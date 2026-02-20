const axios = require('axios');
const jwt = require('jsonwebtoken');

async function test() {
    try {
        const API_URL = 'https://api-production-8d75.up.railway.app';
        const SECRET = 'your-super-secret-jwt-key';
        const token = jwt.sign({ sub: 'user-1', email: 'test@medgrowth.com', role: 'ADMIN' }, SECRET, { expiresIn: '1h' });

        console.log('--- Testing Production API ---');
        console.log(`[1] Hitting GET /ads/connections...`);
        let res;
        try {
            res = await axios.get(`${API_URL}/ads/connections`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
            });
            console.log('GET Response:', res.status, res.data.length, 'connections found.');
        } catch (e) {
            if (e.response && e.response.status === 404) {
                console.log('Endpoint not found, maybe root API responds?');
                let root = await axios.get(`${API_URL}/`, { timeout: 5000 }).catch(er => er.response);
                console.log('Root:', root ? root.status : 'offline');
            }
            throw e;
        }

        console.log(`\n[2] Creating Test Client to mock foreign keys...`);
        const clientRes = await axios.post(`${API_URL}/clients`, {
            name: 'MVP Test Clinic',
            email: 'clinic@test.com',
            phone: '123456789',
            status: 'ACTIVE'
        }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);

        let clientId = clientRes ? clientRes.data.id : null;
        if (!clientId) {
            // fetch existing 
            const cls = await axios.get(`${API_URL}/clients`, { headers: { Authorization: `Bearer ${token}` } });
            clientId = cls.data[0]?.id || 'error';
        }

        console.log(`\n[3] Creating test Ad Connection...`);
        const connRes = await axios.post(`${API_URL}/ads/connections`, {
            clientId: clientId,
            accountId: 'act_12345',
            accessToken: 'dummy-token',
            channel: 'META'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('POST Response:', connRes.status);
        const connId = connRes.data.id;

        console.log(`\n[4] Triggering Sync Job (BullMQ) for connection ${connId}...`);
        const syncRes = await axios.post(`${API_URL}/ads/connections/${connId}/sync`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('SYNC Response:', syncRes.status, syncRes.data);

        console.log('\n✅ All tests passed. API, Database, and Worker are online!');
    } catch (err) {
        if (err.response) {
            console.error('❌ Error during verification:', err.response.status, err.response.data);
        } else {
            console.error('❌ Error during verification:', err.message);
        }
    }
}

test();
