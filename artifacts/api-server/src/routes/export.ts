import { Router, type IRouter } from "express";
import { db, categoriesTable, datasetsTable, variablesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

async function fetchAllData() {
  const [categories, datasets, variables] = await Promise.all([
    db.select().from(categoriesTable).orderBy(asc(categoriesTable.id)),
    db
      .select({
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
        citationText: datasetsTable.citationText,
        citationDoi: datasetsTable.citationDoi,
        isFeatured: datasetsTable.isFeatured,
        categoryId: datasetsTable.categoryId,
        createdAt: datasetsTable.createdAt,
        updatedAt: datasetsTable.updatedAt,
      })
      .from(datasetsTable)
      .orderBy(asc(datasetsTable.id)),
    db.select().from(variablesTable).orderBy(asc(variablesTable.id)),
  ]);
  return { categories, datasets, variables };
}

const schemaDefinition = {
  version: "1.0",
  generated: new Date().toISOString(),
  tables: {
    categories: {
      description: "Research categories that group datasets",
      columns: {
        id: { type: "serial", primaryKey: true },
        name: { type: "text", nullable: false, description: "English category name" },
        name_fa: { type: "text", nullable: false, description: "Persian category name" },
        slug: { type: "text", nullable: false, unique: true, description: "URL-safe identifier" },
        description: { type: "text", nullable: true, description: "English description" },
        description_fa: { type: "text", nullable: true, description: "Persian description" },
        created_at: { type: "timestamptz", nullable: false, default: "now()" },
      },
    },
    datasets: {
      description: "Epidemiological datasets in the repository",
      columns: {
        id: { type: "serial", primaryKey: true },
        title: { type: "text", nullable: false, description: "English title" },
        title_fa: { type: "text", nullable: false, description: "Persian title" },
        description: { type: "text", nullable: false, description: "English description" },
        description_fa: { type: "text", nullable: false, description: "Persian description" },
        records_count: { type: "integer", nullable: false, default: 0 },
        variables_count: { type: "integer", nullable: false, default: 0 },
        year_start: { type: "integer", nullable: false },
        year_end: { type: "integer", nullable: false },
        geographic_coverage: { type: "text", nullable: false },
        geographic_coverage_fa: { type: "text", nullable: false },
        data_source: { type: "text", nullable: false },
        data_source_fa: { type: "text", nullable: false },
        citation_text: { type: "text", nullable: true },
        citation_doi: { type: "text", nullable: true },
        is_featured: { type: "boolean", nullable: false, default: false },
        category_id: { type: "integer", nullable: false, foreignKey: "categories.id" },
        created_at: { type: "timestamptz", nullable: false, default: "now()" },
        updated_at: { type: "timestamptz", nullable: false, default: "now()" },
      },
    },
    variables: {
      description: "Variables (columns/fields) belonging to datasets",
      columns: {
        id: { type: "serial", primaryKey: true },
        dataset_id: { type: "integer", nullable: false, foreignKey: "datasets.id", onDelete: "cascade" },
        name: { type: "text", nullable: false, description: "Technical variable name" },
        name_fa: { type: "text", nullable: false, description: "Persian variable name" },
        label: { type: "text", nullable: false, description: "Human-readable English label" },
        label_fa: { type: "text", nullable: false, description: "Human-readable Persian label" },
        type: { type: "text", nullable: false, enum: ["numeric", "categorical", "date", "text"] },
        description: { type: "text", nullable: false, description: "English description" },
        description_fa: { type: "text", nullable: false, description: "Persian description" },
        values_range: { type: "text", nullable: true, description: "Allowed values or range" },
        values_range_fa: { type: "text", nullable: true, description: "Persian values/range" },
        missing_value_notes: { type: "text", nullable: true },
        missing_value_notes_fa: { type: "text", nullable: true },
      },
    },
  },
  relationships: [
    { from: "datasets.category_id", to: "categories.id", type: "many-to-one" },
    { from: "variables.dataset_id", to: "datasets.id", type: "many-to-one", onDelete: "cascade" },
  ],
};

router.get("/export/schema", (_req, res) => {
  res.setHeader("Content-Disposition", 'attachment; filename="iedr-schema.json"');
  res.json(schemaDefinition);
});

router.get("/export/json", async (req, res) => {
  try {
    const data = await fetchAllData();
    res.setHeader("Content-Disposition", 'attachment; filename="iedr-full-export.json"');
    res.json({ exportedAt: new Date().toISOString(), ...data });
  } catch (err) {
    req.log.error({ err }, "Export JSON failed");
    res.status(500).json({ error: "Export failed" });
  }
});

router.get("/export/json/categories", async (req, res) => {
  try {
    const rows = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.id));
    res.setHeader("Content-Disposition", 'attachment; filename="iedr-categories.json"');
    res.json({ exportedAt: new Date().toISOString(), count: rows.length, data: rows });
  } catch (err) {
    req.log.error({ err }, "Export categories JSON failed");
    res.status(500).json({ error: "Export failed" });
  }
});

router.get("/export/json/datasets", async (req, res) => {
  try {
    const datasets = await db
      .select()
      .from(datasetsTable)
      .orderBy(asc(datasetsTable.id));
    const withVariables = await Promise.all(
      datasets.map(async (ds) => {
        const vars = await db
          .select()
          .from(variablesTable)
          .where(eq(variablesTable.datasetId, ds.id))
          .orderBy(asc(variablesTable.id));
        return { ...ds, variables: vars };
      })
    );
    res.setHeader("Content-Disposition", 'attachment; filename="iedr-datasets.json"');
    res.json({ exportedAt: new Date().toISOString(), count: withVariables.length, data: withVariables });
  } catch (err) {
    req.log.error({ err }, "Export datasets JSON failed");
    res.status(500).json({ error: "Export failed" });
  }
});

router.get("/export/json/variables", async (req, res) => {
  try {
    const rows = await db.select().from(variablesTable).orderBy(asc(variablesTable.id));
    res.setHeader("Content-Disposition", 'attachment; filename="iedr-variables.json"');
    res.json({ exportedAt: new Date().toISOString(), count: rows.length, data: rows });
  } catch (err) {
    req.log.error({ err }, "Export variables JSON failed");
    res.status(500).json({ error: "Export failed" });
  }
});

router.get("/export/csv/categories", async (req, res) => {
  try {
    const rows = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.id));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="iedr-categories.csv"');
    res.send("\uFEFF" + toCsv(rows as Record<string, unknown>[]));
  } catch (err) {
    req.log.error({ err }, "Export categories CSV failed");
    res.status(500).json({ error: "Export failed" });
  }
});

router.get("/export/csv/datasets", async (req, res) => {
  try {
    const rows = await db.select().from(datasetsTable).orderBy(asc(datasetsTable.id));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="iedr-datasets.csv"');
    res.send("\uFEFF" + toCsv(rows as Record<string, unknown>[]));
  } catch (err) {
    req.log.error({ err }, "Export datasets CSV failed");
    res.status(500).json({ error: "Export failed" });
  }
});

router.get("/export/csv/variables", async (req, res) => {
  try {
    const rows = await db.select().from(variablesTable).orderBy(asc(variablesTable.id));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="iedr-variables.csv"');
    res.send("\uFEFF" + toCsv(rows as Record<string, unknown>[]));
  } catch (err) {
    req.log.error({ err }, "Export variables CSV failed");
    res.status(500).json({ error: "Export failed" });
  }
});

export default router;
