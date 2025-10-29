import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import { QAStudioAPIClient } from './api-client';
import type { QAStudioReporterOptions, ReporterState, QAStudioTestResult } from './types';
import {
  convertTestResult,
  batchArray,
  formatDuration,
  generateTestRunName,
  validateOptions,
  sanitizeUrl,
  sanitizeString,
} from './utils';

/**
 * QAStudio.dev Reporter for Playwright
 *
 * Sends test results to QAStudio.dev test management platform
 *
 * @example
 * ```typescript
 * // playwright.config.ts
 * export default defineConfig({
 *   reporter: [
 *     ['@qastudio-dev/playwright', {
 *       apiUrl: 'https://qastudio.dev/api',
 *       apiKey: process.env.QA_STUDIO_API_KEY,
 *       projectId: 'abc123',
 *       environment: 'CI',
 *     }]
 *   ],
 * });
 * ```
 */
export default class QAStudioReporter implements Reporter {
  private options: QAStudioReporterOptions & {
    environment: string;
    createTestRun: boolean;
    verbose: boolean;
    batchSize: number;
    uploadScreenshots: boolean;
    uploadVideos: boolean;
    maxRetries: number;
    timeout: number;
    silent: boolean;
    testRunName: string;
  };
  private apiClient: QAStudioAPIClient;
  private state: ReporterState;
  private totalTests = 0;
  private passedTests = 0;
  private failedTests = 0;
  private skippedTests = 0;

  constructor(options: QAStudioReporterOptions) {
    // Validate options
    validateOptions(options);

    // Sanitize all string options to remove ANSI codes
    const sanitizedOptions = {
      ...options,
      apiUrl: sanitizeUrl(options.apiUrl),
      apiKey: sanitizeString(options.apiKey) || '',
      projectId: sanitizeString(options.projectId) || '',
      environment: sanitizeString(options.environment) || undefined,
      testRunId: sanitizeString(options.testRunId) || undefined,
      testRunName: sanitizeString(options.testRunName) || undefined,
      testRunDescription: sanitizeString(options.testRunDescription) || undefined,
      milestoneId: sanitizeString(options.milestoneId) || undefined,
    };

    // Set defaults
    this.options = {
      ...sanitizedOptions,
      environment: sanitizedOptions.environment ?? 'default',
      createTestRun: sanitizedOptions.createTestRun ?? true,
      verbose: sanitizedOptions.verbose ?? false,
      batchSize: sanitizedOptions.batchSize ?? 10,
      uploadScreenshots: sanitizedOptions.uploadScreenshots ?? true,
      uploadVideos: sanitizedOptions.uploadVideos ?? true,
      maxRetries: sanitizedOptions.maxRetries ?? 3,
      timeout: sanitizedOptions.timeout ?? 30000,
      silent: sanitizedOptions.silent ?? true,
      testRunName: sanitizedOptions.testRunName ?? generateTestRunName(),
    };

    this.apiClient = new QAStudioAPIClient(this.options);

    this.state = {
      tests: new Map(),
    };

    this.log('QAStudio.dev Reporter initialized with options:', {
      ...this.options,
      apiKey: '***hidden***',
    });
  }

  /**
   * Called once before running tests
   */
  async onBegin(_config: FullConfig, _suite: Suite): Promise<void> {
    this.state.startTime = new Date();
    this.log('Test run starting...');

    try {
      // Create test run if needed
      if (this.options.createTestRun && !this.options.testRunId) {
        const response = await this.apiClient.createTestRun({
          projectId: this.options.projectId,
          name: this.options.testRunName,
          description: this.options.testRunDescription,
          environment: this.options.environment,
          milestoneId: this.options.milestoneId,
        });

        this.state.testRunId = response.id;
        this.log(`Created test run with ID: ${this.state.testRunId}`);
      } else {
        this.state.testRunId = this.options.testRunId;
        this.log(`Using existing test run ID: ${this.state.testRunId}`);
      }
    } catch (error) {
      this.handleError('Failed to create test run', error);
    }
  }

  /**
   * Called when a test begins
   */
  onTestBegin(test: TestCase, result: TestResult): void {
    const testId = this.getTestId(test);
    this.state.tests.set(testId, {
      test,
      result,
      startTime: new Date(),
    });

    this.log(`Test started: ${test.title}`);
  }

  /**
   * Called when a test ends
   */
  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const testId = this.getTestId(test);
    const testData = this.state.tests.get(testId);

