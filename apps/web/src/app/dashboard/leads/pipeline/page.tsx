'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi, clientsApi } from '@/lib/api';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Plus, MoreHorizontal, Phone, Calendar,
    DollarSign, AlertCircle, CheckCircle2, User as UserIcon
} from 'lucide-react';
import Link from 'next/link';

// Status labels & colors updated for Portuguese enums
const PIPELINE_STATUSES = [
    'NOVO', 'EM_CONTATO', 'QUALIFICADO', 'AGENDADO', 'COMPARECEU', 'FECHADO', 'PERDIDO'
];

const STATUS_LABELS: Record<string, string> = {
    NOVO: 'Novo',
    EM_CONTATO: 'Em Contato',
    QUALIFICADO: 'Qualificado',
    AGENDADO: 'Agendado',
    COMPARECEU: 'Compareceu',
    FECHADO: 'Fechado',
    PERDIDO: 'Perdido',
};

const STATUS_COLORS: Record<string, string> = {
    NOVO: 'border-t-slate-400 bg-slate-50',
    EM_CONTATO: 'border-t-blue-400 bg-blue-50/30',
    QUALIFICADO: 'border-t-yellow-400 bg-yellow-50/30',
    AGENDADO: 'border-t-purple-400 bg-purple-50/30',
    COMPARECEU: 'border-t-indigo-400 bg-indigo-50/30',
    FECHADO: 'border-t-green-400 bg-green-50/30',
    PERDIDO: 'border-t-red-400 bg-red-50/30',
};

const CHANNEL_LABELS: Record<string, string> = {
    META: '📘 Meta', GOOGLE: '🔍 Google', ORGANIC: '🌱 Orgânico', REFERRAL: '👋 Indicação', OTHER: 'Outro',
};

interface Lead {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    status: string;
    revenue?: number;
    lostReason?: string;
    appointmentDate?: string;
    createdAt: string;
    assignedTo?: { name: string };
}

