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
  chatPassword: string;
  createdAt: string;
  isActive: boolean;
}

interface Settings {
  metaAccessToken: string;
}

interface SuggestionItem {
  id: string;
  type: 'pause' | 'resume' | 'increase_budget' | 'decrease_budget';
  title: string;
  description: string;
  parameters: Record<string, any>;
  status: 'pending' | 'applied' | 'rejected' | 'failed';
  appliedAt?: string;
  error?: string;
}

interface Suggestion {
  id: string;
  clientId: string;
  clientName: string;
  campaignId: string;
  campaignName: string;
  summary: string;
  suggestions: SuggestionItem[];
  status: 'pending' | 'partially_applied' | 'fully_applied' | 'rejected';
  createdAt: string;
}

interface DbSchema {
  examples: { id: number; name: string; createdAt: string }[];
  metrics?: {
    campaigns: any[];
    daily: any[];
    totals: Record<string, any>;
  };
  clients: Client[];
  settings: Settings;
  suggestions: Suggestion[];
}

const DB_FILE_NAME = 'db.json';
const DB_DIR_PATH = process.env.DATABASE_DIR || './data';
const DB_FULL_PATH = path.resolve(process.cwd(), DB_DIR_PATH, DB_FILE_NAME);

const DEFAULT_DATA: DbSchema = {
  examples: [],
  metrics: { campaigns: [], daily: [], totals: {} },
  clients: [],
  settings: { metaAccessToken: '' },
  suggestions: [],
};

let dbInstance: Low<DbSchema> | null = null;

export async function getDb(): Promise<Low<DbSchema>> {
  if (dbInstance) {
    if (dbInstance.data) {
      if (!dbInstance.data.suggestions) {
        dbInstance.data.suggestions = [];
      }
      return dbInstance;
    }
    await dbInstance.read();
    if (!dbInstance.data) {
      dbInstance.data = DEFAULT_DATA;
    }
    if (!dbInstance.data.suggestions) {
      dbInstance.data.suggestions = [];
    }
    return dbInstance;
  }

  try {
    const dir = path.dirname(DB_FULL_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const adapter = new JSONFile<DbSchema>(DB_FULL_PATH);
    dbInstance = new Low<DbSchema>(adapter, DEFAULT_DATA);

    await dbInstance.read();

    if (!dbInstance.data) {
      dbInstance.data = DEFAULT_DATA;
    }
    if (!dbInstance.data.suggestions) {
      dbInstance.data.suggestions = [];
    }

    console.log(`Database initialized/loaded from: ${DB_FULL_PATH}`);

    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize Lowdb database:', error);
    throw error;
  }
}