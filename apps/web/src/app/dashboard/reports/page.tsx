'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leadsApi, dashboardApi } from '@/lib/api';
import { useClient } from '@/contexts/ClientContext';

function formatCurrency(val: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(val);
}

const FUNNEL_LABELS: Record<string, string> = {
    NEW: 'Novo', CONTACTED: 'Contatado', QUALIFIED: 'Qualificado',
    SCHEDULED: 'Agendado', ATTENDED: 'Compareceu', WON: 'Ganho', LOST: 'Perdido',
};
const FUNNEL_COLORS = ['bg-slate-400', 'bg-blue-400', 'bg-yellow-400', 'bg-purple-400', 'bg-indigo-400', 'bg-green-400', 'bg-red-400'];

export default function ReportsPage() {
    const { selectedClientId } = useClient();
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const params: Record<string, string> = {};
    if (selectedClientId && selectedClientId !== 'ALL') params.clientId = selectedClientId;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    const { data: kpis } = useQuery({
        queryKey: ['kpis', params, selectedClientId],
        queryFn: () => dashboardApi.getKPIs(params),
    });
    const { data: funnel } = useQuery({
        queryKey: ['funnel', selectedClientId],
        queryFn: () => leadsApi.getFunnel(selectedClientId && selectedClientId !== 'ALL' ? selectedClientId : undefined),
    });

    const totalFunnelLeads = (funnel || []).reduce((s: number, f: any) => s + f.count, 0);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold">Relatórios</h1>
                <p className="text-muted-foreground text-sm mt-1">Análise de performance por período e cliente</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-wrap gap-3 items-end">
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">De</label>
                    <input type="date" className="px-3 py-2 rounded-lg border border-border text-sm"
                        value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Até</label>
                    <input type="date" className="px-3 py-2 rounded-lg border border-border text-sm"
                        value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Investimento', value: formatCurrency(kpis?.spend || 0), color: 'text-green-600' },
                    { label: 'Leads CRM', value: String(kpis?.leads || 0), color: 'text-blue-600' },
                    { label: 'CPL', value: formatCurrency(kpis?.cpl || 0), color: 'text-purple-600' },
                    { label: 'Agendamentos', value: String(kpis?.appointments || 0), color: 'text-orange-500' },
                ].map((card) => (
                    <div key={card.label} className="kpi-card">
                        <p className="text-xs text-muted-foreground">{card.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Funil de Leads */}
            <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Funil de Leads</h2>
                <div className="space-y-3">
                    {(funnel || []).map((f: any, i: number) => {
                        const pct = totalFunnelLeads > 0 ? (f.count / totalFunnelLeads) * 100 : 0;
                        return (
                            <div key={f.status} className="flex items-center gap-4">
                                <div className="w-28 text-right text-sm text-muted-foreground shrink-0">
                                    {FUNNEL_LABELS[f.status] || f.status}
                                </div>
                                <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                                    <div
                                        className={`h-full ${FUNNEL_COLORS[i]} rounded-full transition-all duration-700 flex items-center justify-end pr-2`}
                                        style={{ width: `${Math.max(pct, 2)}%` }}
                                    >
                                        {pct > 10 && (
                                            <span className="text-white text-xs font-bold">{f.count}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="w-20 text-sm font-semibold text-foreground shrink-0">
                                    {f.count} <span className="text-muted-foreground font-normal">{pct.toFixed(1)}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
