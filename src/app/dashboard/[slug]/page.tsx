"use client";

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import SparklineChart from '@/components/ui/SparklineChart';
import FunnelChart from '@/components/FunnelChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Calendar, RefreshCw, AlertCircle, Loader2, ExternalLink, Users, User, Target } from 'lucide-react';
import { usePdfDownload } from '@/hooks/use-pdf-download';
import { toast } from 'sonner';
import { getObjectiveConfig, getObjectiveSummary, groupCampaignsByObjective } from '@/lib/campaign-objectives';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

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

export default function ClientDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { generatePdf, generating } = usePdfDownload();

  const fetchMetrics = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/dashboard/${slug}/metrics?period=${p}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erro ao carregar dados');
      } else {
        setData(json);
      }
    } catch (err) {
      setError('Falha ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchMetrics(period);
  }, [period, fetchMetrics]);

  const handleDownloadPdf = async () => {
    const clientName = data?.clientName || 'relatorio';
    try {
      await generatePdf('dashboard-content', `${clientName}-${slug}`);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF. Tente novamente.');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0B0D] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0B0D] text-white">
        <Card className="bg-[#18191A] border-gray-800 p-8 max-w-md text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erro ao carregar dashboard</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={() => fetchMetrics(period)} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw size={16} className="mr-2" />
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  const campaigns = data?.campaigns || [];
  const daily = data?.daily || [];
  const totals = data?.totals || {};
  const genderBreakdown = data?.genderBreakdown || [];
  const ageBreakdown = data?.ageBreakdown || [];
  const clientName = data?.clientName || 'Cliente';

  const objectiveSummary = getObjectiveSummary(campaigns);
  const objectiveGroups = groupCampaignsByObjective(campaigns);

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

  const GENDER_COLOR_MAP: Record<string, string> = {
    male: '#3B82F6',
    female: '#EC4899',
    unknown: '#6B7280',
  };
  const GENDER_ORDER = ['male', 'female', 'unknown'];

  const sortedGenderBreakdown = [...genderBreakdown].sort(
    (a: any, b: any) => GENDER_ORDER.indexOf(a.gender) - GENDER_ORDER.indexOf(b.gender)
  );

  const genderPieData = sortedGenderBreakdown.map((g: any) => ({
    name: g.label,
    gender: g.gender,
    value: g.impressions || 0,
    messages: g.messages || 0,
    spend: g.spend || 0,
  }));

  const ageChartData = ageBreakdown.map((a: any) => ({
    name: a.ageRange,
    Investimento: a.spend,
    Mensagens: a.messages,
    Cliques: a.clicks,
  }));

  const OBJ_COLORS: Record<string, string> = {
    OUTCOME_AWARENESS: '#A78BFA',
    OUTCOME_ENGAGEMENT: '#60A5FA',
    OUTCOME_TRAFFIC: '#34D399',
    OUTCOME_LEADS: '#FBBF24',
    OUTCOME_SALES: '#F87171',
    OUTCOME_APP_PROMOTION: '#22D3EE',
    UNKNOWN: '#6B7280',
  };

  const objectivePieData = objectiveSummary.map((o) => ({
    name: getObjectiveConfig(o.objective).shortLabel,
    value: o.totalSpend,
    objective: o.objective,
    count: o.count,
    messages: o.totalMessages,
  }));

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
              <h1 className="text-xl font-bold text-white tracking-tight">{clientName}</h1>
              <p className="text-xs text-gray-400">Relatório Meta Ads</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white border-green-600"
              onClick={handleDownloadPdf}
              disabled={generating || loading}
            >
              {generating ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : (
                <Download size={14} className="mr-2" />
              )}
              {generating ? 'Gerando...' : 'Baixar PDF'}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={() => fetchMetrics(period)}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>

            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px] h-8 bg-[#242526] border-gray-700 text-sm text-gray-300">
                <Calendar size={14} className="mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="15d">Últimos 15 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main id="dashboard-content" className="flex-1 p-4 max-w-[1600px] mx-auto w-full space-y-4 overflow-y-auto">
        {data?.status === 'config-required' && (
          <div className="bg-blue-900/30 border border-blue-800 p-4 rounded text-sm text-blue-200">
            <strong>Configuração necessária:</strong> Verifique as credenciais da conta de anúncios.
          </div>
        )}

        {data?.error && data?.status !== 'config-required' && (
          <div className="bg-red-900/30 border border-red-800 p-4 rounded text-sm text-red-200 flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <strong>Erro na Integração Meta Ads:</strong>
              <p className="mt-1 opacity-90">{data.error}</p>
            </div>
          </div>
        )}

        {/* Resumo por Objetivo */}
        {objectiveSummary.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {objectiveSummary.map((o) => {
              const config = getObjectiveConfig(o.objective);
              return (
                <div key={o.objective} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bgColor}`}>
                  <span className="text-sm">{config.icon}</span>
                  <div>
                    <p className={`text-xs font-medium ${config.color}`}>{config.label}</p>
                    <p className="text-[10px] text-gray-500">
                      {o.count} campanha(s) • {formatCurrency(o.totalSpend)} • {o.totalMessages} msgs
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Métricas Principais */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard title="Investimento" value={totals.spend ? formatCurrency(totals.spend) : 'R$ 0,00'} change={totals.spendChange || 0} data={sparklineDataSpend} color="#EF4444" />
          <MetricCard title="Mensagens Iniciadas" value={totals.messages?.toString() || '0'} change={totals.messagesChange || 0} data={sparklineDataMessages} color="#10B981" />
          <MetricCard title="Cliques" value={totals.clicks ? formatNumber(totals.clicks) : '0'} change={totals.clicksChange || 0} data={sparklineDataClicks} color="#3B82F6" />
          <MetricCard title="Alcance" value={totals.reach ? formatNumber(totals.reach) : '0'} change={totals.reachChange || 0} data={sparklineDataReach} color="#8B5CF6" />
          <MetricCard title="Impressões" value={totals.impressions ? formatNumber(totals.impressions) : '0'} change={totals.impressionsChange || 0} data={sparklineDataImpressions} color="#F59E0B" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Funil */}
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

          {/* Gráfico + Cards de Custo */}
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

          {/* Distribuição por Objetivo + Gênero */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Gráfico de Objetivos */}
            {objectivePieData.length > 0 && (
              <Card className="bg-[#18191A] border-gray-800 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Target size={16} className="text-orange-400" />
                    Por Objetivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="w-full h-36 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={objectivePieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2} dataKey="value">
                          {objectivePieData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={OBJ_COLORS[entry.objective] || '#6B7280'} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff'}}
                          formatter={(value: number) => [formatCurrency(value), 'Investimento']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full mt-2 space-y-1.5">
                    {objectivePieData.map((entry: any, index: number) => {
                      const totalSpend = objectivePieData.reduce((sum: number, item: any) => sum + item.value, 0);
                      const pct = totalSpend > 0 ? ((entry.value / totalSpend) * 100).toFixed(1) : '0';
                      const color = OBJ_COLORS[entry.objective] || '#6B7280';
                      return (
                        <div key={index} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-gray-400">{entry.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">{entry.count}x</span>
                            <span className="text-gray-300">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gênero */}
            <Card className="h-full bg-[#18191A] border-gray-800 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Users size={16} className="text-purple-400" />
                  Gênero
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                {genderPieData.length > 0 ? (
                  <>
                    <div className="w-full h-36 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={genderPieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2} dataKey="value">
                            {genderPieData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={GENDER_COLOR_MAP[entry.gender] || '#6B7280'} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff'}}
                            formatter={(value: number) => [`${formatNumber(value)} impressões`, 'Impressões']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full mt-3 space-y-1.5">
                      {genderPieData.map((entry: any, index: number) => {
                        const totalImpressions = genderPieData.reduce((sum: number, item: any) => sum + item.value, 0);
                        const percentage = totalImpressions > 0 ? ((entry.value / totalImpressions) * 100).toFixed(1) : '0';
                        const color = GENDER_COLOR_MAP[entry.gender] || '#6B7280';
                        return (
                          <div key={index} className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                              <User size={11} style={{ color }} />
                              <span className="text-gray-400">{entry.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-300">{formatNumber(entry.value)}</span>
                              <span className="text-gray-500">({percentage}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-8 text-sm">Dados de gênero não disponíveis</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Gráfico de Idade */}
        {ageChartData.length > 0 && (
          <Card className="bg-[#18191A] border-gray-800 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Users size={16} className="text-green-400" />
                Distribuição por Idade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                    <Legend />
                    <Bar dataKey="Investimento" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Mensagens" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {ageBreakdown.map((a: any, i: number) => (
                  <div key={i} className="bg-[#242526] rounded p-2 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-400 font-medium">{a.ageRange}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Invest.</span>
                        <span className="text-green-400">{formatCurrency(a.spend)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Msgs</span>
                        <span className="text-blue-400">{a.messages}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Cliques</span>
                        <span className="text-gray-300">{a.clicks}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Campanhas por Objetivo */}
        {Object.entries(objectiveGroups).map(([objective, camps]) => {
          const objConfig = getObjectiveConfig(objective);
          const borderColor = OBJ_COLORS[objective] || '#6B7280';
          return (
            <Card key={objective} className="bg-[#18191A] border-gray-800 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{objConfig.icon}</span>
                  <div>
                    <CardTitle className="text-sm font-medium text-gray-300">
                      {objConfig.label}
                    </CardTitle>
                    <p className="text-[11px] text-gray-500">{objConfig.description}</p>
                  </div>
                  <span className="ml-auto text-[11px] text-gray-500">{camps.length} campanha(s)</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700 hover:bg-transparent">
                        <TableHead className="text-gray-400 w-[300px]">Campanhas</TableHead>
                        <TableHead className="text-gray-400">Conjuntos</TableHead>
                        <TableHead className="text-gray-400 text-right">Investimento</TableHead>
                        <TableHead className="text-gray-400 text-right">Cliques</TableHead>
                        <TableHead className="text-gray-400 text-right">CTR</TableHead>
                        <TableHead className="text-gray-400 text-right">CPC</TableHead>
                        <TableHead className="text-gray-400 text-right">Mensagens</TableHead>
                        <TableHead className="text-gray-400 text-center w-[60px]">Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {camps.map((camp: any) => (
                        <TableRow key={camp.id || Math.random()} className="border-gray-800 hover:bg-[#242526]">
                          <TableCell className="font-medium text-sm">
                            <Link
                              href={`/dashboard/${slug}/campaign/${camp.campaignId || camp.id}`}
                              className="text-blue-400 hover:text-blue-300 hover:underline truncate block max-w-[280px]"
                            >
                              {camp.campaignName}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm text-gray-400">{camp.adSetName}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(camp.spend)}</TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{formatNumber(camp.clicks)}</TableCell>
                          <TableCell className="text-right text-sm">
                            <span className={
                              objective === 'OUTCOME_AWARENESS' 
                                ? 'text-gray-300'
                                : camp.ctr >= 1 ? 'text-green-400' : camp.ctr >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                            }>
                              {camp.ctr.toFixed(2)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{formatCurrency(camp.cpc)}</TableCell>
                          <TableCell className="text-right text-sm text-blue-400 font-medium">{camp.messages}</TableCell>
                          <TableCell className="text-center">
                            <Link
                              href={`/dashboard/${slug}/campaign/${camp.campaignId || camp.id}`}
                              className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                              title="Ver detalhes da campanha"
                            >
                              <ExternalLink size={14} />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}