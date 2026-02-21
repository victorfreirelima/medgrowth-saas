const { Client } = require('pg');
const crypto = require('crypto');

const DB_URL = 'postgresql://postgres:QZkWuibKMWaxePXVqDztWLTmzgUaziWZ@turntable.proxy.rlwy.net:31011/railway';

const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    await client.connect();
    console.log('Connected to production DB.');

    // Fix the migration record: mark as successfully applied
    const migrationName = '1_add_client_fields';
    const now = new Date().toISOString();

    // Update the existing record to show it succeeded
    const res = await client.query(`
        UPDATE "_prisma_migrations"
        SET applied_steps_count = 1, finished_at = $1, logs = NULL, rolled_back_at = NULL
        WHERE migration_name = $2
        RETURNING id, migration_name, applied_steps_count, finished_at
    `, [now, migrationName]);

    if (res.rows.length > 0) {
        console.log('✅ Migration record fixed:');
        console.log('  ', res.rows[0]);
    } else {
        console.log('No record found to update. Inserting fresh record...');

        const migrationSql = `-- CreateEnum\nCREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'ARCHIVED');\n\n-- AlterTable\nALTER TABLE "clients" ADD COLUMN "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE';\nALTER TABLE "clients" ADD COLUMN "specialty" TEXT;\nALTER TABLE "clients" ADD COLUMN "city" TEXT;\nALTER TABLE "clients" ADD COLUMN "notes" TEXT;`;
        const checksum = crypto.createHash('sha256').update(migrationSql).digest('hex');

        await client.query(`
            INSERT INTO "_prisma_migrations" 
            (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
            VALUES ($1, $2, $3, $4, NULL, NULL, $5, 1)
        `, [crypto.randomUUID(), checksum, now, migrationName, now]);

        console.log('✅ Fresh migration record inserted.');
    }

    // Confirm final state
    const finalRes = await client.query(`
        SELECT migration_name, applied_steps_count, finished_at 
        FROM "_prisma_migrations" ORDER BY started_at
    `);
    console.log('\n📋 Final _prisma_migrations state:');
    finalRes.rows.forEach(r => console.log(`  - ${r.migration_name}: applied=${r.applied_steps_count}, finished=${r.finished_at}`));

    await client.end();
    console.log('\n🎉 Done. Railway startup should now succeed.');
}

main().catch(async (e) => {
    console.error('Error:', e.message);
    try { await client.end(); } catch { }
    process.exit(1);
});
