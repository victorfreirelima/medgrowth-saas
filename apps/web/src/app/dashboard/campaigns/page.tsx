'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, clientsApi } from '@/lib/api';
import { useSession } from 'next-auth/react';

function formatCurrency(val: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(val);
}

export default function CampaignsPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedChannel, setSelectedChannel] = useState('');

    const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.getAll });
    const { data: campaigns, isLoading } = useQuery({
        queryKey: ['campaigns', selectedClient],
        queryFn: () => dashboardApi.getCampaigns(selectedClient ? { clientId: selectedClient } : undefined),
    });

    const filtered = (campaigns || []).filter((c: any) =>
        selectedChannel ? c.channel === selectedChannel : true
    );
    const totalSpend = filtered.reduce((s: number, c: any) => s + c.spend, 0);
    const totalImpressions = filtered.reduce((s: number, c: any) => s + c.impressions, 0);
    const totalClicks = filtered.reduce((s: number, c: any) => s + c.clicks, 0);
    const totalLeads = filtered.reduce((s: number, c: any) => s + c.leads, 0);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold">Campanhas</h1>
                <p className="text-muted-foreground text-sm mt-1">Performance por campanha — últimos 30 dias</p>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Investimento Total', value: formatCurrency(totalSpend), icon: '💰', color: 'text-green-600' },
                    { label: 'Impressões', value: totalImpressions.toLocaleString('pt-BR'), icon: '👁️', color: 'text-blue-600' },
                    { label: 'Clicks', value: totalClicks.toLocaleString('pt-BR'), icon: '🖱️', color: 'text-purple-600' },
                    { label: 'Leads (Ads)', value: String(totalLeads), icon: '🎯', color: 'text-orange-500' },
                ].map((card) => (
                    <div key={card.label} className="kpi-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">{card.label}</p>
                                <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                            </div>
                            <span className="text-2xl">{card.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-wrap gap-3">
                {userRole === 'ADMIN' && (
                    <select className="px-3 py-2 rounded-lg border border-border text-sm bg-background"
                        value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                        <option value="">Todos os clientes</option>
                        {(clients || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}
                <select className="px-3 py-2 rounded-lg border border-border text-sm bg-background"
                    value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)}>
                    <option value="">Todos os canais</option>
                    <option value="META">📘 Meta Ads</option>
                    <option value="GOOGLE">🔍 Google Ads</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                {['Campanha', 'Canal', 'Investimento', 'Impressões', 'Clicks', 'CTR', 'CPC', 'Leads (Ads)', 'Conversões'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
                                        <td key={j} className="px-4 py-4"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                                    ))}</tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-16 text-center">
                                        <div className="text-4xl mb-2">📡</div>
                                        <p className="text-muted-foreground text-sm">Nenhuma campanha encontrada</p>
                                        <p className="text-muted-foreground text-xs mt-1">Conecte uma conta de anúncios em Configurações</p>
                                    </td>
                                </tr>
                            ) : filtered.map((c: any, i: number) => (
                                <tr key={i} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">{i + 1}</span>
                                            <span className="text-sm font-medium max-w-40 truncate" title={c.campaignName}>{c.campaignName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`status-badge ${c.channel === 'META' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                            {c.channel === 'META' ? '📘 Meta' : '🔍 Google'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(c.spend)}</td>
                                    <td className="px-4 py-3 text-sm">{c.impressions?.toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-3 text-sm">{c.clicks?.toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-3 text-sm">{c.ctr?.toFixed(2)}%</td>
                                    <td className="px-4 py-3 text-sm">{formatCurrency(c.cpc)}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-purple-600">{c.leads}</td>
                                    <td className="px-4 py-3 text-sm">{c.conversions}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-sm text-blue-700">
                <strong>ℹ️ Nota:</strong> Os dados de "Leads (Ads)" são provenientes da API de anúncios. O CPL é calculado com base nos leads do CRM para maior precisão.
                Conecte suas contas em <strong>Configurações → Conexões</strong> para dados em tempo real.
            </div>
        </div>
    );
}
