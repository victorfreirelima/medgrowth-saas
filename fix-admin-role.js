/**
 * query-admin.js - Pure Node.js DB query via TCP (no external deps)
 * Uses built-in 'net' + manual Postgres wire protocol... 
 * Actually, let's use the https module to POST to a lightweight DB proxy.
 * 
 * Simplest approach: use the URL as direct connection via pg wire protocol.
 * Since we can't install pg, we'll use node's child_process to call
 * the API endpoint to raise the role via a special admin script endpoint.
 */

// Actually the cleanest no-dep approach: call the production API's own
// NestJS endpoints to repair the user. But we don't have a "promote user" endpoint.
// 
// ALTERNATIVE: Run this script from within /apps/api which has @nestjs and @prisma/client
// The api package has prisma client already generated.

const { execSync } = require('child_process');

// Check if pg is really not available anywhere
try {
    // Try looking in api node_modules
    const pg = require('C:/Users/victo/Projects/MedGrowth/node_modules/.pnpm/pg@8.13.3/node_modules/pg');
    console.log('Found pg!');

    const { Client } = pg;
    const DB_URL = 'postgresql://postgres:QZkWuibKMWaxePXVqDztWLTmzgUaziWZ@turntable.proxy.rlwy.net:31011/railway';

    const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

    client.connect().then(async () => {
        const selectRes = await client.query(
            "SELECT id, email, role FROM users WHERE email = 'admin@medgrowth.com'"
        );

        if (selectRes.rows.length === 0) {
            console.error('❌ User admin@medgrowth.com NOT FOUND.');
            await client.end();
            return;
        }

        const user = selectRes.rows[0];
        console.log('\n📋 Current state:');
        console.log('   Email:', user.email);
        console.log('   Role: ', user.role, ' ← (original role)');

        if (user.role === 'ADMIN') {
            console.log('\n✅ User already has ADMIN role. The issue is a STALE JWT — user must logout and login again.');
        } else {
            await client.query("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@medgrowth.com'");
            console.log('\n✅ Role UPDATED:', user.role, '→ ADMIN');
            console.log('🔐 User must LOGOUT and LOGIN again for the new role to take effect.');
        }

        await client.end();
    }).catch(e => {
        console.error('❌ Connection error:', e.message);
        client.end();
    });

} catch (e) {
    console.log('pg not found at that path, trying alternative...');
    console.log(e.message);
}
