"use client";

import { useState, useEffect } from 'react';
import MetricCard from '@/components/MetricCard';
import PerformanceChart from '@/components/PerformanceChart';
import CampaignTable from '@/components/CampaignTable';
import { Wallet, MousePointer, TrendingUp, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CampaignMetric, DailyMetric } from '@/lib/mock-meta-data';
import { toast } from 'sonner';

export default function Dashboard() {
  const [period, setPeriod] = useState('30d');
  const [campaigns, setCampaigns] = useState<CampaignMetric[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/meta/metrics?period=${period}`);
        if (!res.ok) throw new Error('Falha ao buscar dados');
        
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        setDailyMetrics(data.daily || []);

        if (data.status === 'mock') {
          toast.warning('Usando dados de demonstração. Configure a API Key.');
        } else {
          toast.success('Métricas atualizadas com sucesso!');
        }
      } catch (error) {
        console.error('Erro ao carregar métricas:', error);
        toast.error('Erro ao carregar métricas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period]);

  // Cálculos baseados nos dados carregados
  const totalSpend = campaigns.reduce((acc, curr) => acc + curr.spend, 0);
  const totalImpressions = campaigns.reduce((acc, curr) => acc + curr.impressions, 0);
  const totalClicks = campaigns.reduce((acc, curr) => acc + curr.clicks, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgRoas = campaigns.length > 0 ? campaigns.reduce((acc, curr) => acc + curr.roas, 0) / campaigns.length : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0668E1] rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">Meta</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Central de Métricas</h1>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard 
            title="Gasto Total" 
            value={`R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            change={{ value: '12,5%', positive: true }}
            icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          />
          <MetricCard 
            title="Impressões" 
            value={totalImpressions.toLocaleString('pt-BR')} 
            change={{ value: '8,2%', positive: true }}
            icon={<Eye className="h-4 w-4 text-muted-foreground" />}
          />
          <MetricCard 
            title="CTR Médio" 
            value={`${avgCtr.toFixed(2)}%`} 
            change={{ value: '0,4%', positive: true }}
            icon={<MousePointer className="h-4 w-4 text-muted-foreground" />}
          />
          <MetricCard 
            title="ROAS Médio" 
            value={`${avgRoas.toFixed(1)}x`} 
            change={{ value: '1,8%', positive: false }}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <div className="grid gap-4">
          <PerformanceChart data={dailyMetrics} />
        </div>

        <CampaignTable data={campaigns} />
      </main>
    </div>
  );
}