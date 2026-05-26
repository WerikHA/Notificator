"use client";

import { useState, useEffect, useCallback } from 'react';
import SparklineChart from '@/components/ui/SparklineChart';
import FunnelChart from '@/components/FunnelChart';
import { Settings, Download, Calendar, Database, Cloud, Code, AlertCircle, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

export default function Dashboard() {
  const [period, setPeriod] = useState('30d');
  const [source, setSource] = useState('auto');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async (p: string, s: string) => {
    setLoading(true);
    setData(null); // Garante que dados antigos não apareçam misturados
    try {
      const res = await fetch(`/api/meta/metrics?period=${p}&source=${s}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch metrics', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(period, source);
  }, [period, source, fetchMetrics]);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-screen bg-[#0A0B0D] text-white">Carregando dados...</div>;
  }

  const campaigns = data?.campaigns || [];
  const daily = data?.daily || [];
  const totals = data?.totals || {};
  const currentSource = data?.source || source;

  const sparklineDataSpend = daily.map((d: any) => d.spend || 0);
  const sparklineDataMessages = daily.map((d: any) => d.messages || 0);
  const sparklineDataClicks = daily.map((d: any) => d.clicks || 0);
  const sparklineDataReach = daily.map((d: any) => d.reach || 0);
  const sparklineDataImpressions = daily.map((d: any) => d.impressions || 0);

  const areaData = daily.map((d: any) => ({
    name: d.date,
    Investimento: d.spend,
    Mensagens: d.messages,
  }));

  const pieData = campaigns.map((c: any) => ({
    name: c.adName ? (c.adName.length > 15 ? c.adName.substring(0, 15) + '...' : c.adName) : 'Desconhecido',
    value: c.messages || 0,
  }));
  
  const COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE'];

  const getSourceLabel = () => {
    switch(currentSource) {
      case 'manual': return 'Dados Manuais';
      case 'meta': return 'Integração Meta Ads';
      default: return 'Simulação (Mock)';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0B0D] text-white font-sans">
      <header className="border-b border-gray-800 bg-[#18191A] p-4">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
               <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2">
                 <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                 <path d="M8 12l3 3 5-5" />
               </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Meta</h1>
              <p className="text-xs text-gray-400">Relatório Meta Ads | Omini Catanduva</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
             <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"><Settings size={16} /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"><Download size={16} /></Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                  onClick={() => fetchMetrics(period, source)}
                  disabled={loading}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </Button>
             </div>
             
             <Select value={source} onValueChange={setSource}>
               <SelectTrigger className="w-[200px] h-8 bg-[#242526] border-gray-700 text-sm text-gray-300">
                 {currentSource === 'meta' ? <Cloud size={14} className="mr-2 text-blue-400" /> : currentSource === 'manual' ? <Code size={14} className="mr-2 text-green-400" /> : <Database size={14} className="mr-2 text-gray-400" />}
                 <SelectValue placeholder="Fonte de Dados" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="auto">
                   <div className="flex items-center gap-2">
                     <Database size={14} className="text-gray-400" />
                     <span>Automático (Fallback)</span>
                   </div>
                 </SelectItem>
                 <SelectItem value="meta">
                   <div className="flex items-center gap-2">
                     <Cloud size={14} className="text-blue-400" />
                     <span>Integração Meta Ads</span>
                   </div>
                 </SelectItem>
                 <SelectItem value="manual">
                   <div className="flex items-center gap-2">
                     <Code size={14} className="text-green-400" />
                     <span>Dados Manuais (POST)</span>
                   </div>
                 </SelectItem>
               </SelectContent>
             </Select>

             <Select value={period} onValueChange={setPeriod}>
               <SelectTrigger className="w-[160px] h-8 bg-[#242526] border-gray-700 text-sm text-gray-300">
                 <Calendar size={14} className="mr-2" />
                 <SelectValue placeholder="Período" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="7d">Últimos 7 dias</SelectItem>
                 <SelectItem value="15d">Últimos 15 dias</SelectItem>
                 <SelectItem value="30d">Últimos 30 dias</SelectItem>
               </SelectContent>
             </Select>
          </div>
        </div>
        
        <div className="max-w-[1600px] mx-auto w-full mt-2">
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#242526] rounded text-xs text-gray-400">
            <div className={`w-2 h-2 rounded-full ${currentSource === 'meta' ? 'bg-blue-400' : currentSource === 'manual' ? 'bg-green-400' : 'bg-gray-500'}`}></div>
            Fonte: {getSourceLabel()}
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-[1600px] mx-auto w-full space-y-4 overflow-y-auto">
        {data?.status === 'config-required' && (
          <div className="bg-blue-900/30 border border-blue-800 p-4 rounded text-sm text-blue-200">
            <strong>Configuração necessária:</strong> Adicione as variáveis `META_ADS_ACCESS_TOKEN` e `META_ADS_ACCOUNT_ID` no seu ambiente para ativar a integração automática.
          </div>
        )}
        
        {data?.error && data?.status !== 'config-required' && (
          <div className="bg-red-900/30 border border-red-800 p-4 rounded text-sm text-red-200 flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <strong>Erro na Integração Meta Ads:</strong>
              <p className="mt-1 opacity-90">{data.error}</p>
              <p className="mt-1 text-xs opacity-70">Verifique se o Token de Acesso é válido e não expirou.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard title="Investimento" value={totals.spend ? formatCurrency(totals.spend) : 'R$ 0,00'} change={totals.spendChange || 0} data={sparklineDataSpend} color="#EF4444" />
          <MetricCard title="Mensagens Iniciadas" value={totals.messages?.toString() || '0'} change={totals.messagesChange || 0} data={sparklineDataMessages} color="#10B981" />
          <MetricCard title="Cliques" value={totals.clicks ? formatNumber(totals.clicks) : '0'} change={totals.clicksChange || 0} data={sparklineDataClicks} color="#3B82F6" />
          <MetricCard title="Alcance" value={totals.reach ? formatNumber(totals.reach) : '0'} change={totals.reachChange || 0} data={sparklineDataReach} color="#8B5CF6" />
          <MetricCard title="Impressões" value={totals.impressions ? formatNumber(totals.impressions) : '0'} change={totals.impressionsChange || 0} data={sparklineDataImpressions} color="#F59E0B" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3">
            <FunnelChart 
              mainSteps={[
                { label: 'Impressões', value: totals.impressions ? formatNumber(totals.impressions) : '0', width: 100 },
                { label: 'Alcance', value: totals.reach ? formatNumber(totals.reach) : '0', width: 80 },
                { label: 'Cliques', value: totals.clicks ? formatNumber(totals.clicks) : '0', width: 50 },
                { label: 'Mensagens', value: totals.messages?.toString() || '0', width: 35 },
              ]}
              sideSteps={[
                { label: 'Video View 25%', value: totals.funnelVideo25 ? formatNumber(totals.funnelVideo25) : '0' },
                { label: 'Video View 75%', value: totals.funnelVideo75 ? formatNumber(totals.funnelVideo75) : '0' },
                { label: 'Taxa de Cliques (CTR)', value: totals.ctr ? `${totals.ctr}%` : '0,00%' },
                { label: 'Taxa de Mensagens', value: totals.messageRate ? `${totals.messageRate}%` : '0,00%' },
              ]}
              bottomMetrics={[
                { label: 'Video View Rate', value: totals.vvr ? `${totals.vvr}%` : '0,00%' },
                { label: 'Frequência', value: totals.frequency?.toString() || '0' },
                { label: 'CPM', value: totals.cpm ? `R$ ${totals.cpm}` : 'R$ 0,00' },
              ]}
            />
          </div>

          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
               <CostCard title="Custo por Mensagem" value={totals.costPerMessage ? formatCurrency(totals.costPerMessage) : 'R$ 0,00'} change={117.6} progress={65} progressColor="bg-green-500" target="R$ 7,57" />
               <CostCard title="Custo por Clique (CPC)" value={totals.cpc ? formatCurrency(totals.cpc) : 'R$ 0,00'} change={175.6} progress={80} progressColor="bg-red-500" target="R$ 2,62" />
            </div>
            
            <Card className="flex-1 bg-[#18191A] border-gray-800 text-white">
              <CardContent className="p-4 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" tick={{fill: '#9CA3AF', fontSize: 10}} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{fill: '#9CA3AF', fontSize: 10}} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff'}} />
                    <Area type="monotone" dataKey="Investimento" stroke="#10B981" fillOpacity={1} fill="url(#colorInvest)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Mensagens" stroke="#3B82F6" fillOpacity={1} fill="url(#colorMsg)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="h-full bg-[#18191A] border-gray-800 text-white">
              <CardContent className="flex flex-col items-center justify-center h-full">
                <div className="w-full h-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                        {pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff'}} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 bg-[#18191A] rounded-full flex items-center justify-center">
                      <span className="text-xs text-gray-400">Total</span>
                    </div>
                  </div>
                </div>
                <div className="w-full mt-4 space-y-1">
                  {pieData.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                        <span className="text-gray-400 truncate w-24">{entry.name}</span>
                      </div>
                      <span className="text-gray-300">{totals.messages ? ((entry.value / totals.messages) * 100).toFixed(1) : 0}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-[#18191A] border-gray-800 text-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-transparent">
                    <TableHead className="text-gray-400 w-[300px]">Campanhas</TableHead>
                    <TableHead className="text-gray-400">Conjuntos</TableHead>
                    <TableHead className="text-gray-400">Anúncios</TableHead>
                    <TableHead className="text-gray-400 text-right">Investimento</TableHead>
                    <TableHead className="text-gray-400 text-right">Cliques</TableHead>
                    <TableHead className="text-gray-400 text-right">Mensagens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((camp: any) => (
                    <TableRow key={camp.id || Math.random()} className="border-gray-800 hover:bg-[#242526]">
                      <TableCell className="font-medium text-sm text-gray-300">{camp.campaignName}</TableCell>
                      <TableCell className="text-sm text-gray-400">{camp.adSetName}</TableCell>
                      <TableCell className="text-sm text-gray-400">{camp.adName}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(camp.spend)}</TableCell>
                      <TableCell className="text-right text-sm text-gray-300">{camp.clicks}</TableCell>
                      <TableCell className="text-right text-sm text-blue-400 font-medium">{camp.messages}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="p-3 flex justify-between items-center text-xs text-gray-500 border-t border-gray-800">
              <span>1 - {campaigns.length} / {campaigns.length}</span>
              <div className="flex gap-2">
                <button className="hover:text-white">{'<'}</button>
                <button className="hover:text-white">{'>'}</button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function MetricCard({ title, value, change, data, color }: { title: string, value: string, change: number, data: number[], color: string }) {
  const isPositive = change > 0;
  return (
    <Card className="bg-[#18191A] border-gray-800 text-white hover:bg-[#1F2022] transition-colors cursor-pointer">
      <CardContent className="p-3">
        <p className="text-xs text-gray-400 mb-1">{title}</p>
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-lg font-bold">{value}</h3>
            <div className={`flex items-center text-xs mt-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              <span className="mr-1">{isPositive ? '↑' : '↓'}</span>
              {Math.abs(change)}%
            </div>
          </div>
          <div className="w-24 h-10 mb-1">
            <SparklineChart data={data} color={color} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CostCard({ title, value, change, progress, progressColor, target }: { title: string, value: string, change: number, progress: number, progressColor: string, target: string }) {
  return (
    <Card className="bg-[#18191A] border-gray-800 text-white p-3">
      <p className="text-xs text-gray-400 mb-1">{title}</p>
      <div className="flex justify-between items-end mb-1">
        <h3 className="text-lg font-bold">{value}</h3>
        <span className="text-green-500 text-xs font-medium">{change}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden">
        <div className={`h-full ${progressColor} rounded-l-full`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
        <span className="absolute right-2 top-1 text-[10px] text-gray-400">{target}</span>
      </div>
    </Card>
  );
}