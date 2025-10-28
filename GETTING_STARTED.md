# Getting Started with Playwright Reporter for QAStudio.dev

This guide will help you set up and start using the QAStudio.dev reporter with your Playwright tests.

## Prerequisites

- Node.js 16.0.0 or higher
- Playwright Test installed in your project
- QAStudio.dev account with API access

## Step 1: Installation

Install the reporter as a dev dependency:

```bash
npm install --save-dev @qastudio-dev/playwright
```

Or with yarn:

```bash
yarn add -D @qastudio-dev/playwright
```

## Step 2: Get Your QAStudio.dev API Credentials

1. Log in to your QAStudio.dev account
2. Navigate to **Settings** → **API Keys**
3. Create a new API key or copy an existing one
4. Note your **Project ID** from the project settings

## Step 3: Set Up Environment Variables

Create a `.env` file in your project root:

```env
QA_STUDIO_API_URL=https://qastudio.dev/api
QA_STUDIO_API_KEY=your-api-key-here
QA_STUDIO_PROJECT_ID=your-project-id-here
```

**Important:** Add `.env` to your `.gitignore` to keep credentials secure!

## Step 4: Configure Playwright

Update your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Your existing configuration...

  reporter: [
    // Keep your existing reporters
    ['list'],
    ['html'],

    // Add QAStudio.dev reporter
    [
      '@qastudio-dev/playwright',
      {
        apiUrl: process.env.QA_STUDIO_API_URL!,
        apiKey: process.env.QA_STUDIO_API_KEY!,
        projectId: process.env.QA_STUDIO_PROJECT_ID!,
        environment: process.env.CI ? 'CI' : 'local',
        createTestRun: true,
      },
    ],
  ],

  // Recommended: Enable screenshots and videos for failed tests
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

## Step 5: Link Tests to QAStudio.dev Test Cases

You can link your Playwright tests to QAStudio.dev test cases in two ways:

### Option 1: Using Annotations (Recommended)

```typescript
import { test, expect } from '@playwright/test';

test('user can login successfully', async ({ page }) => {
  // Add test case ID annotation
  test.info().annotations.push({
    type: 'testCaseId',
    description: 'QA-123',
  });

  await page.goto('/login');
  await page.fill('#username', 'user@example.com');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
});
```

### Option 2: Include ID in Test Title

```typescript
test('[QA-123] user can login successfully', async ({ page }) => {
  // Test implementation...
});
```

## Step 6: Run Your Tests

Run your Playwright tests as normal:

```bash
npx playwright test
```

The reporter will automatically:

- Create a new test run in QAStudio.dev
- Send test results as tests complete
- Upload screenshots and videos for failures
- Complete the test run when all tests finish

## Step 7: View Results in QAStudio.dev

1. Log in to QAStudio.dev
2. Navigate to your project
3. Find the latest test run in the **Test Runs** section
4. View detailed results, including:
   - Pass/fail status for each test
   - Execution time
   - Error messages
   - Screenshots and videos

## Advanced Usage

### Adding Tags to Tests

```typescript
test('critical user workflow', async ({ page }) => {
  test
    .info()
    .annotations.push(
      { type: 'testCaseId', description: 'QA-124' },
      { type: 'tag', description: 'critical' },
      { type: 'tag', description: 'smoke' }
    );

  // Test implementation...
});
```

### Custom Test Run Names

```typescript
export default defineConfig({
  reporter: [
    [
      '@qastudio-dev/playwright',
      {
        apiUrl: process.env.QA_STUDIO_API_URL!,
        apiKey: process.env.QA_STUDIO_API_KEY!,
        projectId: process.env.QA_STUDIO_PROJECT_ID!,
        testRunName: `Nightly Build - ${new Date().toLocaleDateString()}`,
        testRunDescription: 'Automated regression tests',
      },
    ],
  ],
});
```

### Associate with Milestone

```typescript
export default defineConfig({
  reporter: [
    [
      '@qastudio-dev/playwright',
      {
        // ... other options
        milestoneId: 'milestone-id-here',
      },
    ],
  ],
});
```

### Enable Verbose Logging

For debugging, enable verbose mode:

```typescript
export default defineConfig({
  reporter: [
    [
      '@qastudio-dev/playwright',
      {
        // ... other options
        verbose: true,
      },
    ],
  ],
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run tests
        env:
          QA_STUDIO_API_URL: ${{ secrets.QA_STUDIO_API_URL }}
          QA_STUDIO_API_KEY: ${{ secrets.QA_STUDIO_API_KEY }}
          QA_STUDIO_PROJECT_ID: ${{ secrets.QA_STUDIO_PROJECT_ID }}
        run: npx playwright test
```

### GitLab CI Example

```yaml
test:
  image: mcr.microsoft.com/playwright:v1.40.0
  script:
    - npm ci
    - npx playwright test
  variables:
    QA_STUDIO_API_URL: $QA_STUDIO_API_URL
    QA_STUDIO_API_KEY: $QA_STUDIO_API_KEY
    QA_STUDIO_PROJECT_ID: $QA_STUDIO_PROJECT_ID
```

## Troubleshooting

### Reporter not sending results

1. Check that your API credentials are correct
2. Verify your project ID is valid
3. Enable verbose logging to see detailed output
4. Check network connectivity to QAStudio.dev API

### API timeout errors

If you're experiencing timeouts:

```typescript
{
  timeout: 60000,  // Increase to 60 seconds
  maxRetries: 5    // Increase retry attempts
}
```

### Tests passing but not appearing in QAStudio.dev

Make sure:

1. Tests are linked with valid test case IDs
2. The project ID matches your QAStudio.dev project
3. Check QAStudio.dev logs for any import errors

## Next Steps

- Read the [README](README.md) for complete configuration reference
- Check out [examples](examples/) for more usage patterns
- See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute to the project

## Getting Help

- 📚 [Documentation](https://docs.qastudio.dev/integrations/playwright)
- 🐛 [Issue Tracker](https://github.com/QAStudio-Dev/playwright/issues)
- 💬 [Discussions](https://github.com/QAStudio-Dev/playwright/discussions)

Happy testing!
