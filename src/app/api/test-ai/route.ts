import { NextResponse } from 'next/server';

export async function GET() {
  const aiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;
  const aiModel = process.env.AI_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';

  console.log('=== TESTE AI ===');
  console.log('OPENROUTER_API_KEY existe:', !!process.env.OPENROUTER_API_KEY);
  console.log('AI_API_KEY existe:', !!process.env.AI_API_KEY);
  console.log('Chave usada:', aiKey ? `${aiKey.substring(0, 10)}...${aiKey.substring(aiKey.length - 5)}` : 'NENHUMA');
  console.log('Modelo:', aiModel);

  if (!aiKey) {
    return NextResponse.json({ 
      error: 'Nenhuma chave de API configurada',
      configured: false,
      envVars: {
        OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
        AI_API_KEY: !!process.env.AI_API_KEY,
      }
    }, { status: 400 });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AM Dashboard Traffic',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'user', content: 'Responda apenas: OK' }
        ],
      }),
    });

    const responseText = await response.text();
    console.log('Status da resposta:', response.status);
    console.log('Corpo da resposta:', responseText.substring(0, 300));

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Erro ${response.status}`,
        details: responseText.substring(0, 500),
        keyLength: aiKey.length,
        keyPrefix: aiKey.substring(0, 15) + '...'
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