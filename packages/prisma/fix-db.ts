// Rely on the environment variable provided natively or via `railway run`

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Fetching clients with corrupted names/cities...');
    const clients = await prisma.client.findMany();

    for (const client of clients) {
        const hasBadChar = (str: string | null) => str && str.includes('\uFFFD');

        if (hasBadChar(client.name) || hasBadChar(client.city)) {
            const fix = (str: string | null) => {
                if (!str) return str;
                return str
                    .replace(/Clnica/g, 'Clínica')
                    .replace(/Automaro/g, 'Automação')
                    .replace(/Automao/g, 'Automação')
                    .replace(/So/g, 'São')
                    .replace(/So Paulo/g, 'São Paulo')
                    .replace(/Joo/g, 'João')
                    .replace(/\uFFFD/g, 'ã'); // General fallback
            };

            const fixedName = fix(client.name);
            const fixedCity = fix(client.city);

            console.log(`Fixing: ${client.name} -> ${fixedName} | ${client.city} -> ${fixedCity}`);
            await prisma.client.update({
                where: { id: client.id },
                data: { name: fixedName as string, city: fixedCity }
            });
        }
    }
    console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
