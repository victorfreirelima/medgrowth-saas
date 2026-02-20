'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, clientsApi, adsApi } from '@/lib/api';
import { useSession } from 'next-auth/react';

const ROLE_LABELS: Record<string, string> = {
    ADMIN: '👑 Admin', COMMERCIAL: '💼 Comercial', MANAGER: '👔 Gestor',
};

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
}

interface Client {
    id: string;
    name: string;
}

interface Connection {
    id: string;
    channel: 'META' | 'GOOGLE';
    accountId: string;
    accountName: string;
    status: string;
    lastSyncAt?: string;
    client?: { name: string };
}

export default function SettingsPage() {
    const { data: session } = useSession();
    const qc = useQueryClient();
    const [tab, setTab] = useState<'users' | 'connections'>('users');
    const [showUserModal, setShowUserModal] = useState(false);
    const [showConnModal, setShowConnModal] = useState(false);
    const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'COMMERCIAL', clientIds: [] as string[] });
    const [connForm, setConnForm] = useState({ clientId: '', channel: 'META' });
    const [syncLoading, setSyncLoading] = useState<string | null>(null);
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);

    const { data: users } = useQuery<User[]>({ queryKey: ['users'], queryFn: usersApi.getAll });
    const { data: clients } = useQuery<Client[]>({ queryKey: ['clients'], queryFn: clientsApi.getAll });
    const { data: connections } = useQuery<Connection[]>({ queryKey: ['connections'], queryFn: () => adsApi.getConnections() });

    const createUserMutation = useMutation({
        mutationFn: (data: typeof userForm) => usersApi.create(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowUserModal(false); },
    });

    const deleteConnMutation = useMutation({
        mutationFn: (id: string) => adsApi.deleteConnection(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
    });

    async function handleSync(id: string) {
        setSyncLoading(id);
        try {
            await adsApi.triggerSync(id);
            qc.invalidateQueries({ queryKey: ['connections'] });
        } finally {
            setSyncLoading(null);
        }
    }

    async function handleConnect(channel: string) {
        if (!connForm.clientId) {
            alert('Por favor, selecione um cliente primeiro.');
            return;
        }
        setOauthLoading(channel);
        try {
            const res = channel === 'META'
                ? await adsApi.getMetaOAuthUrl(connForm.clientId)
                : await adsApi.getGoogleOAuthUrl(connForm.clientId);

            window.location.href = res.url;
        } catch (error) {
            console.error('Failed to get OAuth URL', error);
            alert('Erro ao iniciar conexão. Verifique se as chaves de API estão configuradas.');
        } finally {
            setOauthLoading(null);
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold">Configurações</h1>
                    <p className="text-muted-foreground text-sm mt-1">Gerencie usuários e conexões de anúncios</p>
                </div>
            </div>

            <div className="flex gap-1 bg-muted/50 p-1.5 rounded-2xl w-fit border border-border/50">
                {(['users', 'connections'] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${tab === t ? 'bg-white shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        {t === 'users' ? '👥 Usuários' : '🔌 Conexões Ads'}
                    </button>
                ))}
            </div>

            {tab === 'users' && (
                <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden overflow-x-auto">
                    <div className="px-8 py-5 border-b border-border flex items-center justify-between bg-muted/10">
                        <h2 className="font-bold text-lg">Usuários do Sistema</h2>
                        <button onClick={() => setShowUserModal(true)}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition">
                            + Novo Usuário
                        </button>
                    </div>
                    <div className="divide-y divide-border">
                        {(users || []).map((u) => (
                            <div key={u.id} className="px-8 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shadow-inner">
                                        {u.name?.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{u.name}</p>
                                        <p className="text-xs text-muted-foreground font-medium">{u.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground rounded-lg px-2.5 py-1 border border-border/50">{ROLE_LABELS[u.role] || u.role}</span>
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {u.isActive ? '✓ ATIVO' : '✕ INATIVO'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'connections' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
                        <div className="px-8 py-5 border-b border-border flex items-center justify-between bg-muted/10">
                            <h2 className="font-bold text-lg">Canais Conectados</h2>
                            <button onClick={() => setShowConnModal(true)}
                                className="px-4 py-2 bg-foreground text-background rounded-xl text-sm font-bold shadow-lg shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition">
                                + Conectar Novo Canal
                            </button>
                        </div>
                        <div className="divide-y divide-border">
                            {(connections || []).length === 0 ? (
                                <div className="py-20 text-center">
                                    <div className="inline-flex w-16 h-16 items-center justify-center rounded-3xl bg-muted/50 text-3xl mb-4 grayscale">🔌</div>
                                    <p className="text-foreground font-bold text-lg">Nenhuma conexão ativa</p>
                                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
                                        Conecte as contas Meta Ads ou Google Ads dos seus clientes para iniciar a coleta automática de métricas.
                                    </p>
                                </div>
                            ) : (connections || []).map((conn) => (
                                <div key={conn.id} className="px-8 py-5 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${conn.channel === 'META' ? 'bg-[#1877F2]/10 border border-[#1877F2]/20' : 'bg-[#4285F4]/10 border border-[#4285F4]/20'}`}>
                                            {conn.channel === 'META' ? 'fb' : 'G'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{conn.accountName || 'Conta de Anúncios'}</p>
                                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-tight flex items-center gap-2">
                                                <span className="text-foreground">{conn.client?.name}</span>
                                                <span className="opacity-30">•</span>
                                                <span>ID: {conn.accountId}</span>
                                                {conn.lastSyncAt && (
                                                    <>
                                                        <span className="opacity-30">•</span>
                                                        <span className="text-blue-600">Sincronizado: {new Date(conn.lastSyncAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${conn.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {conn.status === 'ACTIVE' ? 'ONLINE' : conn.status}
                                        </span>
                                        <button
                                            onClick={() => handleSync(conn.id)}
                                            disabled={syncLoading === conn.id}
                                            className="px-4 py-1.5 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/70 transition disabled:opacity-40 flex items-center gap-2"
                                        >
                                            {syncLoading === conn.id ? '⏳ Sync...' : (
                                                <>🔄 <span className="hidden sm:inline">Sincronizar</span></>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => deleteConnMutation.mutate(conn.id)}
                                            className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition"
                                            title="Remover conexão"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-gradient-to-br from-foreground to-foreground/80 text-background border border-border shadow-xl">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl">💡</div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">Integração OAuth de Produção</h3>
                                <p className="text-white/70 text-sm leading-relaxed max-w-2xl">
                                    O MedGrowth usa o protocolo OAuth 2.0 para garantir que você nunca precise digitar senhas de terceiros.
                                    Seus tokens de acesso são armazenados com criptografia <strong>AES-256</strong> em nível de banco de dados e nunca são expostos ao navegador.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showUserModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] p-10 w-full max-w-md shadow-2xl border border-divider">
                        <h2 className="text-2xl font-black mb-6 text-foreground">Novo Usuário</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black uppercase text-muted-foreground mb-1.5 ml-1 block">Nome Completo</label>
                                <input type="text" placeholder="Ex: Victor Medeiros"
                                    className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border text-sm font-semibold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                                    value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-muted-foreground mb-1.5 ml-1 block">E-mail Profissional</label>
                                <input type="email" placeholder="victor@medgrowth.com"
                                    className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border text-sm font-semibold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                                    value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-muted-foreground mb-1.5 ml-1 block">Senha de Acesso</label>
                                <input type="password" placeholder="••••••••"
                                    className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border text-sm font-semibold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                                    value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-muted-foreground mb-1.5 ml-1 block">Perfil de Acesso</label>
                                <select className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border text-sm font-semibold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                    value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                                    <option value="COMMERCIAL">💼 Comercial (Vendas e Leads)</option>
                                    <option value="MANAGER">👔 Gestor/Cliente (Relatórios)</option>
                                    <option value="ADMIN">👑 Administrador (Acesso Total)</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-10">
                            <button className="flex-1 h-14 bg-primary text-primary-foreground rounded-2xl text-sm font-black shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition duration-200"
                                onClick={() => createUserMutation.mutate(userForm)}>
                                {createUserMutation.isPending ? 'CRIANDO...' : 'CRIAR USUÁRIO'}
                            </button>
                            <button className="px-6 h-14 bg-muted text-foreground rounded-2xl text-sm font-bold hover:bg-muted/70 transition duration-200"
                                onClick={() => setShowUserModal(false)}>CANCELAR</button>
                        </div>
                    </div>
                </div>
            )}

            {showConnModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl border border-divider">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-muted/50 rounded-[30px] flex items-center justify-center text-4xl mx-auto mb-4 grayscale">🔌</div>
                            <h2 className="text-2xl font-black text-foreground">Conectar Nova Conta</h2>
                            <p className="text-muted-foreground text-sm font-medium mt-1">Siga o fluxo OAuth para autorizar o MedGrowth</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black uppercase text-muted-foreground mb-2 ml-1 block">Selecione o Cliente</label>
                                <select className="w-full h-14 px-5 rounded-3xl bg-muted/30 border border-border text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none appearance-none cursor-pointer"
                                    value={connForm.clientId} onChange={(e) => setConnForm({ ...connForm, clientId: e.target.value })}>
                                    <option value="">Selecione um cliente...</option>
                                    {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleConnect('META')}
                                    disabled={!connForm.clientId || oauthLoading === 'META'}
                                    className={`relative h-28 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all group overflow-hidden ${connForm.clientId ? 'border-primary/20 hover:border-[#1877F2] hover:bg-[#1877F2]/5' : 'opacity-50 grayscale cursor-not-allowed border-border'}`}
                                >
                                    <span className="text-3xl transition-transform group-hover:scale-110">📘</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#1877F2]">Meta Ads</span>
                                    {oauthLoading === 'META' && <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-xs font-bold text-[#1877F2]">CARREGANDO...</div>}
                                </button>

                                <button
                                    onClick={() => handleConnect('GOOGLE')}
                                    disabled={!connForm.clientId || oauthLoading === 'GOOGLE'}
                                    className={`relative h-28 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all group overflow-hidden ${connForm.clientId ? 'border-primary/20 hover:border-[#4285F4] hover:bg-[#4285F4]/5' : 'opacity-50 grayscale cursor-not-allowed border-border'}`}
                                >
                                    <span className="text-3xl transition-transform group-hover:scale-110">🔍</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#4285F4]">Google Ads</span>
                                    {oauthLoading === 'GOOGLE' && <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-xs font-bold text-[#4285F4]">CARREGANDO...</div>}
                                </button>
                            </div>
                        </div>

                        <div className="mt-10 pt-6 border-t border-border flex flex-col gap-4">
                            <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest leading-relaxed">
                                Você será redirecionado para o ambiente seguro do Google ou Meta para confirmar a autorização.
                            </p>
                            <button className="h-14 w-full bg-muted text-foreground rounded-2xl text-sm font-bold hover:bg-muted/70 transition duration-200"
                                onClick={() => setShowConnModal(false)}>VOLTAR</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
