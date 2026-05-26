export interface CampaignMetric {
  id: string;
  campaignName: string;
  adSetName: string;
  adName: string;
  spend: number;
  impressions: number;
  clicks: number;
  messages: number;
  reach: number;
  cpm: number;
  ctr: number;
  cpc: number;
  frequency: number;
  conversions: number;
  roas: number;
  videoView25: number;
  videoView75: number;
}

export interface DailyMetric {
  date: string;
  spend: number;
  messages: number;
  impressions: number;
  clicks: number;
  reach: number;
}

export const mockDailyMetrics: DailyMetric[] = Array.from({ length: 25 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (24 - i));
  return {
    date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    spend: Math.floor(Math.random() * 100) + 20,
    messages: Math.floor(Math.random() * 20) + 1,
    impressions: Math.floor(Math.random() * 20000) + 5000,
    clicks: Math.floor(Math.random() * 100) + 10,
    reach: Math.floor(Math.random() * 15000) + 4000,
  };
});

export const mockCampaigns: CampaignMetric[] = [
  { id: '1', campaignName: '[ENGAJA][CATANDUVA][VÍDEON...', adSetName: '[ENGAJA][CATANDUVA][VÍDEON...', adName: '[ENGAJA][CATANDUVA][VÍDEON...', spend: 590.18, impressions: 120000, clicks: 277, messages: 78, reach: 80000, cpm: 4.08, ctr: 0.23, cpc: 2.13, frequency: 1.5, conversions: 45, roas: 3.2, videoView25: 8523, videoView75: 1827 },
  { id: '2', campaignName: 'Camp - 2 feira mulher omini', adSetName: 'Conj 2 feira mulher omini', adName: '2 feira mulher omini', spend: 184.76, impressions: 80000, clicks: 262, messages: 38, reach: 40000, cpm: 2.30, ctr: 0.32, cpc: 0.70, frequency: 2.0, conversions: 20, roas: 4.5, videoView25: 4000, videoView75: 900 },
  { id: '3', campaignName: 'Camp - 2 feira mulher omini 2...', adSetName: 'Conj 2 feira mulher omini 23 /...', adName: '2 feira mulher omini 23 / 05', spend: 166.64, impressions: 60000, clicks: 205, messages: 29, reach: 30000, cpm: 2.77, ctr: 0.34, cpc: 0.81, frequency: 2.0, conversions: 15, roas: 2.8, videoView25: 3000, videoView75: 700 },
  { id: '4', campaignName: '[RECONHE][CATANDUVA][FEIRÃ...', adSetName: '[ENGAJA][CATANDUVA][FEIRÃO]...', adName: '[ENGAJA][CATANDUVA][FEIRÃO]...', spend: 348.75, impressions: 56128, clicks: 126, messages: 0, reach: 21074, cpm: 6.21, ctr: 0.22, cpc: 2.76, frequency: 2.66, conversions: 5, roas: 1.1, videoView25: 2000, videoView75: 500 },
];

export const totalMetrics = {
  spend: 1290.33,
  messages: 145,
  clicks: 870,
  reach: 171074,
  impressions: 316128,
  spendChange: -9.8,
  messagesChange: -23.3,
  clicksChange: -16.7,
  reachChange: 28.9,
  impressionsChange: 2.0,
  funnelImpressions: 316000,
  funnelReach: 171000,
  funnelClicks: 280,
  funnelMessages: 145,
  funnelVideo25: 8523,
  funnelVideo75: 1827,
  ctr: 0.09,
  messageRate: 51.79,
  vvr: 8.54,
  frequency: 1.85,
  cpm: 4.08,
  costPerMessage: 8.90,
  cpc: 4.61,
};