"use client";

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { ArrowLeft, Calendar, RefreshCw, Loader2, AlertCircle, TrendingUp, MessageSquare, MousePointerClick, Eye, DollarSign, BarChart3, Target, Users, User, Info } from 'lucide-react';
import { getObjectiveConfig } from '@/lib/campaign-objectives';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

function MetricCard({ title, value, icon, sub }: { title: string; value: string; icon: React.ReactNode; sub?: string }) {
  return (
    <Card className="bg-[#18191A] border-gray-800 text-white">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-gray-500">{icon}</div>
          <p className="text-xs text-gray-400">{title}</p>
        </div>
        <h3 className="text-lg font-bold">{value}</h3>
        {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function CampaignDetail({ params }: { params: Promise<{ slug: string; campaignId: string }> }) {
  const { slug, campaignId } = use(params);
  const router = useRouter();
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/dashboard/${slug}/campaigns/${campaignId}?period=${p}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erro ao carregar dados');
      } else {
        setData(json);
      }
    } catch {
      setError('Falha ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  }, [slug, campaignId]);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0B0D] text-white">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4 text-blue-500" />
          <p>Carregando detalhes da campanha...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0B0D] text-white">
        <Card className="bg-[#18191A] border-gray-800 p-8 max-w-md text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erro ao carregar detalhes</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => fetchData(period)} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw size={16} className="mr-2" />
              Tentar novamente
            </Button>
            <Button variant="ghost" onClick={() => router.back()} className="text-gray-400 hover:text-white">
              <ArrowLeft size={16} className="mr-2" />
              Voltar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const totals = data?.totals || {};
  const genderBreakdown = data?.genderBreakdown || [];
  const ageBreakdown = data?.ageBreakdown || [];
  const adSets = data?.adSets || [];
  const ads = data?.ads || [];
  const daily = data?.daily || [];
  const clientName = data?.clientName || 'Cliente';

  const objective = totals.objective || 'UNKNOWN';
  const objConfig = getObjectiveConfig(objective);

  const chartData = daily.map((d: any) => ({
    name: d.date,
    Investimento: d.spend,
    Mensagens: d.messages,
    Cliques: d.clicks,
  }));

  const genderChartData = genderBreakdown.map((g: any) => ({
    name: g.label,
    Investimento: g.spend,
    Cliques: g.clicks,
    Mensagens: g.messages,
    Impressões: g.impressions,
  }));

  const ageChartData = ageBreakdown.map((a: any) => ({
    name: a.ageRange,
    Investimento: a.spend,
    Cliques: a.clicks,
    Mensagens: a.messages,
  }));

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0B0D] text-white font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#18191A] p-4">
        <div className="max-w-[1600px] mx-auto w-full">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                onClick={() => router.push(`/dashboard/${slug}`)}
              >
                <ArrowLeft size={18} />
              </Button>
              <div>
                <p className="text-xs text-blue-400">{clientName}</p>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white tracking-tight truncate max-w-[500px]">
                    Detalhes da Campanha
                  </h1>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${objConfig.bgColor} ${objConfig.color}`}>
                    {objConfig.icon} {objConfig.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{objConfig.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                onClick={() => fetchData(period)}
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
        </div>
      </header>

      <main className="flex-1 p-4 max-w-[1600px] mx-auto w-full space-y-4 overflow-y-auto">
        {/* Dica do Objetivo */}
        <div className={`p-3 rounded-lg border ${objConfig.bgColor} flex items-start gap-2`}>
          <Info size={16} className={`${objConfig.color} mt-0.5 shrink-0`} />
          <div>
            <p className={`text-xs font-medium ${objConfig.color}`}>Métricas-chave para {objConfig.label}:</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{objConfig.optimizationTip}</p>
          </div>
        </div>

        {/* Métricas Principais - adaptadas ao objetivo */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard title="Investimento" value={formatCurrency(totals.spend || 0)} icon={<DollarSign size={14} />} />
          <MetricCard title="Mensagens" value={totals.messages?.toString() || '0'} icon={<MessageSquare size={14} />} sub={totals.messageRate ? `${totals.messageRate.toFixed(1)}% taxa` : undefined} />
          <MetricCard title="Cliques" value={formatNumber(totals.clicks || 0)} icon={<MousePointerClick size={14} />} />
          <MetricCard title="Alcance" value={formatNumber(totals.reach || 0)} icon={<Target size={14} />} />
          <MetricCard title="Impressões" value={formatNumber(totals.impressions || 0)} icon={<Eye size={14} />} />
          <MetricCard title="CTR" value={totals.ctr ? `${totals.ctr.toFixed(2)}%` : '0,00%'} icon={<TrendingUp size={14} />} />
        </div>

        {/* Métricas Secundárias */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard title="CPM" value={totals.cpm ? formatCurrency(totals.cpm) : 'R$ 0,00'} icon={<BarChart3 size={14} />} sub="Custo por mil impressões" />
          <MetricCard title="CPC" value={totals.cpc ? formatCurrency(totals.cpc) : 'R$ 0,00'} icon={<MousePointerClick size={14} />} sub="Custo por clique" />
          <MetricCard title="Custo por Mensagem" value={totals.costPerMessage ? formatCurrency(totals.costPerMessage) : 'R$ 0,00'} icon={<MessageSquare size={14} />} />
          <MetricCard title="Frequência" value={totals.frequency?.toFixed(2) || '0'} icon={<Eye size={14} />} sub="Média de vezes por pessoa" />
        </div>

        {/* Gráfico de Performance Diária */}
        <Card className="bg-[#18191A] border-gray-800 text-white">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-300">Performance Diária</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="campColorInvest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="campColorMsg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                  <Area type="monotone" dataKey="Investimento" stroke="#10B981" fillOpacity={1} fill="url(#campColorInvest)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Mensagens" stroke="#3B82F6" fillOpacity={1} fill="url(#campColorMsg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gênero e Idade */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-[#18191A] border-gray-800 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Users size={16} className="text-purple-400" />
                Distribuição por Gênero
              </CardTitle>
            </CardHeader>
            <CardContent>
              {genderBreakdown.length > 0 ? (
                <>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={genderChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                        <Legend />
                        <Bar dataKey="Investimento" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Mensagens" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {genderBreakdown.map((g: any, i: number) => {
                      const totalGenderSpend = genderBreakdown.reduce((sum: number, item: any) => sum + item.spend, 0);
                      const percentage = totalGenderSpend > 0 ? ((g.spend / totalGenderSpend) * 100).toFixed(1) : '0';
                      return (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <User size={14} className={g.gender === 'male' ? 'text-blue-400' : g.gender === 'female' ? 'text-pink-400' : 'text-gray-400'} />
                            <span className="text-gray-300">{g.label}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-gray-400">{formatCurrency(g.spend)} ({percentage}%)</span>
                            <span className="text-blue-400">{g.messages} msgs</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">Dados de gênero não disponíveis</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#18191A] border-gray-800 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Users size={16} className="text-green-400" />
                Distribuição por Idade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ageBreakdown.length > 0 ? (
                <>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ageChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                        <Legend />
                        <Bar dataKey="Investimento" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Mensagens" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {ageBreakdown.map((a: any, i: number) => (
                      <div key={i} className="bg-[#242526] rounded p-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400">{a.ageRange}</span>
                          <span className="text-green-400 font-medium">{formatCurrency(a.spend)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{a.messages} mensagens</span>
                          <span className="text-gray-500">{a.clicks} cliques</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">Dados de idade não disponíveis</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Anúncios */}
        <Card className="bg-[#18191A] border-gray-800 text-white">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Eye size={16} className="text-blue-400" />
              Anúncios ({ads.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-transparent">
                    <TableHead className="text-gray-400 w-[300px]">Anúncio</TableHead>
                    <TableHead className="text-gray-400 text-right">Investimento</TableHead>
                    <TableHead className="text-gray-400 text-right">Impressões</TableHead>
                    <TableHead className="text-gray-400 text-right">Cliques</TableHead>
                    <TableHead className="text-gray-400 text-right">Alcance</TableHead>
                    <TableHead className="text-gray-400 text-right">Mensagens</TableHead>
                    <TableHead className="text-gray-400 text-right">CTR</TableHead>
                    <TableHead className="text-gray-400 text-right">CPC</TableHead>
                    <TableHead className="text-gray-400 text-right">CPM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                        Nenhum anúncio encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    ads.map((ad: any) => {
                      const pctSpend = totals.spend > 0 ? ((ad.spend / totals.spend) * 100).toFixed(1) : '0';
                      return (
                        <TableRow key={ad.id} className="border-gray-800 hover:bg-[#242526]">
                          <TableCell className="font-medium text-sm text-gray-300 max-w-[300px] truncate">
                            {ad.name}
                            <span className="text-[10px] text-gray-600 ml-2">{pctSpend}% do orçamento</span>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(ad.spend)}</TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{formatNumber(ad.impressions)}</TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{formatNumber(ad.clicks)}</TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{formatNumber(ad.reach)}</TableCell>
                          <TableCell className="text-right text-sm text-blue-400 font-medium">{ad.messages}</TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{ad.ctr.toFixed(2)}%</TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{formatCurrency(ad.cpc)}</TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{formatCurrency(ad.cpm)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Ad Sets */}
        <Card className="bg-[#18191A] border-gray-800 text-white">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Target size={16} className="text-orange-400" />
              Conjuntos de Anúncios ({adSets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-transparent">
                    <TableHead className="text-gray-400 w-[300px]">Conjunto</TableHead>
                    <TableHead className="text-gray-400 text-right">Investimento</TableHead>
                    <TableHead className="text-gray-400 text-right">Impressões</TableHead>
                    <TableHead className="text-gray-400 text-right">Cliques</TableHead>
                    <TableHead className="text-gray-400 text-right">Alcance</TableHead>
                    <TableHead className="text-gray-400 text-right">Mensagens</TableHead>
                    <TableHead className="text-gray-400 text-right">CTR</TableHead>
                    <TableHead className="text-gray-400 text-right">CPC</TableHead>
                    <TableHead className="text-gray-400 text-right">CPM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adSets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                        Nenhum conjunto de anúncio encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    adSets.map((adSet: any) => {
                      const pctSpend = totals.spend > 0 ? ((adSet.spend / totals.spend) * 100).toFixed(1) : '0';
                      return (
                        <TableRow key={adSet.id} className="border-gray-800 hover:bg-[#242526]">
                          <TableCell className="font-medium text-sm text-gray-300 max-w-[300px] truncate">
                            {adSet.name}
                            <span className="text-[10px] text-gray-600 ml-2">{pctSpend}%</span>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(adSet.spend)}</TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{formatNumber(adSet.impressions)}</TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{formatNumber(adSet.clicks)}</TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{formatNumber(adSet.reach)}</TableCell>
                          <TableCell className="text-right text-sm text-blue-400 font-medium">{adSet.messages}</TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{adSet.ctr.toFixed(2)}%</TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{formatCurrency(adSet.cpc)}</TableCell>
                          <TableCell className="text-right text-sm text-gray-300">{formatCurrency(adSet.cpm)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}