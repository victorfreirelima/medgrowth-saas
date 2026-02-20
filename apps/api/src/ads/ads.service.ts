import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AdChannel, ConnectionStatus, UserRole } from '@prisma/client';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function encrypt(text: string, key: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'utf8').slice(0, 32), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string, key: string): string {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'utf8').slice(0, 32), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

@Injectable()
export class AdsService {
    private readonly encKey: string;

    constructor(private readonly prisma: PrismaService) {
        this.encKey = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
    }

    private assertClientAccess(user: any, clientId: string) {
        if (user.role !== UserRole.ADMIN && !user.clientIds.includes(clientId)) {
            throw new ForbiddenException('No access to this client');
        }
    }

    async getConnections(user: any, clientId?: string) {
        const clientIds = user.role === UserRole.ADMIN
            ? (clientId ? [clientId] : undefined)
            : user.clientIds;

        const connections = await this.prisma.adAccountConnection.findMany({
            where: clientIds ? { clientId: { in: clientIds } } : {},
            include: { client: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });

        // Never expose tokens to frontend
        return connections.map(({ accessTokenEncrypted, refreshTokenEncrypted, ...c }) => ({
            ...c,
            hasToken: !!accessTokenEncrypted,
        }));
    }

    async createConnection(user: any, dto: {
        clientId: string;
        channel: AdChannel;
        accountId: string;
        accountName?: string;
        accessToken: string;
        refreshToken?: string;
        expiresAt?: Date;
    }) {
        this.assertClientAccess(user, dto.clientId);
        return this.prisma.adAccountConnection.create({
            data: {
                clientId: dto.clientId,
                channel: dto.channel,
                accountId: dto.accountId,
                accountName: dto.accountName,
                accessTokenEncrypted: encrypt(dto.accessToken, this.encKey),
                refreshTokenEncrypted: dto.refreshToken ? encrypt(dto.refreshToken, this.encKey) : null,
                expiresAt: dto.expiresAt,
                status: ConnectionStatus.ACTIVE,
            },
            select: {
                id: true, clientId: true, channel: true, accountId: true,
                accountName: true, status: true, createdAt: true,
            },
        });
    }

    async deleteConnection(user: any, id: string) {
        const conn = await this.prisma.adAccountConnection.findUnique({
            where: { id }, select: { clientId: true },
        });
        if (!conn) throw new NotFoundException('Connection not found');
        this.assertClientAccess(user, conn.clientId);
        await this.prisma.adAccountConnection.delete({ where: { id } });
        return { message: 'Connection deleted' };
    }

    async triggerSync(user: any, connectionId: string) {
        const conn = await this.prisma.adAccountConnection.findUnique({
            where: { id: connectionId },
        });
        if (!conn) throw new NotFoundException('Connection not found');
        this.assertClientAccess(user, conn.clientId);

        // In production this would enqueue a BullMQ job
        // For MVP, we simulate a sync by inserting today's snapshot
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const mockCampaigns = [
            { id: `${conn.channel}_camp_1`, name: `${conn.channel} Campaign A` },
            { id: `${conn.channel}_camp_2`, name: `${conn.channel} Campaign B` },
        ];

        for (const camp of mockCampaigns) {
            const spend = parseFloat((Math.random() * 150 + 30).toFixed(2));
            const impressions = Math.floor(Math.random() * 15000 + 3000);
            const clicks = Math.floor(impressions * (Math.random() * 0.04 + 0.01));
            const leads = Math.floor(clicks * (Math.random() * 0.1 + 0.02));
            await this.prisma.campaignSnapshotDaily.upsert({
                where: {
                    connectionId_date_campaignId_adsetId: {
                        connectionId: conn.id,
                        date: today,
                        campaignId: camp.id,
                        adsetId: null as unknown as string,
                    },
                },
                update: { spend, impressions, clicks, leads, ctr: clicks / impressions, cpc: spend / clicks, cpm: (spend / impressions) * 1000 },
                create: {
                    connectionId: conn.id,
                    date: today,
                    campaignId: camp.id,
                    campaignName: camp.name,
                    channel: conn.channel,
                    spend, impressions, clicks, leads,
                    ctr: clicks / impressions,
                    cpc: clicks > 0 ? spend / clicks : 0,
                    cpm: (spend / impressions) * 1000,
                },
            });
        }

        await this.prisma.adAccountConnection.update({
            where: { id: connectionId },
            data: { lastSyncAt: new Date(), status: ConnectionStatus.ACTIVE },
        });

        return { message: 'Sync completed', connectionId, syncedAt: new Date() };
    }

    async getMetaOAuthUrl(clientId: string) {
        const appId = process.env.META_APP_ID || 'YOUR_META_APP_ID';
        const redirectUri = `${process.env.API_URL}/ads/meta/callback`;
        const scope = 'ads_read,ads_management,business_management';
        const state = Buffer.from(JSON.stringify({ clientId })).toString('base64');
        return {
            url: `https://www.facebook.com/${process.env.META_API_VERSION || 'v19.0'}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`,
        };
    }

    async getGoogleOAuthUrl(clientId: string) {
        const clientId2 = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/ads/google/callback';
        const scope = 'https://www.googleapis.com/auth/adwords';
        const state = Buffer.from(JSON.stringify({ clientId })).toString('base64');
        return {
            url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId2}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&state=${state}`,
        };
    }
}
