const API_URL = 'https://api-production-8d75.up.railway.app';

async function run() {
    console.log('1. Login...');
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@medgrowth.com', password: 'Admin123!' })
    });
    const data = await res.json();
    const token = data.accessToken;
    const clientId = data.clientIds[0];

    console.log('\n2. Create mock Meta connection...');
    const connRes = await fetch(`${API_URL}/ads/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            clientId, channel: 'META', accountId: 'mock-acc-123', accountName: 'E2E Test Account', accessToken: 'mock-token'
        })
    });
    const conn = await connRes.json();
    console.log(`Connection created: ${conn.id}`);

    console.log('\n3. Trigger Sync via Queue...');
    await fetch(`${API_URL}/ads/connections/${conn.id}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n4. Waiting 5 seconds for BullMQ worker to process...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('\n5. Verify Dashboard Campaigns data...');
    const campRes = await fetch(`${API_URL}/dashboard/campaigns?clientId=${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const campaigns = await campRes.json();
    console.log(`Campaigns returned: ${campaigns.length}`);
    if (campaigns.length > 0) {
        console.log('SUCCESS: Background worker processed the job and saved snapshots!');
        console.log(campaigns[0]);
    } else {
        console.error('FAILED: Worker did not save data.');
    }

    // Cleanup the connection
    await fetch(`${API_URL}/ads/connections/${conn.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`\nConnection ${conn.id} deleted from DB.`);
}
run();
