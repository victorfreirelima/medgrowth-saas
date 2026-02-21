import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Processor('lead-capture')
export class LeadCaptureProcessor extends WorkerHost {
    private readonly logger = new Logger(LeadCaptureProcessor.name);

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async process(job: Job<any>): Promise<void> {
        if (job.name === 'process-meta-lead') {
            await this.processMetaLead(job.data);
        }
    }

    private async processMetaLead(data: {
        leadgenId: string;
        pageId: string;
        adId?: string;
        adgroupId?: string;
        formId?: string;
        createdTime?: number;
        rawPayload?: any;
    }) {
        const { leadgenId, pageId, adId, adgroupId, formId, rawPayload } = data;

        try {
            this.logger.log(`[META] Processing leadgen_id=${leadgenId}`);

            // Dedupe check
            const existing = await this.prisma.lead.findUnique({
                where: { providerLeadId: leadgenId },
            });
            if (existing) {
                this.logger.log(`[META] Duplicate lead ${leadgenId} — skipping.`);
                return;
            }

            // Find client integration matching this page
            const integration = await this.prisma.clientIntegration.findFirst({
                where: { pageId, provider: 'META', enabled: true },
                include: { client: true },
            });

            if (!integration) {
                this.logger.warn(`[META] No active integration for page=${pageId}. Storing lead without clientId for review.`);
                // Still try to save with a default or skip
                return;
            }

            // Fetch lead details from META Graph API
            const userToken = await this.getPageAccessToken(integration.clientId);
            if (!userToken) {
                this.logger.error(`[META] No access token for client=${integration.clientId}`);
                return;
            }

            const apiVersion = process.env.META_API_VERSION || 'v19.0';
            const leadRes = await axios.get(
                `https://graph.facebook.com/${apiVersion}/${leadgenId}`,
                {
                    params: {
                        fields: 'field_data,ad_id,adset_id,campaign_id,ad_name,adset_name,campaign_name,created_time,platform',
                        access_token: userToken,
                    },
                    timeout: 10000,
                },
            );

            const leadData = leadRes.data;
            const fields = (leadData.field_data || []) as Array<{ name: string; values: string[] }>;

            // Normalize fields
            const get = (key: string) =>
                fields.find(f => f.name.toLowerCase().includes(key))?.values?.[0] || undefined;

            const name = get('full_name') || get('name') || get('first_name') || 'Lead META';
            const email = get('email');
            const phone = get('phone') || get('phone_number') || get('mobile');

            // Campaign info
            const campaignId = leadData.campaign_id || undefined;
            const campaignName = leadData.campaign_name || undefined;
            const adsetId = leadData.adset_id || adgroupId || undefined;
            const finalAdId = leadData.ad_id || adId || undefined;

            // Upsert lead
            const lead = await this.prisma.lead.create({
                data: {
                    clientId: integration.clientId,
                    name,
                    email,
                    phone,
                    channel: 'META',
                    source: 'META_LEAD_ADS',
                    providerLeadId: leadgenId,
                    campaignId,
                    campaignName,
                    adsetId,
                    adId: finalAdId,
                    formName: integration.formName || undefined,
                    rawPayload: { ...rawPayload, ...leadData },
                    status: 'NOVO',
                },
            });

            // Update lastLeadAt
            await this.prisma.clientIntegration.update({
                where: { id: integration.id },
                data: { lastLeadAt: new Date() },
            });

            this.logger.log(`[META] Lead created: id=${lead.id} name="${name}" client=${integration.client.slug}`);
        } catch (err: any) {
            this.logger.error(`[META] Failed to process leadgen_id=${leadgenId}: ${err.message}`);
            Sentry.captureException(err, { extra: { leadgenId, pageId } });
            throw err; // Allow BullMQ to retry
        }
    }

    private async getPageAccessToken(clientId: string): Promise<string | null> {
        const connection = await this.prisma.adAccountConnection.findFirst({
            where: { clientId, channel: 'META', status: 'ACTIVE' },
        });
        if (!connection) return null;

        try {
            const { createDecipheriv } = await import('crypto');
            const key = process.env.ENCRYPTION_KEY || '';
            const [ivHex, encrypted] = connection.accessTokenEncrypted.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const keyBuf = Buffer.from(key.substring(0, 32).padEnd(32, '0'));
            const decipher = createDecipheriv('aes-256-cbc', keyBuf, iv);
            const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()]);
            return decrypted.toString('utf8');
        } catch {
            return null;
        }
    }
}
