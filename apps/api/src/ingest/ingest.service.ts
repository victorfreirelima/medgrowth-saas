import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IngestService {
    private readonly logger = new Logger(IngestService.name);

    constructor(private readonly prisma: PrismaService) { }

    async ingestLead(
        clientSlug: string,
        apiKey: string,
        dto: {
            name: string;
            phone?: string;
            email?: string;
            message?: string;
            form_name?: string;
            page_url?: string;
            referrer?: string;
            utm_source?: string;
            utm_medium?: string;
            utm_campaign?: string;
            utm_content?: string;
            utm_term?: string;
            gclid?: string;
            wbraid?: string;
            gbraid?: string;
            fbclid?: string;
            device?: string;
            timezone?: string;
        },
    ) {
        // Validate client + API key
        const integration = await this.prisma.clientIntegration.findFirst({
            where: {
                apiKey,
                client: { slug: clientSlug },
                enabled: true,
            },
            include: { client: true },
        });

        if (!integration) {
            throw new UnauthorizedException('Invalid API key or client.');
        }

        const { client } = integration;

        // Dedup: skip if same phone + client within last 60 seconds
        if (dto.phone) {
            const recentDuplicate = await this.prisma.lead.findFirst({
                where: {
                    clientId: client.id,
                    phone: dto.phone,
                    createdAt: { gte: new Date(Date.now() - 60 * 1000) },
                },
            });
            if (recentDuplicate) {
                this.logger.warn(`[INGEST] Duplicate lead suppressed: phone=${dto.phone} client=${clientSlug}`);
                return recentDuplicate;
            }
        }

        // Detect source
        const source = dto.message ? 'WHATSAPP' : 'WEBSITE';

        // Detect channel from UTMs
        const utmMedium = dto.utm_medium?.toLowerCase() || '';
        const utmSource = dto.utm_source?.toLowerCase() || '';
        let channel: 'META' | 'GOOGLE' | 'ORGANIC' | 'REFERRAL' | 'OTHER' = 'OTHER';
        if (dto.fbclid || utmMedium.includes('facebook') || utmSource.includes('facebook') || utmSource.includes('instagram')) {
            channel = 'META';
        } else if (dto.gclid || utmMedium.includes('google') || utmSource.includes('google')) {
            channel = 'GOOGLE';
        } else if (utmMedium.includes('organic') || utmMedium === 'seo') {
            channel = 'ORGANIC';
        } else if (dto.utm_source) {
            channel = 'REFERRAL';
        }

        return this.prisma.lead.create({
            data: {
                clientId: client.id,
                name: dto.name,
                phone: dto.phone,
                email: dto.email,
                message: dto.message,
                formName: dto.form_name,
                pageUrl: dto.page_url,
                source: source as any,
                channel,
                utmSource: dto.utm_source,
                utmMedium: dto.utm_medium,
                utmCampaign: dto.utm_campaign,
                utmContent: dto.utm_content,
                utmTerm: dto.utm_term,
                gclid: dto.gclid,
                wbraid: dto.wbraid,
                gbraid: dto.gbraid,
                fbclid: dto.fbclid,
                deviceType: dto.device,
                timezone: dto.timezone,
                status: 'NEW',
            },
        });
    }
}
