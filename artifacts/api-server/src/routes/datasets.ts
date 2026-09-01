import { Router, type IRouter } from "express";
import { db, datasetsTable, categoriesTable, variablesTable } from "@workspace/db";
import { eq, ilike, and, sql, desc, or } from "drizzle-orm";
import {
  ListDatasetsQueryParams,
  CreateDatasetBody,
  GetDatasetParams,
  UpdateDatasetParams,
  UpdateDatasetBody,
  DeleteDatasetParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const datasetSelect = {
  id: datasetsTable.id,
  title: datasetsTable.title,
  titleFa: datasetsTable.titleFa,
  description: datasetsTable.description,
  descriptionFa: datasetsTable.descriptionFa,
  recordsCount: datasetsTable.recordsCount,
  variablesCount: datasetsTable.variablesCount,
  yearStart: datasetsTable.yearStart,
  yearEnd: datasetsTable.yearEnd,
  geographicCoverage: datasetsTable.geographicCoverage,
  geographicCoverageFa: datasetsTable.geographicCoverageFa,
  dataSource: datasetsTable.dataSource,
  dataSourceFa: datasetsTable.dataSourceFa,
  officialSourceUrl: datasetsTable.officialSourceUrl,
  citationText: datasetsTable.citationText,
  citationDoi: datasetsTable.citationDoi,
  isFeatured: datasetsTable.isFeatured,
  categoryId: datasetsTable.categoryId,
  categoryName: categoriesTable.name,
  categoryNameFa: categoriesTable.nameFa,
  createdAt: sql<string>`${datasetsTable.createdAt}::text`,
};

router.get("/datasets/featured", async (req, res) => {
  try {
    const rows = await db
      .select(datasetSelect)
      .from(datasetsTable)
      .leftJoin(categoriesTable, eq(datasetsTable.categoryId, categoriesTable.id))
      .where(eq(datasetsTable.isFeatured, true))
      .orderBy(desc(datasetsTable.createdAt))
      .limit(6);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error fetching featured datasets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/datasets", async (req, res) => {
  const parsed = ListDatasetsQueryParams.safeParse({
    ...req.query,
    categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
    featured: req.query.featured !== undefined ? req.query.featured === "true" : undefined,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 12,
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, categoryId, featured, page = 1, limit = 12 } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(datasetsTable.title, `%${search}%`),
        ilike(datasetsTable.description, `%${search}%`),
        ilike(datasetsTable.titleFa, `%${search}%`),
        ilike(datasetsTable.descriptionFa, `%${search}%`)
      )
    );
  }
  if (categoryId != null) {
    conditions.push(eq(datasetsTable.categoryId, categoryId));
  }
  if (featured != null) {
    conditions.push(eq(datasetsTable.isFeatured, featured));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    const [totalRow] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(datasetsTable)
      .where(whereClause);

    const rows = await db
      .select(datasetSelect)
      .from(datasetsTable)
      .leftJoin(categoriesTable, eq(datasetsTable.categoryId, categoriesTable.id))
      .where(whereClause)
      .orderBy(desc(datasetsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      data: rows,
      total: totalRow?.count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    req.log.error({ err }, "Error listing datasets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/datasets/:id", async (req, res) => {
  const params = GetDatasetParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [dataset] = await db
      .select(datasetSelect)
      .from(datasetsTable)
      .leftJoin(categoriesTable, eq(datasetsTable.categoryId, categoriesTable.id))
      .where(eq(datasetsTable.id, params.data.id));

    if (!dataset) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const variables = await db
      .select()
      .from(variablesTable)
      .where(eq(variablesTable.datasetId, params.data.id))
      .orderBy(variablesTable.id);

    res.json({ ...dataset, variables });
  } catch (err) {
    req.log.error({ err }, "Error fetching dataset");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/datasets", async (req, res) => {
  const parsed = CreateDatasetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [row] = await db
      .insert(datasetsTable)
      .values(parsed.data)
      .returning();

    const [category] = await db
      .select({ name: categoriesTable.name, nameFa: categoriesTable.nameFa })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, row.categoryId));

    res.status(201).json({
      ...row,
      categoryName: category?.name ?? null,
      categoryNameFa: category?.nameFa ?? null,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating dataset");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/datasets/:id", async (req, res) => {
  const params = UpdateDatasetParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = UpdateDatasetBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [row] = await db
      .update(datasetsTable)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(datasetsTable.id, params.data.id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [category] = await db
      .select({ name: categoriesTable.name, nameFa: categoriesTable.nameFa })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, row.categoryId));

    res.json({
      ...row,
      categoryName: category?.name ?? null,
      categoryNameFa: category?.nameFa ?? null,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating dataset");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/datasets/:id", async (req, res) => {
  const params = DeleteDatasetParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const result = await db
      .delete(datasetsTable)
      .where(eq(datasetsTable.id, params.data.id))
      .returning();
    if (!result.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting dataset");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
