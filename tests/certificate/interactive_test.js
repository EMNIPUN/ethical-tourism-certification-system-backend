
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5000/api/v1';

const log = console.log;
const separator = () => log(chalk.dim('─'.repeat(50)));

async function main() {
    log(boxen(chalk.green.bold('Ethical Tourism Certification System\nEnd-to-End CLI Test (Automated Auth)'), { padding: 1, borderStyle: 'round' }));

    const spinner = ora();
    let token = null;

    // 1. Automated Auth
    log(chalk.blue.bold('\n1. Automated Authentication'));
    separator();

    const randomId = Date.now();
    const userEmail = `owner_${randomId}@test.com`;
    const userPassword = 'password123';
    const userName = 'Auto Test Owner';

    spinner.start(`Creating user: ${userEmail}...`);

    try {
        // Register
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

        if (regRes.status === 201) {
            token = regData.token;
            spinner.succeed(chalk.green(`User registered & logged in: ${userEmail}`));
        } else {
            // If user exists, try login
            if (regData.error === 'User already exists') {
                spinner.text = 'User exists, logging in...';
                const loginRes = await fetch(`${BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail, password: userPassword }),
                });
                const loginData = await loginRes.json();
                if (!loginRes.ok) throw new Error(loginData.error || 'Login failed');
                token = loginData.token;
                spinner.succeed(chalk.green(`Logged in as existing user: ${userEmail}`));
            } else {
                throw new Error(regData.error || 'Registration failed');
            }
        }
    } catch (err) {
        spinner.fail(chalk.red(`Auth failed: ${err.message}`));
        console.error(chalk.red(err.stack));
        await fs.writeFile('error_log.json', JSON.stringify({ error: err.message, stack: err.stack }, null, 2));
        return;
    }

    // 2. Load Hotel Data
    log(chalk.blue.bold('\n2. Load Hotel Data'));
    separator();

    let currentData;
    try {
        const dataPath = join(__dirname, 'data', 'hotel_input.json');
        const rawData = await fs.readFile(dataPath, 'utf-8');
        currentData = JSON.parse(rawData);

        // Make name and email unique per run to avoid duplicate conflicts
        const timestamp = Date.now();
        currentData.businessInfo.name = `${currentData.businessInfo.name} ${timestamp}`;
        currentData.businessInfo.contact.email = `hotel_${timestamp}@test.com`;

        log(chalk.cyan('Initial Hotel Data:'));
        console.log(currentData);
    } catch (err) {
        log(chalk.red(`Failed to load hotel_input.json: ${err.message}`));
        return;
    }

    // 3. Application Loop
    log(chalk.blue.bold('\n3. Hotel Application & Confirmation Loop'));
    separator();

    let finished = false;

    while (!finished) {
        spinner.start('Submitting hotel application...');

        try {
            const res = await fetch(`${BASE_URL}/hotels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(currentData),
            });
            console.log('Sending Body:', JSON.stringify(currentData, null, 2));

            const result = await res.json();

            if (res.status === 201) {
                spinner.succeed(chalk.green('Hotel created successfully (Exact Match)!'));
                log(boxen(JSON.stringify(result, null, 2), { padding: 1, borderStyle: 'double', borderColor: 'green' }));
                finished = true;
            } else if (res.status === 202) {
                spinner.info(chalk.yellow('Ambiguous Match: Candidates found.'));
                const { candidates, message } = result;

                log(chalk.yellow(`\n${message}`));
                log(chalk.dim('candidates:'));
                candidates.forEach((c, i) => {
                    log(chalk.white(`  ${i + 1}. ${c.name} (${c.address}) - Score: ${c.matchScore}`));
                });
                console.log(''); // spacer

                // Interactive Choice
                const { action } = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'action',
                        message: 'System found potential matches. Please confirm:',
                        choices: [
                            ...candidates.map((c, i) => ({
                                name: `Confirm: ${c.name} (${c.matchScore})`,
                                value: { type: 'CONFIRM', token: c.token, name: c.name }
                            })),
                            new inquirer.Separator(),
                            { name: 'My hotel is not listed (Search Again / Edit Details)', value: { type: 'RETRY' } },
                            { name: 'Skip this entirely', value: { type: 'SKIP' } }
                        ]
                    }
                ]);

                if (action.type === 'SKIP') {
                    log(chalk.yellow('Skipping application process.'));
                    finished = true;
                } else if (action.type === 'RETRY') {
                    // Update details
                    log(chalk.cyan('\nUpdate search details to try again:'));
                    const updates = await inquirer.prompt([
                        { name: 'name', message: 'Name:', default: currentData.businessInfo.name },
                        { name: 'address', message: 'Address:', default: currentData.businessInfo.contact.address },
                        { name: 'country', message: 'Country:', default: currentData.businessInfo.contact.country },
                    ]);
                    // Update nested structure
                    currentData.businessInfo.name = updates.name;
                    currentData.businessInfo.contact.address = updates.address;
                    currentData.businessInfo.contact.country = updates.country;

                    log(chalk.cyan('Retrying with new details...'));
                    // Loop continues...
                } else if (action.type === 'CONFIRM') {
                    // Confirm the match
                    spinner.start(`Confirming selection: ${action.name}...`);

                    // We need the pending hotel ID. 
                    // Assuming result.data._id exists from the 202 response
                    const pendingId = result.data ? result.data._id : null;

                    if (!pendingId) {
                        throw new Error('Pending Hotel ID not found in 202 response');
                    }

                    const confirmRes = await fetch(`${BASE_URL}/hotels/${pendingId}/confirm`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ property_token: action.token }),
                    });

                    const finalData = await confirmRes.json();

                    if (confirmRes.ok) {
                        spinner.succeed(chalk.green('Match Confirmed & Saved!'));
                        log(boxen(JSON.stringify(finalData, null, 2), { padding: 1, borderStyle: 'double', borderColor: 'green' }));
                        finished = true;
                    } else {
                        throw new Error(finalData.error || 'Confirmation failed');
                    }
                }

            } else {
                // Other Error (400, 500, etc)
                spinner.fail(chalk.red(`Request failed with status ${res.status}`));
                log(chalk.red(JSON.stringify(result, null, 2)));

                const { retry } = await inquirer.prompt([
                    { type: 'confirm', name: 'retry', message: 'Retry entire process?', default: false }
                ]);
                if (!retry) finished = true;
            }

        } catch (err) {
            spinner.fail(chalk.red(`Error in loop: ${err.message}`));
            console.error(chalk.red(err.stack));
            await fs.writeFile('error_log.json', JSON.stringify({ error: err.message, stack: err.stack }, null, 2));

            const { retry } = await inquirer.prompt([
                { type: 'confirm', name: 'retry', message: 'Retry?', default: false }
            ]);
            if (!retry) finished = true;
        }
    }

    log(chalk.blue.bold('\nTest Completed.'));
}

main();
