import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

const MSG_TYPE = 'onsite_conversion.total_messaging_connection';

function extractMessages(data: any): number {
  let count = 0;
  if (data.actions && Array.isArray(data.actions)) {
    data.actions.forEach((a: any) => {
      if (a.action_type === MSG_TYPE) {
        count += parseInt(a.value || '0');
      }
    });
  }
  if (count === 0 && data.results) {
    count = parseInt(data.results || '0');
  }
  return count;
}

function makeDateRange() {
  const now = new Date();
  const since = new Date();
  since.setDate(now.getDate() - 30);
  const f = (d: Date) => d.toISOString().split('T')[0];
  return JSON.stringify({ since: f(since), until: f(now) });
}

const CAMP_FILTER = encodeURIComponent(JSON.stringify([
  { field: 'campaign.effective_status', operator: 'NOT_IN', value: ['DELETED', 'ARCHIVED'] }
]));

async function fetchClientMetrics(accessToken: string, accountId: string) {
  const fid = accountId.startsWith('act_') ? accountId : 'act_' + accountId;
  const base = 'https://graph.facebook.com/v19.0/' + fid + '/insights';
  const tr = makeDateRange();
  const fields = 'spend,impressions,reach,clicks,actions,results,cpc,cpm,ctr,frequency';

  try {
    const tUrl = base + '?access_token=' + accessToken + '&level=account&fields=' + fields + '&time_range=' + encodeURIComponent(tr);
    const tRes = await fetch(tUrl, { signal: AbortSignal.timeout(15000) });
    const tJson = await tRes.json();
    if (tJson.error) return { error: tJson.error.message, status: 'error' as const };
    if (!tJson.data || tJson.data.length === 0) return { totals: null, campaigns: [], status: 'no-data' as const };

    const t = tJson.data[0];
    const msgs = extractMessages(t);
    const spend = parseFloat(t.spend || '0');
    const impressions = parseInt(t.impressions || '0');
    const reach = parseInt(t.reach || '0');
    const clicks = parseInt(t.clicks || '0');

    const totals = {
      spend, impressions, reach, clicks, messages: msgs,
      cpm: parseFloat(t.cpm || '0'),
      cpc: parseFloat(t.cpc || '0'),
      ctr: parseFloat(t.ctr || '0'),
      costPerMessage: msgs > 0 ? spend / msgs : 0,
    };

    const cUrl = base + '?access_token=' + accessToken + '&level=campaign&fields=campaign_id,campaign_name,' + fields + '&time_range=' + encodeURIComponent(tr) + '&limit=50&filtering=' + CAMP_FILTER;
    const cRes = await fetch(cUrl, { signal: AbortSignal.timeout(15000) });
    const cJson = await cRes.json();

    const campaigns = (cJson.data || [])
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
  } catch {
    return { error: 'Erro de conexao', status: 'error' as const };
  }
}

async function generateQuickSuggestions(clientName: string, totals: any, campaigns: any[]) {
  const aiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;
  const aiModel = process.env.AI_MODEL || 'deepseek/deepseek-r1-0528:free';
  if (!aiKey || !totals || campaigns.length === 0) return null;

  const campLines: string[] = [];
  campaigns.slice(0, 8).forEach((c: any, i: number) => {
    campLines.push(
      String(i + 1) + '. ' + c.name +
      ' - R$' + c.spend.toFixed(2) +
      ' | ' + c.messages + ' msgs' +
      ' | CTR ' + c.ctr.toFixed(2) + '%' +
      ' | CPC R$' + c.cpc.toFixed(2) +
      ' | CPM R$' + c.cpm.toFixed(2)
    );
  });

  const p: string[] = [];
  p.push('Analise as campanhas Meta Ads de "' + clientName + '" e gere um resumo + dicas.');
  p.push('');
  p.push('METRICAS (30 dias):');
  p.push('Total gasto: R$ ' + totals.spend.toFixed(2));
  p.push('Impressoes: ' + totals.impressions);
  p.push('Cliques: ' + totals.clicks);
  p.push('Mensagens: ' + totals.messages);
  p.push('CTR: ' + totals.ctr.toFixed(2) + '%');
  p.push('CPM: R$ ' + totals.cpm.toFixed(2));
  p.push('CPC: R$ ' + totals.cpc.toFixed(2));
  p.push('Custo/msg: R$ ' + totals.costPerMessage.toFixed(2));
  p.push('');
  p.push('CAMPANHAS:');
  campLines.forEach(function(line) { p.push(line); });
  p.push('');
  p.push('Responda APENAS com JSON valido sem markdown:');
  p.push('{"summary":"resumo 2-3 frases","healthScore":75,"tips":[{"text":"dica","priority":"alta"}]}');
  p.push('healthScore 0-100. 3-5 dicas. Alta se CPM>R$15 ou CTR<0.5%.');

  const promptText = p.join('\n');

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + aiKey,
        'HTTP-Referer': 'http://localhost:32107',
        'X-Title': 'AM Dashboard Traffic',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [{ role: 'user', content: promptText }],
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!aiRes.ok) return null;
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content || '';
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]);
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
        const existing = (db.data!.suggestions || []).filter((s: any) =>
          s.clientId === client.id && 'healthScore' in s && 'tips' in s
        );

        if (!client.isActive) {
          return { client, metrics: null, campaigns: [], suggestions: existing, status: 'inactive' };
        }

        const mr = await fetchClientMetrics(client.metaAdsAccessToken, client.metaAdsAccountId);
        let aiSuggestions = existing;

        if (mr.status === 'ok' && mr.totals && mr.campaigns.length > 0) {
          if (existing.length === 0 || refresh) {
            const ai = await generateQuickSuggestions(client.name, mr.totals, mr.campaigns);
            if (ai) {
              const tips = (ai.tips || []).map((tip: any) => ({
                id: crypto.randomUUID(),
                text: tip.text,
                priority: tip.priority || 'media',
                status: 'pending' as const,
              }));
              const entry = {
                id: crypto.randomUUID(),
                clientId: client.id,
                clientName: client.name,
                summary: ai.summary || '',
                healthScore: ai.healthScore || 50,
                tips,
                createdAt: new Date().toISOString(),
              };
              db.data!.suggestions = [
                ...(db.data!.suggestions || []).filter((s: any) =>
                  !(s.clientId === client.id && 'healthScore' in s && 'tips' in s)
                ),
                entry as any,
              ];
              aiSuggestions = [entry as any];
            }
          }
        }

        return {
          client,
          metrics: mr.totals || null,
          campaigns: mr.campaigns || [],
          suggestions: aiSuggestions,
          status: mr.status,
          error: mr.error,
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