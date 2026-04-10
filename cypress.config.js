import { defineConfig } from "cypress";
import mochawesome from "cypress-mochawesome-reporter/plugin.js";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import { createEsbuildPlugin } from "@badeball/cypress-cucumber-preprocessor/esbuild";
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";

export default defineConfig({
    video: true,
    screenshotOnRunFailure: true,
    e2e: {
        baseUrl: "http://localhost:5000",
        specPattern: ["cypress/e2e/**/*.cy.js", "cypress/e2e/**/*.feature"],
        supportFile: "cypress/support/e2e.js",
        async setupNodeEvents(on, config) {
            mochawesome(on);

            await addCucumberPreprocessorPlugin(on, config);

            on(
                "file:preprocessor",
                createBundler({
                    plugins: [createEsbuildPlugin(config)],
                }),
            );

            return config;
        },
        env: {
            apiBaseUrl: "http://localhost:5000/api/v1",
            hotelOwnerEmail: "script.evaluator@example.com",
            hotelOwnerPassword: "password123",
            hotelOwnerName: "Script Evaluator",
        },
    },
    reporter: "cypress-mochawesome-reporter",
    reporterOptions: {
        reportDir: "cypress/reports/mochawesome",
        charts: true,
        reportPageTitle: "ETCS API E2E Report",
        embeddedScreenshots: true,
        inlineAssets: true,
        saveAllAttempts: false,
    },
});
