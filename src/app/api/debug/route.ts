import { NextResponse } from 'next/server';

export async function GET() {
  const aiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;
  const aiModel = process.env.AI_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';

  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    envCheck: {
      OPENROUTER_API_KEY: {
        exists: !!process.env.OPENROUTER_API_KEY,
        length: process.env.OPENROUTER_API_KEY?.length || 0,
        prefix: process.env.OPENROUTER_API_KEY?.substring(0, 15) + '...' || 'N/A',
      },
      AI_API_KEY: {
        exists: !!process.env.AI_API_KEY,
        length: process.env.AI_API_KEY?.length || 0,
      },
      AI_MODEL: {
        value: aiModel,
      },
      keyUsed: aiKey ? 'OPENROUTER_API_KEY ou AI_API_KEY' : 'NENHUMA',
    },
  };

  if (!aiKey) {
    return NextResponse.json({
      status: 'ERROR',
      message: 'Nenhuma chave de API configurada',
      diagnostics,
    }, { status: 400 });
  }

  try {
    console.log('=== DEBUG AI ===');
    console.log('Chave existe:', !!aiKey);
    console.log('Tamanho da chave:', aiKey.length);
    console.log('Modelo:', aiModel);

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
      statusText: response.statusText,
      bodyPreview: responseText.substring(0, 500),
    };

    if (!response.ok) {
      return NextResponse.json({
        status: 'API_ERROR',
        message: `OpenRouter retornou erro ${response.status}`,
        diagnostics,
      }, { status: 502 });
    }

    const data = JSON.parse(responseText);
    const reply = data.choices?.[0]?.message?.content;

    diagnostics.success = {
      model: data.model,
      reply: reply,
      usage: data.usage,
    };

    return NextResponse.json({
      status: 'OK',
      message: 'IA funcionando corretamente!',
      reply,
      diagnostics,
    });
  } catch (error: any) {
    diagnostics.error = {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 300),
    };

    return NextResponse.json({
      status: 'FETCH_ERROR',
      message: 'Falha ao conectar com OpenRouter',
      diagnostics,
    }, { status: 500 });
  }
}