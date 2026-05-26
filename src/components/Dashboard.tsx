"use client";

import { useState, useEffect } from 'react';
import { mockCampaigns, mockDailyMetrics, totalMetrics, DailyMetric } from '@/lib/mock-meta-data';
import SparklineChart from '@/components/ui/SparklineChart';
import FunnelChart from '@/components/FunnelChart';
import { Wallet, MousePointer, TrendingUp, Eye, MessageSquare, BarChart3, Users, ChevronDown, Download, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

// Dados simulados para os sparklines (gerados aleatoriamente para visual)
const sparklineDataSpend = [40, 35, 50, 45, 30, 60, 55, 40, 45, 30];
const sparklineDataMessages = [10, 15, 12, 8, 14, 18, 16, 12, 10, 8];
const sparklineDataClicks = [20, 25, 18, 22, 28, 30, 25, 20, 15, 12];
const sparklineDataReach = [50, 60, 55, 70, 80, 75, 90, 85, 95, 100];
const sparklineDataImpressions = [40, 42, 45, 48, 50, 52, 55, 58, 60, 62];

export default function Dashboard() {
  const [period, setPeriod] = useState('25d');

  // Dados para o gráfico de área (Investimento vs Mensagens)
  const areaData = mockDailyMetrics.map(d => ({
    name: d.date,
    Investimento: d.spend,
    Mensagens: d.messages,
  }));

  // Dados para o gráfico de rosca (Melhores Anúncios)
  const pieData = mockCampaigns.map(c => ({
    name: c.adName.length > 15 ? c.adName.substring(0, 15) + '...' : c.adName,
    value: c.messages,
  }));
  
  const COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE'];

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0B0D] text-white font-sans">
      {/* Header */}
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
             </div>
             
             <Select defaultValue="campaigns">
               <SelectTrigger className="w-[140px] h-8 bg-[#242526] border-gray-700 text-sm text-gray-300">
                 <BarChart3 size={14} className="mr-2" />
                 <SelectValue placeholder="Campanhas" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="campaigns">Campanhas</SelectItem>
                 <SelectItem value="ads">Anúncios</SelectItem>
               </SelectContent>
             </Select>

             <Select defaultValue="date">
               <SelectTrigger className="w-[200px] h-8 bg-[#242526] border-gray-700 text-sm text-gray-300">
                 <CalendarIcon size={14} className="mr-2" />
                 <SelectValue placeholder="1 de mai. de 2026 - 25 de mai." />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="7d">Últimos 7 dias</SelectItem>
                 <SelectItem value="25d">1 de mai. de 2026 - 25 de mai.</SelectItem>
               </SelectContent>
             </Select>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-[1600px] mx-auto w-full space-y-4 overflow-y-auto">
        {/* Top Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard title="Investimento" value={formatCurrency(totalMetrics.spend)} change={totalMetrics.spendChange} data={sparklineDataSpend} color="#EF4444" />
          <MetricCard title="Mensagens Iniciadas" value={totalMetrics.messages.toString()} change={totalMetrics.messagesChange} data={sparklineDataMessages} color="#10B981" />
          <MetricCard title="Cliques" value={formatNumber(totalMetrics.clicks)} change={totalMetrics.clicksChange} data={sparklineDataClicks} color="#3B82F6" />
          <MetricCard title="Alcance" value={formatNumber(totalMetrics.reach)} change={totalMetrics.reachChange} data={sparklineDataReach} color="#8B5CF6" />
          <MetricCard title="Impressões" value={formatNumber(totalMetrics.impressions)} change={totalMetrics.impressionsChange} data={sparklineDataImpressions} color="#F59E0B" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left: Funnel */}
          <div className="lg:col-span-3">
            <FunnelChart 
              mainSteps={[
                { label: 'Impressões', value: '316 mil', width: 100 },
                { label: 'Alcance', value: '171 mil', width: 80 },
                { label: 'Cliques', value: '280', width: 50 },
                { label: 'Mensagens', value: '145', width: 35 },
              ]}
              sideSteps={[
                { label: 'Video View 25%', value: '8.523' },
                { label: 'Video View 75%', value: '1.827' },
                { label: 'Taxa de Cliques (CTR)', value: '0,09%' },
                { label: 'Taxa de Mensagens Enviadas', value: '51,79%' },
              ]}
              bottomMetrics={[
                { label: 'Video View Rate', value: '8,54%' },
                { label: 'Frequência', value: '1,85' },
                { label: 'CPM', value: 'R$ 4,08' },
              ]}
            />
          </div>

          {/* Middle: Charts & Costs */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
               <CostCard title="Custo por Mensagem" value={formatCurrency(totalMetrics.costPerMessage)} change={117.6} progress={65} progressColor="bg-green-500" target="R$ 7,57" />
               <CostCard title="Custo por Clique (CPC)" value={formatCurrency(totalMetrics.cpc)} change={175.6} progress={80} progressColor="bg-red-500" target="R$ 2,62" />
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

          {/* Right: Donut Chart */}
          <div className="lg:col-span-3">
            <Card className="h-full bg-[#18191A] border-gray-800 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-center text-sm">Melhores Anúncios (Mensagens)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-[calc(100%-60px)]">
                <div className="w-full h-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
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
                <div className="w-full mt-2 space-y-1">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index]}}></div>
                        <span className="text-gray-400 truncate w-24">{entry.name}</span>
                      </div>
                      <span className="text-gray-300">{((entry.value / totalMetrics.messages) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Table */}
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
                  {mockCampaigns.map((camp) => (
                    <TableRow key={camp.id} className="border-gray-800 hover:bg-[#242526]">
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
              <span>1 - 4 / 4</span>
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

function CalendarIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}