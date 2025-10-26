import * as https from 'https';
import * as http from 'http';
import type {
  QAStudioReporterOptions,
  CreateTestRunRequest,
  CreateTestRunResponse,
  SubmitTestResultsRequest,
  SubmitTestResultsResponse,
  CompleteTestRunRequest,
  CompleteTestRunResponse,
} from './types';

export class QAStudioAPIClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly maxRetries: number;
  private readonly timeout: number;
  private readonly verbose: boolean;

  constructor(options: QAStudioReporterOptions) {
    this.apiUrl = options.apiUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = options.apiKey;
    this.maxRetries = options.maxRetries ?? 3;
    this.timeout = options.timeout ?? 30000;
    this.verbose = options.verbose ?? false;
  }

  /**
   * Create a new test run
   */
  async createTestRun(request: CreateTestRunRequest): Promise<CreateTestRunResponse> {
    this.log('Creating test run:', request);
    return this.request<CreateTestRunResponse>('/test-runs', {
      method: 'POST',
      body: request,
    });
  }

  /**
   * Submit test results to an existing test run
   */
  async submitTestResults(request: SubmitTestResultsRequest): Promise<SubmitTestResultsResponse> {
    this.log(`Submitting ${request.results.length} test results to run ${request.testRunId}`);
    return this.request<SubmitTestResultsResponse>('/test-results', {
      method: 'POST',
      body: request,
    });
  }

  /**
   * Complete a test run
   */
  async completeTestRun(request: CompleteTestRunRequest): Promise<CompleteTestRunResponse> {
    this.log('Completing test run:', request);
    return this.request<CompleteTestRunResponse>(`/test-runs/${request.testRunId}/complete`, {
      method: 'POST',
      body: request,
    });
  }

  /**
   * Upload an attachment
   */
  async uploadAttachment(
    testRunId: string,
    testResultId: string,
    name: string,
    contentType: string,
    data: Buffer
  ): Promise<{ url: string }> {
    this.log(`Uploading attachment: ${name} (${contentType})`);
    return this.request<{ url: string }>(
      `/test-runs/${testRunId}/results/${testResultId}/attachments`,
      {
        method: 'POST',
        body: {
          name,
          contentType,
          data: data.toString('base64'),
        },
      }
    );
  }

  /**
   * Make an HTTP request with retry logic
   */
  private async request<T>(
    path: string,
    options: {
      method: string;
      body?: unknown;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.log(`Retry attempt ${attempt + 1}/${this.maxRetries}`);
          await this.sleep(Math.min(1000 * Math.pow(2, attempt), 10000)); // Exponential backoff
        }

        return await this.makeRequest<T>(url, options);
      } catch (error) {
        lastError = error as Error;
        this.log(`Request failed (attempt ${attempt + 1}/${this.maxRetries}):`, error);

        // Don't retry on 4xx errors (client errors)
        if (error instanceof APIError && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Make a single HTTP request
   */
  private async makeRequest<T>(
    url: string,
    options: {
      method: string;
      body?: unknown;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const bodyData = options.body ? JSON.stringify(options.body) : undefined;

      const requestOptions: http.RequestOptions = {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'User-Agent': '@qastudio/playwright/1.0.0',
          ...(bodyData ? { 'Content-Length': Buffer.byteLength(bodyData) } : {}),
          ...options.headers,
        },
        timeout: this.timeout,
      };

      const req = httpModule.request(parsedUrl, requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const statusCode = res.statusCode || 0;

          if (statusCode >= 200 && statusCode < 300) {
            try {
              const parsed = data ? JSON.parse(data) : {};
              resolve(parsed as T);
            } catch (error) {
              reject(new Error(`Failed to parse response: ${error}`));
            }
          } else {
            reject(new APIError(statusCode, data || res.statusMessage || 'Request failed'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      });

      if (bodyData) {
        req.write(bodyData);
      }

      req.end();
    });
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.verbose) {
      console.log(`[QAStudio.dev Reporter] ${message}`, ...args);
    }
  }
}

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(`API Error ${statusCode}: ${message}`);
    this.name = 'APIError';
  }
}
