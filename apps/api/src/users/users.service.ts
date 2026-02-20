import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.user.findMany({
            select: {
                id: true, email: true, name: true, role: true, isActive: true, createdAt: true,
                clients: { select: { client: { select: { id: true, name: true, slug: true } } } },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true, email: true, name: true, role: true, isActive: true, createdAt: true,
                clients: { select: { client: { select: { id: true, name: true, slug: true } } } },
            },
        });
        if (!user) throw new NotFoundException('User not found');
        return { ...user, clients: user.clients.map((uc) => uc.client) };
    }

    async create(dto: CreateUserDto) {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (exists) throw new ConflictException('Email already in use');

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                name: dto.name,
                passwordHash,
                role: dto.role,
                clients: dto.clientIds
                    ? { create: dto.clientIds.map((clientId) => ({ clientId })) }
                    : undefined,
            },
        });
        const { passwordHash: _, ...result } = user;
        return result;
    }

    async update(id: string, dto: UpdateUserDto) {
        await this.findOne(id);
        const data: Record<string, unknown> = {
            email: dto.email,
            name: dto.name,
            role: dto.role as UserRole,
            isActive: dto.password ? undefined : undefined,
        };
        if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.update({ where: { id }, data });
        const { passwordHash: _, ...result } = user;
        return result;
    }

    async remove(id: string) {
        await this.findOne(id);
        await this.prisma.user.update({ where: { id }, data: { isActive: false } });
        return { message: 'User deactivated' };
    }

    async assignClients(id: string, clientIds: string[]) {
        await this.findOne(id);
        await this.prisma.userClient.deleteMany({ where: { userId: id } });
        await this.prisma.userClient.createMany({
            data: clientIds.map((clientId) => ({ userId: id, clientId })),
        });
        return this.findOne(id);
    }
}
