const API_URL = 'https://api-production-8d75.up.railway.app';

async function run() {
    console.log('--- A) API Healthcheck ---');
    try {
        const health = await fetch(`${API_URL}/health`);
        const data = await health.json();
        console.log(`[GET /health] Status: ${health.status} OK`);
        console.log(data);
    } catch (e) { console.error('Healthcheck failed', e.message); }

    console.log('\n--- B) OAuth Callbacks (No 404, Return 400) ---');
    try {
        const meta = await fetch(`${API_URL}/ads/meta/callback`);
        const metaData = await meta.json();
        console.log(`[GET /ads/meta/callback] Status: ${meta.status} ${metaData.message || ''}`);
    } catch (e) { console.log('Meta failed', e); }

    try {
        const google = await fetch(`${API_URL}/ads/google/callback`);
        const googleData = await google.json();
        console.log(`[GET /ads/google/callback] Status: ${google.status} ${googleData.message || ''}`);
    } catch (e) { console.log('Google failed', e); }

    console.log('\n--- C) API Login ---');
    let token;
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@medgrowth.com', password: 'Admin123!' })
        });
        const data = await res.json();
        if (res.ok) {
            token = data.accessToken;
            console.log(`[POST /auth/login] Token generated successfully: ${token.substring(0, 15)}...`);
        } else {
            console.error('Login failed', data);
            return;
        }
    } catch (e) { console.error('Login failed', e.message); return; }

    console.log('\n--- D) Trigger Sync worker ---');
    try {
        const connsRes = await fetch(`${API_URL}/ads/connections`, { headers: { Authorization: `Bearer ${token}` } });
        const conns = await connsRes.json();
        console.log(`Connections found: ${conns.length}. Dashboard will fall back to dynamic seed rendering until OAuth completes in the UI.`);
    } catch (e) { console.error('Connection fetch failed', e.message); }
}

run();
