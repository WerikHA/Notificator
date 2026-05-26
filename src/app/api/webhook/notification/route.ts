import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validação básica: mensagem é obrigatória
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Campo "message" é obrigatório e deve ser uma string' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const notifications = db.data?.notifications || [];
    const newId = notifications.length > 0 
      ? Math.max(...notifications.map(n => n.id)) + 1 
      : 1;

    const newNotification = {
      id: newId,
      message: body.message.trim(),
      title: body.title || 'Notificação',
      source: body.source || 'external-api',
      timestamp: new Date().toISOString(),
    };

    if (!db.data) {
      db.data = { examples: [], notifications: [] };
    }
    
    db.data.notifications.push(newNotification);
    await db.write();

    return NextResponse.json(
      { 
        success: true, 
        notification: newNotification,
        message: 'Notificação recebida com sucesso' 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao processar notificação:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar notificação' },
      { status: 500 }
    );
  }
}

// Endpoint para testar se a API está funcionando
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhook/notification',
    method: 'POST',
    required_fields: ['message'],
    optional_fields: ['title', 'source'],
    example: {
      message: 'Servidor reiniciado com sucesso',
      title: 'Alerta de Infraestrutura',
      source: 'monitoring-system'
    }
  });
}