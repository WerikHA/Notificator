"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ExternalLink,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  MousePointerClick,
  Eye,
  DollarSign,
  Brain,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { getObjectiveConfig, groupCampaignsByObjective, type MetaObjective } from '@/lib/campaign-objectives';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

interface Campaign {
  id: string;
  name: string;
  objective?: string;
  spend: number;
  impressions: number;
  clicks: number;
  messages: number;
  cpm: number;
  cpc: number;
  ctr: number;
}

interface Tip {
  id: string;
  text: string;
  priority: string;
  status: string;
}

interface Suggestion {
  id: string;
  clientId: string;
  clientName: string;
  summary: string;
  healthScore: number;
  tips: Tip[];
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  metaAdsAccountId: string;
  isActive: boolean;
  chatPassword: string;
}

interface Metrics {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  messages: number;
  cpm: number;
  cpc: number;
  ctr: number;
  costPerMessage: number;
}

interface ClientOverviewCardProps {
  client: Client;
  metrics: Metrics | null;
  campaigns: Campaign[];
  suggestions: Suggestion[];
  status: string;
  error?: string;
  onRefresh: () => void;
}

function getHealthConfig(score: number) {
  if (score >= 75) return { label: 'Ótimo', color: 'text-green-400', bg: 'bg-green-500', icon: ShieldCheck };
  if (score >= 50) return { label: 'Bom', color: 'text-yellow-400', bg: 'bg-yellow-500', icon: Shield };
  return { label: 'Atenção', color: 'text-red-400', bg: 'bg-red-500', icon: ShieldAlert };
}

function getPriorityConfig(priority: string) {
  switch (priority) {
    case 'alta': return { color: 'text-red-400', bg: 'bg-red-900/40 border-red-800', dot: 'bg-red-500' };
    case 'média': return { color: 'text-yellow-400', bg: 'bg-yellow-900/40 border-yellow-800', dot: 'bg-yellow-500' };
    default: return { color: 'text-blue-400', bg: 'bg-blue-900/40 border-blue-800', dot: 'bg-blue-500' };
  }
}

