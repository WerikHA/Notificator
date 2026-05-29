import { NextResponse } from 'next/server';

export async function GET() {
  const aiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;
  const aiModel = process.env.AI_MODEL || 'deepseek/deepseek-r1-0528:free';

  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    envCheck: {
      OPENROUTER_API_KEY: {
        exists: !!process.env.OPENROUTER_API_KEY,
        length: process.env.OPENROUTER_API_KEY?.length || 0,
      },
      AI_API_KEY: {
        exists: !!process.env.AI_API_KEY,
        length: process.env.AI_API_KEY?.length || 0,
      },
      AI_MODEL: {
        value: aiModel,
        fromEnv: !!process.env.AI_MODEL,
      },
    },
  };

  if (!aiKey) {
    return NextResponse.json({
      status: 'ERROR',
      message: 'Nenhuma chave de API configurada. Defina OPENROUTER_API_KEY ou AI_API_KEY.',
      diagnostics,
    }, { status: 400 });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:32107',
        'X-Title': 'AM Dashboard Traffic',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'user', content: 'Responda apenas: OK' }
        ],
        max_tokens: 10,
      }),
    });

    const responseText = await response.text();
    
    diagnostics.apiResponse = {
      status: response.status,
      bodyPreview: responseText.substring(0, 500),
    };

    if (!response.ok) {
      return NextResponse.json({
        status: 'API_ERROR',
        message: `OpenRouter retornou erro ${response.status}. Modelo: "${aiModel}"`,
        diagnostics,
      }, { status: 502 });
    }

    const data = JSON.parse(responseText);
    const reply = data.choices?.[0]?.message?.content;

    return NextResponse.json({
      status: 'OK',
      message: 'IA funcionando!',
      reply,
      diagnostics,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'FETCH_ERROR',
      message: 'Falha ao conectar com OpenRouter',
      diagnostics: { ...diagnostics, error: error.message },
    }, { status: 500 });
  }
}