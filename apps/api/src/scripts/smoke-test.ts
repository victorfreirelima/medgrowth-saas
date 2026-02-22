import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function runSmokeTest() {
    console.log(`🚀 MedGrowth API Smoke Test`);
    console.log(`Target: ${API_URL}`);
    console.log('---------------------------');

    let success = true;

    // 1. Health Check
    try {
        const res = await axios.get(`${API_URL}/health`);
        if (res.status === 200 && res.data.status === 'ok') {
            console.log('✅ Health Check: PASSED');
        } else {
            console.log('❌ Health Check: FAILED (Unexpected response)');
            success = false;
        }
    } catch (e: any) {
        console.log(`❌ Health Check: FAILED (${e.message})`);
        success = false;
    }

    // 2. Auth Protection Check
    try {
        await axios.get(`${API_URL}/dashboard/kpis`);
        console.log('❌ Auth Protection: FAILED (Accessible without token!)');
        success = false;
    } catch (e: any) {
        if (e.response?.status === 401) {
            console.log('✅ Auth Protection: PASSED (Returned 401 Unauthorized)');
        } else {
            console.log(`❌ Auth Protection: FAILED (Returned ${e.response?.status || e.message})`);
            success = false;
        }
    }

    // 3. Documentation Availability
    try {
        const res = await axios.get(`${API_URL}/docs`);
        if (res.status === 200) {
            console.log('✅ Swagger Docs: PASSED');
        } else {
            console.log('❌ Swagger Docs: FAILED');
            success = false;
        }
    } catch (e: any) {
        console.log(`❌ Swagger Docs: FAILED (${e.message})`);
        success = false;
    }

    console.log('---------------------------');
    if (success) {
        console.log('🎉 SMOKE TEST COMPLETED SUCCESSFULLY');
        process.exit(0);
    } else {
        console.log('💀 SMOKE TEST FAILED');
        process.exit(1);
    }
}

runSmokeTest();
