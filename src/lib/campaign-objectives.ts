export type MetaObjective =
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_SALES'
  | 'OUTCOME_APP_PROMOTION'
  | 'UNKNOWN';

export interface ObjectiveConfig {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
  primaryMetrics: string[];
  secondaryMetrics: string[];
  optimizationTip: string;
}

const OBJECTIVE_MAP: Record<string, ObjectiveConfig> = {
  OUTCOME_AWARENESS: {
    label: 'Reconhecimento',
    shortLabel: 'Reconhecimento',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/30 border-purple-800',
    icon: '👁️',
    description: 'Campanha focada em aumentar a visibilidade da marca e alcance.',
    primaryMetrics: ['impressions', 'reach', 'frequency', 'cpm'],
    secondaryMetrics: ['spend', 'videoView25', 'videoView75'],
    optimizationTip: 'Foque em CPM baixo, alto alcance e frequência controlada (abaixo de 3).',
  },
  OUTCOME_ENGAGEMENT: {
    label: 'Engajamento',
    shortLabel: 'Engajamento',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/30 border-blue-800',
    icon: '💬',
    description: 'Campanha focada em gerar interações, comentários e compartilhamentos.',
    primaryMetrics: ['clicks', 'ctr', 'messages', 'messageRate'],
    secondaryMetrics: ['spend', 'impressions', 'cpc'],
    optimizationTip: 'Foque em CTR alto e custo por mensagem baixo. Teste CTAs que incentivam interação.',
  },
  OUTCOME_TRAFFIC: {
    label: 'Tráfego',
    shortLabel: 'Tráfego',
    color: 'text-green-400',
    bgColor: 'bg-green-900/30 border-green-800',
    icon: '🔗',
    description: 'Campanha focada em direcionar visitantes para um site ou landing page.',
    primaryMetrics: ['clicks', 'ctr', 'cpc', 'impressions'],
    secondaryMetrics: ['spend', 'reach', 'frequency'],
    optimizationTip: 'Foque em CPC baixo e CTR alto. Otimize a landing page para conversão.',
  },
  OUTCOME_LEADS: {
    label: 'Leads',
    shortLabel: 'Leads',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/30 border-yellow-800',
    icon: '📋',
    description: 'Campanha focada em captura de leads e formulários.',
    primaryMetrics: ['messages', 'costPerMessage', 'ctr', 'cpc'],
    secondaryMetrics: ['spend', 'impressions', 'reach'],
    optimizationTip: 'Foque no custo por lead (mensagem). Forms nativos do Meta tendem a ter custo menor.',
  },
  OUTCOME_SALES: {
    label: 'Vendas',
    shortLabel: 'Vendas',
    color: 'text-red-400',
    bgColor: 'bg-red-900/30 border-red-800',
    icon: '🛒',
    description: 'Campanha focada em conversões e vendas diretas.',
    primaryMetrics: ['messages', 'costPerMessage', 'cpc', 'ctr'],
    secondaryMetrics: ['spend', 'impressions', 'cpm'],
    optimizationTip: 'Foque em ROAS e custo por conversão. Pixel do Meta é essencial para otimização.',
  },
  OUTCOME_APP_PROMOTION: {
    label: 'Aplicativo',
    shortLabel: 'App',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-900/30 border-cyan-800',
    icon: '📱',
    description: 'Campanha focada em instalações e engajamento de aplicativos.',
    primaryMetrics: ['clicks', 'ctr', 'cpc', 'spend'],
    secondaryMetrics: ['impressions', 'reach', 'cpm'],
    optimizationTip: 'Foque em CPI (custo por instalação). Use deep links para engajamento pós-instalação.',
  },
};

const DEFAULT_CONFIG: ObjectiveConfig = {
  label: 'Não identificado',
  shortLabel: 'N/D',
  color: 'text-gray-400',
  bgColor: 'bg-gray-900/30 border-gray-800',
  icon: '❓',
  description: 'Objetivo da campanha não identificado.',
  primaryMetrics: ['spend', 'impressions', 'clicks', 'messages'],
  secondaryMetrics: ['ctr', 'cpc', 'cpm'],
  optimizationTip: 'Defina um objetivo claro para a campanha no Meta Ads.',
};

export function getObjectiveConfig(objective: string | null | undefined): ObjectiveConfig {
  if (!objective) return DEFAULT_CONFIG;
  return OBJECTIVE_MAP[objective.toUpperCase()] || DEFAULT_CONFIG;
}

export function getObjectiveLabel(objective: string | null | undefined): string {
  return getObjectiveConfig(objective).label;
}

export function getObjectiveColor(objective: string | null | undefined): string {
  return getObjectiveConfig(objective).color;
}

export function getObjectiveBg(objective: string | null | undefined): string {
  return getObjectiveConfig(objective).bgColor;
}

export function groupCampaignsByObjective(campaigns: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const camp of campaigns) {
    const obj = camp.objective || 'UNKNOWN';
    if (!groups[obj]) groups[obj] = [];
    groups[obj].push(camp);
  }
  return groups;
}

export function getObjectiveSummary(campaigns: any[]): { objective: string; count: number; totalSpend: number; totalMessages: number }[] {
  const groups = groupCampaignsByObjective(campaigns);
  return Object.entries(groups).map(([objective, camps]) => ({
    objective,
    count: camps.length,
    totalSpend: camps.reduce((sum: number, c: any) => sum + (c.spend || 0), 0),
    totalMessages: camps.reduce((sum: number, c: any) => sum + (c.messages || 0), 0),
  })).sort((a, b) => b.totalSpend - a.totalSpend);
}