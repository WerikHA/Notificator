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
    case 'today':
      since = new Date(now);
      break;
    case '7d': since.setDate(now.getDate() - 7); break;
    case '15d': since.setDate(now.getDate() - 15); break;
    case '30d': since.setDate(now.getDate() - 30); break;
    default: since.setDate(now.getDate() - 30);
  }
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  return `{"since":"${formatDate(since)}","until":"${formatDate(now)}"}`;
}

async function fetchCampaignDetails(campaignId: string, accessToken: string, period: string) {
  const baseUrl = `https://graph.facebook.com/v19.0/${campaignId}`;
  const timeRange = getDateRange(period);
  const metricFields = 'spend,impressions,reach,clicks,frequency,actions,results,cpm,cpc,ctr';

  try {
    // 1. Métricas totais da campanha
    const totalsRes = await fetch(
      `${baseUrl}/insights?access_token=${accessToken}&fields=${metricFields}&time_range=${encodeURIComponent(timeRange)}`
    );
    const totalsJson = await totalsRes.json();

    if (totalsJson.error) {
      return { error: totalsJson.error.message || 'Erro na API Meta', status: 'error' };
    }

    if (!totalsJson.data || totalsJson.data.length === 0) {
      return { error: 'Campanha não encontrada ou sem dados', status: 'no-data' };
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
      frequency: parseFloat(t.frequency || '0'),
      cpm: parseFloat(t.cpm || '0'),
      cpc: parseFloat(t.cpc || '0'),
      ctr: parseFloat(t.ctr || '0'),
      costPerMessage: msgs > 0 ? spend / msgs : 0,
      messageRate: clicks > 0 ? (msgs / clicks) * 100 : 0,
    };

    // 2. Breakdown por Gênero
    const genderRes = await fetch(
      `${baseUrl}/insights?access_token=${accessToken}&fields=spend,impressions,clicks,actions&time_range=${encodeURIComponent(timeRange)}&breakdowns=gender`
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

    // 3. Breakdown por Idade
    const ageRes = await fetch(
      `${baseUrl}/insights?access_token=${accessToken}&fields=spend,impressions,clicks,actions&time_range=${encodeURIComponent(timeRange)}&breakdowns=age`
    );
    const ageJson = await ageRes.json();

    const ageBreakdown = (ageJson.data || []).map((a: any) => ({
      ageRange: a.age || 'Desconhecido',
      spend: parseFloat(a.spend || '0'),
      impressions: parseInt(a.impressions || '0'),
      clicks: parseInt(a.clicks || '0'),
      messages: extractMessages(a),
    })).sort((a: any, b: any) => {
      const order = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
      return order.indexOf(a.ageRange) - order.indexOf(b.ageRange);
    });

    // 4. Breakdown por Ad Set (apenas ativos)
    const adSetFilter = encodeURIComponent(JSON.stringify([
      { "field": "adset.effective_status", "operator": "NOT_IN", "value": ["DELETED", "ARCHIVED"] }
    ]));
    const adSetRes = await fetch(
      `${baseUrl}/insights?access_token=${accessToken}&level=adset&fields=adset_id,adset_name,${metricFields}&time_range=${encodeURIComponent(timeRange)}&limit=100&filtering=${adSetFilter}`
    );
    const adSetJson = await adSetRes.json();

    const adSets = (adSetJson.data || [])
      .filter((a: any) => parseFloat(a.spend || '0') > 0 || parseInt(a.impressions || '0') > 0)
      .map((a: any) => {
      const aMsgs = extractMessages(a);
      return {
        id: a.adset_id,
        name: a.adset_name,
        spend: parseFloat(a.spend || '0'),
        impressions: parseInt(a.impressions || '0'),
        clicks: parseInt(a.clicks || '0'),
        reach: parseInt(a.reach || '0'),
        messages: aMsgs,
        cpm: parseFloat(a.cpm || '0'),
        ctr: parseFloat(a.ctr || '0'),
        cpc: parseFloat(a.cpc || '0'),
        frequency: parseFloat(a.frequency || '0'),
      };
    });

    // 5. Breakdown por Anúncio (apenas ativos)
    const adFilter = encodeURIComponent(JSON.stringify([
      { "field": "ad.effective_status", "operator": "NOT_IN", "value": ["DELETED", "ARCHIVED"] }
    ]));
    const adRes = await fetch(
      `${baseUrl}/insights?access_token=${accessToken}&level=ad&fields=ad_id,ad_name,${metricFields}&time_range=${encodeURIComponent(timeRange)}&limit=100&filtering=${adFilter}`
    );
    const adJson = await adRes.json();

    const ads = (adJson.data || [])
      .filter((a: any) => parseFloat(a.spend || '0') > 0 || parseInt(a.impressions || '0') > 0)
      .map((a: any) => {
      const aMsgs = extractMessages(a);
      return {
        id: a.ad_id,
        name: a.ad_name,
        spend: parseFloat(a.spend || '0'),
        impressions: parseInt(a.impressions || '0'),
        clicks: parseInt(a.clicks || '0'),
        reach: parseInt(a.reach || '0'),
        messages: aMsgs,
        cpm: parseFloat(a.cpm || '0'),
        ctr: parseFloat(a.ctr || '0'),
        cpc: parseFloat(a.cpc || '0'),
        frequency: parseFloat(a.frequency || '0'),
      };
    });

    // 6. Dados diários da campanha
    const dailyRes = await fetch(
      `${baseUrl}/insights?access_token=${accessToken}&level=campaign&fields=spend,impressions,reach,clicks,actions,results&time_range=${encodeURIComponent(timeRange)}&time_increment=1`
    );
    const dailyJson = await dailyRes.json();

    const daily = (dailyJson.data || []).map((d: any) => ({
      date: d.date_start
        ? new Date(d.date_start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
        : '',
      spend: parseFloat(d.spend || '0'),
      messages: extractMessages(d),
      impressions: parseInt(d.impressions || '0'),
      clicks: parseInt(d.clicks || '0'),
      reach: parseInt(d.reach || '0'),
    })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { totals, genderBreakdown, ageBreakdown, adSets, ads, daily, status: 'success' };
  } catch (error) {
    console.error('Erro ao buscar detalhes da campanha:', error);
    return { error: 'Falha na conexão com Meta Ads', status: 'error' };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; campaignId: string }> }
) {
  try {
    const { slug, campaignId } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    const db = await getDb();
    const client = db.data?.clients?.find((c) => c.slug === slug);

    if (!client) {
      return NextResponse.json({ error: 'Dashboard não encontrado' }, { status: 404 });
    }

    if (!client.isActive) {
      return NextResponse.json({ error: 'Dashboard desativado' }, { status: 403 });
    }

    const campaignMetaId = campaignId.startsWith('act_') ? campaignId.replace('act_', '') : campaignId;
    const result = await fetchCampaignDetails(campaignMetaId, client.metaAdsAccessToken, period);

    return NextResponse.json({
      ...result,
      clientName: client.name,
      campaignMetaId,
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes da campanha:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}