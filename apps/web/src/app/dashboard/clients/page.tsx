'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Search,
    Plus,
    Edit,
    Archive,
    Building2,
    MapPin,
    Stethoscope,
    X,
    CheckCircle,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null);

    const { data: clients, isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: () => clientsApi.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => {
            console.log('[ClientsAPI] POST /clients — payload:', data);
            return clientsApi.create(data);
        },
        onSuccess: (data) => {
            console.log('[ClientsAPI] POST /clients — response 201:', data);
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsCreateModalOpen(false);
            toast.success(`Cliente "${data.name}" criado com sucesso!`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => {
            console.log('[ClientsAPI] PATCH /clients/' + id + ' — payload:', data);
            return clientsApi.update(id, data);
        },
        onSuccess: (data) => {
            console.log('[ClientsAPI] PATCH /clients — response:', data);
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setEditingClient(null);
            toast.success('Cliente atualizado com sucesso!');
        },
    });

    const archiveMutation = useMutation({
        mutationFn: (id: string) => clientsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            toast.success('Cliente arquivado.');
        },
    });

    const filteredClients = clients?.filter((c: any) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
                    <p className="text-muted-foreground">Gerencie seus médicos e clínicas parceiras.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Novo Cliente
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-border">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou especialidade..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[32px] border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Especialidade / Local</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Métricas</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Criado em</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-8">
                                            <div className="h-4 bg-slate-100 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
                                            <Building2 className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <h3 className="text-sm font-medium text-slate-900">Nenhum cliente encontrado</h3>
                                        <p className="text-xs text-slate-500 mt-1">Experimente mudar o termo de busca ou adicione um novo.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map((client: any) => (
                                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                                                    {client.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">{client.name}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase tracking-tight">{client.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                    <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                                                    {client.specialty || 'Não informada'}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    {client.city || 'Localização não definida'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${client.status === 'ACTIVE'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                {client.status === 'ACTIVE' ? 'Ativo' : 'Arquivado'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4 text-xs">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-semibold">{client._count?.leads || 0}</span>
                                                    <span className="text-muted-foreground">Leads</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-semibold">{client._count?.connections || 0}</span>
                                                    <span className="text-muted-foreground">Anúncios</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {format(new Date(client.createdAt), 'dd MMM yyyy', { locale: ptBR })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditingClient(client)}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Deseja realmente arquivar ${client.name}?`)) {
                                                            archiveMutation.mutate(client.id);
                                                        }
                                                    }}
                                                    disabled={archiveMutation.isPending}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                                    title="Arquivar"
                                                >
                                                    <Archive className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {(isCreateModalOpen || editingClient) && (
                <ClientModal
                    client={editingClient}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setEditingClient(null);
                    }}
                    onSubmit={(data: any) => {
                        console.log('[ClientModal] onSubmit called with:', data);
                        if (editingClient) {
                            updateMutation.mutate({ id: editingClient.id, data });
                        } else {
                            createMutation.mutate(data);
                        }
                    }}
                    isSubmitting={createMutation.isPending || updateMutation.isPending}
                />
            )}
        </div>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function ClientModal({ client, onClose, onSubmit, isSubmitting }: {
    client: any;
    onClose: () => void;
    onSubmit: (data: any) => void;
    isSubmitting: boolean;
}) {
    const [formData, setFormData] = useState({
        name: client?.name || '',
        slug: client?.slug || '',
        specialty: client?.specialty || '',
        city: client?.city || '',
        notes: client?.notes || '',
    });

    const handleNameChange = (name: string) => {
        if (client) {
            // Don't auto-change slug when editing
            setFormData({ ...formData, name });
            return;
        }
        const slug = name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        setFormData({ ...formData, name, slug });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[ClientModal] Form submit event fired. formData:', formData);
        if (!formData.name.trim()) {
            console.warn('[ClientModal] Name is empty, blocking submit.');
            return;
        }
        if (!formData.slug.trim()) {
            console.warn('[ClientModal] Slug is empty, blocking submit.');
            return;
        }
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[32px] border border-border shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">{client ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                        <button onClick={onClose} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-1">
                                    Nome do Cliente <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="Ex: Clínica MedLight"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-1">
                                    Slug <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-100 text-sm focus:outline-none text-muted-foreground"
                                    value={formData.slug}
                                    readOnly
                                    title="Gerado automaticamente a partir do nome"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-1">Especialidade</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={formData.specialty}
                                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                    placeholder="Ex: Dermatologia"
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-1">Cidade / Localização</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Ex: São Paulo, SP"
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-1">Observações</label>
                                <textarea
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[80px] resize-none"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Detalhes internos sobre o contrato..."
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.name.trim()}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isSubmitting ? 'Salvando...' : (client ? 'Salvar Edições' : 'Criar Cliente')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
