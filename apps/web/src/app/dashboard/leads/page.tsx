'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi, clientsApi } from '@/lib/api';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
    NOVO: 'Novo', EM_CONTATO: 'Em Contato', QUALIFICADO: 'Qualificado',
    AGENDADO: 'Agendado', COMPARECEU: 'Compareceu', FECHADO: 'Ganho / Fechado', PERDIDO: 'Perdido',
};
const STATUS_COLORS: Record<string, string> = {
    NOVO: 'bg-slate-100 text-slate-700', EM_CONTATO: 'bg-blue-100 text-blue-700',
    QUALIFICADO: 'bg-yellow-100 text-yellow-700', AGENDADO: 'bg-purple-100 text-purple-700',
    COMPARECEU: 'bg-indigo-100 text-indigo-700', FECHADO: 'bg-green-100 text-green-700',
    PERDIDO: 'bg-red-100 text-red-700',
};
const CHANNEL_LABELS: Record<string, string> = {
    META: '📘 Meta', GOOGLE: '🔍 Google', ORGANIC: '🌱 Orgânico', REFERRAL: '👋 Indicação', OTHER: 'Outro',
};

interface Lead {
    id: string;
    name: string;
    email: string;
    phone?: string;
    channel: string;
    status: string;
    campaignName?: string;
    createdAt: string;
    assignedTo?: { name: string };
}

interface LeadsResponse {
    data: Lead[];
    total: number;
    page: number;
    totalPages: number;
}

