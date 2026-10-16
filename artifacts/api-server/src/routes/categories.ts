import { Router, type IRouter } from "express";
import { db, categoriesTable, datasetsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  UpdateCategoryParams,
  DeleteCategoryParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/admin-auth";

const router: IRouter = Router();

router.get("/categories", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        nameFa: categoriesTable.nameFa,
        slug: categoriesTable.slug,
        description: categoriesTable.description,
        descriptionFa: categoriesTable.descriptionFa,
        datasetCount: sql<number>`cast(count(${datasetsTable.id}) as int)`,
      })
      .from(categoriesTable)
      .leftJoin(datasetsTable, eq(datasetsTable.categoryId, categoriesTable.id))
      .groupBy(categoriesTable.id)
      .orderBy(categoriesTable.name);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error listing categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/categories", requireAdmin, async (req, res) => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [row] = await db
      .insert(categoriesTable)
      .values(parsed.data)
      .returning();
    res.status(201).json({ ...row, datasetCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Error creating category");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/categories/:id", requireAdmin, async (req, res) => {
  const params = UpdateCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = UpdateCategoryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [row] = await db
      .update(categoriesTable)
      .set(body.data)
      .where(eq(categoriesTable.id, params.data.id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const [countRow] = await db
      .select({ datasetCount: sql<number>`cast(count(${datasetsTable.id}) as int)` })
      .from(datasetsTable)
      .where(eq(datasetsTable.categoryId, row.id));
    res.json({ ...row, datasetCount: countRow?.datasetCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Error updating category");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/categories/:id", requireAdmin, async (req, res) => {
  const params = DeleteCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const result = await db
      .delete(categoriesTable)
      .where(eq(categoriesTable.id, params.data.id))
      .returning();
    if (!result.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting category");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
