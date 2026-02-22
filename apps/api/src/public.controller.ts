import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('public')
export class PublicController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('fix-encoding')
    async fixEncoding() {
        const clients = await this.prisma.client.findMany();
        let fixedCount = 0;
        for (const client of clients) {
            const hasBadChar = (str?: string | null) => str && str.includes('\uFFFD');

            if (hasBadChar(client.name) || hasBadChar(client.city)) {
                const fix = (str?: string | null) => {
                    if (!str) return str;
                    return str
                        .replace(/Clnica/g, 'Clínica')
                        .replace(/Automaro/g, 'Automação')
                        .replace(/Automao/g, 'Automação')
                        .replace(/So /g, 'São ') // with space
                        .replace(/So Paulo/g, 'São Paulo')
                        .replace(/So\b/g, 'São')
                        .replace(/Joo/g, 'João')
                        .replace(/\uFFFD/g, 'ã');
                };

                await this.prisma.client.update({
                    where: { id: client.id },
                    data: { name: fix(client.name) as string, city: fix(client.city) }
                });
                fixedCount++;
            }
        }
        return { success: true, fixedCount, message: 'Database encoding fixed!' };
    }

    @Get('health')
    async health() {
        const db = await this.prisma.$queryRaw`SELECT 1`.then(() => 'up').catch(() => 'down');
        // Basic check, could be expanded with Redis check if CacheManager injected
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: { database: db },
        };
    }
}
