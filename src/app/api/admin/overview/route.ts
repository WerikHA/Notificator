` blocks inside the code output.

I need to rewrite the file completely.</think>O arquivo ainda está corrompido no disco. Vou reescrevê-lo completamente:

<dyad-write path="src/app/api/admin/overview/route.ts" description="Reescrevendo a API de overview limpa e funcional">
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

function getDateRange() {
  const now = new Date();
  const since = new Date();
  since.setDate(now.getDate() - 30);
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  return `{"since":"${formatDate(since)}","until":"${formatDate(now)}"}`;
}

const CAMPAIGN_STATUS_FILTER = encodeURIComponent(JSON.stringify([
  { "field": "campaign.effective_status", "operator": "NOT_IN", "value": ["DELETED", "ARCHIVED"] }
]));

async function fetchClientMetrics(accessToken: string, accountId: string) {
  const formattedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const baseUrl = `https://graph.facebook.com/v19.0/${formattedId}/insights`;
  const timeRange = getDateRange();
  const baseFields = 'spend,impressions,reach,clicks,actions,results,cpc,cpm,ctr,frequency';

  try {
    const totalsRes = await fetch(
      `${baseUrl}?access_token=${accessToken}&level=account&fields=${baseFields}&time_range=${encodeURIComponent(timeRange)}`,
      { signal: AbortSignal.timeout(15000) }
    );
    const totalsJson = await totalsRes.json();

    if (totalsJson.error) {
      return { error: totalsJson.error.message, status: 'error' as const };
    }

    if (!totalsJson.data || totalsJson.data.length === 0) {
      return { totals: null, campaigns: [], status: 'no-data' as const };
    }

    const t = totalsJson.data[0];
    const msgs = extractMessages(t);
    const spend = parseFloat(t.spend || '0');
    const impressions = parseInt(t.impressions || '0');
    const reach = parseInt(t.reach || '0');
    const clicks = parseInt(t.clicks || '0');

    const totals = {
      spend,
      impressions,
      reach,
      clicks,
      messages: msgs,
      cpm: parseFloat(t.cpm || '0'),
      cpc: parseFloat(t.cpc || '0'),
      ctr: parseFloat(t.ctr || '0'),
      costPerMessage: msgs > 0 ? spend / msgs : 0,
    };

    const campRes = await fetch(
      `${baseUrl}?access_token=${accessToken}&level=campaign&fields=campaign_id,campaign_name,${baseFields}&time_range=${encodeURIComponent(timeRange)}&limit=50&filtering=${CAMPAIGN_STATUS_FILTER}`,
      { signal: AbortSignal.timeout(15000) }
    );
    const campJson = await campRes.json();

    const campaigns = (campJson.data || [])
      .filter((c: any) => parseFloat(c.spend || '0') > 0 || parseInt(c.impressions || '0') > 0)
      .map((c: any) => ({
        id: c.campaign_id,
        name: c.campaign_name,
        spend: parseFloat(c.spend || '0'),
        impressions: parseInt(c.impressions || '0'),
        clicks: parseInt(c.clicks || '0'),
        messages: extractMessages(c),
        cpm: parseFloat(c.cpm || '0'),
        cpc: parseFloat(c.cpc || '0'),
        ctr: parseFloat(c.ctr || '0'),
      }));

    return { totals, campaigns, status: 'ok' as const };
  } catch (error: any) {
    return { error: error.name === 'TimeoutError' ? 'Timeout' : 'Erro de conexao', status: 'error' as const };
  }
}

