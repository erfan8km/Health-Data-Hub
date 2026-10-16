import { neon } from "@neondatabase/serverless";
import { Hono, type Context } from "hono";

type Bindings = {
  DATABASE_URL?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  CORS_ORIGINS?: string;
};

type AppEnv = { Bindings: Bindings };
type Row = Record<string, unknown>;
type Sql = ReturnType<typeof neon>;

const app = new Hono<AppEnv>();
const SESSION_COOKIE = "iedr_admin_session";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const DATASET_COLUMNS = `
  d.id, d.title, d.title_fa, d.description, d.description_fa,
  d.records_count, d.variables_count, d.year_start, d.year_end,
  d.geographic_coverage, d.geographic_coverage_fa, d.data_source,
  d.data_source_fa, d.official_source_url, d.citation_text, d.citation_doi,
  d.is_featured, d.category_id, d.created_at, d.updated_at,
  c.name AS category_name, c.name_fa AS category_name_fa
`;

const SCHEMA_DEFINITION = {
  version: "1.0",
  tables: {
    categories: {
      description: "Research categories that group registries",
      columns: {
        id: { type: "serial", primaryKey: true },
        name: { type: "text", nullable: false },
        name_fa: { type: "text", nullable: false },
        slug: { type: "text", nullable: false, unique: true },
        description: { type: "text", nullable: true },
        description_fa: { type: "text", nullable: true },
        created_at: { type: "timestamptz", nullable: false },
      },
    },
    datasets: {
      description: "Metadata-only epidemiological registries",
      columns: {
        id: { type: "serial", primaryKey: true },
        title: { type: "text", nullable: false },
        title_fa: { type: "text", nullable: false },
        description: { type: "text", nullable: false },
        description_fa: { type: "text", nullable: false },
        records_count: { type: "integer", nullable: false },
        variables_count: { type: "integer", nullable: false },
        year_start: { type: "integer", nullable: false },
        year_end: { type: "integer", nullable: false },
        geographic_coverage: { type: "text", nullable: false },
        geographic_coverage_fa: { type: "text", nullable: false },
        data_source: { type: "text", nullable: false },
        data_source_fa: { type: "text", nullable: false },
        official_source_url: { type: "text", nullable: true },
        citation_text: { type: "text", nullable: true },
        citation_doi: { type: "text", nullable: true },
        is_featured: { type: "boolean", nullable: false },
        category_id: { type: "integer", nullable: false, foreignKey: "categories.id" },
        created_at: { type: "timestamptz", nullable: false },
        updated_at: { type: "timestamptz", nullable: false },
      },
    },
    variables: {
      description: "General variable dictionary entries",
      columns: {
        id: { type: "serial", primaryKey: true },
        dataset_id: { type: "integer", nullable: false, foreignKey: "datasets.id", onDelete: "cascade" },
        name: { type: "text", nullable: false },
        name_fa: { type: "text", nullable: false },
        label: { type: "text", nullable: false },
        label_fa: { type: "text", nullable: false },
        type: { type: "text", nullable: false },
        description: { type: "text", nullable: false },
        description_fa: { type: "text", nullable: false },
        values_range: { type: "text", nullable: true },
        values_range_fa: { type: "text", nullable: true },
        missing_value_notes: { type: "text", nullable: true },
        missing_value_notes_fa: { type: "text", nullable: true },
      },
    },
  },
};

function jsonError(c: Context<AppEnv>, message: string, status: 400 | 401 | 404 | 409 | 500 | 503) {
  return c.json({ error: message }, status);
}

function getSql(c: Context<AppEnv>): Sql | null {
  return c.env.DATABASE_URL ? neon(c.env.DATABASE_URL) : null;
}

async function query<T extends Row = Row>(c: Context<AppEnv>, text: string, params: unknown[] = []): Promise<T[]> {
  const sql = getSql(c);
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  return (await sql.query(text, params)) as T[];
}

function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseNonNegativeInt(value: unknown, field: string): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(`${field} must be a non-negative integer.`);
  return number;
}

function parseRequiredString(value: unknown, field: string, maxLength = 5000): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
}

