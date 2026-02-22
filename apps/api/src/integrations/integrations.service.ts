import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';


@Injectable()
export class IntegrationsService {
    private readonly logger = new Logger(IntegrationsService.name);
    private readonly apiVersion = process.env.META_API_VERSION || 'v19.0';

    constructor(private readonly prisma: PrismaService) { }

    async list(clientId?: string) {
        return this.prisma.clientIntegration.findMany({
            where: clientId ? { clientId } : {},
            include: { client: { select: { id: true, name: true, slug: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async upsert(dto: {
        clientId: string;
        provider: string;
        pageId?: string;
        formId?: string;
        pageName?: string;
        formName?: string;
        enabled?: boolean;
    }) {
        return this.prisma.clientIntegration.upsert({
            where: {
                clientId_provider: {
                    clientId: dto.clientId,
                    provider: dto.provider as any,
                },
            },
            create: {
                clientId: dto.clientId,
                provider: dto.provider as any,
                pageId: dto.pageId,
                formId: dto.formId,
                pageName: dto.pageName,
                formName: dto.formName,
                enabled: dto.enabled ?? true,
                apiKey: crypto.randomUUID(),
            },
            update: {
                pageId: dto.pageId,
                formId: dto.formId,
                pageName: dto.pageName,
                formName: dto.formName,
                enabled: dto.enabled ?? true,
            },
        });
    }

    async getMetaPages(clientId: string) {
        try {
            const token = await this.getClientToken(clientId);
            const res = await axios.get(
                `https://graph.facebook.com/${this.apiVersion}/me/accounts`,
                { params: { access_token: token, fields: 'id,name,access_token,fan_count' } },
            );
            return res.data.data || [];
        } catch (e) {
            if (e instanceof NotFoundException) return [];
            throw e;
        }
    }

    async getMetaForms(clientId: string, pageId: string) {
        try {
            const token = await this.getPageToken(clientId, pageId);
            const res = await axios.get(
                `https://graph.facebook.com/${this.apiVersion}/${pageId}/leadgen_forms`,
                { params: { access_token: token, fields: 'id,name,status,leads_count,created_time' } },
            );
            return res.data.data || [];
        } catch (e) {
            if (e instanceof NotFoundException) return [];
            throw e;
        }
    }

    async subscribePageToWebhook(clientId: string, pageId: string) {
        const token = await this.getPageToken(clientId, pageId);
        const res = await axios.post(
            `https://graph.facebook.com/${this.apiVersion}/${pageId}/subscribed_apps`,
            null,
            {
                params: {
                    access_token: token,
                    subscribed_fields: 'leadgen',
                },
            },
        );

        if (res.data?.success) {
            await this.prisma.clientIntegration.updateMany({
                where: { clientId, pageId, provider: 'META' },
                data: { webhookActive: true, enabled: true },
            });
            this.logger.log(`[META] Page ${pageId} subscribed to leadgen webhook for client ${clientId}`);
            return { success: true, pageId };
        }
        return { success: false, pageId, response: res.data };
    }

    async rotateApiKey(clientId: string) {
        // Find the WEBSITE integration or create one
        const existing = await this.prisma.clientIntegration.findFirst({
            where: { clientId },
            orderBy: { createdAt: 'asc' },
        });

        if (existing) {
            return this.prisma.clientIntegration.update({
                where: { id: existing.id },
                data: { apiKey: crypto.randomUUID() },
            });
        }

        // Create a base integration for ingest
        const client = await this.prisma.client.findUniqueOrThrow({ where: { id: clientId } });
        return this.prisma.clientIntegration.create({
            data: {
                clientId,
                provider: 'META',
                enabled: true,
                apiKey: crypto.randomUUID(),
            },
        });
    }

    async sendTestLead(clientSlug: string, apiKey: string) {
        const apiUrl = process.env.API_URL || 'http://localhost:3001';
        const res = await axios.post(
            `${apiUrl}/ingest/leads/${clientSlug}`,
            {
                name: 'Lead Teste Automação',
                phone: '11999999999',
                email: 'teste@automacao.com',
                form_name: 'Teste_Form',
                utm_source: 'test',
                utm_medium: 'manual',
                utm_campaign: 'ingest_test',
            },
            { headers: { 'X-CLIENT-KEY': apiKey } },
        );
        return res.data;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private async getClientToken(clientId: string): Promise<string> {
        const conn = await this.prisma.adAccountConnection.findFirst({
            where: { clientId, channel: 'META', status: 'ACTIVE' },
        });
        if (!conn) throw new NotFoundException('No active META connection for this client.');
        return this.decryptToken(conn.accessTokenEncrypted);
    }

    private async getPageToken(clientId: string, pageId: string): Promise<string> {
        const userToken = await this.getClientToken(clientId);
        // Try to get page-specific token via the accounts endpoint
        try {
            const res = await axios.get(
                `https://graph.facebook.com/${this.apiVersion}/me/accounts`,
                { params: { access_token: userToken, fields: 'id,access_token' } },
            );
            const page = (res.data.data || []).find((p: any) => p.id === pageId);
            if (page?.access_token) return page.access_token;
        } catch { }
        return userToken; // Fall back to user token
    }

    private decryptToken(encrypted: string): string {
        try {
            const key = process.env.ENCRYPTION_KEY || '';
            const [ivHex, enc] = encrypted.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const keyBuf = Buffer.from(key.substring(0, 32).padEnd(32, '0'));
            const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
            return Buffer.concat([decipher.update(Buffer.from(enc, 'hex')), decipher.final()]).toString();
        } catch {
            return encrypted; // Return as-is if not encrypted
        }
    }
}
