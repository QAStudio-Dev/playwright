import * as fs from 'fs';
import type { TestCase, TestResult, Suite } from '@playwright/test/reporter';
import type { QAStudioTestResult, QAStudioAttachment } from './types';

/**
 * Convert Playwright test result to QAStudio.dev format
 */
export function convertTestResult(
  test: TestCase,
  result: TestResult,
  startTime: Date
): QAStudioTestResult {
  const endTime = new Date(startTime.getTime() + result.duration);

  return {
    testCaseId: extractTestCaseId(test),
    title: test.title,
    fullTitle: getFullTitle(test),
    status: mapTestStatus(result.status),
    duration: result.duration,
    error: result.error?.message,
    stackTrace: result.error?.stack,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    retry: result.retry,
    attachments: extractAttachments(result),
    projectName: test.parent?.project()?.name,
    metadata: extractMetadata(test),
  };
}

/**
 * Extract test case ID from test annotations or title
 */
export function extractTestCaseId(test: TestCase): string | undefined {
  // Look for @testCaseId annotation
  const annotation = test.annotations.find((a) => a.type === 'testCaseId');
  if (annotation?.description) {
    return annotation.description;
  }

  // Look for QAStudio.dev ID in title (e.g., "[QA-123] Test title")
  const match = test.title.match(/^\[([A-Z]+-\d+)\]/);
  if (match) {
    return match[1];
  }

  return undefined;
}

/**
 * Get full test title including suite hierarchy
 */
export function getFullTitle(test: TestCase): string {
  const titles: string[] = [];
  let current: TestCase | Suite | undefined = test;

  while (current) {
    if (current.title) {
      titles.unshift(current.title);
    }
    current = current.parent;
  }

  return titles.join(' > ');
}

/**
 * Map Playwright test status to QAStudio.dev status
 */
export function mapTestStatus(status: string): 'passed' | 'failed' | 'skipped' | 'timedOut' {
  switch (status) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'timedOut':
      return 'timedOut';
    case 'skipped':
    case 'interrupted':
      return 'skipped';
    default:
      return 'failed';
  }
}

/**
 * Extract attachments from test result
 */
export function extractAttachments(result: TestResult): QAStudioAttachment[] {
  const attachments: QAStudioAttachment[] = [];

  for (const attachment of result.attachments) {
    const type = determineAttachmentType(attachment.name, attachment.contentType);

    attachments.push({
      name: attachment.name,
      contentType: attachment.contentType,
      body: attachment.body || attachment.path || '',
      type,
    });
  }

  return attachments;
}

/**
 * Determine attachment type from name and content type
 */
export function determineAttachmentType(
  name: string,
  contentType: string
): 'screenshot' | 'video' | 'trace' | 'other' {
  if (contentType.startsWith('image/') || name.toLowerCase().includes('screenshot')) {
    return 'screenshot';
  }
  if (contentType.startsWith('video/') || name.toLowerCase().includes('video')) {
    return 'video';
  }
  if (name.toLowerCase().includes('trace')) {
    return 'trace';
  }
  return 'other';
}

/**
 * Extract custom metadata from test
 */
export function extractMetadata(test: TestCase): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  // Add tags from annotations
  const tags = test.annotations.filter((a) => a.type === 'tag').map((a) => a.description);
  if (tags.length > 0) {
    metadata.tags = tags;
  }

  // Add location info
  if (test.location) {
    metadata.location = {
      file: test.location.file,
      line: test.location.line,
      column: test.location.column,
    };
  }

  // Add custom annotations
  for (const annotation of test.annotations) {
    if (annotation.type !== 'tag' && annotation.type !== 'testCaseId') {
      metadata[annotation.type] = annotation.description;
    }
  }

  return metadata;
}

/**
 * Read file as buffer
 */
export async function readFileAsBuffer(filePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * Batch array into chunks
 */
export function batchArray<T>(array: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Generate default test run name
 */
export function generateTestRunName(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `Playwright Test Run - ${dateStr} ${timeStr}`;
}

/**
 * Strip ANSI escape codes from a string
 * Removes color codes and other terminal formatting that can interfere with API calls
 */
export function stripAnsi(str: string | undefined): string | undefined {
  if (!str) return str;

  const cleaned = str
    // Remove ANSI escape sequences (e.g., \x1b[31m, \x1b[0m)
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    // Remove bracket codes (e.g., [31m, [0m)
    .replace(/\[\d+m/g, '')
    // Remove multi-digit bracket codes (e.g., [1;31m)
    .replace(/\[\d+;\d+m/g, '')
    // Trim any whitespace that may have been left
    .trim();

  // Log warning if ANSI codes were detected and removed
  if (cleaned !== str.trim()) {
    console.warn(
      '[QAStudio.dev Reporter] Warning: ANSI escape codes detected and removed from configuration value'
    );
  }

  return cleaned;
}

/**
 * Sanitize and validate a URL string
 */
export function sanitizeUrl(url: string): string {
  const cleaned = stripAnsi(url) || '';

  // Validate URL format
  try {
    new URL(cleaned);
    return cleaned;
  } catch (error) {
    throw new Error(
      `Invalid URL format: "${cleaned}". Please ensure apiUrl is a valid URL (e.g., https://qastudio.dev/api)`
    );
  }
}

/**
 * Sanitize a string field by removing ANSI codes
 */
export function sanitizeString(str: string | undefined): string | undefined {
  return stripAnsi(str);
}

/**
 * Validate reporter options
 */
export function validateOptions(options: unknown): void {
  if (!options || typeof options !== 'object') {
    throw new Error('QAStudio.dev reporter options must be an object');
  }

  const opts = options as Record<string, unknown>;

  if (!opts.apiUrl || typeof opts.apiUrl !== 'string') {
    throw new Error('QAStudio.dev reporter: apiUrl is required and must be a string');
  }

  if (!opts.apiKey || typeof opts.apiKey !== 'string') {
    throw new Error('QAStudio.dev reporter: apiKey is required and must be a string');
  }

  if (!opts.projectId || typeof opts.projectId !== 'string') {
    throw new Error('QAStudio.dev reporter: projectId is required and must be a string');
  }

  // Validate URL format after stripping ANSI codes
  sanitizeUrl(opts.apiUrl);
}