export default function LeadsPage() {
    const { data: session } = useSession();
    const qc = useQueryClient();
    const userRole = (session?.user as { role?: string })?.role;
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [showModal, setShowModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery<LeadsResponse>({
        queryKey: ['leads', filters, page],
        queryFn: () => leadsApi.getAll({ ...filters, page }),
    });
    const { data: clients } = useQuery<{ id: string; name: string }[]>({ queryKey: ['clients'], queryFn: clientsApi.getAll });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => leadsApi.update(id, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
    });
    const createMutation = useMutation({
        mutationFn: ({ clientId, data }: { clientId: string; data: Partial<Lead> }) => leadsApi.create(clientId, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); setShowModal(false); },
    });

    const [form, setForm] = useState({ name: '', phone: '', email: '', channel: 'META', clientId: '', campaignName: '' });

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Leads</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm font-bold text-primary border-b-2 border-primary">Tabela</span>
                        <Link href="/dashboard/leads/pipeline" className="text-sm text-muted-foreground hover:text-primary transition-colors">Kanban</Link>
                    </div>
                </div>
                <div className="flex gap-3">
                    <p className="text-muted-foreground text-sm self-center">
                        {data?.total || 0} leads encontrados
                    </p>
                    {userRole !== 'MANAGER' && (
                        <button
                            id="new-lead-btn"
                            onClick={() => { setSelectedLead(null); setForm({ name: '', phone: '', email: '', channel: 'META', clientId: '', campaignName: '' }); setShowModal(true); }}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition shadow-sm"
                        >
                            + Novo Lead
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-wrap gap-3">
                <select
                    className="px-3 py-2 rounded-lg border border-border text-sm bg-background"
                    onChange={(e) => setFilters(f => ({ ...f, status: e.target.value || '' }))}
                >
                    <option value="">Todos os status</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select
                    className="px-3 py-2 rounded-lg border border-border text-sm bg-background"
                    onChange={(e) => setFilters(f => ({ ...f, channel: e.target.value || '' }))}
                >
                    <option value="">Todos os canais</option>
                    {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input
                    type="text"
                    placeholder="Buscar nome, telefone..."
                    className="px-3 py-2 rounded-lg border border-border text-sm bg-background flex-1 min-w-40"
                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                />
                <input type="date" className="px-3 py-2 rounded-lg border border-border text-sm bg-background"
                    onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
                <input type="date" className="px-3 py-2 rounded-lg border border-border text-sm bg-background"
                    onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                {['Nome', 'Telefone', 'Canal', 'Campanha', 'Status', 'Data', 'Responsável', 'Ações'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 8 }).map((_, j) => (
                                            <td key={j} className="px-4 py-4">
                                                <div className="h-4 bg-muted rounded animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : data?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16 text-center">
                                        <div className="text-4xl mb-2">🎯</div>
                                        <p className="text-muted-foreground text-sm">Nenhum lead encontrado</p>
                                        <p className="text-muted-foreground text-xs mt-1">Ajuste os filtros ou cadastre um novo lead</p>
                                    </td>
                                </tr>
                            ) : data?.data?.map((lead) => (
                                <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-sm text-foreground">{lead.name}</div>
                                        <div className="text-xs text-muted-foreground">{lead.email}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-foreground">{lead.phone || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm">{CHANNEL_LABELS[lead.channel] || lead.channel}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-32 truncate">{lead.campaignName || '—'}</td>
                                    <td className="px-4 py-3">
                                        {userRole !== 'MANAGER' ? (
                                            <select
                                                className={`status-badge border-0 cursor-pointer ${STATUS_COLORS[lead.status]}`}
                                                value={lead.status}
                                                onChange={(e) => updateMutation.mutate({ id: lead.id, data: { status: e.target.value } })}
                                            >
                                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className={`status-badge ${STATUS_COLORS[lead.status]}`}>{STATUS_LABELS[lead.status]}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                        {format(new Date(lead.createdAt), 'dd/MM/yy', { locale: ptBR })}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">{lead.assignedTo?.name || '—'}</td>
                                    <td className="px-4 py-3">
                                        {userRole !== 'MANAGER' && (
                                            <button
                                                className="text-xs text-primary hover:underline"
                                                onClick={() => { setSelectedLead(lead); setShowModal(true); }}
                                            >
                                                Editar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            Página {data.page} de {data.totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition disabled:opacity-40"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >← Anterior</button>
                            <button
                                className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition disabled:opacity-40"
                                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                                disabled={page === data.totalPages}
                            >Próxima →</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <h2 className="text-lg font-bold mb-4">{selectedLead ? 'Editar Lead' : 'Novo Lead'}</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">Nome *</label>
                                <input
                                    id="lead-name"
                                    className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                                    value={selectedLead ? selectedLead.name : form.name}
                                    onChange={(e) => selectedLead ? setSelectedLead({ ...selectedLead, name: e.target.value }) : setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1 block">Telefone</label>
                                    <input
                                        id="lead-phone"
                                        className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                                        value={selectedLead ? selectedLead.phone || '' : form.phone}
                                        onChange={(e) => selectedLead ? setSelectedLead({ ...selectedLead, phone: e.target.value }) : setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1 block">Canal</label>
                                    <select
                                        id="lead-channel"
                                        className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-background"
                                        value={selectedLead ? selectedLead.channel : form.channel}
                                        onChange={(e) => selectedLead ? setSelectedLead({ ...selectedLead, channel: e.target.value }) : setForm({ ...form, channel: e.target.value })}
                                    >
                                        {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                            {!selectedLead && (
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1 block">Cliente *</label>
                                    <select
                                        id="lead-client"
                                        className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-background"
                                        value={form.clientId}
                                        onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                                    >
                                        <option value="">Selecione o cliente</option>
                                        {(clients || []).map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                id="lead-save-btn"
                                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition"
                                onClick={() => {
                                    if (selectedLead) {
                                        updateMutation.mutate({ id: selectedLead.id, data: { name: selectedLead.name, phone: selectedLead.phone, channel: selectedLead.channel } });
                                        setShowModal(false);
                                    } else {
                                        if (!form.clientId) return;
                                        createMutation.mutate({ clientId: form.clientId, data: form });
                                    }
                                }}
                            >
                                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button
                                className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition"
                                onClick={() => setShowModal(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
