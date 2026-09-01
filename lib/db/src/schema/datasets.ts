import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const datasetsTable = pgTable("datasets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleFa: text("title_fa").notNull(),
  description: text("description").notNull(),
  descriptionFa: text("description_fa").notNull(),
  recordsCount: integer("records_count").notNull().default(0),
  variablesCount: integer("variables_count").notNull().default(0),
  yearStart: integer("year_start").notNull(),
  yearEnd: integer("year_end").notNull(),
  geographicCoverage: text("geographic_coverage").notNull(),
  geographicCoverageFa: text("geographic_coverage_fa").notNull().default(""),
  dataSource: text("data_source").notNull(),
  dataSourceFa: text("data_source_fa").notNull().default(""),
  officialSourceUrl: text("official_source_url"),
  citationText: text("citation_text"),
  citationDoi: text("citation_doi"),
  isFeatured: boolean("is_featured").notNull().default(false),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDatasetSchema = createInsertSchema(datasetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type Dataset = typeof datasetsTable.$inferSelect;
