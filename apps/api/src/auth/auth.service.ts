import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async login(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { clients: { select: { clientId: true } } },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const clientIds = user.clients.map((c) => c.clientId);
        return this.generateTokens(user.id, user.email, user.role, clientIds);
    }

    async refreshTokens(userId: string, email: string, role: string, clientIds: string[]) {
        return this.generateTokens(userId, email, role, clientIds);
    }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
                clients: {
                    select: {
                        client: {
                            select: { id: true, name: true, slug: true, logoUrl: true },
                        },
                    },
                },
            },
        });

        if (!user) throw new NotFoundException('User not found');
        return {
            ...user,
            clients: user.clients.map((uc) => uc.client),
        };
    }

    private generateTokens(userId: string, email: string, role: string, clientIds: string[]) {
        const payload = { sub: userId, email, role, clientIds };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: process.env.JWT_EXPIRES_IN || '15m',
            secret: process.env.JWT_SECRET,
        });
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
            secret: process.env.JWT_REFRESH_SECRET,
        });
        return { accessToken, refreshToken, userId, email, role, clientIds };
    }
}
