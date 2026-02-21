import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto, UpdateLeadDto, CreateLeadNoteDto, LeadFiltersDto } from './dto/lead.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class LeadsService {
    constructor(private readonly prisma: PrismaService) { }

    private assertClientAccess(user: any, clientId: string) {
        if (user.role === UserRole.ADMIN) return;
        if (!user.clientIds.includes(clientId)) {
            throw new ForbiddenException('No access to this client');
        }
    }

    async findAll(user: any, filters: LeadFiltersDto) {
        const { clientId, status, channel, assignedToId, dateFrom, dateTo, search, page = 1, limit = 20 } = filters;

        const isAll = clientId === 'ALL' || !clientId;
        const allowedClientIds = user.role === UserRole.ADMIN
            ? (isAll ? undefined : [clientId])
            : (isAll ? user.clientIds : (user.clientIds.includes(clientId) ? [clientId] : []));

        const where: any = {
            ...(allowedClientIds ? { clientId: { in: allowedClientIds } } : {}),
            ...(status ? { status } : {}),
            ...(channel ? { channel } : {}),
            ...(assignedToId ? { assignedToId } : {}),
            ...(dateFrom || dateTo ? {
                createdAt: {
                    ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                    ...(dateTo ? { lte: new Date(dateTo) } : {}),
                },
            } : {}),
            ...(search ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            } : {}),
        };

        const [data, total] = await Promise.all([
            this.prisma.lead.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    client: { select: { id: true, name: true } },
                    assignedTo: { select: { id: true, name: true } },
                    _count: { select: { notes: true, appointments: true } },
                },
            }),
            this.prisma.lead.count({ where }),
        ]);

        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findOne(user: any, id: string) {
        const lead = await this.prisma.lead.findUnique({
            where: { id },
            include: {
                client: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
                notes: {
                    include: { user: { select: { id: true, name: true } } },
                    orderBy: { createdAt: 'desc' },
                },
                appointments: { orderBy: { dateTime: 'desc' } },
            },
        });
        if (!lead) throw new NotFoundException('Lead not found');
        this.assertClientAccess(user, lead.clientId);
        return lead;
    }

    async create(user: any, clientId: string, dto: CreateLeadDto) {
        this.assertClientAccess(user, clientId);
        return this.prisma.lead.create({
            data: { ...dto, clientId },
            include: {
                client: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
            },
        });
    }

    async update(user: any, id: string, dto: UpdateLeadDto) {
        const lead = await this.findOne(user, id);
        const data: any = { ...dto };

        // Automation Rules
        if (dto.status && dto.status !== lead.status) {
            data.statusUpdatedAt = new Date();

            // Ao mover para EM_CONTATO -> preencher firstContactAt se vazio
            if (dto.status === 'EM_CONTATO' && !lead.firstContactAt) {
                data.firstContactAt = new Date();
            }

            // Ao mover para FECHADO -> exigir campo revenue
            if (dto.status === 'FECHADO' && !dto.revenue && !lead.revenue) {
                throw new ForbiddenException('Campo "revenue" é obrigatório para fechamento.');
            }

            // Ao mover para PERDIDO -> exigir lostReason
            if (dto.status === 'PERDIDO' && !dto.lostReason && !lead.lostReason) {
                throw new ForbiddenException('Campo "lostReason" é obrigatório para perda.');
            }
        }

        return this.prisma.lead.update({
            where: { id: lead.id },
            data,
            include: {
                client: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
            },
        });
    }

    async remove(user: any, id: string) {
        const lead = await this.findOne(user, id);
        await this.prisma.lead.delete({ where: { id: lead.id } });
        return { message: 'Lead deletado' };
    }

    async addNote(user: any, leadId: string, dto: CreateLeadNoteDto) {
        const lead = await this.findOne(user, leadId);
        return this.prisma.leadNote.create({
            data: { leadId: lead.id, userId: user.id, content: dto.content },
            include: { user: { select: { id: true, name: true } } },
        });
    }

    async getFunnelMetrics(user: any, clientId?: string) {
        const isAll = clientId === 'ALL' || !clientId;
        const allowedClientIds = user.role === UserRole.ADMIN
            ? (isAll ? undefined : [clientId])
            : (isAll ? user.clientIds : (user.clientIds.includes(clientId) ? [clientId] : []));

        const where: any = allowedClientIds ? { clientId: { in: allowedClientIds } } : {};

        const statuses = ['NOVO', 'EM_CONTATO', 'QUALIFICADO', 'AGENDADO', 'COMPARECEU', 'FECHADO', 'PERDIDO'];
        const results = await this.prisma.lead.groupBy({
            by: ['status'],
            where,
            _count: { id: true },
            _sum: { revenue: true },
        });

        const statsMap: Record<string, { count: number; revenue: number }> = {};
        for (const r of results) {
            statsMap[r.status] = {
                count: r._count.id,
                revenue: r._sum.revenue || 0,
            };
        }

        return statuses.map((s) => ({
            status: s,
            count: statsMap[s]?.count || 0,
            revenue: statsMap[s]?.revenue || 0,
        }));
    }

    async getROIMetrics(user: any, clientId: string) {
        this.assertClientAccess(user, clientId);

        // Fetch investment from campaign snapshots
        const investmentData = await this.prisma.campaignSnapshotDaily.aggregate({
            where: { connection: { clientId } },
            _sum: { spend: true, leads: true },
        });

        const totalSpend = investmentData._sum.spend || 0;
        const totalAdLeads = investmentData._sum.leads || 0;

        // Fetch lead conversion data
        const leadsStats = await this.prisma.lead.groupBy({
            by: ['status'],
            where: { clientId },
            _count: { id: true },
            _sum: { revenue: true },
        });

        const getStats = (s: string) => leadsStats.find(l => l.status === s);
        const totalLeads = leadsStats.reduce((acc, curr) => acc + curr._count.id, 0);
        const scheduled = getStats('AGENDADO')?._count.id || 0;
        const attended = getStats('COMPARECEU')?._count.id || 0;
        const closed = getStats('FECHADO')?._count.id || 0;
        const revenue = leadsStats.reduce((acc, curr) => acc + (curr._sum.revenue || 0), 0);

        return {
            totalSpend,
            totalLeads,
            cpl: totalLeads > 0 ? totalSpend / totalLeads : 0,
            cpa: scheduled > 0 ? totalSpend / scheduled : 0,
            costPerAttendance: attended > 0 ? totalSpend / attended : 0,
            costPerClosing: closed > 0 ? totalSpend / closed : 0,
            attendanceRate: scheduled > 0 ? (attended / scheduled) * 100 : 0,
            closingRate: totalLeads > 0 ? (closed / totalLeads) * 100 : 0,
            revenue,
            roas: totalSpend > 0 ? revenue / totalSpend : 0,
        };
    }
}
