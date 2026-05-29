import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

const MESSAGE_ACTION_TYPE = 'onsite_conversion.total_messaging_connection';

function extractMessages(data: any): number {
  let count = 0;
  if (data.actions && Array.isArray(data.actions)) {
    data.actions.forEach((a: any) => {
      if (a.action_type === MESSAGE_ACTION_TYPE) {
        count += parseInt(a.value || '0');
      }
    });
  }
  if (count === 0 && data.results) {
    count = parseInt(data.results || '0');
  }
  return count;
}

function getDateRange(period: string) {
  const now = new Date();
  let since = new Date();
  switch (period) {
    case 'today': since = new Date(now); break;
    case '7d': since.setDate(now.getDate() - 7); break;
    case '15d': since.setDate(now.getDate() - 15); break;
    case '30d': since.setDate(now.getDate() - 30); break;
    default: since.setDate(now.getDate() - 30);
  }
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  return `{"since":"${formatDate(since)}","until":"${formatDate(now)}"}`;
}

const CAMPAIGN_STATUS_FILTER = encodeURIComponent(JSON.stringify([
  { "field": "campaign.effective_status", "operator": "NOT_IN", "value": ["DELETED", "ARCHIVED"] }
]));

async function fetchClientDataForPeriod(accountId: string, accessToken: string, period: string) {
  const formattedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const baseUrl = `https://graph.facebook.com/v19.0/${formattedId}/insights`;
  const timeRange = getDateRange(period);
  const baseFields = 'spend,impressions,reach,clicks,frequency,actions,results,cpm,cpc,ctr';

  try {
    const totalsRes = await fetch(
      `${baseUrl}?access_token=${accessToken}&level=account&fields=${baseFields}&time_range=${encodeURIComponent(timeRange)}`
    );
    const totalsJson = await totalsRes.json();

    if (!totalsJson.data || totalsJson.data.length === 0) {
      return null;
    }

    const t = totalsJson.data[0];
    const msgs = extractMessages(t);
    const spend = parseFloat(t.spend || '0');
    const impressions = parseInt(t.impressions || '0');
    const reach = parseInt(t.reach || '0');
    const clicks = parseInt(t.clicks || '0');

    const campRes = await fetch(
      `${baseUrl}?access_token=${accessToken}&level=campaign&fields=campaign_id,campaign_name,${baseFields}&time_range=${encodeURIComponent(timeRange)}&limit=50&filtering=${CAMPAIGN_STATUS_FILTER}`
    );
    const campJson = await campRes.json();

    const campaigns = (campJson.data || [])
      .filter((c: any) => parseFloat(c.spend || '0') > 0 || parseInt(c.impressions || '0') > 0)
      .map((c: any) => ({
        name: c.campaign_name,
        spend: parseFloat(c.spend || '0'),
        impressions: parseInt(c.impressions || '0'),
        clicks: parseInt(c.clicks || '0'),
        messages: extractMessages(c),
        ctr: parseFloat(c.ctr || '0'),
      }));

    return {
      totals: {
        spend,
        impressions,
        reach,
        clicks,
        messages: msgs,
        frequency: parseFloat(t.frequency || '0'),
        cpm: parseFloat(t.cpm || '0'),
        cpc: parseFloat(t.cpc || '0'),
        ctr: parseFloat(t.ctr || '0'),
        costPerMessage: msgs > 0 ? spend / msgs : 0,
        messageRate: clicks > 0 ? (msgs / clicks) * 100 : 0,
      },
      campaigns,
    };
  } catch (error) {
    console.error(`Erro ao buscar dados (${period}):`, error);
    return null;
  }
}

