import { Router, type IRouter } from "express";
import { db, categoriesTable, datasetsTable, variablesTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (req, res) => {
  try {
    const [totals] = await db
      .select({
        totalDatasets: sql<number>`cast(count(*) as int)`,
        totalRecords: sql<number>`cast(sum(${datasetsTable.recordsCount}) as int)`,
        totalVariables: sql<number>`cast(sum(${datasetsTable.variablesCount}) as int)`,
        minYear: sql<number>`min(${datasetsTable.yearStart})`,
        maxYear: sql<number>`max(${datasetsTable.yearEnd})`,
      })
      .from(datasetsTable);

    const [catCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(categoriesTable);

    const recentDatasets = await db
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
        officialSourceUrl: datasetsTable.officialSourceUrl,
        citationText: datasetsTable.citationText,
        citationDoi: datasetsTable.citationDoi,
        isFeatured: datasetsTable.isFeatured,
        categoryId: datasetsTable.categoryId,
        categoryName: categoriesTable.name,
        categoryNameFa: categoriesTable.nameFa,
        createdAt: sql<string>`${datasetsTable.createdAt}::text`,
      })
      .from(datasetsTable)
      .leftJoin(categoriesTable, eq(datasetsTable.categoryId, categoriesTable.id))
      .orderBy(desc(datasetsTable.createdAt))
      .limit(5);

    res.json({
      totalDatasets: totals?.totalDatasets ?? 0,
      totalVariables: totals?.totalVariables ?? 0,
      totalRecords: totals?.totalRecords ?? 0,
      categoriesCount: catCount?.count ?? 0,
      yearRange:
        totals?.minYear && totals?.maxYear
          ? `${totals.minYear}–${totals.maxYear}`
          : "N/A",
      recentDatasets,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
