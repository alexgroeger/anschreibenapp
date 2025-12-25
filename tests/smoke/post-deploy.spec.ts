import { test, expect } from '@playwright/test';

test.describe('Post-Deployment Smoke Tests', () => {
  test('should load homepage after deployment', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that page loads without 500 errors
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
    
    // Check for main content
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should have all critical API endpoints accessible', async ({ request }) => {
    const baseURL = process.env.TEST_BASE_URL || 'https://anschreiben-app-411832844870.europe-west1.run.app';
    
    const criticalEndpoints = [
      '/api/hello',
      '/api/applications',
      '/api/resume',
    ];

    for (const endpoint of criticalEndpoints) {
      const response = await request.get(`${baseURL}${endpoint}`);
      // Should not return 500 (server error)
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('should not have critical console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(
      error => !error.includes('favicon') && 
               !error.includes('404') &&
               !error.includes('Failed to load resource') &&
               !error.includes('ChunkLoadError')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('should respond to health check', async ({ request }) => {
    const baseURL = process.env.TEST_BASE_URL || 'https://anschreiben-app-411832844870.europe-west1.run.app';
    
    const response = await request.get(`${baseURL}/api/test-connection-simple`);
    expect(response.status()).toBeLessThan(500);
  });
});


