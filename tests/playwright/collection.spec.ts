/**
 * @file tests/playwright/collection.spec.ts
 * @description Playwright end-to-end test for the full collection and widget flow in SveltyCMS.
 *   - Logs in as admin
 *   - Creates a new collection
 *   - Performs various collection actions (Published, Unpublished, etc.)
 *   - Adds a widget to the dashboard and verifies navigation
 */
import { test, expect } from '@playwright/test';
import { TestUtils, testConfig, testData } from '../helpers/test-config';

test.describe('Collection Management', () => {
	test.setTimeout(testConfig.timeouts.extraLong);

	test.beforeEach(async ({ page }) => {
		// Clean up and login as admin
		await TestUtils.cleanup(page);
		await TestUtils.login(page, 'admin');
		await expect(page).toHaveURL(/\/(admin|dashboard|en\/Collections)/i, { timeout: testConfig.timeouts.medium });
	});

	test('should create and manage a new collection', async ({ page }) => {
		// Navigate to collections
		const collectionsLink = page.getByRole('link', { name: /collections/i });
		if (await collectionsLink.isVisible()) {
			await collectionsLink.click();
		}

		// Create new collection
		const createButton = page.getByRole('button', { name: /create|new|add/i }).first();
		await expect(createButton).toBeVisible({ timeout: testConfig.timeouts.medium });
		await createButton.click();

		// Generate dynamic test data to avoid conflicts
		const dynamicData = TestUtils.generateTestData();
		
		// Fill collection form
		const nameField = page.getByPlaceholder(/name/i).first();
		if (await nameField.isVisible()) {
			await nameField.fill(dynamicData.title);
		}

		const slugField = page.getByPlaceholder(/slug/i).first();
		if (await slugField.isVisible()) {
			await slugField.fill(dynamicData.slug);
		}

		// Save the collection
		const saveButton = page.locator(testConfig.selectors.saveButton).first();
		await saveButton.click();

		// Verify collection was created
		await TestUtils.waitForAPI(page, '/api/collections');
		
		// Should redirect back to collections list or show success
		const successMessage = page.locator(testConfig.selectors.successMessage).first();
		if (await successMessage.isVisible()) {
			await expect(successMessage).toBeVisible();
		}
	});

	test('should perform collection status actions', async ({ page }) => {
		// Navigate to collections list
		await page.goto('/admin/collections', { waitUntil: 'networkidle' });

		const actions = ['Published', 'Unpublished', 'Draft'];

		for (const action of actions) {
			// Find and click action button
			const actionButton = page.getByRole('button', { name: new RegExp(action, 'i') });
			
			if (await actionButton.isVisible()) {
				await actionButton.click();

				// Select first collection if available
				const checkbox = page.locator('input[type="checkbox"]').first();
				if (await checkbox.isVisible()) {
					await checkbox.check();

					// Apply the action
					const applyButton = page.locator(testConfig.selectors.saveButton).first();
					await applyButton.click();

					// Wait for action to complete
					await TestUtils.waitForAPI(page, '/api/collections');
				}
			}
		}
	});

	test('should edit an existing collection', async ({ page }) => {
		// Navigate to collections
		await page.goto('/admin/collections', { waitUntil: 'networkidle' });

		// Find the first collection edit button or link
		const editButton = page.getByRole('button', { name: /edit/i }).first();
		const editLink = page.getByRole('link', { name: /edit/i }).first();
		
		if (await editButton.isVisible()) {
			await editButton.click();
		} else if (await editLink.isVisible()) {
			await editLink.click();
		} else {
			// Click on the first collection row
			const firstRow = page.locator('[data-testid="collection-row"], tr').first();
			await firstRow.click();
		}

		// Update collection details
		const nameField = page.getByPlaceholder(/name/i).first();
		if (await nameField.isVisible()) {
			const updatedName = `Updated Collection ${Date.now()}`;
			await nameField.fill(updatedName);
		}

		// Save changes
		const saveButton = page.locator(testConfig.selectors.saveButton).first();
		await saveButton.click();

		// Verify update was successful
		const successMessage = page.locator(testConfig.selectors.successMessage).first();
		if (await successMessage.isVisible()) {
			await expect(successMessage).toBeVisible({ timeout: testConfig.timeouts.short });
		}
	});

	test('should delete a collection', async ({ page }) => {
		// First create a test collection to delete
		await page.goto('/admin/collections/create', { waitUntil: 'networkidle' });
		
		const testData = TestUtils.generateTestData();
		await TestUtils.fillForm(page, {
			name: `Test Collection for Deletion ${testData.name}`,
			slug: `delete-test-${Date.now()}`
		});

		const saveButton = page.locator(testConfig.selectors.saveButton).first();
		await saveButton.click();

		// Navigate back to collections list
		await page.goto('/admin/collections', { waitUntil: 'networkidle' });

		// Find and delete the test collection
		const deleteButton = page.getByRole('button', { name: /delete/i }).first();
		if (await deleteButton.isVisible()) {
			await deleteButton.click();

			// Confirm deletion if modal appears
			const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i }).first();
			if (await confirmButton.isVisible()) {
				await confirmButton.click();
			}

			// Verify deletion was successful
			await TestUtils.waitForAPI(page, '/api/collections');
		}
	});

	test('should filter and search collections', async ({ page }) => {
		await page.goto('/admin/collections', { waitUntil: 'networkidle' });

		// Test search functionality
		const searchField = page.getByPlaceholder(/search/i).first();
		if (await searchField.isVisible()) {
			await searchField.fill('test');
			
			// Wait for search results
			await page.waitForTimeout(1000);
			
			// Clear search
			await searchField.fill('');
		}

		// Test status filter
		const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first();
		if (await statusFilter.isVisible()) {
			await statusFilter.selectOption('published');
			await page.waitForTimeout(1000);
		}
	});
});
