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

async function fetchCampaignData(accessToken: string, accountId: string) {
  const formattedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const baseUrl = `https://graph.facebook.com/v19.0/${formattedId}/insights`;
  const timeRange = getDateRange('30d');
  const baseFields = 'spend,impressions,reach,clicks,frequency,actions,results,cpm,cpc,ctr';

  const totalsRes = await fetch(
    `${baseUrl}?access_token=${accessToken}&level=account&fields=${baseFields}&time_range=${encodeURIComponent(timeRange)}`
  );
  const totalsJson = await totalsRes.json();
  const accountTotals = totalsJson.data?.[0] || {};

  const campRes = await fetch(
    `${baseUrl}?access_token=${accessToken}&level=campaign&fields=campaign_id,campaign_name,objective,${baseFields}&time_range=${encodeURIComponent(timeRange)}&limit=50&filtering=${CAMPAIGN_STATUS_FILTER}`
  );
  const campJson = await campRes.json();

  const campaigns = (campJson.data || [])
    .filter((c: any) => parseFloat(c.spend || '0') > 0 || parseInt(c.impressions || '0') > 0)
    .map((c: any) => ({
      id: c.campaign_id,
      name: c.campaign_name,
      objective: c.objective || 'UNKNOWN',
      status: c.effective_status || 'ACTIVE',
      spend: parseFloat(c.spend || '0'),
      impressions: parseInt(c.impressions || '0'),
      clicks: parseInt(c.clicks || '0'),
      reach: parseInt(c.reach || '0'),
      messages: extractMessages(c),
      cpm: parseFloat(c.cpm || '0'),
      cpc: parseFloat(c.cpc || '0'),
      ctr: parseFloat(c.ctr || '0'),
      frequency: parseFloat(c.frequency || '0'),
    }));

  return {
    accountTotals: {
      spend: parseFloat(accountTotals.spend || '0'),
      impressions: parseInt(accountTotals.impressions || '0'),
      clicks: parseInt(accountTotals.clicks || '0'),
      messages: extractMessages(accountTotals),
      cpm: parseFloat(accountTotals.cpm || '0'),
      cpc: parseFloat(accountTotals.cpc || '0'),
      ctr: parseFloat(accountTotals.ctr || '0'),
    },
    campaigns,
  };
}

