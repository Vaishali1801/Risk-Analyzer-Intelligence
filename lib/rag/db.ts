type RagQueryResult<Row = Record<string, unknown>> = {
  rows: Row[];
  rowCount: number | null;
};

export type RagPostgresPoolClient = {
  query<Row = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<RagQueryResult<Row>>;
  release(): void;
};

export type RagPostgresPool = {
  query<Row = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<RagQueryResult<Row>>;
  connect(): Promise<RagPostgresPoolClient>;
  end(): Promise<void>;
};

export type CreateRagPostgresPoolOptions = {
  connectionString?: string;
  max?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
};

type PgPoolConstructor = new (config: {
  connectionString: string;
  max?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}) => RagPostgresPool;

type PgModule = {
  Pool: PgPoolConstructor;
};

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("RAG database helpers can only be used on the server.");
  }
}

function requireRagDatabaseUrl(connectionString?: string) {
  const value = connectionString ?? process.env.RAG_DATABASE_URL;
  if (!value || !value.trim()) {
    throw new Error("RAG_DATABASE_URL is required to create a RAG Postgres pool.");
  }
  return value;
}

function loadPgPool(): PgPoolConstructor {
  const pg = require("pg") as PgModule;
  return pg.Pool;
}

// Server-side helper only. Importing this module does not connect to Postgres;
// a pool is created only when createRagPostgresPool is explicitly called.
export function createRagPostgresPool(options: CreateRagPostgresPoolOptions = {}): RagPostgresPool {
  assertServerRuntime();
  const Pool = loadPgPool();
  const connectionString = requireRagDatabaseUrl(options.connectionString);

  return new Pool({
    connectionString,
    max: options.max ?? 5,
    ssl: options.ssl ?? { rejectUnauthorized: false }
  });
}