function parseOptionalString(value: unknown, field: string, maxLength = 5000): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) throw new Error(`${field} is invalid.`);
  return value.trim() || null;
}

function parseOfficialUrl(value: unknown): string | null {
  const url = parseOptionalString(value, "officialSourceUrl", 2000);
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("officialSourceUrl must be a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("officialSourceUrl must use http or https.");
  }
  return parsed.toString();
}

function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${field} must be a boolean.`);
  return value;
}

function toDataset(row: Row): Row {
  return {
    id: Number(row.id),
    title: row.title,
    titleFa: row.title_fa,
    description: row.description,
    descriptionFa: row.description_fa,
    recordsCount: Number(row.records_count ?? 0),
    variablesCount: Number(row.variables_count ?? 0),
    yearStart: Number(row.year_start ?? 0),
    yearEnd: Number(row.year_end ?? 0),
    geographicCoverage: row.geographic_coverage,
    geographicCoverageFa: row.geographic_coverage_fa,
    dataSource: row.data_source,
    dataSourceFa: row.data_source_fa,
    officialSourceUrl: row.official_source_url ?? null,
    citationText: row.citation_text ?? null,
    citationDoi: row.citation_doi ?? null,
    isFeatured: Boolean(row.is_featured),
    categoryId: Number(row.category_id),
    categoryName: row.category_name ?? null,
    categoryNameFa: row.category_name_fa ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toVariable(row: Row): Row {
  return {
    id: Number(row.id),
    datasetId: Number(row.dataset_id),
    name: row.name,
    nameFa: row.name_fa,
    label: row.label,
    labelFa: row.label_fa,
    type: row.type,
    description: row.description,
    descriptionFa: row.description_fa,
    valuesRange: row.values_range ?? null,
    valuesRangeFa: row.values_range_fa ?? null,
    missingValueNotes: row.missing_value_notes ?? null,
    missingValueNotesFa: row.missing_value_notes_fa ?? null,
  };
}

function toCategory(row: Row): Row {
  return {
    id: Number(row.id),
    name: row.name,
    nameFa: row.name_fa,
    slug: row.slug,
    description: row.description ?? null,
    descriptionFa: row.description_fa ?? null,
    datasetCount: Number(row.dataset_count ?? 0),
    createdAt: row.created_at,
  };
}

function readCookies(request: Request): Record<string, string> {
  const header = request.headers.get("Cookie") ?? "";
  return Object.fromEntries(
    header.split(";").flatMap((part) => {
      const index = part.indexOf("=");
      if (index <= 0) return [];
      try {
        return [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]];
      } catch {
        return [];
      }
    }),
  );
}

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function secureEqual(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([digest(left), digest(right)]);
  let difference = leftDigest.length === rightDigest.length ? 0 : 1;
  for (let index = 0; index < Math.max(leftDigest.length, rightDigest.length); index += 1) {
    difference |= (leftDigest[index] ?? 0) ^ (rightDigest[index] ?? 0);
  }
  return difference === 0;
}

async function signSession(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createSession(secret: string): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = base64UrlEncode(JSON.stringify({ issuedAt: Date.now(), expiresAt }));
  return { token: `${payload}.${await signSession(payload, secret)}`, expiresAt };
}

async function hasValidSession(request: Request, secret: string | undefined): Promise<boolean> {
  if (!secret || secret.length < 32) return false;
  const token = readCookies(request)[SESSION_COOKIE];
  if (!token) return false;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!(await secureEqual(signature, await signSession(payload, secret)))) return false;
  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as { issuedAt: number; expiresAt: number };
    return Number.isFinite(parsed.issuedAt) && Number.isFinite(parsed.expiresAt) && parsed.expiresAt > Date.now();
  } catch {
    return false;
  }
}

async function requireAdmin(c: Context<AppEnv>): Promise<Response | null> {
  if (!c.env.SESSION_SECRET || c.env.SESSION_SECRET.length < 32) {
    return jsonError(c, "Admin authentication is not configured.", 503);
  }
  if (!(await hasValidSession(c.req.raw, c.env.SESSION_SECRET))) {
    return jsonError(c, "Admin authentication required.", 401);
  }
  return null;
}

async function readJson(c: Context<AppEnv>): Promise<Record<string, unknown>> {
  const value: unknown = await c.req.json().catch(() => null);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("A JSON object is required.");
  return value as Record<string, unknown>;
}

function datasetValues(body: Record<string, unknown>) {
  return {
    title: parseRequiredString(body.title, "title"),
    titleFa: parseRequiredString(body.titleFa, "titleFa"),
    description: parseRequiredString(body.description, "description"),
    descriptionFa: parseRequiredString(body.descriptionFa, "descriptionFa"),
    recordsCount: parseNonNegativeInt(body.recordsCount, "recordsCount"),
    variablesCount: parseNonNegativeInt(body.variablesCount, "variablesCount"),
    yearStart: parseNonNegativeInt(body.yearStart, "yearStart"),
    yearEnd: parseNonNegativeInt(body.yearEnd, "yearEnd"),
    geographicCoverage: parseRequiredString(body.geographicCoverage, "geographicCoverage"),
    geographicCoverageFa: parseRequiredString(body.geographicCoverageFa, "geographicCoverageFa"),
    dataSource: parseRequiredString(body.dataSource, "dataSource"),
    dataSourceFa: parseRequiredString(body.dataSourceFa, "dataSourceFa"),
    officialSourceUrl: parseOfficialUrl(body.officialSourceUrl),
    citationText: parseOptionalString(body.citationText, "citationText"),
    citationDoi: parseOptionalString(body.citationDoi, "citationDoi"),
    isFeatured: parseBoolean(body.isFeatured, "isFeatured"),
    categoryId: parseNonNegativeInt(body.categoryId, "categoryId"),
  };
}

function variableValues(body: Record<string, unknown>) {
  const type = parseRequiredString(body.type, "type", 30);
  if (!["numeric", "categorical", "date", "text"].includes(type)) throw new Error("type is invalid.");
  return {
    name: parseRequiredString(body.name, "name", 200),
    nameFa: parseRequiredString(body.nameFa, "nameFa", 200),
    label: typeof body.label === "string" ? body.label.trim() : "",
    labelFa: typeof body.labelFa === "string" ? body.labelFa.trim() : "",
    type,
    description: parseRequiredString(body.description, "description"),
    descriptionFa: parseRequiredString(body.descriptionFa, "descriptionFa"),
    valuesRange: parseOptionalString(body.valuesRange, "valuesRange"),
    valuesRangeFa: parseOptionalString(body.valuesRangeFa, "valuesRangeFa"),
    missingValueNotes: parseOptionalString(body.missingValueNotes, "missingValueNotes"),
    missingValueNotesFa: parseOptionalString(body.missingValueNotesFa, "missingValueNotesFa"),
  };
}

function csvValue(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function csvResponse(rows: Row[], columns: string[], filename: string): Response {
  const content = [
    `\uFEFF${columns.join(",")}`,
    ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(",")),
  ].join("\r\n");
  return new Response(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

app.use("*", async (c, next) => {
  const origin = c.req.header("Origin");
  const allowedOrigins = (c.env.CORS_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (origin && allowedOrigins.includes(origin)) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");
  }
  c.header("Access-Control-Allow-Headers", "Content-Type");
  c.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "same-origin");
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
  return c.res;
});

app.get("/healthz", async (c) => {
  if (!c.env.DATABASE_URL) return jsonError(c, "Database is not configured.", 503);
  try {
    await query(c, "SELECT 1");
    return c.json({ status: "ok" });
  } catch {
    return jsonError(c, "Database is unavailable.", 503);
  }
});

app.post("/auth/admin-login", async (c) => {
  if (!c.env.ADMIN_PASSWORD || !c.env.SESSION_SECRET) return jsonError(c, "Admin authentication is not configured.", 503);
  const body = await readJson(c).catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) return jsonError(c, "Password is required.", 400);
  if (!(await secureEqual(password, c.env.ADMIN_PASSWORD))) return jsonError(c, "Incorrect password.", 401);
  const session = await createSession(c.env.SESSION_SECRET);
  c.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(session.token)}; Max-Age=${SESSION_MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax${new URL(c.req.url).protocol === "https:" ? "; Secure" : ""}`,
  );
  return c.json({ ok: true, expiresAt: session.expiresAt });
});

