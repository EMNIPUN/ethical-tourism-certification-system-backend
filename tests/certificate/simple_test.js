
import fs from 'fs';

const BASE_URL = 'http://localhost:5000/api/v1';

async function main() {
    console.log('--- START SIMPLE TEST ---');
    try {
        // 1. Auth
        const randomId = Date.now();
        const userEmail = `owner_${randomId}@test.com`;
        const userPassword = 'password123';
        const userName = 'Auto Test Owner';

        console.log('Registering...');
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: userName,
                email: userEmail,
                password: userPassword,
                role: 'Hotel Owner'
            }),
        });
        const regData = await regRes.json();
        const token = regData.token;
        console.log('Token:', token ? 'GOT TOKEN' : 'NO TOKEN');

        // 2. Create Hotel
        const timestamp = Date.now();
        const body = {
            businessInfo: {
                name: `Grand Hotel Test ${timestamp}`,
                registrationNumber: "REG-12345",
                licenseNumber: "LIC-12345",
                businessType: "Hotel",
                contact: {
                    ownerName: "John Doe",
                    phone: "+94771234567",
                    email: `hotel_${Date.now()}@test.com`,
                    address: "123 Test St, Test City, Country"
                }
            },
            guestServices: {
                facilities: {
                    numberOfRooms: 50,
                    roomTypes: ["Single", "Double", "Suite"]
                },
                wifi: true,
                parking: true
            }
        };

        console.log('Creating Hotel...');
        const res = await fetch(`${BASE_URL}/hotels`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body),
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response Body:', text);
        fs.writeFileSync('response.txt', text);

    } catch (err) {
        console.error('ERROR:', err);
    }
}

main();
