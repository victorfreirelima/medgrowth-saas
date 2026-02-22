import { Test, TestingModule } from '@nestjs/testing';
import { AdsService } from '../ads/ads.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getQueueToken } from '@nestjs/bullmq';
import { ForbiddenException } from '@nestjs/common';
import { AdChannel } from '@prisma/client';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AdsService - OAuth & RBAC', () => {
    let service: AdsService;
    let jwtService: JwtService;
    let prisma: PrismaService;

    const mockPrisma = {
        adAccountConnection: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn(),
            delete: jest.fn(),
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
    };

    const mockConfig = {
        get: jest.fn((key: string) => {
            if (key === 'ENCRYPTION_KEY') return '12345678901234567890123456789012';
            if (key === 'JWT_SECRET') return 'test-secret';
            if (key === 'META_APP_ID') return 'meta-app-id';
            return null;
        }),
    };

    const mockJwt = {
        sign: jest.fn(),
        verify: jest.fn(),
    };

    const mockQueue = {
        add: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdsService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: ConfigService, useValue: mockConfig },
                { provide: JwtService, useValue: mockJwt },
                { provide: getQueueToken('ads-sync'), useValue: mockQueue },
            ],
        }).compile();

        service = module.get<AdsService>(AdsService);
        jwtService = module.get<JwtService>(JwtService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('OAuth anti-replay (State Validation)', () => {
        it('should generate a valid JWT state for Meta OAuth', async () => {
            mockJwt.sign.mockReturnValue('mocked-jwt-state');

            const result = await service.getMetaOAuthUrl('client-123');

            expect(mockJwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({ clientId: 'client-123', nonce: expect.any(String) }),
                expect.objectContaining({ secret: 'test-secret', expiresIn: '15m' })
            );
            expect(result.url).toContain('state=mocked-jwt-state');
        });

        it('should throw ForbiddenException if state is missing in callback', async () => {
            await expect(service.handleMetaCallback('some-code', '')).rejects.toThrow(ForbiddenException);
        });

        it('should throw ForbiddenException if JWT state is invalid/expired', async () => {
            mockJwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });
            await expect(service.handleMetaCallback('some-code', 'invalid-jwt-state')).rejects.toThrow(ForbiddenException);
        });

        it('should process OAuth callback successfully if state is valid', async () => {
            mockJwt.verify.mockReturnValue({ clientId: 'client-123' });
            mockedAxios.get.mockImplementation((url: string, config: any) => {
                const params = config?.params || {};
                if (url.includes('oauth/access_token') && params.code) return Promise.resolve({ data: { access_token: 'short-token' } });
                if (url.includes('oauth/access_token') && params.grant_type === 'fb_exchange_token') return Promise.resolve({ data: { access_token: 'long-token', expires_in: 3600 } });
                if (url.includes('me/adaccounts')) return Promise.resolve({ data: { data: [{ id: 'act_123', name: 'Test Account' }] } });
                return Promise.reject(new Error(`Unknown URL or params: ${url} ${JSON.stringify(params)}`));
            });

            mockPrisma.adAccountConnection.upsert.mockResolvedValue({ id: 'conn-1' });

            const result = await service.handleMetaCallback('some-code', 'valid-jwt-state');

            expect(mockJwt.verify).toHaveBeenCalledWith('valid-jwt-state', { secret: 'test-secret' });
            expect(mockPrisma.adAccountConnection.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { clientId_channel_accountId: { clientId: 'client-123', channel: AdChannel.META, accountId: 'act_123' } }
            }));
            expect(result).toEqual({ id: 'conn-1' });
        });
    });

    describe('RBAC & Multi-tenant Isolation for Ads', () => {
        it('should allow ADMIN to fetch ALL connections', async () => {
            const adminUser = { role: 'ADMIN', clientIds: [] } as any;
            await service.getConnections(adminUser, 'ALL');
            expect(mockPrisma.adAccountConnection.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} })
            );
        });

        it('should restrict COMMERCIAL to empty connections if ALL is requested', async () => {
            const commUser = { role: 'COMMERCIAL', clientIds: ['client-1'] } as any;
            await service.getConnections(commUser, 'ALL');
            expect(mockPrisma.adAccountConnection.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { clientId: { in: [] } } })
            );
        });

        it('should allow COMMERCIAL to fetch specific approved client', async () => {
            const commUser = { role: 'COMMERCIAL', clientIds: ['client-1'] } as any;
            await service.getConnections(commUser, 'client-1');
            expect(mockPrisma.adAccountConnection.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { clientId: { in: ['client-1'] } } })
            );
        });

        it('should block COMMERCIAL from fetching unapproved client', async () => {
            const commUser = { role: 'COMMERCIAL', clientIds: ['client-1'] } as any;
            await service.getConnections(commUser, 'client-X');
            expect(mockPrisma.adAccountConnection.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { clientId: { in: [] } } }) // Array is empty, returns no records
            );
        });

        it('should throw ForbiddenException if NON-ADMIN attempts to create connection for unapproved client', async () => {
            const commUser = { role: 'COMMERCIAL', clientIds: ['client-1'] } as any;
            await expect(service.createConnection(commUser, {
                clientId: 'client-X', channel: AdChannel.META, accountId: 'abc', accessToken: 'xyz'
            })).rejects.toThrow(ForbiddenException);
        });

        it('should throw ForbiddenException if NON-ADMIN attempts to access unapproved client connection sync', async () => {
            mockPrisma.adAccountConnection.findUnique.mockResolvedValue({ clientId: 'client-X' });
            const commUser = { role: 'COMMERCIAL', clientIds: ['client-1'] } as any;

            await expect(service.triggerSync(commUser, 'conn-123')).rejects.toThrow(ForbiddenException);
        });
    });
});
