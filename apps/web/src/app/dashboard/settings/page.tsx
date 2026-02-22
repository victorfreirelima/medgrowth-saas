'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, clientsApi, adsApi } from '@/lib/api';
import { useSession } from 'next-auth/react';
import { useClient } from '@/contexts/ClientContext';
import { FormInput } from '@/components/ui/FormInput';

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
    const { selectedClientId } = useClient();
    const qc = useQueryClient();
    const [tab, setTab] = useState<'users' | 'connections'>('users');
    const [showUserModal, setShowUserModal] = useState(false);
    const [showConnModal, setShowConnModal] = useState(false);
    const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'COMMERCIAL', clientIds: [] as string[] });
    const [connForm, setConnForm] = useState({ clientId: '', channel: 'META' });
    const [showInlineClientCreate, setShowInlineClientCreate] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [syncLoading, setSyncLoading] = useState<string | null>(null);
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);

    const { data: users } = useQuery<User[]>({ queryKey: ['users'], queryFn: usersApi.getAll });
    const { data: clients } = useQuery<Client[]>({ queryKey: ['clients'], queryFn: clientsApi.getAll });

    // Only fetch connections if a specific client is selected
    const { data: connections } = useQuery<Connection[]>({
        queryKey: ['connections', selectedClientId],
        queryFn: () => adsApi.getConnections(selectedClientId === 'ALL' ? undefined : (selectedClientId ?? undefined)),
        enabled: selectedClientId !== 'ALL' && !!selectedClientId
    });

    const createUserMutation = useMutation({
        mutationFn: (data: typeof userForm) => usersApi.create(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowUserModal(false); },
    });

    const deleteConnMutation = useMutation({
        mutationFn: (id: string) => adsApi.deleteConnection(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
    });

    const createClientMutation = useMutation({
        mutationFn: (data: { name: string; slug: string }) => clientsApi.create(data),
        onSuccess: (data: any) => {
            qc.invalidateQueries({ queryKey: ['clients'] });
            setConnForm({ ...connForm, clientId: data.id });
            setShowInlineClientCreate(false);
            setNewClientName('');
        },
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
        // If a client is selected globally, use that for connection automatically.
        // The modal still has the selector if 'connForm.clientId' was somehow set, 
        // but it shouldn't show up. We prioritize the globally selected client.
        const targetClientId = selectedClientId !== 'ALL' && selectedClientId ? selectedClientId : connForm.clientId;

        if (!targetClientId) {
            alert('Por favor, selecione um cliente primeiro.');
            return;
        }
        setOauthLoading(channel);
        try {
            const res = channel === 'META'
                ? await adsApi.getMetaOAuthUrl(targetClientId)
                : await adsApi.getGoogleOAuthUrl(targetClientId);

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
                <div className="space-y-6">
                    {(!selectedClientId || selectedClientId === 'ALL') ? (
                        <div className="bg-white rounded-[32px] border border-border shadow-sm p-12 text-center">
                            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🏢</div>
                            <h2 className="text-xl font-bold mb-2">Selecione um Cliente</h2>
                            <p className="text-muted-foreground">
                                As conexões de anúncios são individuais. Escolha um cliente específico <br /> no menu superior direito para gerenciar suas integrações.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Meta Ads Card */}
                                <div className="bg-white rounded-[32px] border border-border shadow-sm overflow-hidden flex flex-col">
                                    <div className="p-8 pb-4 flex items-center justify-between">
                                        <div className="p-3 rounded-2xl bg-[#1877F2]/10 border border-[#1877F2]/20">
                                            <svg className="w-8 h-8 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                            </svg>
                                        </div>
                                        {connections?.find(c => c.channel === 'META') ? (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-green-200">Conectado</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-wider rounded-lg border border-border/50">Não Conectado</span>
                                        )}
                                    </div>
                                    <div className="px-8 py-2">
                                        <h3 className="text-xl font-black">Meta Ads</h3>
                                        <p className="text-muted-foreground text-sm mt-1">Sincronize campanhas do Facebook e Instagram Ads.</p>
                                    </div>
                                    <div className="mt-auto p-8 pt-4">
                                        {connections?.find(c => c.channel === 'META') ? (
                                            <div className="space-y-4">
                                                <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
                                                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Último Sync</p>
                                                    <p className="text-xs font-bold font-mono">
                                                        {connections.find(c => c.channel === 'META')?.lastSyncAt
                                                            ? new Date(connections.find(c => c.channel === 'META')!.lastSyncAt!).toLocaleString('pt-BR')
                                                            : 'Nunca sincronizado'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleSync(connections.find(c => c.channel === 'META')!.id)}
                                                    disabled={syncLoading === connections.find(c => c.channel === 'META')?.id}
                                                    className="w-full h-12 bg-foreground text-background rounded-2xl text-sm font-black hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50">
                                                    {syncLoading === connections.find(c => c.channel === 'META')?.id ? 'Sincronizando...' : 'Sincronizar agora'}
                                                </button>
                                                <button
                                                    onClick={() => deleteConnMutation.mutate(connections.find(c => c.channel === 'META')!.id)}
                                                    className="w-full text-[10px] font-black uppercase text-red-500 hover:text-red-600 transition tracking-widest pt-2">
                                                    Remover Conexão
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowConnModal(true)}
                                                className="w-full h-14 bg-[#1877F2] text-white rounded-2xl text-sm font-black shadow-xl shadow-[#1877F2]/20 hover:scale-[1.02] active:scale-[0.98] transition">
                                                Conectar Meta Ads
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Google Ads Card */}
                                <div className="bg-white rounded-[32px] border border-border shadow-sm overflow-hidden flex flex-col">
                                    <div className="p-8 pb-4 flex items-center justify-between">
                                        <div className="p-3 rounded-2xl bg-[#4285F4]/10 border border-[#4285F4]/20">
                                            <svg className="w-8 h-8 text-[#4285F4]" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.92 3.32-2.12 4.52-1.32 1.32-3.4 2.12-6.52 2.12-5.2 0-9.44-4.2-9.44-9.44s4.24-9.44 9.44-9.44c2.84 0 4.92 1.12 6.44 2.56l2.32-2.32C18.12 2.12 15.44 1 12.48 1s-6.44 2.4-8.76 4.72c-2.32 2.32-3.72 5.52-3.72 8.76s1.4 6.44 3.72 8.76c2.32 2.32 5.8 3.76 8.76 3.76 2.68 0 4.92-.88 6.72-2.68 1.84-1.84 2.64-4.32 2.64-6.32 0-.64-.04-1.28-.16-1.88h-9.2z" />
                                            </svg>
                                        </div>
                                        {connections?.find(c => c.channel === 'GOOGLE') ? (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-green-200">Conectado</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-wider rounded-lg border border-border/50">Não Conectado</span>
                                        )}
                                    </div>
                                    <div className="px-8 py-2">
                                        <h3 className="text-xl font-black">Google Ads</h3>
                                        <p className="text-muted-foreground text-sm mt-1">Sincronize campanhas de Busca, Display e YouTube.</p>
                                    </div>
                                    <div className="mt-auto p-8 pt-4">
                                        {connections?.find(c => c.channel === 'GOOGLE') ? (
                                            <div className="space-y-4">
                                                <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
                                                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Último Sync</p>
                                                    <p className="text-xs font-bold font-mono">
                                                        {connections.find(c => c.channel === 'GOOGLE')?.lastSyncAt
                                                            ? new Date(connections.find(c => c.channel === 'GOOGLE')!.lastSyncAt!).toLocaleString('pt-BR')
                                                            : 'Nunca sincronizado'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleSync(connections.find(c => c.channel === 'GOOGLE')!.id)}
                                                    disabled={syncLoading === connections.find(c => c.channel === 'GOOGLE')?.id}
                                                    className="w-full h-12 bg-foreground text-background rounded-2xl text-sm font-black hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50">
                                                    {syncLoading === connections.find(c => c.channel === 'GOOGLE')?.id ? 'Sincronizando...' : 'Sincronizar agora'}
                                                </button>
                                                <button
                                                    onClick={() => deleteConnMutation.mutate(connections.find(c => c.channel === 'GOOGLE')!.id)}
                                                    className="w-full text-[10px] font-black uppercase text-red-500 hover:text-red-600 transition tracking-widest pt-2">
                                                    Remover Conexão
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowConnModal(true)}
                                                className="w-full h-14 bg-[#4285F4] text-white rounded-2xl text-sm font-black shadow-xl shadow-[#4285F4]/20 hover:scale-[1.02] active:scale-[0.98] transition">
                                                Conectar Google Ads
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 rounded-[40px] bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                                <div className="relative flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">🔒</div>
                                    <div>
                                        <h3 className="text-xl font-black mb-1">Segurança de Dados</h3>
                                        <p className="text-white/80 text-sm leading-relaxed max-w-2xl font-medium">
                                            Suas conexões usam criptografia de ponta a ponta (AES-256). O MedGrowth nunca armazena suas senhas,
                                            apenas tokens de acesso autorizados via APIs oficiais do Facebook e Google.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {showUserModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] p-10 w-full max-w-md shadow-2xl border border-divider">
                        <h2 className="text-2xl font-black mb-6 text-foreground">Novo Usuário</h2>
                        <div className="space-y-4">
                            <FormInput
                                label="Nome Completo"
                                id="user-name"
                                name="user-name"
                                placeholder="Ex: Victor Medeiros"
                                className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border text-sm font-semibold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50 text-foreground"
                                labelClassName="text-xs font-black uppercase text-muted-foreground mb-1.5 ml-1 block"
                                value={userForm.name}
                                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                                autoComplete="name"
                                required
                            />
                            <FormInput
                                label="E-mail Profissional"
                                id="user-email"
                                name="user-email"
                                type="email"
                                placeholder="victor@medgrowth.com"
                                className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border text-sm font-semibold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50 text-foreground"
                                labelClassName="text-xs font-black uppercase text-muted-foreground mb-1.5 ml-1 block"
                                value={userForm.email}
                                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                                autoComplete="email"
                                required
                            />
                            <FormInput
                                label="Senha de Acesso"
                                id="user-password"
                                name="user-password"
                                type="password"
                                placeholder="••••••••"
                                className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border text-sm font-semibold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50 text-foreground"
                                labelClassName="text-xs font-black uppercase text-muted-foreground mb-1.5 ml-1 block"
                                value={userForm.password}
                                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                autoComplete="new-password"
                                required
                            />
                            <div>
                                <label htmlFor="user-role" className="text-xs font-black uppercase text-muted-foreground mb-1.5 ml-1 block">Perfil de Acesso</label>
                                <select
                                    id="user-role"
                                    name="user-role"
                                    className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border text-sm font-semibold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                    value={userForm.role}
                                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                >
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
                                <div className="flex items-center justify-between mb-2 ml-1">
                                    <label className="text-xs font-black uppercase text-muted-foreground">Selecione o Cliente</label>
                                    <button
                                        onClick={() => setShowInlineClientCreate(!showInlineClientCreate)}
                                        className="text-[10px] font-black uppercase text-primary hover:underline">
                                        {showInlineClientCreate ? '✕ Cancelar' : '+ Criar Novo'}
                                    </button>
                                </div>

                                {showInlineClientCreate ? (
                                    <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                                        <FormInput
                                            label="Nome do cliente (Inline)"
                                            id="new-client-name"
                                            name="new-client-name"
                                            placeholder="Nome do novo cliente..."
                                            className="flex-1 h-14 px-5 rounded-3xl bg-primary/5 border border-primary/20 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none text-foreground"
                                            labelClassName="sr-only"
                                            value={newClientName}
                                            onChange={(e) => setNewClientName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const slug = newClientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                                    createClientMutation.mutate({ name: newClientName, slug });
                                                }
                                            }}
                                            autoComplete="off"
                                        />
                                        <button
                                            onClick={() => {
                                                const slug = newClientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                                createClientMutation.mutate({ name: newClientName, slug });
                                            }}
                                            disabled={!newClientName || createClientMutation.isPending}
                                            className="h-14 px-6 bg-primary text-white rounded-[24px] text-xs font-black disabled:opacity-50">
                                            {createClientMutation.isPending ? '...' : 'OK'}
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        id="client-select"
                                        name="client-select"
                                        className="w-full h-14 px-5 rounded-3xl bg-muted/30 border border-border text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none appearance-none cursor-pointer"
                                        value={connForm.clientId}
                                        onChange={(e) => setConnForm({ ...connForm, clientId: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecione um cliente...</option>
                                        {(clients || []).map((c: any) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.slug?.includes('demo') ? '(DEMO)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
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
