import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class ClientsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(user: any) {
        if (user.role === UserRole.ADMIN) {
            return this.prisma.client.findMany({ orderBy: { name: 'asc' } });
        }
        return this.prisma.client.findMany({
            where: { id: { in: user.clientIds } },
            orderBy: { name: 'asc' },
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

    async create(dto: { name: string; slug: string; logoUrl?: string }) {
        return this.prisma.client.create({ data: dto });
    }

    async update(id: string, dto: { name?: string; slug?: string; logoUrl?: string; isActive?: boolean }) {
        return this.prisma.client.update({ where: { id }, data: dto });
    }
}
