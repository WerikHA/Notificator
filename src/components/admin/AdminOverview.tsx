"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { RefreshCw, Loader2, BarChart3, TrendingUp, MessageSquare, DollarSign, Clock, Zap } from 'lucide-react';
import ClientOverviewCard from './ClientOverviewCard';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

interface Campaign {
  id: string;
  name: string;
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

interface ClientOverview {
  client: Client;
  metrics: Metrics | null;
  campaigns: Campaign[];
  suggestions: Suggestion[];
  status: string;
  error?: string;
}

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cached, setCached] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [nextRefresh, setNextRefresh] = useState<string | null>(null);

  const fetchOverview = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = forceRefresh
        ? '/api/admin/overview?forceRefresh=true'
        : '/api/admin/overview';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
        setCached(data.cached || false);
        setGeneratedAt(data.generatedAt || null);
        setNextRefresh(data.nextRefresh || null);

        if (forceRefresh) {
          toast.success('Dados atualizados com sucesso!');
        } else if (data.cached) {
          console.log('Dados em cache. Proxima atualizacao:', data.nextRefresh);
        }
      } else {
        toast.error('Erro ao carregar visao geral');
      }
    } catch {
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const totalSpend = clients.reduce((sum, c) => sum + (c.metrics?.spend || 0), 0);
  const totalMessages = clients.reduce((sum, c) => sum + (c.metrics?.messages || 0), 0);
  const totalImpressions = clients.reduce((sum, c) => sum + (c.metrics?.impressions || 0), 0);
  const activeClients = clients.filter((c) => c.status !== 'inactive').length;
  const avgHealth = clients.filter((c) => c.suggestions[0]).reduce((sum, c) => sum + (c.suggestions[0]?.healthScore || 0), 0) / (clients.filter((c) => c.suggestions[0]).length || 1);

  const formatTimeUntil = (isoDate: string) => {
    const diff = new Date(isoDate).getTime() - Date.now();
    if (diff <= 0) return 'Atualizando...';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return hours + 'h ' + minutes + 'min';
    return minutes + 'min';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Carregando dados dos clientes...</p>
          <p className="text-xs text-gray-600 mt-1">Isso pode levar alguns segundos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner de Cache */}
      {cached && (
        <Card className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-blue-800/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600/30 rounded-lg flex items-center justify-center">
                  <Clock size={16} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Dados em cache</p>
                  <p className="text-xs text-gray-400">
                    Gerado em {generatedAt ? new Date(generatedAt).toLocaleString('pt-BR') : '-'}
                    {nextRefresh && (
                      <span className="ml-2 text-blue-400">
                        • Proxima atualizacao em {formatTimeUntil(nextRefresh)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent border-blue-700 text-blue-400 hover:bg-blue-900/30 h-8"
                onClick={() => fetchOverview(true)}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 size={14} className="animate-spin mr-2" />
                ) : (
                  <Zap size={14} className="mr-2" />
                )}
                {refreshing ? 'Atualizando...' : 'Atualizar Agora'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-[#18191A] border-gray-800 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={14} className="text-blue-400" />
              <span className="text-[10px] text-gray-500 uppercase">Total Investido</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(totalSpend)}</p>
            <p className="text-[10px] text-gray-500">{activeClients} conta(s) ativa(s)</p>
          </CardContent>
        </Card>
        <Card className="bg-[#18191A] border-gray-800 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={14} className="text-green-400" />
              <span className="text-[10px] text-gray-500 uppercase">Total Mensagens</span>
            </div>
            <p className="text-lg font-bold">{formatNumber(totalMessages)}</p>
            <p className="text-[10px] text-gray-500">Ultimos 30 dias</p>
          </CardContent>
        </Card>
        <Card className="bg-[#18191A] border-gray-800 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-purple-400" />
              <span className="text-[10px] text-gray-500 uppercase">Impressoes</span>
            </div>
            <p className="text-lg font-bold">{formatNumber(totalImpressions)}</p>
            <p className="text-[10px] text-gray-500">Ultimos 30 dias</p>
          </CardContent>
        </Card>
        <Card className="bg-[#18191A] border-gray-800 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className="text-yellow-400" />
              <span className="text-[10px] text-gray-500 uppercase">Saude Media</span>
            </div>
            <p className={`text-lg font-bold ${avgHealth >= 75 ? 'text-green-400' : avgHealth >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {Math.round(avgHealth)}/100
            </p>
            <p className="text-[10px] text-gray-500">Score da IA</p>
          </CardContent>
        </Card>
      </div>

      {/* Botao Atualizar Tudo */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-300">
          Visao Geral dos Clientes ({clients.length})
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="bg-[#242526] border-gray-700 text-gray-300 hover:bg-[#2F3033]"
          onClick={() => fetchOverview(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 size={14} className="animate-spin mr-2" />
          ) : (
            <RefreshCw size={14} className="mr-2" />
          )}
          {refreshing ? 'Atualizando...' : 'Atualizar Todos'}
        </Button>
      </div>

      {/* Cards dos Clientes */}
      {clients.length === 0 ? (
        <Card className="bg-[#18191A] border-gray-800 text-white">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 size={48} className="text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">Nenhum cliente cadastrado</p>
            <p className="text-gray-500 text-sm mt-1">Crie um cliente no painel para comecar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {clients.map((item) => (
            <ClientOverviewCard
              key={item.client.id}
              client={item.client}
              metrics={item.metrics}
              campaigns={item.campaigns}
              suggestions={item.suggestions}
              status={item.status}
              error={item.error}
              onRefresh={() => fetchOverview(true)}
            />
          ))}
        </div>
      )}
    </div>
  );
}