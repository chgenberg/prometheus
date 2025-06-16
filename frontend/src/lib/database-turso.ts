import { createClient } from '@libsql/client';

// Turso database configuration
const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'libsql://prometheus-poker-chgenberg.aws-eu-west-1.turso.io';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTAxMDkwMTYsImlkIjoiNmZhNmVlMTctMDdmMi00YzZkLWI1ZjYtYjMzM2FkMWY5M2JjIiwicmlkIjoiYjNhMzhhNTQtZTI2My00OWY2LThmOTctOTIxOWFlMGZmZDcwIn0.UzqBB_BUpjvr2hIgSNEnJScuBNuOZZDJsD2kygffqndsjhQ3DmoIfD9tnN62xb0TNSDE_rKpwtYCQw2MjdbJAg';

let client: any;

export function getTursoDb() {
  if (!client) {
    console.log('Initializing Turso database connection...');
    client = createClient({
      url: TURSO_DATABASE_URL,
      authToken: TURSO_AUTH_TOKEN,
    });
    console.log('Turso database connection initialized successfully');
  }
  return client;
}

export async function openTursoDb() {
  return getTursoDb();
}

// Compatibility wrapper to match SQLite interface
export interface TursoResult {
  rows: any[];
  meta: {
    columns: string[];
  };
}

export async function queryTurso(sql: string, params: any[] = []): Promise<TursoResult> {
  const db = getTursoDb();
  try {
    const result = await db.execute({ sql, args: params });
    // Convert Turso result format to our expected format
    const rows = result.rows.map((row: any) => {
      // If row is an object, return as-is. If it's an array, convert to object
      if (Array.isArray(row)) {
        const obj: any = {};
        result.columns.forEach((col: string, index: number) => {
          obj[col] = row[index];
        });
        return obj;
      }
      return row;
    });
    
    return {
      rows: rows,
      meta: {
        columns: result.columns || []
      }
    };
  } catch (error) {
    console.error('Turso query error:', error);
    throw error;
  }
}

export default getTursoDb; 