import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    const db = await getDb();
    if (!db.data?.suggestions) {
      return NextResponse.json([]);
    }

    let suggestions = db.data.suggestions;
    if (clientId) {
      suggestions = suggestions.filter((s) => s.clientId === clientId);
    }

    suggestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(suggestions);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar sugestões' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId é obrigatório' }, { status: 400 });
    }

    const db = await getDb();
    if (!db.data?.suggestions) {
      return NextResponse.json({ success: true });
    }

    db.data.suggestions = db.data.suggestions.filter((s) => s.clientId !== clientId);
    await db.write();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao limpar sugestões' }, { status: 500 });
  }
}