app.get("/auth/admin-session", async (c) => {
  return c.json({ authenticated: await hasValidSession(c.req.raw, c.env.SESSION_SECRET) });
});

app.post("/auth/admin-logout", async (c) => {
  const authError = await requireAdmin(c);
  if (authError) return authError;
  c.header("Set-Cookie", `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`);
  return c.body(null, 204);
});

app.get("/categories", async (c) => {
  try {
    const rows = await query(c, `
      SELECT c.id, c.name, c.name_fa, c.slug, c.description, c.description_fa,
             c.created_at, COUNT(d.id)::int AS dataset_count
      FROM categories c
      LEFT JOIN datasets d ON d.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `);
    return c.json(rows.map(toCategory));
  } catch {
    return jsonError(c, "Internal server error.", 500);
  }
});

app.post("/categories", async (c) => {
  const authError = await requireAdmin(c);
  if (authError) return authError;
  try {
    const body = await readJson(c);
    const name = parseRequiredString(body.name, "name", 200);
    const nameFa = parseRequiredString(body.nameFa, "nameFa", 200);
    const slug = parseRequiredString(body.slug, "slug", 200);
    const description = parseOptionalString(body.description, "description");
    const descriptionFa = parseOptionalString(body.descriptionFa, "descriptionFa");
    const [row] = await query(c, `
      INSERT INTO categories (name, name_fa, slug, description, description_fa)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, nameFa, slug, description, descriptionFa]);
    return c.json({ ...toCategory(row), datasetCount: 0 }, 201);
  } catch (error) {
    return jsonError(c, error instanceof Error ? error.message : "Unable to create category.", 400);
  }
});

app.put("/categories/:id", async (c) => {
  const authError = await requireAdmin(c);
  if (authError) return authError;
  const id = parseId(c.req.param("id"));
  if (!id) return jsonError(c, "Invalid id.", 400);
  try {
    const body = await readJson(c);
    const name = parseRequiredString(body.name, "name", 200);
    const nameFa = parseRequiredString(body.nameFa, "nameFa", 200);
    const slug = parseRequiredString(body.slug, "slug", 200);
    const description = parseOptionalString(body.description, "description");
    const descriptionFa = parseOptionalString(body.descriptionFa, "descriptionFa");
    const [row] = await query(c, `
      UPDATE categories
      SET name = $1, name_fa = $2, slug = $3, description = $4, description_fa = $5
      WHERE id = $6
      RETURNING *
    `, [name, nameFa, slug, description, descriptionFa, id]);
    if (!row) return jsonError(c, "Not found.", 404);
    const [count] = await query(c, "SELECT COUNT(*)::int AS dataset_count FROM datasets WHERE category_id = $1", [id]);
    return c.json({ ...toCategory(row), datasetCount: Number(count?.dataset_count ?? 0) });
  } catch (error) {
    return jsonError(c, error instanceof Error ? error.message : "Unable to update category.", 400);
  }
});

app.delete("/categories/:id", async (c) => {
  const authError = await requireAdmin(c);
  if (authError) return authError;
  const id = parseId(c.req.param("id"));
  if (!id) return jsonError(c, "Invalid id.", 400);
  try {
    const rows = await query(c, "DELETE FROM categories WHERE id = $1 RETURNING id", [id]);
    if (!rows.length) return jsonError(c, "Not found.", 404);
    return c.body(null, 204);
  } catch {
    return jsonError(c, "Category cannot be deleted while registries use it.", 409);
  }
});

app.get("/datasets/featured", async (c) => {
  try {
    const rows = await query(c, `
      SELECT ${DATASET_COLUMNS}
      FROM datasets d
      LEFT JOIN categories c ON c.id = d.category_id
      WHERE d.is_featured = true
      ORDER BY d.created_at DESC
      LIMIT 6
    `);
    return c.json(rows.map(toDataset));
  } catch {
    return jsonError(c, "Internal server error.", 500);
  }
});

app.get("/datasets", async (c) => {
  try {
    const params = new URL(c.req.url).searchParams;
    const search = params.get("search")?.trim() ?? "";
    const categoryId = params.get("categoryId") ? parseId(params.get("categoryId") ?? undefined) : null;
    const featuredValue = params.get("featured");
    const featured = featuredValue === null ? null : featuredValue === "true";
    const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 12) || 12));
    const where: string[] = ["1 = 1"];
    const values: unknown[] = [];
    const add = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };
    if (search) {
      const pattern = add(`%${search}%`);
      where.push(`(d.title ILIKE ${pattern} OR d.title_fa ILIKE ${pattern} OR d.description ILIKE ${pattern} OR d.description_fa ILIKE ${pattern} OR d.data_source ILIKE ${pattern} OR d.data_source_fa ILIKE ${pattern} OR c.name ILIKE ${pattern} OR c.name_fa ILIKE ${pattern})`);
    }
    if (categoryId) where.push(`d.category_id = ${add(categoryId)}`);
    if (featuredValue !== null) where.push(`d.is_featured = ${add(featured)}`);
    const whereClause = where.join(" AND ");
    const [count] = await query(c, `
      SELECT COUNT(*)::int AS count FROM datasets d
      LEFT JOIN categories c ON c.id = d.category_id
      WHERE ${whereClause}
    `, values);
    const offset = (page - 1) * limit;
    const rows = await query(c, `
      SELECT ${DATASET_COLUMNS}
      FROM datasets d
      LEFT JOIN categories c ON c.id = d.category_id
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT ${add(limit)} OFFSET ${add(offset)}
    `, values);
    return c.json({ data: rows.map(toDataset), total: Number(count?.count ?? 0), page, limit });
  } catch (error) {
    return jsonError(c, error instanceof Error ? error.message : "Internal server error.", 400);
  }
});

app.get("/datasets/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return jsonError(c, "Invalid id.", 400);
  try {
    const [row] = await query(c, `
      SELECT ${DATASET_COLUMNS}
      FROM datasets d
      LEFT JOIN categories c ON c.id = d.category_id
      WHERE d.id = $1
    `, [id]);
    if (!row) return jsonError(c, "Not found.", 404);
    const variables = await query(c, "SELECT * FROM variables WHERE dataset_id = $1 ORDER BY id", [id]);
    return c.json({ ...toDataset(row), variables: variables.map(toVariable) });
  } catch {
    return jsonError(c, "Internal server error.", 500);
  }
});

app.post("/datasets", async (c) => {
  const authError = await requireAdmin(c);
  if (authError) return authError;
  try {
    const values = datasetValues(await readJson(c));
    const [row] = await query(c, `
      INSERT INTO datasets (
        title, title_fa, description, description_fa, records_count, variables_count,
        year_start, year_end, geographic_coverage, geographic_coverage_fa,
        data_source, data_source_fa, official_source_url, citation_text, citation_doi,
        is_featured, category_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *
    `, [
      values.title, values.titleFa, values.description, values.descriptionFa, values.recordsCount,
      values.variablesCount, values.yearStart, values.yearEnd, values.geographicCoverage,
      values.geographicCoverageFa, values.dataSource, values.dataSourceFa, values.officialSourceUrl,
      values.citationText, values.citationDoi, values.isFeatured, values.categoryId,
    ]);
    return c.json(toDataset(row), 201);
  } catch (error) {
    return jsonError(c, error instanceof Error ? error.message : "Unable to create registry.", 400);
  }
});

app.put("/datasets/:id", async (c) => {
  const authError = await requireAdmin(c);
  if (authError) return authError;
  const id = parseId(c.req.param("id"));
  if (!id) return jsonError(c, "Invalid id.", 400);
  try {
    const values = datasetValues(await readJson(c));
    const [row] = await query(c, `
      UPDATE datasets SET
        title=$1, title_fa=$2, description=$3, description_fa=$4,
        records_count=$5, variables_count=$6, year_start=$7, year_end=$8,
        geographic_coverage=$9, geographic_coverage_fa=$10, data_source=$11,
        data_source_fa=$12, official_source_url=$13, citation_text=$14,
        citation_doi=$15, is_featured=$16, category_id=$17, updated_at=NOW()
      WHERE id=$18
      RETURNING *
    `, [
      values.title, values.titleFa, values.description, values.descriptionFa, values.recordsCount,
      values.variablesCount, values.yearStart, values.yearEnd, values.geographicCoverage,
      values.geographicCoverageFa, values.dataSource, values.dataSourceFa, values.officialSourceUrl,
      values.citationText, values.citationDoi, values.isFeatured, values.categoryId, id,
    ]);
    if (!row) return jsonError(c, "Not found.", 404);
    return c.json(toDataset(row));
  } catch (error) {
    return jsonError(c, error instanceof Error ? error.message : "Unable to update registry.", 400);
  }
});

app.delete("/datasets/:id", async (c) => {
  const authError = await requireAdmin(c);
  if (authError) return authError;
  const id = parseId(c.req.param("id"));
  if (!id) return jsonError(c, "Invalid id.", 400);
  try {
    const rows = await query(c, "DELETE FROM datasets WHERE id = $1 RETURNING id", [id]);
    if (!rows.length) return jsonError(c, "Not found.", 404);
    return c.body(null, 204);
  } catch {
    return jsonError(c, "Unable to delete registry.", 500);
  }
});

app.get("/variables", async (c) => {
  try {
    const params = new URL(c.req.url).searchParams;
    const search = params.get("search")?.trim() ?? "";
    const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 20) || 20));
    const where: string[] = ["1 = 1"];
    const values: unknown[] = [];
    const add = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };
    if (search) {
      const pattern = add(`%${search}%`);
      where.push(`(v.name ILIKE ${pattern} OR v.name_fa ILIKE ${pattern} OR v.label ILIKE ${pattern} OR v.label_fa ILIKE ${pattern} OR v.description ILIKE ${pattern} OR v.description_fa ILIKE ${pattern})`);
    }
    const datasetId = params.get("datasetId") ? parseId(params.get("datasetId") ?? undefined) : null;
    const categoryId = params.get("categoryId") ? parseId(params.get("categoryId") ?? undefined) : null;
    const type = params.get("type");
    if (datasetId) where.push(`v.dataset_id = ${add(datasetId)}`);
    if (categoryId) where.push(`d.category_id = ${add(categoryId)}`);
    if (type) where.push(`v.type = ${add(type)}`);
    const whereClause = where.join(" AND ");
    const [count] = await query(c, `
      SELECT COUNT(*)::int AS count FROM variables v
      LEFT JOIN datasets d ON d.id = v.dataset_id
      WHERE ${whereClause}
    `, values);
    const offset = (page - 1) * limit;
    const rows = await query(c, `
      SELECT v.*, d.title AS dataset_title, d.title_fa AS dataset_title_fa,
             d.category_id, c.name AS category_name, c.name_fa AS category_name_fa
      FROM variables v
      LEFT JOIN datasets d ON d.id = v.dataset_id
      LEFT JOIN categories c ON c.id = d.category_id
      WHERE ${whereClause}
      ORDER BY v.name, v.id
      LIMIT ${add(limit)} OFFSET ${add(offset)}
    `, values);
    return c.json({
      data: rows.map((row) => ({ ...toVariable(row), datasetTitle: row.dataset_title, datasetTitleFa: row.dataset_title_fa, categoryId: row.category_id, categoryName: row.category_name, categoryNameFa: row.category_name_fa })),
      total: Number(count?.count ?? 0),
      page,
      limit,
    });
  } catch (error) {
    return jsonError(c, error instanceof Error ? error.message : "Internal server error.", 400);
  }
});

app.get("/datasets/:datasetId/variables", async (c) => {
  const datasetId = parseId(c.req.param("datasetId"));
  if (!datasetId) return jsonError(c, "Invalid datasetId.", 400);
  try {
    const rows = await query(c, "SELECT * FROM variables WHERE dataset_id = $1 ORDER BY id", [datasetId]);
    return c.json(rows.map(toVariable));
  } catch {
    return jsonError(c, "Internal server error.", 500);
  }
});

app.post("/datasets/:datasetId/variables", async (c) => {
  const authError = await requireAdmin(c);
  if (authError) return authError;
  const datasetId = parseId(c.req.param("datasetId"));
  if (!datasetId) return jsonError(c, "Invalid datasetId.", 400);
  try {
    const values = variableValues(await readJson(c));
    const [row] = await query(c, `
      INSERT INTO variables (dataset_id, name, name_fa, label, label_fa, type, description, description_fa, values_range, values_range_fa, missing_value_notes, missing_value_notes_fa)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [datasetId, values.name, values.nameFa, values.label, values.labelFa, values.type, values.description, values.descriptionFa, values.valuesRange, values.valuesRangeFa, values.missingValueNotes, values.missingValueNotesFa]);
    return c.json(toVariable(row), 201);
  } catch (error) {
    return jsonError(c, error instanceof Error ? error.message : "Unable to create variable.", 400);
  }
});

app.put("/datasets/:datasetId/variables/:id", async (c) => {
  const authError = await requireAdmin(c);
  if (authError) return authError;
  const datasetId = parseId(c.req.param("datasetId"));
  const id = parseId(c.req.param("id"));
  if (!datasetId || !id) return jsonError(c, "Invalid params.", 400);
  try {
    const values = variableValues(await readJson(c));
    const [row] = await query(c, `
      UPDATE variables SET name=$1, name_fa=$2, label=$3, label_fa=$4, type=$5,
        description=$6, description_fa=$7, values_range=$8, values_range_fa=$9,
        missing_value_notes=$10, missing_value_notes_fa=$11
      WHERE id=$12 AND dataset_id=$13
      RETURNING *
    `, [values.name, values.nameFa, values.label, values.labelFa, values.type, values.description, values.descriptionFa, values.valuesRange, values.valuesRangeFa, values.missingValueNotes, values.missingValueNotesFa, id, datasetId]);
    if (!row) return jsonError(c, "Not found.", 404);
    return c.json(toVariable(row));
  } catch (error) {
    return jsonError(c, error instanceof Error ? error.message : "Unable to update variable.", 400);
  }
});

app.delete("/datasets/:datasetId/variables/:id", async (c) => {
  const authError = await requireAdmin(c);
  if (authError) return authError;
  const datasetId = parseId(c.req.param("datasetId"));
  const id = parseId(c.req.param("id"));
  if (!datasetId || !id) return jsonError(c, "Invalid params.", 400);
  const rows = await query(c, "DELETE FROM variables WHERE id = $1 AND dataset_id = $2 RETURNING id", [id, datasetId]);
  if (!rows.length) return jsonError(c, "Not found.", 404);
  return c.body(null, 204);
});

app.get("/stats", async (c) => {
  try {
    const [stats] = await query(c, `
      SELECT COUNT(*)::int AS total_datasets,
             COALESCE(SUM(records_count), 0)::bigint AS total_records,
             COALESCE(SUM(variables_count), 0)::int AS total_variables,
             MIN(NULLIF(year_start, 0))::int AS min_year,
             MAX(NULLIF(year_end, 0))::int AS max_year
      FROM datasets
    `);
    const [categories] = await query(c, "SELECT COUNT(*)::int AS count FROM categories");
    const recent = await query(c, `SELECT ${DATASET_COLUMNS} FROM datasets d LEFT JOIN categories c ON c.id = d.category_id ORDER BY d.created_at DESC LIMIT 5`);
    return c.json({
      totalDatasets: Number(stats?.total_datasets ?? 0),
      totalRecords: Number(stats?.total_records ?? 0),
      totalVariables: Number(stats?.total_variables ?? 0),
      totalCategories: Number(categories?.count ?? 0),
      minYear: stats?.min_year ?? null,
      maxYear: stats?.max_year ?? null,
      recentDatasets: recent.map(toDataset),
    });
  } catch {
    return jsonError(c, "Internal server error.", 500);
  }
});

app.get("/export/schema", (c) => c.json({ ...SCHEMA_DEFINITION, generated: new Date().toISOString() }));

app.get("/export/json/categories", async (c) => {
  const rows = await query(c, "SELECT c.*, COUNT(d.id)::int AS dataset_count FROM categories c LEFT JOIN datasets d ON d.category_id = c.id GROUP BY c.id ORDER BY c.id");
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), count: rows.length, data: rows.map(toCategory) }, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="iedr-categories.json"' } });
});

