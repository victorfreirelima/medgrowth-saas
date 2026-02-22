import { AuthUser } from '../common/interfaces/auth-user.interface';
import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { AdChannel, ConnectionStatus, UserRole } from '@prisma/client';
import { encrypt } from '../common/utils/crypto.util';

@Injectable()
export class AdsService {
    private readonly encKey: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly jwtService: JwtService,
        @InjectQueue('ads-sync') private adsSyncQueue: Queue,
    ) {
        this.encKey = this.config.get<string>('ENCRYPTION_KEY') || '12345678901234567890123456789012';
    }

    private assertClientAccess(user: AuthUser, clientId: string) {
        if (user.role !== UserRole.ADMIN && !user.clientIds.includes(clientId)) {
            throw new ForbiddenException('No access to this client');
        }
    }

    async getConnections(user: AuthUser, clientId?: string) {
        const isAll = clientId === 'ALL' || !clientId;
        let clientIds: string[] | undefined;

        if (user.role === UserRole.ADMIN) {
            clientIds = isAll ? undefined : [clientId];
        } else {
            clientIds = isAll ? [] : (user.clientIds.includes(clientId) ? [clientId] : []);
        }

        const connections = await this.prisma.adAccountConnection.findMany({
            where: clientIds ? { clientId: { in: clientIds } } : {},
            include: { client: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });

        return connections.map(({ accessTokenEncrypted, refreshTokenEncrypted, ...c }: any) => ({
            ...c,
            hasToken: !!accessTokenEncrypted,
        }));
    }

    async createConnection(user: AuthUser, dto: {
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

    async deleteConnection(user: AuthUser, id: string) {
        const conn = await this.prisma.adAccountConnection.findUnique({
            where: { id }, select: { clientId: true },
        });
        if (!conn) throw new NotFoundException('Connection not found');
        this.assertClientAccess(user, conn.clientId);
        await this.prisma.adAccountConnection.delete({ where: { id } });
        return { message: 'Connection deleted' };
    }

    async triggerSync(user: AuthUser, connectionId: string) {
        const conn = await this.prisma.adAccountConnection.findUnique({
            where: { id: connectionId },
        });
        if (!conn) throw new NotFoundException('Connection not found');
        this.assertClientAccess(user, conn.clientId);

        await this.adsSyncQueue.add('sync-job', { connectionId });

        return { message: 'Sync job added to queue', connectionId, enqueuedAt: new Date() };
    }

    async getMetaOAuthUrl(clientId: string) {
        const appId = this.config.get<string>('META_APP_ID');
        const redirectUri = this.config.get<string>('META_REDIRECT_URI');
        const version = this.config.get<string>('META_API_VERSION') || 'v19.0';

        const statePayload = { clientId, nonce: Date.now().toString() };
        const secret = this.config.get<string>('JWT_SECRET');
        const state = this.jwtService.sign(statePayload, { secret, expiresIn: '15m' });

        return {
            url: `https://www.facebook.com/${version}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri || '')}&scope=ads_read,ads_management,business_management&state=${state}`,
        };
    }

    async handleMetaCallback(code: string, state: string) {
        if (!state) throw new ForbiddenException('Invalid OAuth state');
        let clientId: string;
        try {
            const secret = this.config.get<string>('JWT_SECRET');
            const payload = this.jwtService.verify(state, { secret });
            clientId = payload.clientId;
        } catch (e) {
            throw new ForbiddenException('Invalid or expired OAuth state');
        }
        const appId = this.config.get<string>('META_APP_ID');
        const appSecret = this.config.get<string>('META_APP_SECRET');
        const redirectUri = this.config.get<string>('META_REDIRECT_URI');

        const tokenRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
            params: {
                client_id: appId || '',
                client_secret: appSecret || '',
                redirect_uri: redirectUri || '',
                code,
            },
        });

        const shortToken = tokenRes.data.access_token;

        const longTokenRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId || '',
                client_secret: appSecret || '',
                fb_exchange_token: shortToken,
            },
        });

        const accessToken = longTokenRes.data.access_token;
        const expiresIn = longTokenRes.data.expires_in;

        const accountsRes = await axios.get(`https://graph.facebook.com/v19.0/me/adaccounts`, {
            params: { access_token: accessToken },
        });

        const account = accountsRes.data.data[0];
        if (!account) throw new Error('No Meta Ad Account found for this user');

        return this.prisma.adAccountConnection.upsert({
            where: {
                clientId_channel_accountId: {
                    clientId,
                    channel: AdChannel.META,
                    accountId: account.id,
                },
            },
            update: {
                accessTokenEncrypted: encrypt(accessToken, this.encKey),
                expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
                status: ConnectionStatus.ACTIVE,
                lastSyncAt: new Date(),
            },
            create: {
                clientId,
                channel: AdChannel.META,
                accountId: account.id,
                accountName: account.name || 'Meta Ads Account',
                accessTokenEncrypted: encrypt(accessToken, this.encKey),
                expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
                status: ConnectionStatus.ACTIVE,
            },
        });
    }

    async getGoogleOAuthUrl(clientId: string) {
        const gClientId = this.config.get<string>('GOOGLE_CLIENT_ID');
        const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
        const scope = 'https://www.googleapis.com/auth/adwords';

        const statePayload = { clientId, nonce: Date.now().toString() };
        const secret = this.config.get<string>('JWT_SECRET');
        const state = this.jwtService.sign(statePayload, { secret, expiresIn: '15m' });

        return {
            url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${gClientId}&redirect_uri=${encodeURIComponent(redirectUri || '')}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}`,
        };
    }

    async handleGoogleCallback(code: string, state: string) {
        if (!state) throw new ForbiddenException('Invalid OAuth state');
        let clientId: string;
        try {
            const secret = this.config.get<string>('JWT_SECRET');
            const payload = this.jwtService.verify(state, { secret });
            clientId = payload.clientId;
        } catch (e) {
            throw new ForbiddenException('Invalid or expired OAuth state');
        }
        const gClientId = this.config.get<string>('GOOGLE_CLIENT_ID');
        const gClientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
        const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');

        const tokenRes = await axios.post(`https://oauth2.googleapis.com/token`, {
            code,
            client_id: gClientId,
            client_secret: gClientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        });

        const { access_token, refresh_token, expires_in } = tokenRes.data;
        const accountId = 'google-ads-account-id';

        return this.prisma.adAccountConnection.upsert({
            where: {
                clientId_channel_accountId: {
                    clientId,
                    channel: AdChannel.GOOGLE,
                    accountId,
                },
            },
            update: {
                accessTokenEncrypted: encrypt(access_token, this.encKey),
                refreshTokenEncrypted: refresh_token ? encrypt(refresh_token, this.encKey) : undefined,
                expiresAt: new Date(Date.now() + expires_in * 1000),
                status: ConnectionStatus.ACTIVE,
                lastSyncAt: new Date(),
            },
            create: {
                clientId,
                channel: AdChannel.GOOGLE,
                accountId,
                accountName: 'Google Ads Account',
                accessTokenEncrypted: encrypt(access_token, this.encKey),
                refreshTokenEncrypted: refresh_token ? encrypt(refresh_token, this.encKey) : null,
                expiresAt: new Date(Date.now() + expires_in * 1000),
                status: ConnectionStatus.ACTIVE,
            },
        });
    }
}
