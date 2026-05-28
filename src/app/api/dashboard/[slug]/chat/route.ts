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

async function fetchClientData(accountId: string, accessToken: string, period: string) {
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
        reach: parseInt(c.reach || '0'),
        messages: extractMessages(c),
        cpm: parseFloat(c.cpm || '0'),
        ctr: parseFloat(c.ctr || '0'),
        cpc: parseFloat(c.cpc || '0'),
        frequency: parseFloat(c.frequency || '0'),
      }));

    const genderRes = await fetch(
      `${baseUrl}?access_token=${accessToken}&fields=spend,impressions,clicks,actions&time_range=${encodeURIComponent(timeRange)}&breakdowns=gender&filtering=${CAMPAIGN_STATUS_FILTER}`
    );
    const genderJson = await genderRes.json();
    const genderBreakdown = (genderJson.data || []).map((g: any) => ({
      gender: g.gender || 'unknown',
      label: g.gender === 'male' ? 'Masculino' : g.gender === 'female' ? 'Feminino' : 'Desconhecido',
      spend: parseFloat(g.spend || '0'),
      impressions: parseInt(g.impressions || '0'),
      clicks: parseInt(g.clicks || '0'),
      messages: extractMessages(g),
    }));

    const ageRes = await fetch(
      `${baseUrl}?access_token=${accessToken}&fields=spend,impressions,clicks,actions&time_range=${encodeURIComponent(timeRange)}&breakdowns=age&filtering=${CAMPAIGN_STATUS_FILTER}`
    );
    const ageJson = await ageRes.json();
    const ageBreakdown = (ageJson.data || []).map((a: any) => ({
      ageRange: a.age || 'Desconhecido',
      spend: parseFloat(a.spend || '0'),
      impressions: parseInt(a.impressions || '0'),
      clicks: parseInt(a.clicks || '0'),
      messages: extractMessages(a),
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
      genderBreakdown,
      ageBreakdown,
    };
  } catch (error) {
    console.error('Erro ao buscar dados do cliente:', error);
    return null;
  }
}

function buildContext(clientName: string, data: any, period: string) {
  if (!data) {
    return `Você é um assistente de marketing digital especializado em Meta Ads. O cliente "${clientName}" não possui dados disponíveis no momento. Informe ao usuário que não foi possível carregar os dados.`;
  }

  const t = data.totals;
  const periodLabel = period === 'today' ? 'hoje' : period === '7d' ? 'últimos 7 dias' : period === '15d' ? 'últimos 15 dias' : 'últimos 30 dias';

  return `Você é um assistente de marketing digital especializado em Meta Ads. Responda sempre em português brasileiro de forma clara e objetiva. Use formatação com emojis para tornar a resposta mais visual.

O cliente se chama "${clientName}".

Dados da conta de anúncios nos ${periodLabel}:

RESUMO GERAL:
- Investimento total: R$ ${t.spend.toFixed(2)}
- Impressões: ${t.impressions.toLocaleString('pt-BR')}
- Alcance: ${t.reach.toLocaleString('pt-BR')}
- Cliques totais: ${t.clicks.toLocaleString('pt-BR')}
- Mensagens iniciadas pelo Instagram/WhatsApp: ${t.messages}
- CPM (custo por mil impressões): R$ ${t.cpm.toFixed(2)}
- CPC (custo por clique): R$ ${t.cpc.toFixed(2)}
- CTR (taxa de cliques): ${t.ctr.toFixed(2)}%
- Custo por mensagem: R$ ${t.costPerMessage.toFixed(2)}
- Taxa de mensagens (mensagens/cliques): ${t.messageRate.toFixed(2)}%
- Frequência média: ${t.frequency.toFixed(2)}

CAMPANHAS ATIVAS (${data.campaigns.length} campanhas):
${data.campaigns.map((c: any, i: number) => `
${i + 1}. ${c.name}
   Investimento: R$ ${c.spend.toFixed(2)} | Impressões: ${c.impressions.toLocaleString('pt-BR')} | Cliques: ${c.clicks} | Mensagens: ${c.messages}
   CTR: ${c.ctr.toFixed(2)}% | CPC: R$ ${c.cpc.toFixed(2)} | CPM: R$ ${c.cpm.toFixed(2)} | Frequência: ${c.frequency.toFixed(2)}`).join('\n')}

DADOS POR GÊNERO:
${data.genderBreakdown.length > 0 ? data.genderBreakdown.map((g: any) => `- ${g.label}: R$ ${g.spend.toFixed(2)} investido, ${g.impressions.toLocaleString('pt-BR')} impressões, ${g.messages} mensagens`).join('\n') : 'Não disponível'}

DADOS POR FAIXA ETÁRIA:
${data.ageBreakdown.length > 0 ? data.ageBreakdown.map((a: any) => `- ${a.ageRange}: R$ ${a.spend.toFixed(2)} investido, ${a.impressions.toLocaleString('pt-BR')} impressões, ${a.messages} mensagens`).join('\n') : 'Não disponível'}

INSTRUÇÕES:
- Analise os dados e dê insights úteis sobre o desempenho
- Se o usuário perguntar sobre uma métrica específica, destaque-a com detalhes
- Se perguntar "como estão as campanhas", faça um resumo geral com pontos positivos e pontos de atenção
- Sugira melhorias quando achar relevante
- Compare métricas entre campanhas quando fizer sentido
- Use tabelas simples ou listas para organizar informações quando necessário
- Seja direto e não escreva textos muito longos`;
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

    const clientData = await fetchClientData(
      client.metaAdsAccountId,
      client.metaAdsAccessToken,
      period
    );

    const systemPrompt = buildContext(client.name, clientData, period);

    const recentHistory = history.slice(-10).map((h) => ({
      role: h.role,
      content: h.content,
    }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: message },
    ];

    const aiUrl = process.env.AI_API_URL;
    const aiKey = process.env.AI_API_KEY;
    const aiModel = process.env.AI_MODEL || 'mimo-v2.5';

    if (!aiUrl || !aiKey) {
      return NextResponse.json(
        { error: 'API de IA não configurada. Adicione as variáveis AI_API_URL e AI_API_KEY.' },
        { status: 500 }
      );
    }

    const aiRes = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      console.error('Erro na API de IA:', aiRes.status, errorText);
      return NextResponse.json(
        { error: `Erro na API de IA (${aiRes.status})` },
        { status: 502 }
      );
    }

    const aiJson = await aiRes.json();

    const reply = aiJson.choices?.[0]?.message?.content;

    if (!reply) {
      return NextResponse.json({ error: 'A IA não retornou uma resposta válida' }, { status: 500 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Erro no chat:', error);
    return NextResponse.json({ error: 'Erro interno ao processar chat' }, { status: 500 });
  }
}