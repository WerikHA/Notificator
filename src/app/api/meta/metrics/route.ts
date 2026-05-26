import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

function getDateRangeForMeta(period: string) {
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

const MESSAGE_ACTION_TYPES = [
  'total_messaging_connection',
  'onsite_conversion.messaging_conversation_started_7d',
  'onsite_conversion.total_messaging_connection',
  'messaging_conversation_started_24h',
  'messaging_conversation_started_7d',
  'messaging_first_reply',
  'message_send'
];

function extractMessages(data: any): number {
  let count = 0;
  let foundExplicitMessageAction = false;
  
  if (data.actions && Array.isArray(data.actions)) {
    data.actions.forEach((a: any) => {
      const type = a.action_type || '';
      if (MESSAGE_ACTION_TYPES.includes(type)) {
        count += parseInt(a.value || '0');
        foundExplicitMessageAction = true;
      }
    });
  }
  
  if (!foundExplicitMessageAction && data.results) {
     count = parseInt(data.results || '0');
  }

  return count;
}

async function fetchMetaAdsData(period: string = '30d') {
  const token = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;

  if (!token || !accountId) {
    return { error: 'Variáveis de ambiente não configuradas', status: 'config-required' };
  }

  const formattedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const baseUrl = `https://graph.facebook.com/v19.0/${formattedId}/insights`;
  const timeRange = getDateRangeForMeta(period);

  const baseFields = 'spend,impressions,reach,clicks,frequency,actions,results,cpm,cpc,ctr';

  try {
    // 1. Buscar Totais
    const totalsRes = await fetch(
      `${baseUrl}?access_token=${token}&level=account&fields=${baseFields}&time_range=${encodeURIComponent(timeRange)}`
    );
    const totalsJson = await totalsRes.json();

    if (!totalsJson.data || totalsJson.data.length === 0) {
      return { error: 'Nenhum dado encontrado na Meta', status: 'no-data' }; 
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

    // 2. Buscar Campanhas
    const campRes = await fetch(
      `${baseUrl}?access_token=${token}&level=campaign&fields=campaign_name,${baseFields}&time_range=${encodeURIComponent(timeRange)}&limit=50`
    );
    const campJson = await campRes.json();

    let finalCampaigns: any[] = [];
    if (campJson.data && campJson.data.length > 0) {
      finalCampaigns = campJson.data.map((c: any, i: number) => {
         const campMsgs = extractMessages(c);
         const campSpend = parseFloat(c.spend || '0');
         return {
          id: `meta-${i}`,
          campaignName: c.campaign_name,
          adSetName: 'Ver Detalhes',
          adName: c.name || 'Ver Detalhes',
          spend: campSpend,
          impressions: parseInt(c.impressions || '0'),
          clicks: parseInt(c.clicks || '0'),
          reach: parseInt(c.reach || '0'),
          messages: campMsgs,
          cpm: parseFloat(c.cpm || '0'),
          ctr: parseFloat(c.ctr || '0'),
          cpc: parseFloat(c.cpc || '0'),
          frequency: parseFloat(c.frequency || '0'),
          conversions: campMsgs,
          roas: 0,
          videoView25: 0,
          videoView75: 0,
        };
      });
    }

    // 3. Buscar Dados Diários
    const dailyRes = await fetch(
      `${baseUrl}?access_token=${token}&level=account&fields=spend,impressions,reach,clicks,actions,results&time_range=${encodeURIComponent(timeRange)}&time_increment=1`
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
      })).sort((a: { date: string }, b: { date: string }) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return {
      totals: finalTotals,
      campaigns: finalCampaigns,
      daily: finalDaily, 
      status: 'live-meta'
    };

  } catch (error) {
    console.error('Erro ao conectar com Meta Ads:', error);
    return { error: 'Falha na conexão com Meta Ads', status: 'error' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const source = searchParams.get('source') || 'auto';

    const db = await getDb();

    // 1. Modo Manual: Retorna estritamente o que está salvo no banco
    if (source === 'manual') {
      const dbMetrics = db.data?.metrics;
      if (dbMetrics && dbMetrics.campaigns.length > 0) {
        return NextResponse.json({ ...dbMetrics, source: 'manual' });
      }
      return NextResponse.json({ 
        campaigns: [], daily: [], totals: {}, 
        status: 'no-manual-data', 
        source: 'manual' 
      });
    }

    // 2. Modo Meta: Força busca na API, ignora cache do banco para evitar dados velhos
    if (source === 'meta') {
      const metaResult = await fetchMetaAdsData(period);
      if (metaResult.status === 'live-meta') {
        // Salva os dados frescos no banco
        db.data!.metrics = {
          campaigns: metaResult.campaigns || [],
          daily: metaResult.daily || [],
          totals: metaResult.totals || {}
        };
        await db.write();
        return NextResponse.json({ ...metaResult, source: 'meta' });
      }
      return NextResponse.json({ 
        campaigns: [], daily: [], totals: {}, 
        status: metaResult.status, 
        error: metaResult.error,
        source: 'meta' 
      });
    }

    // 3. Modo Automático (Auto): Tenta API -> Se falhar usa DB -> Se não tem DB usa Vazio
    const metaResult = await fetchMetaAdsData(period);
    if (metaResult.status === 'live-meta') {
      db.data!.metrics = {
        campaigns: metaResult.campaigns || [],
        daily: metaResult.daily || [],
        totals: metaResult.totals || {}
      };
      await db.write();
      return NextResponse.json({ ...metaResult, source: 'meta' });
    }

    // Fallback para dados manuais salvos
    if (db.data?.metrics && db.data.metrics.campaigns.length > 0) {
      return NextResponse.json({ ...db.data.metrics, source: 'manual' });
    }

    // Retorno Vazio
    return NextResponse.json({
      campaigns: [],
      daily: [],
      totals: {},
      status: 'empty',
      source: 'empty'
    });
  } catch (error) {
    console.error('Erro geral ao buscar métricas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = await getDb();

    db.data!.metrics = {
      campaigns: body.campaigns || [],
      daily: body.daily || [],
      totals: body.totals || {}
    };

    await db.write();

    return NextResponse.json({ 
      success: true, 
      message: 'Dados manuais salvos com sucesso!' 
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao salvar métricas:', error);
    return NextResponse.json({ error: 'Erro ao salvar dados' }, { status: 500 });
  }
}