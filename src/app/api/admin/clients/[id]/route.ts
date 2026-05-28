import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const client = db.data?.clients?.find((c) => c.id === id);

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar cliente' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = await getDb();

    if (!db.data?.clients) {
      return NextResponse.json({ error: 'Nenhum cliente encontrado' }, { status: 404 });
    }

    const index = db.data.clients.findIndex((c) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const { name, metaAdsAccountId, metaAdsAccessToken, chatPassword, isActive } = body;
    
    if (name !== undefined) db.data.clients[index].name = name;
    if (metaAdsAccountId !== undefined) db.data.clients[index].metaAdsAccountId = metaAdsAccountId;
    if (metaAdsAccessToken !== undefined) db.data.clients[index].metaAdsAccessToken = metaAdsAccessToken;
    if (chatPassword !== undefined) {
      if (chatPassword.length > 0 && chatPassword.length < 4) {
        return NextResponse.json({ error: 'A senha do chat deve ter pelo menos 4 caracteres' }, { status: 400 });
      }
      db.data.clients[index].chatPassword = chatPassword;
    }
    if (isActive !== undefined) db.data.clients[index].isActive = isActive;

    await db.write();
    return NextResponse.json(db.data.clients[index]);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    if (!db.data?.clients) {
      return NextResponse.json({ error: 'Nenhum cliente encontrado' }, { status: 404 });
    }

    const index = db.data.clients.findIndex((c) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    db.data.clients.splice(index, 1);
    await db.write();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar cliente' }, { status: 500 });
  }
}