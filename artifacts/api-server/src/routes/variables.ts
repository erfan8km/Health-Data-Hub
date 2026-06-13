import { Router, type IRouter } from "express";
import { db, variablesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListVariablesParams,
  CreateVariableParams,
  CreateVariableBody,
  UpdateVariableParams,
  UpdateVariableBody,
  DeleteVariableParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

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

router.post("/datasets/:datasetId/variables", async (req, res) => {
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

router.put("/datasets/:datasetId/variables/:id", async (req, res) => {
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

router.delete("/datasets/:datasetId/variables/:id", async (req, res) => {
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
