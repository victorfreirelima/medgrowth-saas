import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, ClientStatus } from '@prisma/client';

@Injectable()
export class ClientsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(user: any, status?: ClientStatus) {
        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (user.role !== UserRole.ADMIN) {
            where.id = { in: user.clientIds };
        }

        return this.prisma.client.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                _count: { select: { leads: true, connections: true } }
            }
        });
    }

    async findOne(user: any, id: string) {
        if (user.role !== UserRole.ADMIN && !user.clientIds.includes(id)) {
            throw new ForbiddenException('No access to this client');
        }
        const client = await this.prisma.client.findUnique({
            where: { id },
            include: {
                users: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
                _count: { select: { leads: true, connections: true } },
            },
        });
        if (!client) throw new NotFoundException('Client not found');
        return client;
    }

    async create(dto: { name: string; slug: string; specialty?: string; city?: string; notes?: string; logoUrl?: string }) {
        const existing = await this.prisma.client.findUnique({ where: { slug: dto.slug } });
        if (existing) throw new ConflictException(`Slug "${dto.slug}" já está em uso. Escolha um nome diferente.`);
        return this.prisma.client.create({ data: dto });
    }

    async update(id: string, dto: { name?: string; slug?: string; logoUrl?: string; status?: ClientStatus; specialty?: string; city?: string; notes?: string; isActive?: boolean }) {
        return this.prisma.client.update({ where: { id }, data: dto });
    }

    async remove(id: string) {
        // Soft delete: set status to ARCHIVED
        return this.prisma.client.update({
            where: { id },
            data: { status: ClientStatus.ARCHIVED }
        });
    }
}