    if (!testData) {
      this.log(`Warning: Test data not found for ${test.title}`);
      return;
    }

    // Update test data
    testData.result = result;
    testData.endTime = new Date();

    // Update counters (only count final result, not retries)
    if (result.retry === test.retries) {
      this.totalTests++;
      switch (result.status) {
        case 'passed':
          this.passedTests++;
          break;
        case 'failed':
        case 'timedOut':
          this.failedTests++;
          break;
        case 'skipped':
        case 'interrupted':
          this.skippedTests++;
          break;
      }
    }

    this.log(
      `Test ended: ${test.title} - ${result.status} (${result.duration}ms) [retry: ${result.retry}/${test.retries}]`
    );
  }

  /**
   * Called after all tests have finished
   */
  async onEnd(_result: FullResult): Promise<void> {
    this.state.endTime = new Date();
    const duration = this.state.endTime.getTime() - (this.state.startTime?.getTime() ?? 0);

    this.log('Test run completed');
    this.log(
      `Total: ${this.totalTests}, Passed: ${this.passedTests}, Failed: ${this.failedTests}, Skipped: ${this.skippedTests}`
    );
    this.log(`Duration: ${formatDuration(duration)}`);

    try {
      // Send test results to QAStudio.dev
      await this.sendTestResults();

      // Complete the test run
      if (this.state.testRunId) {
        await this.apiClient.completeTestRun({
          testRunId: this.state.testRunId,
          summary: {
            total: this.totalTests,
            passed: this.passedTests,
            failed: this.failedTests,
            skipped: this.skippedTests,
            duration,
          },
        });

        this.log('Test run completed successfully');

        // Trigger notifications
        await this.apiClient.triggerNotifications({
          testRunId: this.state.testRunId,
        });
      }
    } catch (error) {
      this.handleError('Failed to send test results', error);
    }
  }

  /**
   * Send test results to QAStudio.dev in batches
   */
  private async sendTestResults(): Promise<void> {
    if (!this.state.testRunId) {
      this.log('No test run ID available, skipping result submission');
      return;
    }

    // Convert all tests to QAStudio.dev format
    const results: QAStudioTestResult[] = [];

    for (const [_testId, testData] of this.state.tests) {
      // Only send final result (not retries)
      if (testData.result.retry === testData.test.retries) {
        const qaResult = convertTestResult(testData.test, testData.result, testData.startTime);

        // Filter attachments based on options
        if (qaResult.attachments) {
          qaResult.attachments = qaResult.attachments.filter((att) => {
            if (att.type === 'screenshot' && !this.options.uploadScreenshots) {
              return false;
            }
            if (att.type === 'video' && !this.options.uploadVideos) {
              return false;
            }
            return true;
          });
        }

        results.push(qaResult);
      }
    }

    this.log(`Sending ${results.length} test results in batches of ${this.options.batchSize}`);

    // Send results in batches
    const batches = batchArray(results, this.options.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.log(`Sending batch ${i + 1}/${batches.length} (${batch.length} results)`);

      try {
        const response = await this.apiClient.submitTestResults({
          testRunId: this.state.testRunId,
          results: batch,
        });

        this.log(
          `Batch ${i + 1} submitted successfully: ${response.processedCount} results processed`
        );

        if (response.errors && response.errors.length > 0) {
          this.log(`Batch ${i + 1} had ${response.errors.length} errors:`);
          response.errors.forEach((err) => {
            this.log(`  - ${err.testTitle}: ${err.error}`);
          });
        }
      } catch (error) {
        this.handleError(`Failed to send batch ${i + 1}`, error);
      }
    }
  }

  /**
   * Get unique test ID
   */
  private getTestId(test: TestCase): string {
    return `${test.titlePath().join(' > ')}`;
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.options.verbose) {
      console.log(`[QAStudio.dev Reporter] ${message}`, ...args);
    }
  }

  /**
   * Handle errors based on silent mode
   */
  private handleError(message: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullMessage = `${message}: ${errorMessage}`;

    if (this.options.silent) {
      console.error(`[QAStudio.dev Reporter] ${fullMessage}`);
    } else {
      throw new Error(fullMessage);
    }
  }

  /**
   * Print summary to console
   */
  printsToStdio(): boolean {
    return this.options.verbose;
  }
}

// Export types for users
export type { QAStudioReporterOptions } from './types';
