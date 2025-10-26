import { test, expect } from '@playwright/test';

/**
 * Example test file showing how to use QAStudio.dev reporter
 *
 * The reporter automatically captures test results and sends them to QAStudio.dev.
 * You can link tests to QAStudio.dev test cases using annotations.
 */

test.describe('Login Flow', () => {
  // Method 1: Use @testCaseId annotation to link to QAStudio.dev test case
  test('should login with valid credentials', async ({ page }) => {
    test.info().annotations.push({
      type: 'testCaseId',
      description: 'QA-123', // QAStudio.dev test case ID
    });

    await page.goto('/login');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  // Method 2: Include test case ID in the test title
  test('[QA-124] should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'invalid');
    await page.fill('#password', 'wrong');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
  });

  // Tests can also have tags for better organization
  test('should redirect to login when not authenticated', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'testCaseId', description: 'QA-125' },
        { type: 'tag', description: 'security' },
        { type: 'tag', description: 'authentication' }
      );

    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
  });

  test('[QA-126] should display user information', async ({ page }) => {
    await expect(page.locator('.user-name')).toContainText('Test User');
  });

  test('[QA-127] should allow logout', async ({ page }) => {
    test.info().annotations.push({ type: 'tag', description: 'critical' });

    await page.click('#logout-button');
    await expect(page).toHaveURL('/login');
  });
});

// Example of a test that will be marked as skipped
test.skip('[QA-128] Feature under development', async ({ page }) => {
  // This test will be reported as skipped to QAStudio.dev
});

// Example of a test with custom metadata
test('complex workflow with metadata', async ({ page }) => {
  test
    .info()
    .annotations.push(
      { type: 'testCaseId', description: 'QA-129' },
      { type: 'tag', description: 'e2e' },
      { type: 'priority', description: 'high' },
      { type: 'owner', description: 'qa-team' }
    );

  // Test implementation...
  await page.goto('/');
  await expect(page).toHaveTitle(/Home/);
});
