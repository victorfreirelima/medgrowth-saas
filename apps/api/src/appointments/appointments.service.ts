import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto, UpdateAppointmentDto, AppointmentFiltersDto } from './dto/appointment.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AppointmentsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(user: any, filters: AppointmentFiltersDto) {
        const { clientId, status, dateFrom, dateTo, page = 1, limit = 20 } = filters;

        const allowedClientIds = user.role === UserRole.ADMIN
            ? (clientId ? [clientId] : undefined)
            : user.clientIds;

        const where: any = {
            lead: allowedClientIds ? { clientId: { in: allowedClientIds } } : undefined,
            ...(status ? { status } : {}),
            ...(dateFrom || dateTo ? {
                dateTime: {
                    ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                    ...(dateTo ? { lte: new Date(dateTo) } : {}),
                },
            } : {}),
        };

        const [data, total] = await Promise.all([
            this.prisma.appointment.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { dateTime: 'desc' },
                include: {
                    lead: {
                        select: {
                            id: true, name: true, phone: true,
                            client: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
            this.prisma.appointment.count({ where }),
        ]);

        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findOne(user: any, id: string) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id },
            include: {
                lead: {
                    select: {
                        id: true, name: true, phone: true, email: true,
                        client: { select: { id: true, name: true } },
                    },
                },
            },
        });
        if (!appointment) throw new NotFoundException('Appointment not found');
        if (user.role !== UserRole.ADMIN && !user.clientIds.includes(appointment.lead.client.id)) {
            throw new ForbiddenException('No access to this appointment');
        }
        return appointment;
    }

    async create(user: any, dto: CreateAppointmentDto) {
        const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } });
        if (!lead) throw new NotFoundException('Lead not found');
        if (user.role !== UserRole.ADMIN && !user.clientIds.includes(lead.clientId)) {
            throw new ForbiddenException('No access to this lead');
        }
        return this.prisma.appointment.create({
            data: {
                leadId: dto.leadId,
                dateTime: new Date(dto.dateTime),
                procedure: dto.procedure,
                status: dto.status,
                notes: dto.notes,
            },
            include: { lead: { select: { id: true, name: true } } },
        });
    }

    async update(user: any, id: string, dto: UpdateAppointmentDto) {
        await this.findOne(user, id);
        return this.prisma.appointment.update({
            where: { id },
            data: {
                ...(dto.dateTime ? { dateTime: new Date(dto.dateTime) } : {}),
                ...(dto.procedure !== undefined ? { procedure: dto.procedure } : {}),
                ...(dto.status ? { status: dto.status } : {}),
                ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
            },
            include: { lead: { select: { id: true, name: true } } },
        });
    }

    async remove(user: any, id: string) {
        await this.findOne(user, id);
        await this.prisma.appointment.delete({ where: { id } });
        return { message: 'Appointment deleted' };
    }
}
