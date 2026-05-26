import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';
import { mockCampaigns, mockDailyMetrics, totalMetrics } from '@/lib/mock-meta-data';

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

// Lista exata de action_types que representam mensagens na API da Meta
const MESSAGE_ACTION_TYPES = [
  'total_messaging_connection',
  'onsite_conversion.messaging_conversation_started_7d',
  'onsite_conversion.total_messaging_connection'
];

// Função robusta para extrair mensagens da API da Meta
function extractMessages(data: any): number {
  let count = 0;
  
  // 1. Tenta encontrar nas ações explícitas
  if (data.actions && Array.isArray(data.actions)) {
    data.actions.forEach((a: any) => {
      const type = a.action_type || '';
      if (MESSAGE_ACTION_TYPES.includes(type)) {
        count += parseInt(a.value || '0');
      }
    });
  }
  
  // 2. Fallback: Se não achou ações de mensagem, usa 'results'
  // (Assume-se que a campanha é otimizada para mensagens se o total de ações de mensagem for 0)
  if (count === 0 && data.results) {
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

  // Adicionado 'results' para fallback de contagem
  const fields = 'spend,impressions,reach,clicks,frequency,actions,results,cpm,cpc,ctr';

  try {
    // 1. Buscar Totais (Nível da Conta)
    const totalsRes = await fetch(
      `${baseUrl}?access_token=${token}&level=account&fields=${fields}&time_range=${encodeURIComponent(timeRange)}`
    );
    const totalsJson = await totalsRes.json();

    if (!totalsJson.data || totalsJson.data.length === 0) {
      return { error: 'Nenhum dado encontrado na Meta', status: 'no-data' }; 
    }

    const t = totalsJson.data[0];
    const msgs = extractMessages(t);

    const finalTotals = {
      ...totalMetrics,
      spend: parseFloat(t.spend || 0),
      impressions: parseInt(t.impressions || 0),
      reach: parseInt(t.reach || 0),
      clicks: parseInt(t.clicks || 0),
      messages: msgs,
      frequency: parseFloat(t.frequency || 0),
      cpm: parseFloat(t.cpm || 0),
      cpc: parseFloat(t.cpc || 0),
      ctr: parseFloat(t.ctr || 0),
      spendChange: 0, messagesChange: 0, clicksChange: 0, reachChange: 0, impressionsChange: 0,
    };

    // 2. Buscar Campanhas
    const campRes = await fetch(
      `${baseUrl}?access_token=${token}&level=campaign&fields=campaign_name,${fields}&time_range=${encodeURIComponent(timeRange)}&limit=50`
    );
    const campJson = await campRes.json();

    let finalCampaigns: any[] = [];
    if (campJson.data && campJson.data.length > 0) {
      finalCampaigns = campJson.data.map((c: any, i: number) => {
         const campMsgs = extractMessages(c);
         return {
          id: `meta-${i}`,
          campaignName: c.campaign_name,
          adSetName: 'Ver Detalhes',
          adName: 'Ver Detalhes',
          spend: parseFloat(c.spend || 0),
          impressions: parseInt(c.impressions || 0),
          clicks: parseInt(c.clicks || 0),
          reach: parseInt(c.reach || 0),
          messages: campMsgs,
          cpm: parseFloat(c.cpm || 0),
          ctr: parseFloat(c.ctr || 0),
          cpc: parseFloat(c.cpc || 0),
          frequency: 1,
          conversions: 0,
          roas: 0,
          videoView25: 0,
          videoView75: 0,
        };
      });
    }

    return {
      totals: finalTotals,
      campaigns: finalCampaigns.length > 0 ? finalCampaigns : mockCampaigns,
      daily: mockDailyMetrics, 
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

    if (source === 'manual') {
      if (db.data?.metrics && db.data.metrics.campaigns.length > 0) {
        return NextResponse.json({ ...db.data.metrics, source: 'manual' });
      }
      return NextResponse.json({ 
        campaigns: [], daily: [], totals: {}, 
        status: 'no-manual-data', 
        source: 'manual' 
      });
    }

    if (source === 'meta') {
      const metaResult = await fetchMetaAdsData(period);
      if (metaResult.status === 'live-meta') {
        db.data.metrics = {
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

    if (db.data?.metrics && db.data.metrics.campaigns.length > 0) {
      return NextResponse.json({ ...db.data.metrics, source: 'manual' });
    }

    const metaResult = await fetchMetaAdsData(period);
    if (metaResult.status === 'live-meta') {
      db.data.metrics = {
        campaigns: metaResult.campaigns || [],
        daily: metaResult.daily || [],
        totals: metaResult.totals || {}
      };
      await db.write();
      return NextResponse.json({ ...metaResult, source: 'meta' });
    }

    return NextResponse.json({
      campaigns: mockCampaigns,
      daily: mockDailyMetrics,
      totals: totalMetrics,
      status: 'mock',
      source: 'mock'
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

    db.data.metrics = {
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