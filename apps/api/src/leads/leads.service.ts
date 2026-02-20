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

        const allowedClientIds = user.role === UserRole.ADMIN
            ? (clientId ? [clientId] : undefined)
            : user.clientIds;

        const where: any = {
            ...(allowedClientIds ? { clientId: { in: allowedClientIds } } : {}),
            ...(clientId && user.role !== UserRole.ADMIN ? { clientId } : {}),
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
        return this.prisma.lead.update({
            where: { id: lead.id },
            data: dto,
            include: {
                client: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
            },
        });
    }

    async remove(user: any, id: string) {
        const lead = await this.findOne(user, id);
        await this.prisma.lead.delete({ where: { id: lead.id } });
        return { message: 'Lead deleted' };
    }

    async addNote(user: any, leadId: string, dto: CreateLeadNoteDto) {
        const lead = await this.findOne(user, leadId);
        return this.prisma.leadNote.create({
            data: { leadId: lead.id, userId: user.id, content: dto.content },
            include: { user: { select: { id: true, name: true } } },
        });
    }

    async getFunnelMetrics(user: any, clientId?: string) {
        const allowedClientIds = user.role === UserRole.ADMIN
            ? (clientId ? [clientId] : undefined)
            : user.clientIds;

        const where: any = allowedClientIds ? { clientId: { in: allowedClientIds } } : {};

        const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'SCHEDULED', 'ATTENDED', 'WON', 'LOST'];
        const results = await this.prisma.lead.groupBy({
            by: ['status'],
            where,
            _count: { id: true },
        });

        const countMap: Record<string, number> = {};
        for (const r of results) {
            countMap[r.status] = r._count.id;
        }

        return statuses.map((s) => ({ status: s, count: countMap[s] || 0 }));
    }
}
