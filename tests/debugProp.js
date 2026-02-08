const BASE_URL = 'http://localhost:5001/api/v1';

const debug = async () => {
    try {
        console.log('--- Debugging API ---');

        // 1. Root
        console.log('GET /');
        const resRoot = await fetch(BASE_URL + '/');
        console.log('Root status:', resRoot.status);
        const textRoot = await resRoot.text();
        console.log('Root body:', textRoot);

        // 2. Auth Register (simplified)
        console.log('\nPOST /auth/register');
        const resReg = await fetch(BASE_URL + '/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Debug User',
                email: 'debug_' + Date.now() + '@example.com',
                password: 'password123',
                role: 'Tourist'
            })
        });
        console.log('Register status:', resReg.status);
        const textReg = await resReg.text();
        console.log('Register body:', textReg.substring(0, 200)); // Log first 200 chars

    } catch (err) {
        console.error('Debug error:', err);
    }
};

debug();
