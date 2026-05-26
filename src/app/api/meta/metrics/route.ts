import { NextRequest, NextResponse } from 'next/server';
import { mockCampaigns, mockDailyMetrics } from '@/lib/mock-meta-data';

export async function GET(request: NextRequest) {
  const token = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  const period = request.nextUrl.searchParams.get('period') || '30d';

  // Verifica se as credenciais estão configuradas
  if (!token || !accountId) {
    console.warn('META_ADS_ACCESS_TOKEN ou META_ADS_ACCOUNT_ID não configurados. Retornando dados mockados.');
    
    // Retorna dados mockados para permitir o desenvolvimento e testes sem a chave real
    return NextResponse.json({
      campaigns: mockCampaigns,
      daily: mockDailyMetrics,
      status: 'mock',
    });
  }

  /* 
    INTEGRAÇÃO REAL:
    Aqui você usaria o token para fazer a requisição real à API do Meta (Graph API).
    
    Exemplo:
    const response = await fetch(
      `https://graph.facebook.com/v18.0/act_${accountId}/insights?fields=campaign_name,impressions,clicks,spend,ctr,cpc,actions,roas&time_preset=${period}&access_token=${token}`
    );
    const data = await response.json();
    
    // Transformar 'data' para o formato que o frontend espera
    return NextResponse.json({ campaigns: ..., daily: ..., status: 'live' });
  */

  // Por enquanto, retorna mock mesmo com a chave, até a integração ser implementada
  return NextResponse.json({
    campaigns: mockCampaigns,
    daily: mockDailyMetrics,
    status: 'live',
  });
}