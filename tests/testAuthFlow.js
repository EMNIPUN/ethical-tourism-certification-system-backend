// Native fetch is available in Node 18+

const BASE_URL = 'http://localhost:5000/api/v1/auth';

const testAuth = async () => {
    try {
        console.log('--- Testing Auth Flow for ALL Roles ---');

        const roles = ['Admin', 'Hotel Owner', 'Auditor', 'Tourist'];

        for (const role of roles) {
            console.log(`\n--- Testing Role: ${role} ---`);
            const email = `${role.toLowerCase().replace(' ', '')}_${Date.now()}@example.com`;
            const password = 'password123';
            const name = `${role} User`;

            // 1. Register
            const regRes = await fetch(`${BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role })
            });
            if (!regRes.ok) {
                const text = await regRes.text();
                console.log(`[FAIL] Register ${role} Status: ${regRes.status}`);
                console.log(`Response Body: ${text.substring(0, 500)}`);
                continue;
            }
            const regData = await regRes.json();
            if (regRes.status === 201) {
                console.log(`[PASS] Registered ${role}`);
            } else {
                console.log(`[FAIL] Register ${role}:`, regData.error);
                continue;
            }

            // 2. Login
            const loginRes = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const loginData = await loginRes.json();

            if (loginRes.status === 200 && loginData.token) {
                console.log(`[PASS] Logged in ${role}`);
            } else {
                console.log(`[FAIL] Login ${role}:`, loginData.error);
                continue;
            }

            // 3. Verify Token & Role access (Get Me)
            const meRes = await fetch(`${BASE_URL}/me`, {
                headers: { 'Authorization': `Bearer ${loginData.token}` }
            });
            const meData = await meRes.json();

            if (meRes.status === 200 && meData.data.role === role) {
                console.log(`[PASS] Verified Role: ${meData.data.role}`);
            } else {
                console.log(`[FAIL] Verify Role ${role}:`, meData);
            }
        }

        console.log('\n--- All Tests Completed ---');

    } catch (error) {
        console.error('Error running tests:', error);
    }
};

testAuth();
