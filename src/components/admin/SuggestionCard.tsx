"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Check,
  X,
  Loader2,
  Pause,
  Play,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
} from 'lucide-react';

interface SuggestionItem {
  id: string;
  type: 'pause' | 'resume' | 'increase_budget' | 'decrease_budget';
  title: string;
  description: string;
  parameters: Record<string, any>;
  status: 'pending' | 'applied' | 'rejected' | 'failed';
  appliedAt?: string;
  error?: string;
}

interface Suggestion {
  id: string;
  clientId: string;
  clientName: string;
  campaignId: string;
  campaignName: string;
  summary: string;
  suggestions: SuggestionItem[];
  status: 'pending' | 'partially_applied' | 'fully_applied' | 'rejected';
  createdAt: string;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onUpdate: () => void;
}

const ACTION_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  pause: { icon: Pause, color: 'text-red-400', bg: 'bg-red-900/30 border-red-800', label: 'Pausar' },
  resume: { icon: Play, color: 'text-green-400', bg: 'bg-green-900/30 border-green-800', label: 'Ativar' },
  increase_budget: { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-800', label: 'Aumentar' },
  decrease_budget: { icon: TrendingDown, color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-800', label: 'Reduzir' },
};

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/40', label: 'Pendente' },
  fully_applied: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/40', label: 'Aplicado' },
  partially_applied: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-900/40', label: 'Parcial' },
  rejected: { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-800/40', label: 'Recusado' },
  applied: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/40', label: 'Aplicado' },
  failed: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/40', label: 'Falhou' },
};

export default function SuggestionCard({ suggestion, onUpdate }: SuggestionCardProps) {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAction = async (actionId: string, action: 'approve' | 'reject') => {
    setProcessing(actionId);
    try {
      const res = await fetch(`/api/admin/suggestions/${suggestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, actionId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao processar');

      if (action === 'approve') {
        toast.success('Ação aplicada no Meta Ads!');
      } else {
        toast.success('Sugestão recusada');
      }

      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar');
    } finally {
      setProcessing(null);
    }
  };

  const overallStatus = STATUS_CONFIG[suggestion.status] || STATUS_CONFIG.pending;
  const OverallIcon = overallStatus.icon;

  return (
    <Card className="bg-[#18191A] border-gray-800 text-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <CardTitle className="text-sm font-medium text-white truncate">
                {suggestion.campaignName}
              </CardTitle>
              <Badge className={`${overallStatus.bg} ${overallStatus.color} border-0 text-[10px]`}>
                <OverallIcon size={10} className="mr-1" />
                {overallStatus.label}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 line-clamp-2">{suggestion.summary}</p>
          </div>
          <div className="text-[10px] text-gray-600 shrink-0">
            {new Date(suggestion.createdAt).toLocaleDateString('pt-BR')}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {suggestion.suggestions.map((item) => {
          const config = ACTION_CONFIG[item.type] || ACTION_CONFIG.pause;
          const ActionIcon = config.icon;
          const itemStatus = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
          const ItemStatusIcon = itemStatus.icon;
          const isPending = item.status === 'pending';

          return (
            <div
              key={item.id}
              className={`${config.bg} border rounded-lg p-3`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <ActionIcon size={14} className={config.color} />
                  <span className="text-sm font-medium text-white">{item.title}</span>
                </div>
                <Badge className={`${itemStatus.bg} ${itemStatus.color} border-0 text-[10px]`}>
                  <ItemStatusIcon size={10} className="mr-1" />
                  {itemStatus.label}
                </Badge>
              </div>

              <p className="text-xs text-gray-300 mb-3 leading-relaxed">{item.description}</p>

              {item.error && (
                <p className="text-xs text-red-400 mb-2 bg-red-900/20 p-2 rounded">
                  ⚠️ {item.error}
                </p>
              )}

              {isPending && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs flex-1"
                    onClick={() => handleAction(item.id, 'approve')}
                    disabled={!!processing}
                  >
                    {processing === item.id ? (
                      <Loader2 size={12} className="animate-spin mr-1" />
                    ) : (
                      <Check size={12} className="mr-1" />
                    )}
                    Aprovar e Aplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-gray-400 hover:text-red-400 hover:bg-red-900/20 text-xs"
                    onClick={() => handleAction(item.id, 'reject')}
                    disabled={!!processing}
                  >
                    <X size={12} className="mr-1" />
                    Recusar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}