export default function ClientOverviewCard({ client, metrics, campaigns, suggestions, status, error, onRefresh }: ClientOverviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const latestSuggestion = suggestions[0];
  const healthScore = latestSuggestion?.healthScore || 0;
  const healthConfig = getHealthConfig(healthScore);
  const HealthIcon = healthConfig.icon;

  const objectiveGroups = groupCampaignsByObjective(campaigns);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshing(true);
    try {
      onRefresh();
      toast.success(`Atualizando ${client.name}...`);
    } finally {
      setTimeout(() => setRefreshing(false), 2000);
    }
  };

  return (
    <Card className="bg-[#18191A] border-gray-800 text-white overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                client.isActive ? 'bg-blue-600' : 'bg-gray-700'
              }`}>
                <span className="text-white font-bold text-sm">
                  {client.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white truncate">{client.name}</h3>
                  <Badge variant={client.isActive ? 'default' : 'secondary'} className={
                    client.isActive ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                  }>
                    {client.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 font-mono truncate">Conta: {client.metaAdsAccountId}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-white"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Atualizar dados"
              >
                {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              </Button>
              <Link
                href={`/dashboard/${client.slug}`}
                target="_blank"
                className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="px-4 py-3 bg-red-900/20 border-b border-red-900/30">
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        {metrics ? (
          <div className="p-4 border-b border-gray-800">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-[#242526] rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign size={12} className="text-red-400" />
                  <span className="text-[10px] text-gray-500 uppercase">Investimento</span>
                </div>
                <p className="text-sm font-bold text-white">{formatCurrency(metrics.spend)}</p>
              </div>
              <div className="bg-[#242526] rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare size={12} className="text-green-400" />
                  <span className="text-[10px] text-gray-500 uppercase">Mensagens</span>
                </div>
                <p className="text-sm font-bold text-white">{formatNumber(metrics.messages)}</p>
              </div>
              <div className="bg-[#242526] rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <MousePointerClick size={12} className="text-blue-400" />
                  <span className="text-[10px] text-gray-500 uppercase">Cliques</span>
                </div>
                <p className="text-sm font-bold text-white">{formatNumber(metrics.clicks)}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-[10px] text-gray-500">CTR</p>
                <p className={`text-xs font-medium ${metrics.ctr >= 1 ? 'text-green-400' : metrics.ctr >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {metrics.ctr.toFixed(2)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500">CPC</p>
                <p className={`text-xs font-medium ${metrics.cpc <= 3 ? 'text-green-400' : metrics.cpc <= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formatCurrency(metrics.cpc)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500">CPM</p>
                <p className={`text-xs font-medium ${metrics.cpm <= 8 ? 'text-green-400' : metrics.cpm <= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formatCurrency(metrics.cpm)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500">Custo/Msg</p>
                <p className={`text-xs font-medium ${metrics.costPerMessage <= 5 ? 'text-green-400' : metrics.costPerMessage <= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formatCurrency(metrics.costPerMessage)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info size={14} />
              <span>{status === 'inactive' ? 'Dashboard inativo' : 'Sem dados disponíveis'}</span>
            </div>
          </div>
        )}

        {/* AI Summary */}
        {latestSuggestion && (
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={14} className="text-purple-400" />
              <span className="text-xs font-medium text-gray-300">Análise da IA</span>
              <div className="flex items-center gap-1 ml-auto">
                <HealthIcon size={12} className={healthConfig.color} />
                <span className={`text-xs font-bold ${healthConfig.color}`}>{healthScore}</span>
                <span className="text-[10px] text-gray-500">/100</span>
              </div>
            </div>

            <div className="mb-3">
              <Progress value={healthScore} className="h-1.5 bg-gray-800">
                <div className={`h-full ${healthConfig.bg} rounded-full transition-all`} style={{ width: `${healthScore}%` }} />
              </Progress>
              <p className={`text-[10px] mt-1 ${healthConfig.color}`}>{healthConfig.label}</p>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mb-3">{latestSuggestion.summary}</p>

            {latestSuggestion.tips && latestSuggestion.tips.length > 0 && (
              <div className="space-y-1.5">
                {latestSuggestion.tips.map((tip) => {
                  const pConfig = getPriorityConfig(tip.priority);
                  return (
                    <div key={tip.id} className={`flex items-start gap-2 text-xs p-2 rounded border ${pConfig.bg}`}>
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${pConfig.dot}`} />
                      <span className="text-gray-300 leading-relaxed">{tip.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Campanhas por Objetivo */}
        {campaigns.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-[#1F2022] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {campaigns.length} campanha(s)
                </span>
                {Object.keys(objectiveGroups).length > 1 && (
                  <div className="flex gap-1">
                    {Object.entries(objectiveGroups).map(([obj, camps]) => {
                      const config = getObjectiveConfig(obj);
                      return (
                        <span key={obj} className={`text-[10px] px-1.5 py-0.5 rounded border ${config.bgColor} ${config.color}`}>
                          {config.icon} {camps.length}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
            </button>

            {expanded && (
              <div className="px-4 pb-4 space-y-3">
                {Object.entries(objectiveGroups).map(([objective, camps]) => {
                  const objConfig = getObjectiveConfig(objective);
                  return (
                    <div key={objective}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs">{objConfig.icon}</span>
                        <span className={`text-xs font-medium ${objConfig.color}`}>{objConfig.label}</span>
                        <span className="text-[10px] text-gray-600">• {camps.length} campanha(s)</span>
                      </div>
                      <div className="space-y-2">
                        {camps.map((camp: any) => (
                          <div key={camp.id} className="bg-[#242526] rounded-lg p-3 text-xs border-l-2" style={{ borderLeftColor: objective === 'OUTCOME_AWARENESS' ? '#A78BFA' : objective === 'OUTCOME_ENGAGEMENT' ? '#60A5FA' : objective === 'OUTCOME_TRAFFIC' ? '#34D399' : objective === 'OUTCOME_LEADS' ? '#FBBF24' : objective === 'OUTCOME_SALES' ? '#F87171' : '#6B7280' }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-gray-300 font-medium truncate max-w-[70%]">{camp.name}</span>
                              <span className="text-blue-400 font-medium">{camp.messages} msgs</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-[10px]">
                              <div>
                                <span className="text-gray-500">Gasto</span>
                                <p className="text-gray-300">{formatCurrency(camp.spend)}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">CTR</span>
                                <p className={camp.ctr >= 1 ? 'text-green-400' : camp.ctr >= 0.5 ? 'text-yellow-400' : 'text-red-400'}>
                                  {camp.ctr.toFixed(2)}%
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">CPC</span>
                                <p className="text-gray-300">{formatCurrency(camp.cpc)}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Imp</span>
                                <p className="text-gray-300">{formatNumber(camp.impressions)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}