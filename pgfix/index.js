const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:QZkWuibKMWaxePXVqDztWLTmzgUaziWZ@turntable.proxy.rlwy.net:31011/railway';

const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    await client.connect();
    console.log('Connected to production DB.');

    // 1. Check current columns in clients table
    const colRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'clients'
        ORDER BY ordinal_position
    `);

    console.log('\n📋 Current "clients" table columns:');
    colRes.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

    const existingCols = colRes.rows.map(r => r.column_name);
    const needsMigration = !existingCols.includes('specialty') || !existingCols.includes('status');

    if (!needsMigration) {
        console.log('\n✅ Migration already applied. All new columns exist.');
    } else {
        console.log('\n⚠️  Columns missing! Applying migration...');

        // Check if enum type exists
        const enumRes = await client.query(`
            SELECT typname FROM pg_type WHERE typname = 'ClientStatus'
        `);

        if (enumRes.rows.length === 0) {
            console.log('Creating ClientStatus enum...');
            await client.query(`CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'ARCHIVED')`);
            console.log('✅ Enum created.');
        } else {
            console.log('✅ ClientStatus enum already exists.');
        }

        if (!existingCols.includes('status')) {
            await client.query(`ALTER TABLE "clients" ADD COLUMN "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE'`);
            console.log('✅ Added status column.');
        }
        if (!existingCols.includes('specialty')) {
            await client.query(`ALTER TABLE "clients" ADD COLUMN "specialty" TEXT`);
            console.log('✅ Added specialty column.');
        }
        if (!existingCols.includes('city')) {
            await client.query(`ALTER TABLE "clients" ADD COLUMN "city" TEXT`);
            console.log('✅ Added city column.');
        }
        if (!existingCols.includes('notes')) {
            await client.query(`ALTER TABLE "clients" ADD COLUMN "notes" TEXT`);
            console.log('✅ Added notes column.');
        }

        console.log('\n🎉 Migration applied successfully!');
    }

    // 2. Test a POST - list current clients
    const clientsRes = await client.query('SELECT id, name, slug, status FROM clients LIMIT 5');
    console.log('\n📋 First 5 clients in DB:');
    clientsRes.rows.forEach(r => console.log(`  - [${r.status || 'N/A'}] ${r.name} (${r.slug})`));

    await client.end();
}

main().catch(async (e) => {
    console.error('Error:', e.message);
    try { await client.end(); } catch { }
    process.exit(1);
});
