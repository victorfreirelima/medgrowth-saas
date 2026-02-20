import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../dashboard/dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService - Metrics Calculations', () => {
    let service: DashboardService;
    let prisma: PrismaService;

    const mockPrisma = {
        campaignSnapshotDaily: {
            aggregate: jest.fn(),
            groupBy: jest.fn(),
        },
        lead: {
            count: jest.fn(),
            groupBy: jest.fn(),
        },
        appointment: {
            count: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DashboardService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();
        service = module.get<DashboardService>(DashboardService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => jest.clearAllMocks());

    it('calculates CPL correctly when leads > 0', async () => {
        mockPrisma.campaignSnapshotDaily.aggregate.mockResolvedValue({
            _sum: { spend: 1000, leads: 10, clicks: 500, impressions: 10000, conversions: 5 },
        });
        mockPrisma.lead.count.mockResolvedValue(20); // CRM leads
        mockPrisma.appointment.count.mockResolvedValue(8);

        const adminUser = { role: 'ADMIN', clientIds: [] };
        const result = await service.getKPIs(adminUser);

        expect(result.spend).toBe(1000);
        expect(result.leads).toBe(20);
        expect(result.cpl).toBeCloseTo(50, 1); // 1000 / 20
        expect(result.appointments).toBe(8);
        expect(result.cpa).toBeCloseTo(125, 1); // 1000 / 8
    });

    it('returns CPL = 0 when no leads', async () => {
        mockPrisma.campaignSnapshotDaily.aggregate.mockResolvedValue({
            _sum: { spend: 500, leads: 0, clicks: 100, impressions: 5000, conversions: 0 },
        });
        mockPrisma.lead.count.mockResolvedValue(0);
        mockPrisma.appointment.count.mockResolvedValue(0);

        const adminUser = { role: 'ADMIN', clientIds: [] };
        const result = await service.getKPIs(adminUser);

        expect(result.cpl).toBe(0);
        expect(result.cpa).toBe(0);
    });

    it('respects COMMERCIAL user client isolation', async () => {
        mockPrisma.campaignSnapshotDaily.aggregate.mockResolvedValue({
            _sum: { spend: 200, leads: 5, clicks: 50, impressions: 2000, conversions: 2 },
        });
        mockPrisma.lead.count.mockResolvedValue(5);
        mockPrisma.appointment.count.mockResolvedValue(2);

        const commercialUser = { role: 'COMMERCIAL', clientIds: ['client-1'] };
        const result = await service.getKPIs(commercialUser);

        // Should call with clientId filter
        expect(mockPrisma.campaignSnapshotDaily.aggregate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    connection: { clientId: { in: ['client-1'] } },
                }),
            }),
        );
        expect(result.spend).toBe(200);
    });

    it('calculates CTR from campaign data correctly', async () => {
        mockPrisma.campaignSnapshotDaily.groupBy.mockResolvedValue([
            {
                campaignId: 'camp_001',
                campaignName: 'Test Campaign',
                channel: 'META',
                _sum: { spend: 500, impressions: 10000, clicks: 300, leads: 15, conversions: 5 },
            },
        ]);

        const adminUser = { role: 'ADMIN', clientIds: [] };
        const result = await service.getCampaigns(adminUser);

        expect(result).toHaveLength(1);
        expect(result[0].ctr).toBeCloseTo(3.0, 1); // 300/10000 * 100
        expect(result[0].cpc).toBeCloseTo(1.67, 1); // 500/300
    });
});