export default function PipelinePage() {
    const { data: session } = useSession();
    const userRole = (session?.user as { role?: string })?.role;
    const qc = useQueryClient();
    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string>('');

    const [pendingUpdate, setPendingUpdate] = useState<{ id: string; status: string } | null>(null);
    const [revenue, setRevenue] = useState<string>('');
    const [lostReason, setLostReason] = useState<string>('');

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', channel: 'META', clientId: '', campaignName: '' });

    const { data: clients } = useQuery<{ id: string; name: string }[]>({
        queryKey: ['clients'],
        queryFn: clientsApi.getAll
    });

    const { data: leadsResponse } = useQuery({
        queryKey: ['leads-pipeline', selectedClientId],
        queryFn: () => leadsApi.getAll(selectedClientId ? { clientId: selectedClientId, limit: 1000 } : { limit: 1000 }),
        enabled: !!session,
    });

    const leads = useMemo(() => leadsResponse?.data || [], [leadsResponse]);

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => leadsApi.update(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['leads-pipeline'] });
            qc.invalidateQueries({ queryKey: ['dashboard'] });
            setPendingUpdate(null);
            setRevenue('');
            setLostReason('');
        },
    });

    const createMutation = useMutation({
        mutationFn: ({ clientId, data }: { clientId: string; data: Partial<Lead> }) => leadsApi.create(clientId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['leads-pipeline'] });
            qc.invalidateQueries({ queryKey: ['dashboard'] });
            setShowModal(false);
            setForm({ name: '', phone: '', email: '', channel: 'META', clientId: '', campaignName: '' });
        },
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const onDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) {
            setActiveId(null);
            return;
        }

        const leadId = active.id as string;
        const overId = over.id as string;

        let targetStatus = overId;
        const overLead = leads.find((l: Lead) => l.id === overId);
        if (overLead) targetStatus = overLead.status;

        const lead = leads.find((l: Lead) => l.id === leadId);
        if (!lead || lead.status === targetStatus || !PIPELINE_STATUSES.includes(targetStatus)) {
            setActiveId(null);
            return;
        }

        if (targetStatus === 'FECHADO' || targetStatus === 'PERDIDO') {
            setPendingUpdate({ id: leadId, status: targetStatus });
        } else {
            updateMutation.mutate({ id: leadId, data: { status: targetStatus } });
        }

        setActiveId(null);
    };

    const handleExtraInfoSubmit = () => {
        if (!pendingUpdate) return;
        const data: any = { status: pendingUpdate.status };
        if (pendingUpdate.status === 'FECHADO') data.revenue = parseFloat(revenue);
        if (pendingUpdate.status === 'PERDIDO') data.lostReason = lostReason;

        updateMutation.mutate({ id: pendingUpdate.id, data });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Pipeline de CRM</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <Link href="/dashboard/leads" className="text-sm text-muted-foreground hover:text-primary transition-colors">Tabela</Link>
                        <span className="text-sm font-bold text-primary border-b-2 border-primary">Kanban</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <select
                        className="px-3 py-2 rounded-xl border border-border text-sm bg-white shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                    >
                        <option value="">Todos os Clientes</option>
                        {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {userRole !== 'MANAGER' && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Novo Lead
                        </button>
                    )}
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto min-h-0">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                >
                    <div className="flex gap-4 h-full pb-4 px-1" style={{ width: 'max-content', minWidth: '100%' }}>
                        {PIPELINE_STATUSES.map(status => (
                            <Column
                                key={status}
                                status={status}
                                leads={leads.filter((l: Lead) => l.status === status)}
                            />
                        ))}
                    </div>

                    <DragOverlay dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({
                            styles: { active: { opacity: '0.5' } },
                        }),
                    }}>
                        {activeId ? (
                            <Card lead={leads.find((l: Lead) => l.id === activeId)!} isOverlay />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* Required Info Modal */}
            {pendingUpdate && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                            {pendingUpdate.status === 'FECHADO' ? <CheckCircle2 className="text-green-500" /> : <AlertCircle className="text-red-500" />}
                            {pendingUpdate.status === 'FECHADO' ? 'Parabéns pelo Fechamento!' : 'Lead Perdido'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {pendingUpdate.status === 'FECHADO'
                                ? 'Informe o valor da venda para calcularmos o ROI real.'
                                : 'Por favor, informe o motivo para análise de melhoria.'}
                        </p>

                        {pendingUpdate.status === 'FECHADO' ? (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Valor da Receita (R$)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        autoFocus
                                        type="number"
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="0,00"
                                        value={revenue}
                                        onChange={(e) => setRevenue(e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Motivo da Perda</label>
                                <textarea
                                    autoFocus
                                    className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                                    placeholder="Ex: Preço alto, desisitiu, sem contato..."
                                    value={lostReason}
                                    onChange={(e) => setLostReason(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleExtraInfoSubmit}
                                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50"
                                disabled={updateMutation.isPending || (pendingUpdate.status === 'FECHADO' ? !revenue : !lostReason)}
                            >
                                Confirmar
                            </button>
                            <button
                                onClick={() => setPendingUpdate(null)}
                                className="flex-1 py-2 rounded-xl border border-border text-sm font-medium hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Novo Lead */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <h2 className="text-lg font-bold mb-4">Novo Lead</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">Nome *</label>
                                <input
                                    className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1 block">Telefone</label>
                                    <input
                                        className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1 block">Canal</label>
                                    <select
                                        className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-background"
                                        value={form.channel}
                                        onChange={(e) => setForm({ ...form, channel: e.target.value })}
                                    >
                                        {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">Cliente *</label>
                                <select
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
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                                onClick={() => {
                                    if (!form.clientId) return;
                                    createMutation.mutate({ clientId: form.clientId, data: form });
                                }}
                                disabled={createMutation.isPending || !form.name || !form.clientId}
                            >
                                {createMutation.isPending ? 'Salvando...' : 'Salvar'}
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

function Column({ status, leads }: { status: string; leads: Lead[] }) {
    const { setNodeRef } = useSortable({
        id: status,
        data: { type: 'Column', status },
    });

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col w-72 rounded-2xl border-t-4 shadow-sm h-full ${STATUS_COLORS[status]}`}
        >
            <div className="p-4 flex items-center justify-between sticky top-0 bg-inherit rounded-t-2xl z-10">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-tight">{STATUS_LABELS[status]}</span>
                    <span className="px-2 py-0.5 bg-white/60 rounded-full text-[10px] font-bold border border-black/5">
                        {leads.length}
                    </span>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 px-2 pb-4 overflow-y-auto space-y-3 scrollbar-hide">
                <SortableContext items={leads.map((l: Lead) => l.id)} strategy={verticalListSortingStrategy}>
                    {leads.map(lead => (
                        <Card key={lead.id} lead={lead} />
                    ))}
                </SortableContext>
                {leads.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-black/5 rounded-xl flex items-center justify-center p-4 text-center">
                        <p className="text-[10px] text-slate-400 font-medium italic">Vazio</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function Card({ lead, isOverlay }: { lead: Lead; isOverlay?: boolean }) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: lead.id,
        data: { type: 'Lead', lead },
    });

    const style = {
        transition,
        transform: CSS.Translate.toString(transform),
    };

    if (isDragging && !isOverlay) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="h-28 bg-black/5 border-2 border-dashed border-black/10 rounded-xl"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`group bg-white p-3 rounded-xl border border-border shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${isOverlay ? 'shadow-xl rotate-3 scale-105' : ''}`}
        >
            <div className="flex justify-between items-start mb-1.5">
                <h4 className="font-bold text-[13px] leading-tight truncate pr-2 group-hover:text-primary transition-colors">{lead.name}</h4>
            </div>

            <div className="space-y-1 mb-2.5">
                {lead.phone && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                        <Phone className="w-3 h-3" />
                        <span>{lead.phone}</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                    {lead.revenue ? (
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100 uppercase tracking-tighter flex items-center gap-1">
                            <DollarSign className="w-2.5 h-2.5" />
                            R$ {lead.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    ) : lead.appointmentDate && (
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {format(new Date(lead.appointmentDate), 'dd/MM HH:mm')}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-[9px] text-slate-300 font-medium">
                    {format(new Date(lead.createdAt), 'dd/MM/yy', { locale: ptBR })}
                </span>
                <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-400 font-semibold truncate max-w-[80px]">
                        {lead.assignedTo?.name?.split(' ')[0] || '—'}
                    </span>
                    <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center border border-border overflow-hidden">
                        <UserIcon className="w-2.5 h-2.5 text-slate-300" />
                    </div>
                </div>
            </div>
        </div>
    );
}
