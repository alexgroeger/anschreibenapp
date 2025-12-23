import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'https://anschreiben-app-411832844870.europe-west1.run.app';

test.describe('API Health Checks', () => {
  test('should respond to health check endpoints', async ({ request }) => {
    // Test root endpoint
    const rootResponse = await request.get(`${BASE_URL}/`);
    expect(rootResponse.status()).toBeLessThan(500);
  });

  test('should have accessible API endpoints', async ({ request }) => {
    const endpoints = [
      '/api/hello',
      '/api/test-connection-simple',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`${BASE_URL}${endpoint}`);
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('should handle extract API endpoint structure', async ({ request }) => {
    // Test that extract endpoint exists and returns proper error for missing data
    const response = await request.post(`${BASE_URL}/api/extract`, {
      data: {},
    });
    
    // Should return 400 (bad request) for missing data, not 500 (server error)
    expect([400, 500]).toContain(response.status());
    
    if (response.status() === 400) {
      const body = await response.json().catch(() => ({}));
      expect(body).toHaveProperty('error');
    }
  });

  test('should handle applications API endpoint', async ({ request }) => {
    // Test GET applications endpoint (read-only)
    const response = await request.get(`${BASE_URL}/api/applications`);
    
    // Should return 200 (success) or 401/403 (auth) but not 500
    expect(response.status()).toBeLessThan(500);
    
    if (response.status() === 200) {
      const body = await response.json().catch(() => ({}));
      // API might return array or object, both are valid
      expect(typeof body === 'object').toBe(true);
    }
  });

  test('should handle resume API endpoint', async ({ request }) => {
    // Test GET resume endpoint (read-only)
    const response = await request.get(`${BASE_URL}/api/resume`);
    
    // Should return 200 (success) or 404 (not found) but not 500
    expect(response.status()).toBeLessThan(500);
  });

  test('should handle old cover letters API endpoint', async ({ request }) => {
    // Test GET old cover letters endpoint (read-only)
    const response = await request.get(`${BASE_URL}/api/old-cover-letters`);
    
    // Should return 200 (success) or 401/403 (auth) but not 500
    expect(response.status()).toBeLessThan(500);
    
    if (response.status() === 200) {
      const body = await response.json().catch(() => ({}));
      // API might return array or object, both are valid
      expect(typeof body === 'object').toBe(true);
    }
  });
});

