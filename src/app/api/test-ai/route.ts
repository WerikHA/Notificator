import { NextResponse } from 'next/server';

export async function GET() {
  const aiKey = process.env.AI_API_KEY;
  const aiModel = process.env.AI_MODEL || 'minimax/minimax-m2.5:free';

  if (!aiKey) {
    return NextResponse.json({ 
      error: 'AI_API_KEY não configurada',
      configured: false 
    }, { status: 400 });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AM Dashboard Traffic Test',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'user', content: 'Responda apenas: OK' }
        ],
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Erro ${response.status}`,
        details: responseText.substring(0, 500),
        keyLength: aiKey.length,
        keyPrefix: aiKey.substring(0, 10) + '...'
      }, { status: 502 });
    }

    const data = JSON.parse(responseText);
    const reply = data.choices?.[0]?.message?.content;

    return NextResponse.json({ 
      success: true, 
      reply,
      model: aiModel,
      keyLength: aiKey.length
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Falha na conexão',
      details: error.message 
    }, { status: 500 });
  }
}