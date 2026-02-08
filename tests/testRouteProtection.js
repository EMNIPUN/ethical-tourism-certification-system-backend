// Native fetch is available in Node 18+

const BASE_URL = 'http://localhost:5001/api/v1';

const testProtection = async () => {
    try {
        console.log('--- Testing Route Protection ---');

        // 1. Login as Admin to get a token
        console.log('\nLogging in Admin...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin_test@example.com', // Assuming this user exists from previous test or will be created
                password: 'password123'
            })
        });

        let token = null;
        if (loginRes.status === 200) {
            const data = await loginRes.json();
            token = data.token;
            console.log('[PASS] Admin logged in.');
        } else {
            // If admin doesn't exist, register one
            console.log('Admin not found, registering...');
            const regRes = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Admin Test',
                    email: 'admin_test@example.com',
                    password: 'password123',
                    role: 'Admin'
                })
            });
            const regData = await regRes.json();
            if (regRes.status === 201) {
                token = regData.token;
                console.log('[PASS] Admin registered and logged in.');
            } else {
                console.log('[FAIL] Could not get Admin token:', regData);
                return;
            }
        }

        // 2. Test Unauthenticated Access to /hotels (should fail)
        console.log('\nTesting Unauthenticated Access to GET /hotels...');
        const unauthRes = await fetch(`${BASE_URL}/hotels`);
        if (unauthRes.status === 401) {
            console.log('[PASS] Unauthenticated request rejected (401).');
        } else {
            console.log(`[FAIL] Unauthenticated request passed with status ${unauthRes.status}.`);
        }

        // 3. Test Authorized Access to /hotels (should succeed)
        console.log('\nTesting Authorized Access to GET /hotels...');
        const authRes = await fetch(`${BASE_URL}/hotels`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (authRes.status === 200) {
            console.log('[PASS] Authorized request accepted (200).');
        } else {
            console.log(`[FAIL] Authorized request failed with status ${authRes.status}.`);
        }

        // 4. Test Search (Protected)
        console.log('\nTesting Search Route Protection...');
        const searchRes = await fetch(`${BASE_URL}/hotels/search?q=Test`);
        if (searchRes.status === 401) {
            console.log('[PASS] Unauthenticated Search rejected (401).');
        } else {
            console.log(`[FAIL] Unauthenticated Search passed with status ${searchRes.status}.`);
        }

        console.log('\n--- Route Protection Test Completed ---');

    } catch (error) {
        console.error('Error running tests:', error);
    }
};

testProtection();