app.get("/export/json/datasets", async (c) => {
  const rows = await query(c, `SELECT ${DATASET_COLUMNS} FROM datasets d LEFT JOIN categories c ON c.id = d.category_id ORDER BY d.id`);
  const datasets = await Promise.all(rows.map(async (row) => ({
    ...toDataset(row),
    variables: (await query(c, "SELECT * FROM variables WHERE dataset_id = $1 ORDER BY id", [row.id])).map(toVariable),
  })));
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), count: datasets.length, data: datasets }, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="iedr-datasets.json"' } });
});

app.get("/export/json/variables", async (c) => {
  const rows = await query(c, "SELECT * FROM variables ORDER BY id");
  const variables = rows.map(toVariable);
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), count: variables.length, data: variables }, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="iedr-variables.json"' } });
});

app.get("/export/json", async (c) => {
  const [categories, datasets, variables] = await Promise.all([
    query(c, "SELECT c.*, COUNT(d.id)::int AS dataset_count FROM categories c LEFT JOIN datasets d ON d.category_id = c.id GROUP BY c.id ORDER BY c.id"),
    query(c, `SELECT ${DATASET_COLUMNS} FROM datasets d LEFT JOIN categories c ON c.id = d.category_id ORDER BY d.id`),
    query(c, "SELECT * FROM variables ORDER BY id"),
  ]);
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), categories: categories.map(toCategory), datasets: datasets.map(toDataset), variables: variables.map(toVariable) }, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="iedr-metadata-backup.json"' } });
});

