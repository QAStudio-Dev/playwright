import { defineConfig, devices } from '@playwright/test';

/**
 * Example Playwright configuration using QAStudio.dev reporter
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Configure the QAStudio.dev reporter
  reporter: [
    // Keep the default reporters
    ['list'],
    ['html'],

    // Add QAStudio.dev reporter
    [
      '@qastudio/playwright',
      {
        // Required settings
        apiUrl: process.env.QA_STUDIO_API_URL || 'https://qastudio.dev/api',
        apiKey: process.env.QA_STUDIO_API_KEY!,
        projectId: process.env.QA_STUDIO_PROJECT_ID!,

        // Optional settings
        environment: process.env.CI ? 'CI' : 'local',
        createTestRun: true,
        testRunName: `Playwright Tests - ${new Date().toISOString()}`,
        testRunDescription: 'Automated test run from Playwright',

        // Upload settings
        uploadScreenshots: true,
        uploadVideos: true,

        // Performance settings
        batchSize: 10,
        maxRetries: 3,
        timeout: 30000,

        // Error handling
        silent: true, // Don't fail tests if API is down

        // Debugging
        verbose: false, // Set to true for detailed logs
      },
    ],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