async function generateQuickSuggestions(clientName: string, totals: any, campaigns: any[]) {
  const aiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;
  const aiModel = process.env.AI_MODEL || 'deepseek/deepseek-r1-0528:free';

  if (!aiKey || !totals || campaigns.length === 0) return null;

  const campaignsText = campaigns.slice(0, 8).map((c: any, i: number) => {
    return `${i + 1}. "${c.name}" - R$${c.spend.toFixed(2)} | ${c.messages} msgs | CTR ${c.ctr.toFixed(2)}% | CPC R$${c.cpc.toFixed(2)} | CPM R$${c.cpm.toFixed(2)}`;
  }).join('\n');

  const prompt = [
    `Analise as campanhas Meta Ads de "${clientName}" e gere um resumo executivo + dicas.`,
    ``,
    `METRICAS (30 dias):`,
    `Total gasto: R$ ${totals.spend.toFixed(2)}`,
    `Impressoes: ${totals.impressions}`,
    `Cliques: ${totals.clicks}`,
    `Mensagens: ${totals.messages}`,
    `CTR: ${totals.ctr.toFixed(2)}%`,
    `CPM: R$ ${totals.cpm.toFixed(2)}`,
    `CPC: R$ ${totals.cpc.toFixed(2)}`,
    `Custo por mensagem: R$ ${totals.costPerMessage.toFixed(2)}`,
    ``,
    `CAMPANHAS:`,
    campaignsText,
    ``,
    `IMPORTANTE: Responda APENAS com JSON valido, sem markdown.`,
    `{`,
    `  "summary": "Resumo executivo de 2-3 frases sobre o desempenho geral",`,
    `  "healthScore": 75,`,
    `  "tips": [`,
    `    { "text": "Dica especifica de melhoria", "priority": "alta ou media ou baixa" }`,
    `  ]`,
    `}`,
    ``,
    `Regras:`,
    `- healthScore de 0 a 100 baseado no desempenho`,
    `- Gere 3-5 dicas relevantes e especificas`,
    `- Prioridade alta para problemas criticos (CPM > R$15, CTR < 0.5%)`,
    `- Priorize custo por mensagem como metrica principal`,
  ].join('\n');

  try {
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
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!aiRes.ok) return null;

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    const db = await getDb();
    const clients = db.data?.clients || [];

    if (!db.data) {
      db.data = { examples: [], clients: [], settings: { metaAccessToken: '' }, suggestions: [] };
    }
    if (!db.data.suggestions) {
      db.data.suggestions = [];
    }

    const overview = await Promise.all(
      clients.map(async (client) => {
        const existingSuggestions = (db.data!.suggestions || []).filter((s: any) => {
          return s.clientId === client.id && 'healthScore' in s && 'tips' in s;
        });

        if (!client.isActive) {
          return {
            client,
            metrics: null,
            campaigns: [],
            suggestions: existingSuggestions,
            status: 'inactive',
          };
        }

        const metricsResult = await fetchClientMetrics(client.metaAdsAccessToken, client.metaAdsAccountId);

        let aiSuggestions = existingSuggestions;

        if (metricsResult.status === 'ok' && metricsResult.totals && metricsResult.campaigns.length > 0) {
          if (existingSuggestions.length === 0 || refresh) {
            const aiResult = await generateQuickSuggestions(
              client.name,
              metricsResult.totals,
              metricsResult.campaigns
            );

            if (aiResult) {
              const newSuggestions = (aiResult.tips || []).map((tip: any) => ({
                id: crypto.randomUUID(),
                text: tip.text,
                priority: tip.priority || 'media',
                status: 'pending' as const,
              }));

              const summaryEntry = {
                id: crypto.randomUUID(),
                clientId: client.id,
                clientName: client.name,
                summary: aiResult.summary || '',
                healthScore: aiResult.healthScore || 50,
                tips: newSuggestions,
                createdAt: new Date().toISOString(),
              };

              db.data!.suggestions = [
                ...(db.data!.suggestions || []).filter((s: any) => !(s.clientId === client.id && 'healthScore' in s && 'tips' in s)),
                summaryEntry as any,
              ];

              aiSuggestions = [summaryEntry as any];
            }
          }
        }

        return {
          client,
          metrics: metricsResult.totals || null,
          campaigns: metricsResult.campaigns || [],
          suggestions: aiSuggestions,
          status: metricsResult.status,
          error: metricsResult.error,
        };
      })
    );

    await db.write();

    return NextResponse.json({ clients: overview });
  } catch (error) {
    console.error('Erro ao buscar overview:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}