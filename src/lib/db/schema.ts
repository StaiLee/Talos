import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const sources = pgTable("sources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("active"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastError: text("last_error"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenders = pgTable("tenders", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: integer("source_id").references(() => sources.id),
  externalId: text("external_id"),
  reference: text("reference"),
  title: text("title").notNull(),
  buyer: text("buyer").notNull(),
  city: text("city"),
  department: text("department"),
  description: text("description"),
  cpv: text("cpv"),
  url: text("url"),
  dossierPath: text("dossier_path"),
  status: text("status").notNull().default("detecte"),
  goDecision: text("go_decision").notNull().default("a_evaluer"),
  score: integer("score"),
  domains: jsonb("domains").$type<string[]>().notNull().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  deadline: timestamp("deadline", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("tenders_source_external_idx").on(table.sourceId, table.externalId),
  index("tenders_deadline_idx").on(table.deadline),
  index("tenders_status_idx").on(table.status),
]);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenderId: uuid("tender_id").references(() => tenders.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("autre"),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  storagePath: text("storage_path").notNull(),
  sha256: text("sha256").notNull(),
  status: text("status").notNull().default("importe"),
  pageCount: integer("page_count"),
  extractedText: text("extracted_text"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("documents_tender_idx").on(table.tenderId)]);

export const requirements = pgTable("requirements", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenderId: uuid("tender_id").notNull().references(() => tenders.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  mandatory: boolean("mandatory").notNull().default(false),
  status: text("status").notNull().default("a_verifier"),
  confidence: integer("confidence").notNull().default(0),
  evidence: text("evidence"),
  sourceDocumentId: uuid("source_document_id").references(() => documents.id),
  sourcePage: integer("source_page"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("requirements_tender_idx").on(table.tenderId)]);

export const capabilities = pgTable("capabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(),
  label: text("label").notNull(),
  level: text("level"),
  owner: text("owner"),
  status: text("status").notNull().default("a_verifier"),
  evidence: text("evidence"),
  notes: text("notes"),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const responses = pgTable("responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenderId: uuid("tender_id").notNull().references(() => tenders.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  version: integer("version").notNull().default(1),
  filename: text("filename").notNull(),
  storagePath: text("storage_path").notNull(),
  status: text("status").notNull().default("brouillon"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("responses_tender_idx").on(table.tenderId)]);

export const collectionRuns = pgTable("collection_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: integer("source_id").notNull().references(() => sources.id),
  status: text("status").notNull().default("en_cours"),
  discovered: integer("discovered").notNull().default(0),
  created: integer("created").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenderId: uuid("tender_id").references(() => tenders.id, { onDelete: "cascade" }),
  operation: text("operation").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cachedTokens: integer("cached_tokens").notNull().default(0),
  costEuros: numeric("cost_euros", { precision: 12, scale: 6 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("ai_usage_created_idx").on(table.createdAt)]);

export const activityEvents = pgTable("activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenderId: uuid("tender_id").references(() => tenders.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("activity_created_idx").on(table.createdAt)]);