async function generateAISuggestions(clientName: string, accountData: any) {
  const aiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;
  const aiModel = process.env.AI_MODEL || 'deepseek/deepseek-r1-0528:free';

  if (!aiKey) {
    throw new Error('Chave de API não configurada');
  }

  const at = accountData.accountTotals;
  const campaignsText = accountData.campaigns.map((c: any, i: number) => {
    const avgCpm = at.spend > 0 ? at.spend / (at.impressions / 1000) : 0;
    const efficiency = c.cpm > 0 ? (avgCpm / c.cpm * 100).toFixed(0) : '0';
    const objLabel = (c.objective || 'UNKNOWN').replace('OUTCOME_', '');
    return `${i + 1}. "${c.name}" (ID: ${c.id})
   Objetivo: ${objLabel} | Status: ${c.status} | Gasto: R$${(c.spend || 0).toFixed(2)} | Imp: ${c.impressions} | Cliques: ${c.clicks}
   Mensagens: ${c.messages} | CTR: ${(c.ctr || 0).toFixed(2)}% | CPC: R$${(c.cpc || 0).toFixed(2)} | CPM: R$${(c.cpm || 0).toFixed(2)}
   Freq: ${(c.frequency || 0).toFixed(2)} | Eficiência relativa: ${efficiency}%`;
  }).join('\n\n');

  const prompt = `Analise as campanhas Meta Ads da conta "${clientName}" e gere sugestões de otimização.
Considere o OBJETIVO de cada campanha ao avaliar as métricas.

📊 MÉTRICAS DA CONTA (últimos 30 dias):
💰 Total gasto: R$${(at.spend || 0).toFixed(2)}
👁️ Impressões: ${at.impressions || 0} | 👆 Cliques: ${at.clicks || 0}
💬 Mensagens: ${at.messages || 0} | CPM: R$${(at.cpm || 0).toFixed(2)} | CPC: R$${(at.cpc || 0).toFixed(2)}
📈 CTR: ${(at.ctr || 0).toFixed(2)}%

📋 CAMPANHAS (com objetivo):
${campaignsText}

REGRAS POR OBJETIVO:
- AWARENESS/Reconhecimento: foque em CPM baixo e alcance alto. CTR não é prioridade. Se CPM > R$15, sugira diminuir.
- ENGAGEMENT/Engajamento: foque em CTR e mensagens. Custo por msg importa. CTR < 0.5% é ruim.
- TRAFFIC/Tráfego: foque em CPC baixo e CTR alto. CPC > R$5 é caro.
- LEADS: foque em custo por lead (mensagem) baixo. Se custo/msg > R$15, sugira pausar.
- SALES/Vendas: foque em ROAS e custo por conversão.
- APP_PROMOTION/App: foque em CPC e CTR.

IMPORTANTE: Responda APENAS com JSON válido, sem markdown, sem \`\`\`, sem texto antes ou depois.
O JSON deve ter exatamente esta estrutura:
{
  "suggestions": [
    {
      "campaignId": "ID_DA_CAMPANHA",
      "campaignName": "NOME_DA_CAMPANHA",
      "objective": "OBJETIVO",
      "summary": "Resumo de 1-2 frases sobre o desempenho considerando o objetivo",
      "actions": [
        {
          "type": "pause ou resume ou increase_budget ou decrease_budget",
          "title": "Título curto da ação",
          "description": "Descrição detalhada do porquê e o que fazer",
          "parameters": {}
        }
      ]
    }
  ]
}

Regras gerais:
- Para cada campanha, gere 1-3 ações sugeridas baseadas no objetivo
- Para increase_budget, parameters deve ter {"budget_change_percent": 20}
- Para decrease_budget, parameters deve ter {"budget_change_percent": -20}
- Para pause/resume, parameters pode ser {}
- NÃO inclua a campanha se não tiver sugestão relevante`;

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
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    }),
  });

  if (!aiRes.ok) {
    const text = await aiRes.text();
    throw new Error(`Erro IA (${aiRes.status}): ${text.substring(0, 200)}`);
  }

  const aiJson = await aiRes.json();
  const content = aiJson.choices?.[0]?.message?.content || '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('IA não retornou JSON válido');
  }

  return JSON.parse(jsonMatch[0]);
}

export async function POST(request: NextRequest) {
  try {
    const { clientId } = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: 'clientId é obrigatório' }, { status: 400 });
    }

    const db = await getDb();
    if (!db.data) {
      db.data = { examples: [], clients: [], settings: { metaAccessToken: '' }, suggestions: [], overviewCache: null };
    }
    if (!db.data.suggestions) {
      db.data.suggestions = [];
    }

    const client = db.data.clients?.find((c) => c.id === clientId);
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const accountData = await fetchCampaignData(client.metaAdsAccessToken, client.metaAdsAccountId);

    if (accountData.campaigns.length === 0) {
      return NextResponse.json({ error: 'Nenhuma campanha encontrada com gastos no período' }, { status: 404 });
    }

    const aiResult = await generateAISuggestions(client.name, accountData);

    const newSuggestions: any[] = [];

    if (aiResult.suggestions && Array.isArray(aiResult.suggestions)) {
      for (const aiSugg of aiResult.suggestions) {
        const campaign = accountData.campaigns.find((c: any) => c.id === aiSugg.campaignId);

        const items = (aiSugg.actions || []).map((action: any) => ({
          id: crypto.randomUUID(),
          type: action.type,
          title: action.title,
          description: action.description,
          parameters: action.parameters || {},
          status: 'pending' as const,
        }));

        if (items.length > 0) {
          const suggestion = {
            id: crypto.randomUUID(),
            clientId: client.id,
            clientName: client.name,
            campaignId: aiSugg.campaignId,
            campaignName: aiSugg.campaignName || campaign?.name || 'Campanha',
            objective: aiSugg.objective || campaign?.objective || 'UNKNOWN',
            summary: aiSugg.summary,
            suggestions: items,
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
          };

          newSuggestions.push(suggestion);
        }
      }
    }

    db.data.suggestions = [
      ...db.data.suggestions.filter((s) => s.clientId !== clientId),
      ...newSuggestions,
    ];

    await db.write();

    return NextResponse.json({ suggestions: newSuggestions, total: newSuggestions.length });
  } catch (error: any) {
    console.error('Erro ao gerar sugestões:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}