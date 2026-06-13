import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { datasetsTable } from "./datasets";

export const variablesTable = pgTable("variables", {
  id: serial("id").primaryKey(),
  datasetId: integer("dataset_id").notNull().references(() => datasetsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nameFa: text("name_fa").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  descriptionFa: text("description_fa").notNull(),
  valuesRange: text("values_range"),
  valuesRangeFa: text("values_range_fa"),
});

export const insertVariableSchema = createInsertSchema(variablesTable).omit({ id: true });
export type InsertVariable = z.infer<typeof insertVariableSchema>;
export type Variable = typeof variablesTable.$inferSelect;
