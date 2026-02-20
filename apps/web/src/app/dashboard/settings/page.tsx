'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, clientsApi, adsApi } from '@/lib/api';
import { useSession } from 'next-auth/react';

const ROLE_LABELS: Record<string, string> = {
    ADMIN: '👑 Admin', COMMERCIAL: '💼 Comercial', MANAGER: '👔 Gestor',
};

export default function SettingsPage() {
    const { data: session } = useSession();
    const qc = useQueryClient();
    const [tab, setTab] = useState<'users' | 'connections'>('users');
    const [showUserModal, setShowUserModal] = useState(false);
    const [showConnModal, setShowConnModal] = useState(false);
    const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'COMMERCIAL', clientIds: [] as string[] });
    const [connForm, setConnForm] = useState({ clientId: '', channel: 'META', accountId: '', accountName: '', accessToken: '' });
    const [syncLoading, setSyncLoading] = useState<string | null>(null);

    const { data: users } = useQuery({ queryKey: ['users'], queryFn: usersApi.getAll });
    const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.getAll });
    const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: () => adsApi.getConnections() });

    const createUserMutation = useMutation({
        mutationFn: (data: any) => usersApi.create(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowUserModal(false); },
    });
    const createConnMutation = useMutation({
        mutationFn: (data: any) => adsApi.createConnection(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['connections'] }); setShowConnModal(false); },
    });
    const deleteConnMutation = useMutation({
        mutationFn: (id: string) => adsApi.deleteConnection(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
    });

    async function handleSync(id: string) {
        setSyncLoading(id);
        try { await adsApi.triggerSync(id); qc.invalidateQueries({ queryKey: ['connections'] }); }
        finally { setSyncLoading(null); }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold">Configurações</h1>
                <p className="text-muted-foreground text-sm mt-1">Gerencie usuários e conexões de anúncios</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
                {(['users', 'connections'] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        {t === 'users' ? '👥 Usuários' : '🔌 Conexões Ads'}
                    </button>
                ))}
            </div>

            {/* Users Tab */}
            {tab === 'users' && (
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                        <h2 className="font-semibold">Usuários</h2>
                        <button onClick={() => setShowUserModal(true)}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition">
                            + Novo Usuário
                        </button>
                    </div>
                    <div className="divide-y divide-border">
                        {(users || []).map((u: any) => (
                            <div key={u.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                                        {u.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{u.name}</p>
                                        <p className="text-xs text-muted-foreground">{u.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs bg-muted rounded-full px-3 py-1">{ROLE_LABELS[u.role] || u.role}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {u.isActive ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Connections Tab */}
            {tab === 'connections' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <h2 className="font-semibold">Contas de Anúncios</h2>
                            <button onClick={() => setShowConnModal(true)}
                                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition">
                                + Conectar Conta
                            </button>
                        </div>
                        <div className="divide-y divide-border">
                            {(connections || []).length === 0 ? (
                                <div className="px-6 py-12 text-center">
                                    <div className="text-4xl mb-2">🔌</div>
                                    <p className="text-muted-foreground text-sm">Nenhuma conta conectada</p>
                                    <p className="text-muted-foreground text-xs mt-1">Conecte uma conta Meta Ads ou Google Ads para iniciar a sincronização</p>
                                </div>
                            ) : (connections || []).map((conn: any) => (
                                <div key={conn.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${conn.channel === 'META' ? 'bg-blue-100' : 'bg-green-100'}`}>
                                            {conn.channel === 'META' ? '📘' : '🔍'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">{conn.accountName || conn.accountId}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {conn.client?.name} • ID: {conn.accountId}
                                                {conn.lastSyncAt && ` • Sync: ${new Date(conn.lastSyncAt).toLocaleDateString('pt-BR')}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${conn.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {conn.status === 'ACTIVE' ? '✓ Ativo' : conn.status}
                                        </span>
                                        <button
                                            onClick={() => handleSync(conn.id)}
                                            disabled={syncLoading === conn.id}
                                            className="px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/70 transition disabled:opacity-40"
                                        >
                                            {syncLoading === conn.id ? '⏳ Sync...' : '🔄 Sincronizar'}
                                        </button>
                                        <button
                                            onClick={() => deleteConnMutation.mutate(conn.id)}
                                            className="px-3 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-sm text-amber-700">
                        <strong>⚠️ Integração OAuth:</strong> Para conectar contas reais, configure <code className="bg-amber-100 px-1 rounded">META_APP_ID</code> e <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code> no ambiente.
                        As contas de demonstração abaixo usam tokens de exemplo e dados sintéticos.
                    </div>
                </div>
            )}

            {/* User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-lg font-bold mb-4">Novo Usuário</h2>
                        <div className="space-y-3">
                            {[
                                { key: 'name', label: 'Nome', type: 'text', placeholder: 'Nome completo' },
                                { key: 'email', label: 'Email', type: 'email', placeholder: 'email@exemplo.com' },
                                { key: 'password', label: 'Senha', type: 'password', placeholder: '••••••••' },
                            ].map(({ key, label, type, placeholder }) => (
                                <div key={key}>
                                    <label className="text-sm font-medium mb-1 block">{label} *</label>
                                    <input type={type} placeholder={placeholder}
                                        className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                                        value={(userForm as any)[key]} onChange={(e) => setUserForm({ ...userForm, [key]: e.target.value })} />
                                </div>
                            ))}
                            <div>
                                <label className="text-sm font-medium mb-1 block">Perfil</label>
                                <select className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                                    value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                                    <option value="COMMERCIAL">Comercial</option>
                                    <option value="MANAGER">Gestor/Cliente</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Clientes</label>
                                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                    {(clients || []).map((c: any) => (
                                        <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
                                            <input type="checkbox" className="rounded"
                                                checked={userForm.clientIds.includes(c.id)}
                                                onChange={(e) => setUserForm({ ...userForm, clientIds: e.target.checked ? [...userForm.clientIds, c.id] : userForm.clientIds.filter(id => id !== c.id) })}
                                            />
                                            {c.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition"
                                onClick={() => createUserMutation.mutate(userForm)}>
                                {createUserMutation.isPending ? 'Criando...' : 'Criar Usuário'}
                            </button>
                            <button className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition"
                                onClick={() => setShowUserModal(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Connection Modal */}
            {showConnModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-lg font-bold mb-4">Conectar Conta de Anúncios</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Cliente *</label>
                                <select className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                                    value={connForm.clientId} onChange={(e) => setConnForm({ ...connForm, clientId: e.target.value })}>
                                    <option value="">Selecione</option>
                                    {(clients || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Canal</label>
                                <select className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                                    value={connForm.channel} onChange={(e) => setConnForm({ ...connForm, channel: e.target.value })}>
                                    <option value="META">📘 Meta Ads</option>
                                    <option value="GOOGLE">🔍 Google Ads</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Account ID *</label>
                                <input placeholder="Ex: act_123456789" className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                                    value={connForm.accountId} onChange={(e) => setConnForm({ ...connForm, accountId: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Nome da Conta</label>
                                <input placeholder="Nome descritivo" className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                                    value={connForm.accountName} onChange={(e) => setConnForm({ ...connForm, accountName: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Access Token *</label>
                                <input type="password" placeholder="Token de acesso" className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                                    value={connForm.accessToken} onChange={(e) => setConnForm({ ...connForm, accessToken: e.target.value })} />
                                <p className="text-xs text-muted-foreground mt-1">Token é criptografado com AES-256 — nunca exposto no frontend</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition"
                                onClick={() => createConnMutation.mutate(connForm)}>
                                {createConnMutation.isPending ? 'Conectando...' : 'Conectar'}
                            </button>
                            <button className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition"
                                onClick={() => setShowConnModal(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
