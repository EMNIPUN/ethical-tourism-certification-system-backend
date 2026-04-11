import { spawn } from 'node:child_process';
import process from 'node:process';

const API_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1';

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForApiReady({ url, timeoutMs = 120_000, intervalMs = 2_000 }) {
    const deadline = Date.now() + timeoutMs;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            const res = await fetch(url, { method: 'GET' });
            if (res.ok) return;
        } catch {
            // ignore until timeout
        }

        if (Date.now() > deadline) {
            throw new Error(`API did not become ready within ${timeoutMs}ms: ${url}`);
        }

        await sleep(intervalMs);
    }
}

async function main() {
    console.log('Starting API server for confirmation flow test...');

    const server = spawn(process.execPath, ['server.js'], {
        stdio: 'inherit',
        shell: false,
        env: {
            ...process.env,
            NODE_ENV: process.env.NODE_ENV ?? 'test',
            PORT: process.env.PORT ?? '5000',
            E2E_MOCK_MODE: process.env.E2E_MOCK_MODE ?? 'true',
        },
    });

    const cleanup = async () => {
        if (server.exitCode == null && !server.killed) {
            server.kill('SIGTERM');
            await sleep(1000);
            if (server.exitCode == null && !server.killed) {
                server.kill('SIGKILL');
            }
        }
    };

    const handleSignal = async (signal) => {
        console.log(`\nReceived ${signal}, shutting down...`);
        await cleanup();
        process.exit(1);
    };

    process.on('SIGINT', handleSignal);
    process.on('SIGTERM', handleSignal);

    try {
        await waitForApiReady({ url: API_URL });

        const res = await fetch(API_URL, { method: 'GET' });
        if (!res.ok) {
            throw new Error(`API smoke test failed (status ${res.status}): ${API_URL}`);
        }

        console.log('API smoke test passed.');
    } finally {
        await cleanup();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