function buildContext(clientName: string, data30d: any, data15d: any, data7d: any) {
  const hasData = data30d || data15d || data7d;

  if (!hasData) {
    return `Você é um assistente de marketing para Meta Ads. O cliente "${clientName}" não possui dados. Informe que não há dados disponíveis.`;
  }

  let ctx = `Você é um analista de Meta Ads. Responda em português brasileiro, de forma clara e objetiva. Use emojis.

Cliente: "${clientName}"

`;

  if (data30d) {
    const t = data30d.totals;
    ctx += `📊 ÚLTIMOS 30 DIAS:
💰 R$ ${t.spend.toFixed(2)} | 👁️ ${t.impressions} imp | 👆 ${t.clicks} cliques | 💬 ${t.messages} msgs
📈 CTR: ${t.ctr.toFixed(2)}% | CPM: R$ ${t.cpm.toFixed(2)} | CPC: R$ ${t.cpc.toFixed(2)}
💲 Custo/msg: R$ ${t.costPerMessage.toFixed(2)} | Freq: ${t.frequency.toFixed(2)}

`;
    if (data30d.campaigns.length > 0) {
      ctx += `Campanhas:\n`;
      data30d.campaigns.slice(0, 5).forEach((c: any, i: number) => {
        ctx += `${i + 1}. ${c.name} - R$${c.spend.toFixed(2)} | ${c.messages} msgs | CTR ${c.ctr.toFixed(2)}%\n`;
      });
      ctx += '\n';
    }
  }

  if (data15d) {
    const t = data15d.totals;
    ctx += `📊 ÚLTIMOS 15 DIAS:
💰 R$ ${t.spend.toFixed(2)} | 👁️ ${t.impressions} imp | 👆 ${t.clicks} cliques | 💬 ${t.messages} msgs
📈 CTR: ${t.ctr.toFixed(2)}% | Custo/msg: R$ ${t.costPerMessage.toFixed(2)}

`;
  }

  if (data7d) {
    const t = data7d.totals;
    ctx += `📊 ÚLTIMOS 7 DIAS:
💰 R$ ${t.spend.toFixed(2)} | 👁️ ${t.impressions} imp | 👆 ${t.clicks} cliques | 💬 ${t.messages} msgs
📈 CTR: ${t.ctr.toFixed(2)}% | Custo/msg: R$ ${t.costPerMessage.toFixed(2)}

`;
  }

  ctx += `REGRAS:
- Se a pergunta for geral, dê um resumo rápido e pergunte qual período quer detalhes
- Compare períodos quando fizer sentido
- Seja direto, máximo 300 palavras`;

  return ctx;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { message, period = '30d', history = [] } = body as {
      message: string;
      period?: string;
      history?: ChatMessage[];
    };

    if (!message) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    const db = await getDb();
    const client = db.data?.clients?.find((c) => c.slug === slug);

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const [data30d, data15d, data7d] = await Promise.all([
      fetchClientDataForPeriod(client.metaAdsAccountId, client.metaAdsAccessToken, '30d'),
      fetchClientDataForPeriod(client.metaAdsAccountId, client.metaAdsAccessToken, '15d'),
      fetchClientDataForPeriod(client.metaAdsAccountId, client.metaAdsAccessToken, '7d'),
    ]);

    const systemPrompt = buildContext(client.name, data30d, data15d, data7d);

    const recentHistory = history.slice(-6).map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }));

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...recentHistory,
      { role: 'user' as const, content: message },
    ];

    const aiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;
    const aiModel = process.env.AI_MODEL || 'deepseek/deepseek-r1-0528:free';

    if (!aiKey) {
      return NextResponse.json(
        { error: 'Chave de API não configurada. Adicione OPENROUTER_API_KEY ou AI_API_KEY nas variáveis de ambiente.' },
        { status: 500 }
      );
    }

    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiKey}`,
        'HTTP-Referer': 'http://localhost:32107',
        'X-Title': 'AM Dashboard Traffic',
      },
      body: JSON.stringify({
        model: aiModel,
        messages,
      }),
    });

    const responseText = await aiRes.text();

    if (!aiRes.ok) {
      console.error('Erro OpenRouter:', aiRes.status, responseText);
      
      if (aiRes.status === 429) {
        return NextResponse.json(
          { error: 'Limite de requisições atingido. Aguarde e tente novamente.' },
          { status: 429 }
        );
      }

      if (aiRes.status === 404) {
        return NextResponse.json(
          { error: `Modelo "${aiModel}" não encontrado no OpenRouter. Verifique o nome do modelo na variável AI_MODEL.` },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: `Erro da API (${aiRes.status}). Verifique a chave de API.` },
        { status: 502 }
      );
    }

    const aiJson = JSON.parse(responseText);
    const reply = aiJson.choices?.[0]?.message?.content;

    if (!reply) {
      return NextResponse.json(
        { error: 'A IA não retornou resposta.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Erro no chat:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}