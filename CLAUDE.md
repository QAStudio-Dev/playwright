# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `@qastudio-dev/playwright`, an npm package that provides a Playwright test reporter for QAStudio.dev test management platform. The package is published as a scoped npm package under the `@qastudio` organization.

**Package name**: `@qastudio-dev/playwright`
**Language**: TypeScript
**Target**: Node.js >=16.0.0
**Peer dependency**: `@playwright/test` ^1.0.0

## Build Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript (outputs to dist/)
npm run build

# Type check without emitting files
npm run lint

# Clean build artifacts
npm run clean

# Full clean build
npm run clean && npm run build

# Prepare for publishing (automatic on npm publish)
npm run prepublishOnly
```

## Architecture

### Core Components

The package consists of four main modules in `src/`:

1. **`index.ts`** - Main reporter class (`QAStudioReporter`)
   - Implements Playwright's `Reporter` interface
   - Lifecycle: `onBegin` → `onTestBegin` → `onTestEnd` → `onEnd`
   - Manages test run creation, result collection, and batch submission
   - Handles reporter state and counters (totalTests, passedTests, failedTests, skippedTests)

2. **`api-client.ts`** - HTTP client for QAStudio.dev API (`QAStudioAPIClient`)
   - Handles all API communication with retry logic and exponential backoff
   - Methods: `createTestRun()`, `submitTestResults()`, `completeTestRun()`, `uploadAttachment()`
   - Built using Node.js native `http`/`https` modules (no external HTTP libraries)
   - Includes custom `APIError` class for structured error handling

3. **`types.ts`** - TypeScript type definitions
   - `QAStudioReporterOptions` - Configuration interface with all reporter options
   - API request/response types for all endpoints
   - Internal state management types (`ReporterState`, `InternalTestData`)
   - Test result and attachment types for data mapping

4. **`utils.ts`** - Helper functions
   - `convertTestResult()` - Maps Playwright `TestResult` to QAStudio.dev format
   - `extractTestCaseId()` - Extracts test case IDs from annotations or title patterns like `[QA-123]`
   - `extractMetadata()` - Pulls custom annotations (tags, priority, owner, etc.)
   - `batchArray()` - Splits arrays into batches for efficient API calls
   - `validateOptions()` - Validates required reporter configuration

### Reporter Workflow

1. **`onBegin`**: Creates test run via API (or uses existing testRunId)
2. **`onTestBegin`**: Records test start time in internal state map
3. **`onTestEnd`**: Updates test data, increments counters (only for final retry)
4. **`onEnd`**:
   - Converts all test results to QAStudio.dev format
   - Filters attachments based on `uploadScreenshots`/`uploadVideos` options
   - Batches results (default: 10 per batch)
   - Submits batches sequentially with error handling
   - Completes test run with summary stats

### Key Design Patterns

- **Silent Mode** (`silent: true` by default): API failures don't throw, preventing test suite failures
- **Retry Handling**: Only final test results reported (skips intermediate retries)
- **Batch Processing**: Results sent in configurable batches to avoid overwhelming API
- **Graceful Degradation**: Continues on API errors when silent mode enabled
- **Test Linking**: Two methods to link tests to QAStudio.dev cases:
  1. Annotation: `test.info().annotations.push({ type: 'testCaseId', description: 'QA-123' })`
  2. Title prefix: `test('[QA-123] test name', ...)`

## TypeScript Configuration

- **Target**: ES2020
- **Module**: CommonJS (for Node.js compatibility)
- **Strict mode**: Enabled
- **Declaration files**: Generated (`.d.ts` files in `dist/`)
- **Source maps**: Enabled

## Package Structure

```
dist/              # Compiled output (not in git)
src/               # TypeScript source
  ├── index.ts     # Main reporter class
  ├── api-client.ts
  ├── types.ts
  └── utils.ts
examples/          # Usage examples (not published to npm)
  ├── playwright.config.ts
  ├── example.spec.ts
  └── .env.example
```

Files published to npm (see `package.json` "files" field):

- `dist/` - Compiled JavaScript and type definitions
- `README.md`
- `LICENSE`

## Publishing

This is a **scoped package** requiring special npm publish command.

### Automated (Recommended)

The repository uses GitHub Actions for automated releases and publishing:

1. **`.github/workflows/test.yml`** - CI testing on push/PR
2. **`.github/workflows/release.yml`** - Creates releases (manual trigger)
3. **`.github/workflows/publish.yml`** - Publishes to npm on release

See `.github/WORKFLOWS.md` for complete documentation.

### Manual

```bash
# First publish (sets public access)
npm publish --access public

# Subsequent publishes
npm publish
```

The package must be public since it's a free/open-source integration.

## Testing Locally

To test changes with a local Playwright project:

```bash
# In this package directory
npm link

# In your Playwright project
npm link @qastudio-dev/playwright

# Configure playwright.config.ts to use the reporter
reporter: [['@qastudio-dev/playwright', { ... }]]
```

## Important Notes

- **API URL**: Default is `https://qastudio.dev/api`
- **User-Agent**: Set to `@qastudio-dev/playwright/1.0.0` in API requests
- **Error messages**: Prefixed with `[QAStudio.dev Reporter]` for easy identification
- **Environment variables**: Expected format is `QA_STUDIO_API_URL`, `QA_STUDIO_API_KEY`, `QA_STUDIO_PROJECT_ID`

## Configuration Defaults

Key default values in reporter options:

- `environment`: `'default'`
- `createTestRun`: `true`
- `verbose`: `false`
- `batchSize`: `10`
- `uploadScreenshots`: `true`
- `uploadVideos`: `true`
- `maxRetries`: `3`
- `timeout`: `30000` (30 seconds)
- `silent`: `true`
