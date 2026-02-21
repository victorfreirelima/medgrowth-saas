require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fetching clients with corrupted names/cities...');
    const clients = await prisma.client.findMany();

    for (const client of clients) {
        const hasBadChar = (str) => str && str.includes('');

        if (hasBadChar(client.name) || hasBadChar(client.city)) {
            const fix = (str) => {
                if (!str) return str;
                return str
                    .replace(/Clnica/g, 'Clínica')
                    .replace(/Automaro/g, 'Automação')
                    .replace(/Automao/g, 'Automação')
                    .replace(/So/g, 'São')
                    .replace(/So Paulo/g, 'São Paulo')
                    .replace(/Joo/g, 'João')
                    .replace(/\uFFFD/g, '?');
            };

            const fixedName = fix(client.name);
            const fixedCity = fix(client.city);

            console.log(`Fixing: ${client.name} -> ${fixedName} | ${client.city} -> ${fixedCity}`);
            await prisma.client.update({
                where: { id: client.id },
                data: { name: fixedName, city: fixedCity }
            });
        }
    }
    console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
