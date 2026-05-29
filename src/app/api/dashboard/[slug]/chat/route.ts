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
    console.error(`Erro ao buscar dados do cliente (${period}):`, error);
    return null;
  }
}

function formatPeriodContext(periodLabel: string, data: any) {
  if (!data) return `📊 Dados dos ${periodLabel}: Não disponíveis\n`;

  const t = data.totals;
  return `📊 DADOS DOS ${periodLabel.toUpperCase()}:
💰 Investimento total: R$ ${t.spend.toFixed(2)}
👁️ Impressões: ${t.impressions.toLocaleString('pt-BR')}
🎯 Alcance: ${t.reach.toLocaleString('pt-BR')}
👆 Cliques: ${t.clicks.toLocaleString('pt-BR')}
💬 Mensagens: ${t.messages}
📈 CPM: R$ ${t.cpm.toFixed(2)} | CPC: R$ ${t.cpc.toFixed(2)} | CTR: ${t.ctr.toFixed(2)}%
💲 Custo por mensagem: R$ ${t.costPerMessage.toFixed(2)}
🔄 Frequência: ${t.frequency.toFixed(2)}

CAMPANHAS:
${data.campaigns.map((c: any, i: number) => `  ${i + 1}. ${c.name} — R$ ${c.spend.toFixed(2)} | ${c.messages} msgs | CTR: ${c.ctr.toFixed(2)}%`).join('\n') || '  Nenhuma campanha com dados'}

`;
}

function buildContext(clientName: string, allData: Record<string, any>, selectedPeriod: string) {
  const periodLabels: Record<string, string> = {
    '7d': 'últimos 7 dias',
    '15d': 'últimos 15 dias',
    '30d': 'últimos 30 dias',
    'today': 'hoje',
  };

  const hasAnyData = Object.values(allData).some((d) => d !== null);

  if (!hasAnyData) {
    return `Você é um assistente de marketing digital especializado em Meta Ads. O cliente "${clientName}" não possui dados disponíveis no momento. Informe ao usuário que não foi possível carregar os dados e sugira verificar a configuração da conta.`;
  }

  let context = `Você é um assistente de marketing digital especializado em Meta Ads. Responda sempre em português brasileiro de forma clara, objetiva e amigável. Use emojis para tornar a resposta mais visual e organizada.

O cliente se chama "${clientName}".

⚠️ REGRAS IMPORTANTES SOBRE PERÍODOS:
- Você tem acesso aos dados de TRÊS períodos: últimos 7 dias, últimos 15 dias e últimos 30 dias.
- Quando o cliente perguntar sobre "as campanhas", "como estão", "métricas" ou qualquer coisa geral SEM especificar um período, você DEVE:
  1. Apresentar um RESUMO RÁPIDO dos últimos 30 dias
  2. Perguntar qual período ele gostaria de analisar com mais detalhes:
     - "📅 Para qual período você gostaria de ver os detalhes?"
     - Opções: "Últimos 7 dias", "Últimos 15 dias" ou "Últimos 30 dias"
- Quando o cliente escolher um período, apresente os dados daquele período específico com mais detalhes
- Compare os períodos quando fizer sentido (ex: "Nos últimos 7 dias o investimento foi R$ X, enquanto nos últimos 30 dias foi R$ Y")
- Se o cliente perguntar sobre um período específico diretamente, vá direto para os dados daquele período

DADOS POR PERÍODO:

`;

  const periodOrder = ['30d', '15d', '7d'];
  for (const p of periodOrder) {
    const label = periodLabels[p] || p;
    context += formatPeriodContext(label, allData[p]);
    context += '---\n\n';
  }

  context += `INSTRUÇÕES GERAIS:
- Analise os dados e dê insights úteis sobre o desempenho
- Seja direto e não escreva textos muito longos
- Use tabelas simples ou listas para organizar informações
- Sugira melhorias quando achar relevante
- Compare métricas entre campanhas quando fizer sentido
- Compare períodos quando o usuário demonstrar interesse
- Sempre pergunte o período quando o usuário fizer perguntas gerais`;

  return context;
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

    // Busca dados de TODOS os períodos para o contexto da IA
    const [data30d, data15d, data7d] = await Promise.all([
      fetchClientDataForPeriod(client.metaAdsAccountId, client.metaAdsAccessToken, '30d'),
      fetchClientDataForPeriod(client.metaAdsAccountId, client.metaAdsAccessToken, '15d'),
      fetchClientDataForPeriod(client.metaAdsAccountId, client.metaAdsAccessToken, '7d'),
    ]);

    const allData: Record<string, any> = {
      '7d': data7d,
      '15d': data15d,
      '30d': data30d,
    };

    const systemPrompt = buildContext(client.name, allData, period);

    const recentHistory = history.slice(-10).map((h) => ({
      role: h.role,
      content: h.content,
    }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: message },
    ];

    // Configuração do OpenRouter
    const aiKey = process.env.AI_API_KEY;
    const aiModel = process.env.AI_MODEL || 'minimax/minimax-m2.5:free';
    const openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

    if (!aiKey) {
      return NextResponse.json(
        { error: 'Chave de API do OpenRouter não configurada. Adicione a variável AI_API_KEY.' },
        { status: 500 }
      );
    }

    const aiRes = await fetch(openrouterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'AM Dashboard Traffic',
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
      console.error('Erro na API do OpenRouter:', aiRes.status, errorText);
      return NextResponse.json(
        { error: `Erro na API do OpenRouter (${aiRes.status})` },
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