'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
    Zap, Copy, Check, RefreshCw, Play, ChevronDown, Globe,
    MessageCircle, Settings, AlertCircle, CheckCircle, Loader2,
    Code, X, ExternalLink,
} from 'lucide-react';
import api from '@/lib/api';
import { useClient } from '@/contexts/ClientContext';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

type Client = { id: string; name: string; slug: string };
type Integration = {
    id: string; clientId: string; provider: string;
    enabled: boolean; pageId?: string; formId?: string;
    pageName?: string; formName?: string;
    webhookActive: boolean; lastLeadAt?: string;
    apiKey: string;
    client: { id: string; name: string; slug: string };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="ml-2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
            title="Copiar"
        >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
    const { data: session } = useSession();
    const qc = useQueryClient();
    const { selectedClientId, availableClients } = useClient();
    const [activeSnippetTab, setActiveSnippetTab] = useState<'js' | 'zapier' | 'make' | 'wordpress'>('js');

    // API URL for display
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-8d75.up.railway.app';
    const isSpecificClient = selectedClientId && selectedClientId !== 'ALL';

    // ── Data fetching ──
    const { data: integrations = [], isLoading: loadingIntegrations } = useQuery<Integration[]>({
        queryKey: ['integrations', selectedClientId],
        queryFn: () => api.get('/integrations', { params: isSpecificClient ? { clientId: selectedClientId } : {} }).then(r => r.data),
        enabled: true,
    });

    const { data: metaPages = [], isLoading: loadingPages } = useQuery({
        queryKey: ['meta-pages', selectedClientId],
        queryFn: () => api.get('/integrations/meta/pages', { params: { clientId: selectedClientId } }).then(r => r.data),
        enabled: !!selectedClientId,
        retry: false,
    });

    // ── Current integration for selected client ──
    const currentIntegration = isSpecificClient ? integrations.find(i => i.clientId === selectedClientId) : undefined;
    const selectedClient = isSpecificClient ? availableClients.find(c => c.id === selectedClientId) : undefined;
    const ingestUrl = selectedClient ? `${apiUrl}/ingest/leads/${selectedClient.slug}` : '';
    const apiKey = currentIntegration?.apiKey || '';

    // ── Forms query ──
    const [selectedPageId, setSelectedPageId] = useState<string>('');
    const [selectedPageName, setSelectedPageName] = useState<string>('');
    const { data: metaForms = [], isLoading: loadingForms } = useQuery({
        queryKey: ['meta-forms', selectedClientId, selectedPageId],
        queryFn: () => api.get(`/integrations/meta/pages/${selectedPageId}/forms`, { params: { clientId: selectedClientId } }).then(r => r.data),
        enabled: !!selectedPageId && !!selectedClientId,
        retry: false,
    });

    // ── Mutations ──
    const saveMeta = useMutation({
        mutationFn: (dto: any) => api.post('/integrations', dto).then(r => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); toast.success('Configuração META salva!'); },
    });

    const subscribeMeta = useMutation({
        mutationFn: () => api.post('/integrations/meta/subscribe', { clientId: selectedClientId, pageId: selectedPageId }).then(r => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); toast.success('Webhook ativado! Leads META serão capturados automaticamente.'); },
    });

    const rotateKey = useMutation({
        mutationFn: () => api.post('/integrations/ingest-key/rotate', { clientId: selectedClientId }).then(r => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); toast.success('API Key renovada!'); },
    });

    const testIngest = useMutation({
        mutationFn: () => api.post('/integrations/ingest-test', { clientSlug: selectedClient?.slug, apiKey }).then(r => r.data),
        onSuccess: () => toast.success('Lead de teste criado! Verifique a lista de Leads.'),
    });

    // ── Snippet content ──
    const jsSnippet = `fetch('${ingestUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CLIENT-KEY': '${apiKey}'
  },
  body: JSON.stringify({
    name: form.name.value,
    phone: form.phone.value,
    email: form.email.value,
    utm_source: new URLSearchParams(location.search).get('utm_source'),
    utm_medium: new URLSearchParams(location.search).get('utm_medium'),
    utm_campaign: new URLSearchParams(location.search).get('utm_campaign'),
    fbclid: new URLSearchParams(location.search).get('fbclid'),
    gclid: new URLSearchParams(location.search).get('gclid'),
    page_url: location.href
  })
});`;

    const zapierSnippet = `Webhook URL: ${ingestUrl}
Method: POST
Headers:
  X-CLIENT-KEY: ${apiKey}
  Content-Type: application/json
Body (JSON):
{
  "name": "{{Name}}",
  "phone": "{{Phone}}",
  "email": "{{Email}}",
  "utm_source": "zapier"
}`;

    const makeSnippet = `Module: HTTP > Make a request
URL: ${ingestUrl}
Method: POST
Headers: X-CLIENT-KEY = ${apiKey}
Body type: JSON
Body:
{
  "name": "{{1.name}}",
  "phone": "{{1.phone}}",
  "email": "{{1.email}}",
  "utm_source": "make"
}`;

    const wpSnippet = `// functions.php — add after form submission hook
add_action('wpcf7_before_send_mail', function($cf7) {
  $submission = WPCF7_Submission::get_instance();
  $data = $submission->get_posted_data();
  wp_remote_post('${ingestUrl}', [
    'method'  => 'POST',
    'headers' => [
      'Content-Type'  => 'application/json',
      'X-CLIENT-KEY'  => '${apiKey}',
    ],
    'body' => json_encode([
      'name'     => $data['your-name'] ?? '',
      'phone'    => $data['your-phone'] ?? '',
      'email'    => $data['your-email'] ?? '',
      'page_url' => $_SERVER['HTTP_REFERER'] ?? '',
    ]),
  ]);
});`;

    const snippets: Record<string, string> = { js: jsSnippet, zapier: zapierSnippet, make: makeSnippet, wordpress: wpSnippet };
    const snippetLabels: Record<string, string> = { js: 'JavaScript fetch', zapier: 'Zapier', make: 'Make / Integromat', wordpress: 'WordPress' };

    return (
        <div className="space-y-8 pb-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Integrações & Captura de Leads</h2>
                    <p className="text-muted-foreground">Configure captura automática via META Lead Ads e Landing Pages / WhatsApp.</p>
                </div>
            </div>

            {/* Headers */}
            {(!selectedClientId || selectedClientId === 'ALL') ? (
                <div className="bg-white rounded-[32px] border border-border shadow-sm p-12 text-center">
                    <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🏢</div>
                    <h2 className="text-xl font-bold mb-2">Selecione um Cliente</h2>
                    <p className="text-muted-foreground">
                        Para configurar o webhook do META Lead Ads ou a URL da API de leads (Make/Zapier),<br /> por favor selecione um cliente específico no cabeçalho acima.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                    {/* ── META Lead Ads Block ─────────────────────────────────── */}
                    <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Meta Lead Ads</h3>
                                    <p className="text-xs text-muted-foreground">Captura em tempo real via webhook</p>
                                </div>
                            </div>
                            {currentIntegration?.webhookActive && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Ativo
                                </span>
                            )}
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Webhook URL info */}
                            <div className="bg-slate-50 rounded-xl p-3 text-xs">
                                <span className="text-muted-foreground font-semibold uppercase tracking-wider">URL do Webhook (configurar no Meta):</span>
                                <div className="flex items-center mt-1">
                                    <code className="text-blue-700 break-all text-[11px]">{apiUrl}/webhooks/meta/leads</code>
                                    <CopyButton text={`${apiUrl}/webhooks/meta/leads`} />
                                </div>
                                <div className="mt-1">
                                    <span className="text-muted-foreground">Verify Token: </span>
                                    <code className="text-slate-700 text-[11px]">medgrowth-lead-verify</code>
                                </div>
                            </div>

                            {/* Page selector */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Página do Facebook</label>
                                {loadingPages ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Carregando páginas...
                                    </div>
                                ) : metaPages.length === 0 ? (
                                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                        Nenhuma conexão META ativa para este cliente. Conecte uma conta em Configurações → Anúncios.
                                    </p>
                                ) : (
                                    <select
                                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={selectedPageId}
                                        onChange={e => {
                                            setSelectedPageId(e.target.value);
                                            setSelectedPageName(metaPages.find((p: any) => p.id === e.target.value)?.name || '');
                                        }}
                                    >
                                        <option value="">-- Selecione uma Página --</option>
                                        {metaPages.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Form selector */}
                            {selectedPageId && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formulário de Leads</label>
                                    {loadingForms ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Carregando formulários...
                                        </div>
                                    ) : (
                                        <select
                                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            defaultValue=""
                                            id="form-select"
                                        >
                                            <option value="">-- Selecione um Formulário (opcional) --</option>
                                            {metaForms.map((f: any) => (
                                                <option key={f.id} value={f.id}>{f.name} ({f.status})</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => {
                                        const formEl = document.getElementById('form-select') as HTMLSelectElement;
                                        const formId = formEl?.value || undefined;
                                        const formName = metaForms.find((f: any) => f.id === formId)?.name;
                                        saveMeta.mutate({
                                            clientId: selectedClientId,
                                            provider: 'META',
                                            pageId: selectedPageId || undefined,
                                            pageName: selectedPageName || undefined,
                                            formId,
                                            formName,
                                            enabled: true,
                                        });
                                    }}
                                    disabled={saveMeta.isPending}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all disabled:opacity-50"
                                >
                                    {saveMeta.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Salvar Configuração
                                </button>
                                <button
                                    onClick={() => subscribeMeta.mutate()}
                                    disabled={!selectedPageId || subscribeMeta.isPending}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50"
                                >
                                    {subscribeMeta.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                    Ativar Captura
                                </button>
                            </div>

                            {currentIntegration?.lastLeadAt && (
                                <p className="text-xs text-muted-foreground">
                                    Último lead recebido: {new Date(currentIntegration.lastLeadAt).toLocaleString('pt-BR')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Landing / WhatsApp Block ────────────────────────────── */}
                    <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Landing Page / WhatsApp</h3>
                                    <p className="text-xs text-muted-foreground">Endpoint REST com UTMs e click IDs</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Endpoint */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endpoint</label>
                                <div className="flex items-center bg-slate-50 rounded-xl border border-border px-3 py-2">
                                    <code className="text-xs text-blue-700 break-all flex-1">{ingestUrl}</code>
                                    <CopyButton text={ingestUrl} />
                                </div>
                            </div>

                            {/* API Key */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Key (X-CLIENT-KEY)</label>
                                <div className="flex items-center bg-slate-50 rounded-xl border border-border px-3 py-2">
                                    <code className="text-xs text-slate-700 flex-1 truncate">{apiKey || 'Nenhuma key gerada'}</code>
                                    {apiKey && <CopyButton text={apiKey} />}
                                    <button
                                        onClick={() => rotateKey.mutate()}
                                        disabled={rotateKey.isPending}
                                        className="ml-1 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-orange-600 transition-colors"
                                        title="Renovar API Key"
                                    >
                                        {rotateKey.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Snippet tabs */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                                    {(['js', 'zapier', 'make', 'wordpress'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveSnippetTab(tab)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSnippetTab === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {snippetLabels[tab]}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <pre className="bg-slate-900 text-green-400 text-[11px] rounded-xl p-4 overflow-auto max-h-52 font-mono leading-relaxed">
                                        {snippets[activeSnippetTab]}
                                    </pre>
                                    <CopyButton text={snippets[activeSnippetTab]} />
                                </div>
                            </div>

                            {/* Test button */}
                            <button
                                onClick={() => testIngest.mutate()}
                                disabled={!apiKey || !selectedClient || testIngest.isPending}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-all shadow-md disabled:opacity-50"
                            >
                                {testIngest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                Testar Envio
                            </button>
                            <p className="text-xs text-muted-foreground -mt-3">Cria um lead de teste e exibe na lista de Leads.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Integrations list */}
            {integrations.length > 0 && (
                <div className="bg-white rounded-[28px] border border-border shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                        <h3 className="font-bold text-slate-900">Integrações Configuradas</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-slate-50/50">
                                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provedor</th>
                                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Página / Formulário</th>
                                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Último Lead</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {integrations.map((i: Integration) => (
                                <tr key={i.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 text-sm font-semibold">{i.client.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">{i.provider}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">{i.pageName || '—'} / {i.formName || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${i.webhookActive && i.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {i.webhookActive && i.enabled ? <><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Ativo</> : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {i.lastLeadAt ? new Date(i.lastLeadAt).toLocaleString('pt-BR') : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
