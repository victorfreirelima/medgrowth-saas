'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, leadsApi } from '@/lib/api';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { FormInput } from '@/components/ui/FormInput';
import { ptBR } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
    CONFIRMED: 'Confirmado', CANCELLED: 'Cancelado', NO_SHOW: 'Não Compareceu', COMPLETED: 'Concluído',
};
const STATUS_COLORS: Record<string, string> = {
    CONFIRMED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700',
    NO_SHOW: 'bg-orange-100 text-orange-700', COMPLETED: 'bg-blue-100 text-blue-700',
};

type AppointmentStatus = 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';

interface Lead {
    id: string;
    name: string;
    client?: { name: string };
    phone?: string;
}

interface Appointment {
    id: string;
    dateTime: string;
    procedure?: string;
    status: AppointmentStatus;
    lead?: Lead;
}


export default function AppointmentsPage() {
    const { data: session } = useSession();
    const qc = useQueryClient();
    const userRole = (session?.user as { role?: string })?.role;
    const [showModal, setShowModal] = useState(false);
    const [page, setPage] = useState(1);
    const [form, setForm] = useState({ leadId: '', dateTime: '', procedure: '', status: 'CONFIRMED' });

    const { data, isLoading } = useQuery({
        queryKey: ['appointments', page],
        queryFn: () => appointmentsApi.getAll({ page }),
    });
    const { data: leadsData } = useQuery({
        queryKey: ['leads-all'],
        queryFn: () => leadsApi.getAll({ limit: 100 }),
    });

    const createMutation = useMutation({
        mutationFn: (data: unknown) => appointmentsApi.create(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); setShowModal(false); },
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: unknown }) => appointmentsApi.update(id, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Agendamentos</h1>
                    <p className="text-muted-foreground text-sm mt-1">{data?.total || 0} agendamentos</p>
                </div>
                {userRole !== 'MANAGER' && (
                    <button
                        id="new-appointment-btn"
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition shadow-sm"
                    >
                        + Novo Agendamento
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                {['Data/Hora', 'Paciente', 'Telefone', 'Procedimento', 'Status', 'Ações'].map((h) => (
                                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                                        <td key={j} className="px-6 py-4"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                                    ))}</tr>
                                ))
                            ) : data?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <div className="text-4xl mb-2">📅</div>
                                        <p className="text-muted-foreground text-sm">Nenhum agendamento encontrado</p>
                                    </td>
                                </tr>
                            ) : data?.data?.map((apt: Appointment) => (
                                <tr key={apt.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-foreground">
                                            {format(new Date(apt.dateTime), 'dd/MM/yyyy', { locale: ptBR })}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {format(new Date(apt.dateTime), 'HH:mm')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-foreground">{apt.lead?.name}</div>
                                        <div className="text-xs text-muted-foreground">{apt.lead?.client?.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-foreground">{apt.lead?.phone || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-foreground">{apt.procedure || '—'}</td>
                                    <td className="px-6 py-4">
                                        {userRole !== 'MANAGER' ? (
                                            <select
                                                className={`status-badge border-0 cursor-pointer ${STATUS_COLORS[apt.status]}`}
                                                value={apt.status}
                                                onChange={(e) => updateMutation.mutate({ id: apt.id, data: { status: e.target.value as AppointmentStatus } })}
                                            >
                                                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                            </select>
                                        ) : (
                                            <span className={`status-badge ${STATUS_COLORS[apt.status]}`}>{STATUS_LABELS[apt.status]}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {userRole !== 'MANAGER' && (
                                            <button
                                                className="text-xs text-destructive hover:underline"
                                                onClick={() => appointmentsApi.delete(apt.id).then(() => qc.invalidateQueries({ queryKey: ['appointments'] }))}
                                            >
                                                Remover
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {data && data.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Página {data.page} de {data.totalPages}</span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition disabled:opacity-40"
                                onClick={() => setPage((p) => p - 1)} disabled={page === 1}>← Anterior</button>
                            <button className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition disabled:opacity-40"
                                onClick={() => setPage((p) => p + 1)} disabled={page === data.totalPages}>Próxima →</button>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <h2 className="text-lg font-bold mb-4">Novo Agendamento</h2>
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="leadId" className="text-sm font-medium mb-1 block">Lead *</label>
                                <select
                                    id="leadId"
                                    name="leadId"
                                    className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-background"
                                    value={form.leadId}
                                    onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione o lead</option>
                                    {leadsData?.data?.map((l: Lead) => (
                                        <option key={l.id} value={l.id}>{l.name} — {l.client?.name}</option>
                                    ))}
                                </select>
                            </div>
                            <FormInput
                                label="Data/Hora *"
                                id="dateTime"
                                name="dateTime"
                                type="datetime-local"
                                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/30 outline-none text-foreground bg-background"
                                labelClassName="text-sm font-medium mb-1 block"
                                value={form.dateTime}
                                onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                                required
                            />
                            <FormInput
                                label="Procedimento"
                                id="procedure"
                                name="procedure"
                                placeholder="Ex: Botox, Consulta inicial..."
                                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/30 outline-none text-foreground bg-background"
                                labelClassName="text-sm font-medium mb-1 block"
                                value={form.procedure}
                                onChange={(e) => setForm({ ...form, procedure: e.target.value })}
                                autoComplete="off"
                            />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition"
                                onClick={() => createMutation.mutate({ ...form })}>
                                {createMutation.isPending ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition"
                                onClick={() => setShowModal(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
