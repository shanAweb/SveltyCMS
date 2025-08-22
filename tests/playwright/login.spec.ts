/**
 * @file tests/playwright/login.spec.ts
 * @description Playwright end-to-end test for the login and logout flow in SveltyCMS.
 *   - Navigates to the login page
 *   - Performs login with admin credentials
 *   - Verifies successful navigation to the admin area
 *   - Logs out and checks redirect to login page
 */
import { test, expect } from '@playwright/test';
import { TestUtils, testConfig } from '../helpers/test-config';

test.describe('Authentication Flow', () => {
	test.beforeEach(async ({ page }) => {
		// Clean up any existing session data
		await TestUtils.cleanup(page);
		
		// Navigate to login page using baseURL from config
		const response = await page.goto('/login', { 
			waitUntil: 'domcontentloaded',
			timeout: testConfig.timeouts.extraLong 
		});
		
		// Check if we got a successful response
		if (response && response.status() !== 200) {
			const responseText = await response.text();
			console.log(`Server Error Details: ${response.status()} - ${response.statusText()}`);
			console.log(`Response body: ${responseText}`);
			throw new Error(`Server returned ${response.status()}: ${response.statusText()}. Response: ${responseText}`);
		}
	});

	test('should login with valid credentials as admin', async ({ page }) => {
		test.setTimeout(testConfig.timeouts.extraLong);

		await page.waitForLoadState('networkidle');
		
		// Use the unified selectors and credentials from test config
		const emailInput = page.locator(testConfig.selectors.email).first();
		const passwordInput = page.locator(testConfig.selectors.password).first();
		const loginButton = page.locator(testConfig.selectors.loginButton).first();

		await expect(emailInput).toBeVisible({ timeout: testConfig.timeouts.long });

		// Fill login form fields with admin credentials
		await emailInput.fill(testConfig.users.admin.email);
		await passwordInput.fill(testConfig.users.admin.password);

		// Submit the form
		await loginButton.click();

		// Assert successful login (more flexible URL matching)
		await expect(page).toHaveURL(/\/(admin|dashboard|en\/Collections)/i, { timeout: testConfig.timeouts.medium });
		
		// Verify we're logged in by checking for user menu or dashboard elements
		const userIndicator = page.locator(testConfig.selectors.userMenu).first();
		await expect(userIndicator).toBeVisible({ timeout: testConfig.timeouts.long });
	});

	test('should login with different user roles', async ({ page }) => {
		test.setTimeout(testConfig.timeouts.extraLong);

		const userTypes = ['admin', 'editor', 'user'] as const;
		
		for (const userType of userTypes) {
			// Clean up between user tests
			await TestUtils.cleanup(page);
			await page.goto('/login');
			
			await TestUtils.login(page, userType);
			
			// Verify login was successful
			await expect(page).toHaveURL(/\/(admin|dashboard|en\/Collections)/i, { timeout: testConfig.timeouts.medium });
			
			// Logout for next iteration
			await TestUtils.logout(page);
		}
	});

	test('should logout successfully', async ({ page }) => {
		test.setTimeout(testConfig.timeouts.extraLong);

		// First login using utility
		await TestUtils.login(page, 'admin');
		
		await expect(page).toHaveURL(/\/(admin|dashboard|en\/Collections)/i, { timeout: testConfig.timeouts.medium });

		// Use the utility function for logout
		await TestUtils.logout(page);

		// Verify we're logged out and redirected
		await expect(page).toHaveURL(/\/login/, { timeout: testConfig.timeouts.medium });
		
		// Verify login form is visible
		const loginForm = page.locator(testConfig.selectors.email).first();
		await expect(loginForm).toBeVisible();
	});

	test('should show error for invalid credentials', async ({ page }) => {
		test.setTimeout(testConfig.timeouts.medium);

		await page.fill(testConfig.selectors.email, 'invalid@example.com');
		await page.fill(testConfig.selectors.password, 'wrongpassword');
		await page.click(testConfig.selectors.loginButton);

		// Should show error message
		const errorMessage = page.locator(testConfig.selectors.errorMessage).first();
		await expect(errorMessage).toBeVisible({ timeout: testConfig.timeouts.short });
		
		// Should remain on login page
		await expect(page).toHaveURL(/\/login/);
	});

	test('should validate required fields', async ({ page }) => {
		test.setTimeout(testConfig.timeouts.medium);

		// Try to submit without filling fields
		await page.click(testConfig.selectors.loginButton);

		// Should show validation errors or stay on login page
		await expect(page).toHaveURL(/\/login/);
		
		// Fill only email, leave password empty
		await page.fill(testConfig.selectors.email, testConfig.users.admin.email);
		await page.click(testConfig.selectors.loginButton);
		
		// Should still be on login page
		await expect(page).toHaveURL(/\/login/);
	});

	test('should handle session persistence', async ({ page }) => {
		test.setTimeout(testConfig.timeouts.extraLong);

		// Login
		await TestUtils.login(page, 'admin');
		await expect(page).toHaveURL(/\/(admin|dashboard|en\/Collections)/i, { timeout: testConfig.timeouts.medium });

		// Refresh the page
		await page.reload();

		// Should still be logged in (if session persistence is implemented)
		await expect(page).not.toHaveURL(/\/login/, { timeout: testConfig.timeouts.short });
	});
});
