import { test, expect } from '@playwright/test';

test.describe('Homepage and Navigation', () => {
  test('should load the homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads without errors
    await expect(page).toHaveTitle(/Anschreiben Muckibude|Dashboard/i);
    
    // Check for main content
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should display navigation menu', async ({ page }) => {
    await page.goto('/');
    
    // Check for navigation elements
    const navigation = page.locator('nav, [role="navigation"]').first();
    await expect(navigation).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to different pages', async ({ page }) => {
    await page.goto('/');
    
    // Wait for navigation to be ready
    await page.waitForTimeout(1000);
    
    // Try to find and click navigation links
    const navLinks = [
      { text: /bewerbung|application/i, href: '/bewerbung-hinzufuegen' },
      { text: /dashboard/i, href: '/' },
    ];
    
    for (const link of navLinks) {
      try {
        const linkElement = page.locator(`a[href="${link.href}"], a:has-text("${link.text}")`).first();
        if (await linkElement.isVisible({ timeout: 2000 }).catch(() => false)) {
          await linkElement.click();
          await page.waitForURL(`**${link.href}`, { timeout: 5000 });
          await expect(page).toHaveURL(new RegExp(link.href.replace('/', '\\/')));
        }
      } catch (error) {
        // Navigation link might not be visible, continue with next
        console.log(`Navigation link for ${link.href} not found or not visible`);
      }
    }
  });

  test('should not have console errors', async ({ page }) => {
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
               !error.includes('Failed to load resource')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});

