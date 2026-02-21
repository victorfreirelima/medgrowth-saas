/**
 * fix-admin-role.js
 * Run with: DATABASE_URL="<your-railway-postgres-url>" node fix-admin-role.js
 * 
 * This script:
 * 1. Reads the current role of admin@medgrowth.com
 * 2. Prints the original role
 * 3. Updates it to ADMIN if it isn't already
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@medgrowth.com';

    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
        console.error(`❌ User ${email} not found in database.`);
        process.exit(1);
    }

    console.log(`\n📋 Current state:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name:  ${user.name}`);
    console.log(`   Role:  ${user.role}  ← (original role)`);

    if (user.role === 'ADMIN') {
        console.log(`\n✅ User already has ADMIN role. No changes needed.`);
        console.log(`\n⚠️  The issue is likely a stale JWT session. Ask the user to LOGOUT and LOGIN again.`);
    } else {
        await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN' },
        });

        console.log(`\n✅ Role updated:  ${user.role} → ADMIN`);
        console.log(`\n🔐 User must LOGOUT and LOGIN again for the JWT to pick up the new role.`);
    }
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
