import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';
import crypto from 'crypto';

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
}

export async function GET() {
  try {
    const db = await getDb();
    const clients = db.data?.clients || [];
    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, metaAdsAccountId, metaAdsAccessToken } = body;

    if (!name || !metaAdsAccountId || !metaAdsAccessToken) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    const db = await getDb();
    if (!db.data) {
      db.data = { examples: [], clients: [] };
    }
    if (!db.data.clients) {
      db.data.clients = [];
    }

    const newClient = {
      id: crypto.randomUUID(),
      name,
      slug: generateSlug(name),
      metaAdsAccountId,
      metaAdsAccessToken,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    db.data.clients.push(newClient);
    await db.write();

    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 });
  }
}