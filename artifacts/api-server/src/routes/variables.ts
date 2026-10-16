import { Router, type IRouter } from "express";
import { db, variablesTable, datasetsTable, categoriesTable } from "@workspace/db";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import {
  ListAllVariablesQueryParams,
  ListVariablesParams,
  CreateVariableParams,
  CreateVariableBody,
  UpdateVariableParams,
  UpdateVariableBody,
  DeleteVariableParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/admin-auth";

const router: IRouter = Router();

// Flat listing across all datasets (public variable dictionary)
router.get("/variables", async (req, res) => {
  const query = ListAllVariablesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { search, name, datasetId, categoryId, type, page, limit } = query.data;
  const offset = (page - 1) * limit;

  try {
    const conditions = [];
    if (datasetId != null) conditions.push(eq(variablesTable.datasetId, datasetId));
    if (categoryId != null) conditions.push(eq(datasetsTable.categoryId, categoryId));
    if (type != null) conditions.push(eq(variablesTable.type, type));
    if (name != null) conditions.push(eq(variablesTable.name, name));
    if (search) {
      conditions.push(
        or(
          ilike(variablesTable.name, `%${search}%`),
          ilike(variablesTable.label, `%${search}%`),
          ilike(variablesTable.description, `%${search}%`),
          ilike(variablesTable.nameFa, `%${search}%`),
          ilike(variablesTable.labelFa, `%${search}%`),
          ilike(variablesTable.descriptionFa, `%${search}%`),
        )
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const baseQuery = db
      .select({
        id: variablesTable.id,
        datasetId: variablesTable.datasetId,
        datasetTitle: datasetsTable.title,
        datasetTitleFa: datasetsTable.titleFa,
        categoryId: datasetsTable.categoryId,
        categoryName: categoriesTable.name,
        categoryNameFa: categoriesTable.nameFa,
        name: variablesTable.name,
        nameFa: variablesTable.nameFa,
        label: variablesTable.label,
        labelFa: variablesTable.labelFa,
        type: variablesTable.type,
        description: variablesTable.description,
        descriptionFa: variablesTable.descriptionFa,
        valuesRange: variablesTable.valuesRange,
        valuesRangeFa: variablesTable.valuesRangeFa,
        missingValueNotes: variablesTable.missingValueNotes,
        missingValueNotesFa: variablesTable.missingValueNotesFa,
      })
      .from(variablesTable)
      .leftJoin(datasetsTable, eq(variablesTable.datasetId, datasetsTable.id))
      .leftJoin(categoriesTable, eq(datasetsTable.categoryId, categoriesTable.id));

    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(variablesTable)
      .leftJoin(datasetsTable, eq(variablesTable.datasetId, datasetsTable.id))
      .leftJoin(categoriesTable, eq(datasetsTable.categoryId, categoriesTable.id));

    const [rows, countResult] = await Promise.all([
      baseQuery.where(where).orderBy(variablesTable.name, variablesTable.id).limit(limit).offset(offset),
      countQuery.where(where),
    ]);

    res.json({ data: rows, total: countResult[0]?.count ?? 0, page, limit });
  } catch (err) {
    req.log.error({ err }, "Error listing all variables");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Per-dataset listing
router.get("/datasets/:datasetId/variables", async (req, res) => {
  const params = ListVariablesParams.safeParse({ datasetId: Number(req.params.datasetId) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid datasetId" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(variablesTable)
      .where(eq(variablesTable.datasetId, params.data.datasetId))
      .orderBy(variablesTable.id);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error listing variables");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/datasets/:datasetId/variables", requireAdmin, async (req, res) => {
  const params = CreateVariableParams.safeParse({ datasetId: Number(req.params.datasetId) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid datasetId" });
    return;
  }
  const body = CreateVariableBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [row] = await db
      .insert(variablesTable)
      .values({ ...body.data, datasetId: params.data.datasetId })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Error creating variable");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/datasets/:datasetId/variables/:id", requireAdmin, async (req, res) => {
  const params = UpdateVariableParams.safeParse({
    datasetId: Number(req.params.datasetId),
    id: Number(req.params.id),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const body = UpdateVariableBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [row] = await db
      .update(variablesTable)
      .set(body.data)
      .where(
        and(
          eq(variablesTable.id, params.data.id),
          eq(variablesTable.datasetId, params.data.datasetId)
        )
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Error updating variable");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/datasets/:datasetId/variables/:id", requireAdmin, async (req, res) => {
  const params = DeleteVariableParams.safeParse({
    datasetId: Number(req.params.datasetId),
    id: Number(req.params.id),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  try {
    const result = await db
      .delete(variablesTable)
      .where(
        and(
          eq(variablesTable.id, params.data.id),
          eq(variablesTable.datasetId, params.data.datasetId)
        )
      )
      .returning();
    if (!result.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting variable");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
