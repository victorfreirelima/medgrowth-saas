'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function KPICard({ title, value, subtitle, icon, color }: {
    title: string; value: string; subtitle?: string; icon: string; color: string;
}) {
    return (
        <div className="kpi-card">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-muted-foreground text-sm font-medium">{title}</p>
                    <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
                    {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                </div>
                <span className="text-3xl">{icon}</span>
            </div>
        </div>
    );
}

function formatCurrency(val: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(val);
}

export default function DashboardPage() {
    const { data: kpis, isLoading: loadingKPIs } = useQuery({
        queryKey: ['dashboard-kpis'],
        queryFn: () => dashboardApi.getKPIs(),
    });
    const { data: timeSeries, isLoading: loadingTS } = useQuery({
        queryKey: ['dashboard-timeseries'],
        queryFn: () => dashboardApi.getTimeSeries({ days: '30' }),
    });
    const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
        queryKey: ['dashboard-campaigns'],
        queryFn: () => dashboardApi.getCampaigns(),
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">Resumo dos últimos 30 dias</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {loadingKPIs ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="kpi-card animate-pulse">
                            <div className="h-4 bg-muted rounded w-2/3 mb-3" />
                            <div className="h-8 bg-muted rounded w-1/2" />
                        </div>
                    ))
                ) : (
                    <>
                        <KPICard title="Investimento" value={formatCurrency(kpis?.spend || 0)} subtitle="Período atual" icon="💰" color="text-green-600" />
                        <KPICard title="Leads (CRM)" value={String(kpis?.leads || 0)} subtitle="Cadastrados" icon="👥" color="text-blue-600" />
                        <KPICard title="CPL" value={formatCurrency(kpis?.cpl || 0)} subtitle="Custo por lead" icon="🎯" color="text-purple-600" />
                        <KPICard title="Agendamentos" value={String(kpis?.appointments || 0)} subtitle="Confirmados" icon="📅" color="text-orange-500" />
                        <KPICard title="CPA" value={formatCurrency(kpis?.cpa || 0)} subtitle="Custo por agend." icon="🏆" color="text-rose-600" />
                    </>
                )}
            </div>

            {/* Chart */}
            <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Evolução — Últimos 30 Dias</h2>
                {loadingTS ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={timeSeries || []}>
                            <defs>
                                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(v) => format(new Date(v + 'T00:00:00'), 'dd/MM', { locale: ptBR })}
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                            />
                            <YAxis yAxisId="spend" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                            <YAxis yAxisId="leads" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip
                                formatter={(value: number, name: string) => {
                                    if (name === 'spend') return [formatCurrency(value), 'Investimento'];
                                    if (name === 'crmLeads') return [value, 'Leads (CRM)'];
                                    if (name === 'adLeads') return [value, 'Leads (Ads)'];
                                    return [value, name];
                                }}
                                labelFormatter={(label) => format(new Date(label + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                            />
                            <Legend />
                            <Area yAxisId="spend" type="monotone" dataKey="spend" stroke="#3b82f6" fill="url(#spendGrad)" strokeWidth={2} dot={false} name="spend" />
                            <Area yAxisId="leads" type="monotone" dataKey="crmLeads" stroke="#8b5cf6" fill="url(#leadsGrad)" strokeWidth={2} dot={false} name="crmLeads" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Campaign Table */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Campanhas — Ranking por Investimento</h2>
                    <span className="text-xs text-muted-foreground">Últimos 30 dias</span>
                </div>
                {loadingCampaigns ? (
                    <div className="p-6 space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    {['Campanha', 'Canal', 'Investimento', 'Clicks', 'CTR', 'CPC', 'Leads'].map((h) => (
                                        <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {(campaigns || []).map((c: any, i: number) => (
                                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                                                <span className="text-sm font-medium text-foreground">{c.campaignName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.channel === 'META' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                {c.channel === 'META' ? '📘 Meta' : '🔍 Google'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-foreground">{formatCurrency(c.spend)}</td>
                                        <td className="px-6 py-4 text-sm text-foreground">{c.clicks?.toLocaleString('pt-BR')}</td>
                                        <td className="px-6 py-4 text-sm text-foreground">{c.ctr?.toFixed(2)}%</td>
                                        <td className="px-6 py-4 text-sm text-foreground">{formatCurrency(c.cpc)}</td>
                                        <td className="px-6 py-4 text-sm text-foreground">{c.leads}</td>
                                    </tr>
                                ))}
                                {(!campaigns || campaigns.length === 0) && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-sm">
                                            Nenhuma campanha encontrada para o período.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
