import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';

interface Client {
  id: string;
  name: string;
  slug: string;
  metaAdsAccountId: string;
  metaAdsAccessToken: string;
  createdAt: string;
  isActive: boolean;
}

interface DbSchema {
  examples: { id: number; name: string; createdAt: string }[];
  metrics?: {
    campaigns: any[];
    daily: any[];
    totals: Record<string, any>;
  };
  clients: Client[];
}

const DB_FILE_NAME = 'db.json';
const DB_DIR_PATH = process.env.DATABASE_DIR || './data';
const DB_FULL_PATH = path.resolve(process.cwd(), DB_DIR_PATH, DB_FILE_NAME);

let dbInstance: Low<DbSchema> | null = null;

export async function getDb(): Promise<Low<DbSchema>> {
  if (dbInstance) {
    if (dbInstance.data) {
      return dbInstance;
    }
    await dbInstance.read();
    return dbInstance;
  }

  try {
    const dir = path.dirname(DB_FULL_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const adapter = new JSONFile<DbSchema>(DB_FULL_PATH);
    dbInstance = new Low<DbSchema>(adapter, { 
      examples: [],
      metrics: { campaigns: [], daily: [], totals: {} },
      clients: []
    });

    await dbInstance.read();

    console.log(`Database initialized/loaded from: ${DB_FULL_PATH}`);

    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize Lowdb database:', error);
    throw error;
  }
}