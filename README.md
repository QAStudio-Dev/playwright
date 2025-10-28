# Playwright Reporter for QAStudio.dev

[![npm version](https://badge.fury.io/js/@qastudio%2Fplaywright.svg)](https://www.npmjs.com/package/@qastudio-dev/playwright)
[![CI](https://github.com/QAStudio-Dev/playwright/actions/workflows/test.yml/badge.svg)](https://github.com/QAStudio-Dev/playwright/actions/workflows/test.yml)
[![Publish](https://github.com/QAStudio-Dev/playwright/actions/workflows/publish.yml/badge.svg)](https://github.com/QAStudio-Dev/playwright/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive Playwright test reporter that automatically sends test results to the QAStudio.dev test management platform.

## Features

- ✅ Automatic test result reporting to QAStudio.dev
- ✅ Auto-creation of test runs
- ✅ Map Playwright tests to QAStudio.dev test cases
- ✅ Upload screenshots and videos for failed tests
- ✅ Batch API requests for optimal performance
- ✅ Retry handling (only reports final results)
- ✅ Detailed error handling with fallback mode
- ✅ Rich metadata extraction from test annotations
- ✅ TypeScript support with full type definitions

## Installation

```bash
npm install --save-dev @qastudio-dev/playwright
```

Or with yarn:

```bash
yarn add -D @qastudio-dev/playwright
```

## Quick Start

### 1. Configure Environment Variables

Create a `.env` file in your project root:

```env
QA_STUDIO_API_URL=https://qastudio.dev/api
QA_STUDIO_API_KEY=your-api-key-here
QA_STUDIO_PROJECT_ID=your-project-id-here
```

### 2. Update Playwright Configuration

Add the reporter to your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'], // Keep default reporters
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
});
```

### 3. Run Your Tests

```bash
npx playwright test
```

Test results will be automatically sent to QAStudio.dev!

## Configuration Options

| Option               | Type    | Required | Default        | Description                                         |
| -------------------- | ------- | -------- | -------------- | --------------------------------------------------- |
| `apiUrl`             | string  | ✅       | -              | QAStudio.dev API base URL                           |
| `apiKey`             | string  | ✅       | -              | API key for authentication                          |
| `projectId`          | string  | ✅       | -              | QAStudio.dev project ID                             |
| `testRunId`          | string  | ❌       | -              | Existing test run ID (auto-created if not provided) |
| `environment`        | string  | ❌       | `'default'`    | Environment name (e.g., 'CI', 'staging')            |
| `createTestRun`      | boolean | ❌       | `true`         | Auto-create test run if testRunId not provided      |
| `testRunName`        | string  | ❌       | Auto-generated | Name for new test runs                              |
| `testRunDescription` | string  | ❌       | -              | Description for new test runs                       |
| `milestoneId`        | string  | ❌       | -              | Associate test run with milestone                   |
| `verbose`            | boolean | ❌       | `false`        | Enable detailed logging                             |
| `batchSize`          | number  | ❌       | `10`           | Batch size for sending results                      |
| `uploadScreenshots`  | boolean | ❌       | `true`         | Upload screenshots for failed tests                 |
| `uploadVideos`       | boolean | ❌       | `true`         | Upload videos for failed tests                      |
| `maxRetries`         | number  | ❌       | `3`            | Max retry attempts for API requests                 |
| `timeout`            | number  | ❌       | `30000`        | API request timeout (ms)                            |
| `silent`             | boolean | ❌       | `true`         | Don't fail tests if API is unavailable              |

## Linking Tests to QAStudio.dev Test Cases

There are two ways to link Playwright tests to QAStudio.dev test cases:

### Method 1: Using Annotations (Recommended)

```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  test.info().annotations.push({
    type: 'testCaseId',
    description: 'QA-123', // QAStudio.dev test case ID
  });

  // Your test code...
});
```

### Method 2: Include ID in Test Title

```typescript
test('[QA-123] user can login', async ({ page }) => {
  // Your test code...
});
```

## Adding Tags and Metadata

Enhance your test reports with custom metadata:

```typescript
test('critical user flow', async ({ page }) => {
  test
    .info()
    .annotations.push(
      { type: 'testCaseId', description: 'QA-124' },
      { type: 'tag', description: 'critical' },
      { type: 'tag', description: 'smoke' },
      { type: 'priority', description: 'high' },
      { type: 'owner', description: 'qa-team' }
    );

  // Your test code...
});
```

All annotations are sent to QAStudio.dev as metadata.

## Advanced Configuration

### Using with Existing Test Run

To add results to an existing test run instead of creating a new one:

```typescript
export default defineConfig({
  reporter: [
    [
      '@qastudio-dev/playwright',
      {
        apiUrl: process.env.QA_STUDIO_API_URL!,
        apiKey: process.env.QA_STUDIO_API_KEY!,
        projectId: process.env.QA_STUDIO_PROJECT_ID!,
        testRunId: 'existing-run-id', // Use existing run
        createTestRun: false, // Don't create new run
      },
    ],
  ],
});
```

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
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

### Debugging

Enable verbose logging to troubleshoot issues:

```typescript
export default defineConfig({
  reporter: [
    [
      '@qastudio-dev/playwright',
      {
        // ... other options
        verbose: true, // Enable detailed logs
        silent: false, // Throw errors instead of failing silently
      },
    ],
  ],
});
```

## Error Handling

By default, the reporter operates in "silent" mode, meaning it won't fail your tests if the QAStudio.dev API is unavailable. Errors are logged to the console but don't affect test execution.

To make API failures throw errors:

```typescript
{
  silent: false;
}
```

## API Reference

### Reporter Lifecycle

The reporter follows Playwright's reporter lifecycle:

1. **`onBegin`** - Creates or connects to test run
2. **`onTestBegin`** - Tracks test start time
3. **`onTestEnd`** - Collects test results and attachments
4. **`onEnd`** - Sends results in batches and completes test run

### Test Result Data

Each test result includes:

- Test case ID (if linked)
- Title and full path
- Status (passed/failed/skipped/timedOut)
- Duration
- Error messages and stack traces
- Attachments (screenshots, videos, traces)
- Browser/project information
- Custom metadata from annotations

## Troubleshooting

### Tests not appearing in QAStudio.dev

1. Check your API credentials are correct
2. Enable verbose mode to see detailed logs
3. Verify the project ID exists in QAStudio.dev
4. Check that tests are linked with valid test case IDs

### API timeout errors

Increase the timeout value:

```typescript
{
  timeout: 60000; // 60 seconds
}
```

### Too many API requests

Increase batch size to reduce number of requests:

```typescript
{
  batchSize: 50;
}
```

### Screenshots/videos not uploading

Ensure Playwright is configured to capture them:

```typescript
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

## Examples

Check the `examples/` directory for complete working examples:

- `examples/playwright.config.ts` - Full configuration example
- `examples/example.spec.ts` - Test examples with annotations
- `examples/.env.example` - Environment variables template

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/QAStudio-Dev/playwright.git
cd @qastudio-dev/playwright

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- 📚 [Documentation](https://docs.qastudio.dev/integrations/playwright)
- 🐛 [Issue Tracker](https://github.com/QAStudio-Dev/playwright/issues)
- 💬 [Discussions](https://github.com/QAStudio-Dev/playwright/discussions)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

Made with ❤️ for the QA community