app.get("/export/csv/categories", async (c) => {
  const rows = await query(c, "SELECT c.*, COUNT(d.id)::int AS dataset_count FROM categories c LEFT JOIN datasets d ON d.category_id = c.id GROUP BY c.id ORDER BY c.id");
  return csvResponse(rows.map(toCategory), ["id", "name", "nameFa", "slug", "description", "descriptionFa", "datasetCount", "createdAt"], "iedr-categories.csv");
});

app.get("/export/csv/datasets", async (c) => {
  const rows = await query(c, `SELECT ${DATASET_COLUMNS} FROM datasets d LEFT JOIN categories c ON c.id = d.category_id ORDER BY d.id`);
  return csvResponse(rows.map(toDataset), ["id", "title", "titleFa", "description", "descriptionFa", "recordsCount", "variablesCount", "yearStart", "yearEnd", "geographicCoverage", "geographicCoverageFa", "dataSource", "dataSourceFa", "officialSourceUrl", "citationText", "citationDoi", "isFeatured", "categoryId", "createdAt", "updatedAt"], "iedr-registries.csv");
});

app.get("/export/csv/variables", async (c) => {
  const rows = await query(c, "SELECT * FROM variables ORDER BY id");
  return csvResponse(rows.map(toVariable), ["id", "datasetId", "name", "nameFa", "label", "labelFa", "type", "description", "descriptionFa", "valuesRange", "valuesRangeFa", "missingValueNotes", "missingValueNotesFa"], "iedr-variables.csv");
});

app.onError((error, c) => {
  console.error("Cloudflare API error", error.message);
  return jsonError(c, "Internal server error.", 500);
});

app.notFound((c) => jsonError(c, "Not found.", 404));

export const onRequest = async (context: {
  request: Request;
  env: Bindings;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
}) => {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  const rewrittenUrl = new URL(`${path}${url.search}`, url);
  const request = context.request as unknown as globalThis.Request;
  const rewrittenRequest = new globalThis.Request(rewrittenUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
  });
  return app.fetch(rewrittenRequest, context.env, context as never);
};
