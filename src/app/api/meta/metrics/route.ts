import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';
import { mockCampaigns, mockDailyMetrics, totalMetrics } from '@/lib/mock-meta-data';

// Função auxiliar para buscar dados da Meta Ads API
async function fetchMetaAdsData() {
  const token = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;

  // Se as variáveis não estiverem configuradas, retorna null para usar o fallback (mock)
  if (!token || !accountId) return null;

  // Garante que o ID da conta tenha o prefixo 'act_'
  const formattedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const baseUrl = `https://graph.facebook.com/v19.0/${formattedId}/insights`;

  try {
    // 1. Buscar Totais (Nível da Conta)
    const totalsRes = await fetch(
      `${baseUrl}?access_token=${token}&level=account&fields=spend,impressions,reach,clicks,frequency,actions,cpm,cpc,ctr&date_preset=last_30d`
    );
    const totalsJson = await totalsRes.json();

    if (!totalsJson.data || totalsJson.data.length === 0) {
      return null; 
    }

    const t = totalsJson.data[0];
    
    // A Meta retorna as mensagens dentro do array 'actions'
    const msgs = t.actions?.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started')?.value || 0;

    // Mesclamos os dados reais com os mockados para preencher campos calculados (como variação %) 
    // que exigiriam comparações complexas de datas para calcular na hora.
    const finalTotals = {
      ...totalMetrics, // Base mockada para garantir que a UI não quebre com campos vazios
      spend: parseFloat(t.spend || 0),
      impressions: parseInt(t.impressions || 0),
      reach: parseInt(t.reach || 0),
      clicks: parseInt(t.clicks || 0),
      messages: parseInt(msgs),
      frequency: parseFloat(t.frequency || 0),
      cpm: parseFloat(t.cpm || 0),
      cpc: parseFloat(t.cpc || 0),
      ctr: parseFloat(t.ctr || 0),
      // Resetar variações para 0 pois não estamos calculando histórico neste momento
      spendChange: 0, messagesChange: 0, clicksChange: 0, reachChange: 0, impressionsChange: 0,
    };

    // 2. Buscar Campanhas
    const campRes = await fetch(
      `${baseUrl}?access_token=${token}&level=campaign&fields=campaign_name,spend,impressions,reach,clicks,actions&date_preset=last_30d&limit=10`
    );
    const campJson = await campRes.json();

    let finalCampaigns: any[] = [];
    if (campJson.data && campJson.data.length > 0) {
      finalCampaigns = campJson.data.map((c: any, i: number) => {
         const campMsgs = c.actions?.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started')?.value || 0;
         return {
          id: `meta-${i}`,
          campaignName: c.campaign_name,
          adSetName: 'Ver Detalhes',
          adName: 'Ver Detalhes',
          spend: parseFloat(c.spend || 0),
          impressions: parseInt(c.impressions || 0),
          clicks: parseInt(c.clicks || 0),
          reach: parseInt(c.reach || 0),
          messages: parseInt(campMsgs),
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
      daily: mockDailyMetrics, // Mantemos o diário mockado para evitar lentidão na renderização
      status: 'live-meta'
    };

  } catch (error) {
    console.error('Erro ao conectar com Meta Ads:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    // 1. Se houver dados enviados manualmente (via POST), eles têm prioridade
    if (db.data?.metrics && db.data.metrics.campaigns.length > 0) {
      return NextResponse.json(db.data.metrics);
    }

    // 2. Tentar buscar da API da Meta (se variáveis de ambiente existirem)
    const metaResult = await fetchMetaAdsData();
    if (metaResult) {
      // Salva no banco para cache (opcional, mas ajuda na performance)
      db.data.metrics = {
        campaigns: metaResult.campaigns,
        daily: metaResult.daily,
        totals: metaResult.totals
      };
      await db.write();
      return NextResponse.json(metaResult);
    }

    // 3. Fallback para dados Mockados (Simulação) se nada mais funcionar
    return NextResponse.json({
      campaigns: mockCampaigns,
      daily: mockDailyMetrics,
      totals: totalMetrics,
      status: 'mock'
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

    // Permite sobrescrever os dados da API com dados manuais
    db.data.metrics = {
      campaigns: body.campaigns || [],
      daily: body.daily || [],
      totals: body.totals || {}
    };

    await db.write();

    return NextResponse.json({ 
      success: true, 
      message: 'Dados do dashboard atualizados com sucesso!' 
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao salvar métricas:', error);
    return NextResponse.json({ error: 'Erro ao salvar dados' }, { status: 500 });
  }
}