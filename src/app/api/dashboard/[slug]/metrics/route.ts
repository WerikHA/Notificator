import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

function getDateRange(period: string) {
  const now = new Date();
  let since = new Date();

  switch (period) {
    case '7d':
      since.setDate(now.getDate() - 7);
      break;
    case '15d':
      since.setDate(now.getDate() - 15);
      break;
    case '30d':
      since.setDate(now.getDate() - 30);
      break;
    default:
      since.setDate(now.getDate() - 30);
  }

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  return `{"since":"${formatDate(since)}","until":"${formatDate(now)}"}`;
}

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

async function fetchMetaAdsData(accountId: string, accessToken: string, period: string = '30d') {
  const formattedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const baseUrl = `https://graph.facebook.com/v19.0/${formattedId}/insights`;
  const timeRange = getDateRange(period);
  const baseFields = 'spend,impressions,reach,clicks,frequency,actions,results,cpm,cpc,ctr';

  try {
    const totalsRes = await fetch(
      `${baseUrl}?access_token=${accessToken}&level=account&fields=${baseFields}&time_range=${encodeURIComponent(timeRange)}`
    );
    const totalsJson = await totalsRes.json();

    if (totalsJson.error) {
      return { error: totalsJson.error.message || 'Erro na API Meta', status: 'error' };
    }

    if (!totalsJson.data || totalsJson.data.length === 0) {
      return { error: 'Nenhum dado encontrado', status: 'no-data' };
    }

    const t = totalsJson.data[0];
    const msgs = extractMessages(t);
    const spend = parseFloat(t.spend || '0');
    const impressions = parseInt(t.impressions || '0');
    const reach = parseInt(t.reach || '0');
    const clicks = parseInt(t.clicks || '0');

    const finalTotals = {
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
      vvr: 0,
      spendChange: 0, messagesChange: 0, clicksChange: 0, reachChange: 0, impressionsChange: 0,
      funnelImpressions: impressions,
      funnelReach: reach,
      funnelClicks: clicks,
      funnelMessages: msgs,
      funnelVideo25: 0,
      funnelVideo75: 0,
    };

    const campRes = await fetch(
      `${baseUrl}?access_token=${accessToken}&level=campaign&fields=campaign_id,campaign_name,${baseFields}&time_range=${encodeURIComponent(timeRange)}&limit=50`
    );
    const campJson = await campRes.json();

    let finalCampaigns: any[] = [];
    if (campJson.data && campJson.data.length > 0) {
      finalCampaigns = campJson.data.map((c: any, i: number) => ({
        id: `meta-${i}`,
        campaignId: c.campaign_id || '',
        campaignName: c.campaign_name,
        adSetName: 'Ver Detalhes',
        adName: c.name || 'Ver Detalhes',
        spend: parseFloat(c.spend || '0'),
        impressions: parseInt(c.impressions || '0'),
        clicks: parseInt(c.clicks || '0'),
        reach: parseInt(c.reach || '0'),
        messages: extractMessages(c),
        cpm: parseFloat(c.cpm || '0'),
        ctr: parseFloat(c.ctr || '0'),
        cpc: parseFloat(c.cpc || '0'),
        frequency: parseFloat(c.frequency || '0'),
        conversions: extractMessages(c),
        roas: 0,
        videoView25: 0,
        videoView75: 0,
      }));
    }

    // Buscar breakdown por gênero
    const genderRes = await fetch(
      `${baseUrl}?access_token=${accessToken}&fields=spend,impressions,clicks,actions&time_range=${encodeURIComponent(timeRange)}&breakdowns=gender`
    );
    const genderJson = await genderRes.json();
    
    let genderBreakdown: any[] = [];
    if (genderJson.data && genderJson.data.length > 0) {
      genderBreakdown = genderJson.data.map((g: any) => ({
        gender: g.gender || 'unknown',
        label: g.gender === 'male' ? 'Masculino' : g.gender === 'female' ? 'Feminino' : 'Desconhecido',
        spend: parseFloat(g.spend || '0'),
        impressions: parseInt(g.impressions || '0'),
        clicks: parseInt(g.clicks || '0'),
        messages: extractMessages(g),
      }));
    }

    // Buscar breakdown por idade
    const ageRes = await fetch(
      `${baseUrl}?access_token=${accessToken}&fields=spend,impressions,clicks,actions&time_range=${encodeURIComponent(timeRange)}&breakdowns=age`
    );
    const ageJson = await ageRes.json();
    
    let ageBreakdown: any[] = [];
    if (ageJson.data && ageJson.data.length > 0) {
      ageBreakdown = ageJson.data.map((a: any) => ({
        ageRange: a.age || 'Desconhecido',
        spend: parseFloat(a.spend || '0'),
        impressions: parseInt(a.impressions || '0'),
        clicks: parseInt(a.clicks || '0'),
        messages: extractMessages(a),
      })).sort((a: any, b: any) => {
        const order = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
        return order.indexOf(a.ageRange) - order.indexOf(b.ageRange);
      });
    }

    const dailyRes = await fetch(
      `${baseUrl}?access_token=${accessToken}&level=account&fields=spend,impressions,reach,clicks,actions,results&time_range=${encodeURIComponent(timeRange)}&time_increment=1`
    );
    const dailyJson = await dailyRes.json();
    
    let finalDaily: any[] = [];
    if (dailyJson.data && dailyJson.data.length > 0) {
      finalDaily = dailyJson.data.map((d: any) => ({
        date: d.date_start ? new Date(d.date_start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '',
        spend: parseFloat(d.spend || '0'),
        messages: extractMessages(d),
        impressions: parseInt(d.impressions || '0'),
        clicks: parseInt(d.clicks || '0'),
        reach: parseInt(d.reach || '0'),
      })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return {
      totals: finalTotals,
      campaigns: finalCampaigns,
      daily: finalDaily,
      genderBreakdown,
      ageBreakdown,
      status: 'live-meta'
    };

  } catch (error) {
    console.error('Erro ao conectar com Meta Ads:', error);
    return { error: 'Falha na conexão com Meta Ads', status: 'error' };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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

    const result = await fetchMetaAdsData(
      client.metaAdsAccountId,
      client.metaAdsAccessToken,
      period
    );

    return NextResponse.json({
      ...result,
      clientName: client.name,
    });
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}