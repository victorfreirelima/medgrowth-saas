import axios from 'axios';
import { getSession } from 'next-auth/react';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from session
api.interceptors.request.use(async (config) => {
    if (typeof window !== 'undefined') {
        const session = await getSession();
        if (session?.user) {
            const token = (session.user as { accessToken?: string }).accessToken;
            if (token) config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Response error handler
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    },
);

export default api;

// ─── Typed API helpers ───────────────────────────────────────────────────────

export const dashboardApi = {
    getKPIs: (params?: Record<string, string>) =>
        api.get('/dashboard/kpis', { params }).then((r) => r.data),
    getTimeSeries: (params?: Record<string, string>) =>
        api.get('/dashboard/time-series', { params }).then((r) => r.data),
    getCampaigns: (params?: Record<string, string>) =>
        api.get('/dashboard/campaigns', { params }).then((r) => r.data),
};

export const leadsApi = {
    getAll: (params?: Record<string, unknown>) =>
        api.get('/leads', { params }).then((r) => r.data),
    getOne: (id: string) => api.get(`/leads/${id}`).then((r) => r.data),
    create: (clientId: string, data: unknown) =>
        api.post(`/leads/${clientId}`, data).then((r) => r.data),
    update: (id: string, data: unknown) =>
        api.patch(`/leads/${id}`, data).then((r) => r.data),
    delete: (id: string) => api.delete(`/leads/${id}`).then((r) => r.data),
    addNote: (id: string, content: string) =>
        api.post(`/leads/${id}/notes`, { content }).then((r) => r.data),
    getFunnel: (clientId?: string) =>
        api.get('/leads/funnel', { params: { clientId } }).then((r) => r.data),
    getROI: (clientId: string) =>
        api.get('/leads/roi', { params: { clientId } }).then((r) => r.data),
};

export const appointmentsApi = {
    getAll: (params?: Record<string, unknown>) =>
        api.get('/appointments', { params }).then((r) => r.data),
    getOne: (id: string) => api.get(`/appointments/${id}`).then((r) => r.data),
    create: (data: unknown) => api.post('/appointments', data).then((r) => r.data),
    update: (id: string, data: unknown) =>
        api.patch(`/appointments/${id}`, data).then((r) => r.data),
    delete: (id: string) => api.delete(`/appointments/${id}`).then((r) => r.data),
};

export const clientsApi = {
    getAll: () => api.get('/clients').then((r) => r.data),
    getOne: (id: string) => api.get(`/clients/${id}`).then((r) => r.data),
    create: (data: unknown) => api.post('/clients', data).then((r) => r.data),
    update: (id: string, data: unknown) =>
        api.patch(`/clients/${id}`, data).then((r) => r.data),
    delete: (id: string) => api.delete(`/clients/${id}`).then((r) => r.data),
};

export const usersApi = {
    getAll: () => api.get('/users').then((r) => r.data),
    create: (data: unknown) => api.post('/users', data).then((r) => r.data),
    update: (id: string, data: unknown) =>
        api.patch(`/users/${id}`, data).then((r) => r.data),
    delete: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
    assignClients: (id: string, clientIds: string[]) =>
        api.patch(`/users/${id}/clients`, { clientIds }).then((r) => r.data),
};

export const adsApi = {
    getConnections: (clientId?: string) =>
        api.get('/ads/connections', { params: { clientId } }).then((r) => r.data),
    createConnection: (data: unknown) =>
        api.post('/ads/connections', data).then((r) => r.data),
    deleteConnection: (id: string) =>
        api.delete(`/ads/connections/${id}`).then((r) => r.data),
    triggerSync: (id: string) =>
        api.post(`/ads/connections/${id}/sync`).then((r) => r.data),
    getMetaOAuthUrl: (clientId: string) =>
        api.get('/ads/meta/oauth-url', { params: { clientId } }).then((r) => r.data),
    getGoogleOAuthUrl: (clientId: string) =>
        api.get('/ads/google/oauth-url', { params: { clientId } }).then((r) => r.data),
};

export const integrationsApi = {
    list: (clientId?: string) =>
        api.get('/integrations', { params: { clientId } }).then((r) => r.data),
    save: (data: unknown) => api.post('/integrations', data).then((r) => r.data),
    getMetaPages: (clientId: string) =>
        api.get('/integrations/meta/pages', { params: { clientId } }).then((r) => r.data),
    getMetaForms: (clientId: string, pageId: string) =>
        api.get(`/integrations/meta/pages/${pageId}/forms`, { params: { clientId } }).then((r) => r.data),
    subscribeMeta: (clientId: string, pageId: string) =>
        api.post('/integrations/meta/subscribe', { clientId, pageId }).then((r) => r.data),
    rotateIngestKey: (clientId: string) =>
        api.post('/integrations/ingest-key/rotate', { clientId }).then((r) => r.data),
    testIngest: (clientSlug: string, apiKey: string) =>
        api.post('/integrations/ingest-test', { clientSlug, apiKey }).then((r) => r.data),
};
