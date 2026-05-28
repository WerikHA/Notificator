import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Senha é obrigatória' }, { status: 400 });
    }

    const db = await getDb();
    const client = db.data?.clients?.find((c) => c.slug === slug);

    if (!client) {
      return NextResponse.json({ error: 'Dashboard não encontrado' }, { status: 404 });
    }

    if (!client.chatPassword) {
      return NextResponse.json({ error: 'Senha não configurada para este dashboard' }, { status: 400 });
    }

    if (password !== client.chatPassword) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}