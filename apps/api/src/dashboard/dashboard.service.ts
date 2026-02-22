import { AuthUser } from '../common/interfaces/auth-user.interface';
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { AdChannel, UserRole } from '@prisma/client';

@Injectable()
export class DashboardService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    private getClientFilter(user: AuthUser, clientId?: string) {
        const isAll = clientId === 'ALL' || !clientId;

        if (user.role === UserRole.ADMIN) {
            return isAll ? undefined : [clientId];
        }

        if (isAll) {
            return []; // Non-admins cannot view cross-client aggregated dashboards
        }

        return user.clientIds.includes(clientId) ? [clientId] : [];
    }

    async getKPIs(user: AuthUser, clientId?: string, dateFrom?: string, dateTo?: string) {
        const cacheKey = `kpis:${user.id}:${clientId || 'ALL'}:${dateFrom || 'ALL'}:${dateTo || 'ALL'}`;
        const cached = await this.cacheManager.get<any>(cacheKey);
        if (cached) return cached;

        const clientIds = this.getClientFilter(user, clientId);
        const clientWhere: any = clientIds ? { clientId: { in: clientIds } } : {};

        const dateFilter = {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
        };
        const dateFromDefault = new Date();
        dateFromDefault.setDate(dateFromDefault.getDate() - 30);
        const snapshotWhere: any = {
            ...clientWhere,
            date: Object.keys(dateFilter).length ? dateFilter : { gte: dateFromDefault },
        };

        const [snapshotAgg, leadCount, appointmentCount, wonCount] = await Promise.all([
            this.prisma.campaignSnapshotDaily.aggregate({
                where: snapshotWhere,
                _sum: { spend: true, leads: true, clicks: true, impressions: true, conversions: true },
            }),
            this.prisma.lead.count({ where: { ...clientWhere, createdAt: Object.keys(dateFilter).length ? dateFilter : { gte: dateFromDefault } } }),
            this.prisma.appointment.count({ where: { ...clientWhere } }),
            this.prisma.lead.count({ where: { ...clientWhere, status: 'FECHADO' as any } }),
        ]);

        const totalSpend = snapshotAgg._sum.spend || 0;
        const totalLeads = leadCount;
        const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
        const cpa = appointmentCount > 0 ? totalSpend / appointmentCount : 0;

        const result = {
            spend: totalSpend,
            leads: totalLeads,
            cpl,
            appointments: appointmentCount,
            cpa,
            won: wonCount,
            clicks: snapshotAgg._sum.clicks || 0,
            impressions: snapshotAgg._sum.impressions || 0,
            conversions: snapshotAgg._sum.conversions || 0,
        };

        await this.cacheManager.set(cacheKey, result, 1800000); // 30 mins
        return result;
    }

    async getTimeSeries(user: AuthUser, clientId?: string, days = 30) {
        const cacheKey = `timeseries:${user.id}:${clientId || 'ALL'}:${days}`;
        const cached = await this.cacheManager.get<any>(cacheKey);
        if (cached) return cached;

        const clientIds = this.getClientFilter(user, clientId);
        const clientWhere: any = clientIds ? { clientId: { in: clientIds } } : {};

        const from = new Date();
        from.setDate(from.getDate() - days);

        const [snapshots, leads] = await Promise.all([
            this.prisma.campaignSnapshotDaily.groupBy({
                by: ['date'],
                where: { ...clientWhere, date: { gte: from } },
                _sum: { spend: true, leads: true, clicks: true },
                orderBy: { date: 'asc' },
            }),
            this.prisma.lead.groupBy({
                by: ['createdAt'],
                where: { ...clientWhere, createdAt: { gte: from } },
                _count: { id: true },
            }),
        ]);

        // Aggregate leads per day
        const leadsByDay: Record<string, number> = {};
        for (const l of leads) {
            const day = l.createdAt.toISOString().split('T')[0];
            leadsByDay[day] = (leadsByDay[day] || 0) + l._count.id;
        }

        const result = snapshots.map((s) => {
            const day = s.date instanceof Date ? s.date.toISOString().split('T')[0] : String(s.date);
            return {
                date: day,
                spend: s._sum.spend || 0,
                clicks: s._sum.clicks || 0,
                adLeads: s._sum.leads || 0,
                crmLeads: leadsByDay[day] || 0,
            };
        });

        await this.cacheManager.set(cacheKey, result, 1800000); // 30 mins
        return result;
    }

    async getCampaigns(user: AuthUser, clientId?: string, dateFrom?: string, dateTo?: string) {
        const cacheKey = `campaigns:${user.id}:${clientId || 'ALL'}:${dateFrom || 'ALL'}:${dateTo || 'ALL'}`;
        const cached = await this.cacheManager.get<any>(cacheKey);
        if (cached) return cached;

        const clientIds = this.getClientFilter(user, clientId);
        const clientWhere: any = clientIds ? { clientId: { in: clientIds } } : {};

        const dateFromDefault = new Date();
        dateFromDefault.setDate(dateFromDefault.getDate() - 30);
        const dateFilter = {
            ...(dateFrom ? { gte: new Date(dateFrom) } : { gte: dateFromDefault }),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
        };

        const snapshots = await this.prisma.campaignSnapshotDaily.groupBy({
            by: ['campaignId', 'campaignName', 'channel'],
            where: { ...clientWhere, date: dateFilter },
            _sum: { spend: true, impressions: true, clicks: true, leads: true, conversions: true },
            orderBy: { _sum: { spend: 'desc' } },
        });

        const result = snapshots.map((s) => ({
            campaignId: s.campaignId,
            campaignName: s.campaignName,
            channel: s.channel,
            spend: s._sum.spend || 0,
            impressions: s._sum.impressions || 0,
            clicks: s._sum.clicks || 0,
            ctr: s._sum.impressions ? ((s._sum.clicks || 0) / s._sum.impressions) * 100 : 0,
            cpc: s._sum.clicks ? (s._sum.spend || 0) / s._sum.clicks : 0,
            leads: s._sum.leads || 0,
            conversions: s._sum.conversions || 0,
        }));

        await this.cacheManager.set(cacheKey, result, 1800000); // 30 mins
        return result;
    }
}
