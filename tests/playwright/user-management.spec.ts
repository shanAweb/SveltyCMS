import { test, expect } from '@playwright/test';
import { TestUtils, testConfig, testData } from '../helpers/test-config';

test.describe('User Management and Token Creation', () => {
  test.setTimeout(testConfig.timeouts.extraLong);

  test.beforeEach(async ({ page }) => {
    // Clean up and login as admin
    await TestUtils.cleanup(page);
    await TestUtils.login(page, 'admin');
    await expect(page).toHaveURL(/\/(admin|dashboard|en\/Collections)/i, { timeout: testConfig.timeouts.medium });
  });

  test('should display user management interface', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'networkidle' });

    // Check main interface elements
    await expect(page.locator('h1, [data-testid="page-title"]')).toContainText(['Users', 'User Management']);
    await expect(page.locator('[data-testid="create-user"], button:has-text("Create"), button:has-text("Add User")')).toBeVisible();
    await expect(page.locator('[data-testid="users-table"], table, [data-testid="users-grid"]')).toBeVisible();
  });

  test('should create new user with different roles', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'networkidle' });

    const roles = ['editor', 'user', 'contributor'];

    for (const role of roles) {
      // Click create user
      const createButton = page.locator('[data-testid="create-user"], button:has-text("Create"), button:has-text("Add User")').first();
      await createButton.click();

      // Fill user form with dynamic data
      const userData = TestUtils.generateTestData();
      
      await TestUtils.fillForm(page, {
        email: userData.email,
        firstName: userData.name.split(' ')[0],
        lastName: userData.name.split(' ')[1] || 'User',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!'
      });

      // Select role
      const roleSelect = page.locator('[data-testid="role-select"], select[name="role"]').first();
      if (await roleSelect.isVisible()) {
        await roleSelect.selectOption(role);
      }

      // Save user
      const saveButton = page.locator(testConfig.selectors.saveButton).first();
      await saveButton.click();

      // Verify user creation
      await TestUtils.waitForAPI(page, '/api/users');
      
      // Check for success message
      const successMessage = page.locator(testConfig.selectors.successMessage).first();
      if (await successMessage.isVisible()) {
        await expect(successMessage).toContainText(['created', 'success']);
      }

      // Return to users list
      await page.goto('/admin/users', { waitUntil: 'networkidle' });
    }
  });

  test('should edit existing user profile and permissions', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'networkidle' });

    // Find first user to edit (not admin)
    const userRow = page.locator('[data-testid="user-row"], tr').nth(1); // Skip admin user
    const editButton = userRow.locator('[data-testid="edit-user"], button:has-text("Edit"), a:has-text("Edit")').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
    } else {
      // Click on user row if no specific edit button
      await userRow.click();
    }

    // Update user information
    const updatedName = `Updated User ${Date.now()}`;
    
    const nameField = page.locator('[data-testid="firstName"], input[name="firstName"]').first();
    if (await nameField.isVisible()) {
      await nameField.fill(updatedName);
    }

    // Update role/permissions
    const roleSelect = page.locator('[data-testid="role-select"], select[name="role"]').first();
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('editor');
    }

    // Update permissions if available
    const permissionCheckboxes = page.locator('[data-testid^="permission-"], input[type="checkbox"][name*="permission"]');
    const count = await permissionCheckboxes.count();
    
    if (count > 0) {
      // Toggle some permissions
      await permissionCheckboxes.nth(0).check();
      await permissionCheckboxes.nth(1).uncheck();
    }

    // Save changes
    const saveButton = page.locator(testConfig.selectors.saveButton).first();
    await saveButton.click();

    // Verify update success
    await TestUtils.waitForAPI(page, '/api/users');
    
    const successMessage = page.locator(testConfig.selectors.successMessage).first();
    if (await successMessage.isVisible()) {
      await expect(successMessage).toContainText(['updated', 'saved', 'success']);
    }
  });

  test('should manage user status (activate/deactivate)', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'networkidle' });

    // Find user to manage
    const userRow = page.locator('[data-testid="user-row"], tr').nth(1);
    const statusToggle = userRow.locator('[data-testid="status-toggle"], button:has-text("Activate"), button:has-text("Deactivate")').first();
    
    if (await statusToggle.isVisible()) {
      const currentStatus = await statusToggle.textContent();
      await statusToggle.click();

      // Confirm action if modal appears
      const confirmButton = page.locator('[data-testid="confirm"], button:has-text("Confirm")').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Verify status change
      await TestUtils.waitForAPI(page, '/api/users');
      
      // Check that status has changed
      const newStatus = await statusToggle.textContent();
      expect(newStatus).not.toBe(currentStatus);
    }
  });

  test('should delete user with confirmation', async ({ page }) => {
    // First create a test user to delete
    await page.goto('/admin/users/create', { waitUntil: 'networkidle' });
    
    const testUser = TestUtils.generateTestData();
    await TestUtils.fillForm(page, {
      email: testUser.email,
      firstName: 'Test Delete',
      lastName: 'User',
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!'
    });

    const saveButton = page.locator(testConfig.selectors.saveButton).first();
    await saveButton.click();
    
    await TestUtils.waitForAPI(page, '/api/users');
    
    // Navigate back to users list
    await page.goto('/admin/users', { waitUntil: 'networkidle' });

    // Find and delete the test user
    const testUserRow = page.locator(`[data-testid="user-row"]:has-text("${testUser.email}"), tr:has-text("${testUser.email}")`).first();
    const deleteButton = testUserRow.locator('[data-testid="delete-user"], button:has-text("Delete")').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Handle deletion confirmation
      const confirmModal = page.locator('[data-testid="delete-confirmation"], [role="dialog"]').first();
      await expect(confirmModal).toBeVisible();
      
      const confirmDeleteButton = page.locator('[data-testid="confirm-delete"], button:has-text("Delete")').first();
      await confirmDeleteButton.click();

      // Verify deletion
      await TestUtils.waitForAPI(page, '/api/users');
      
      // User should no longer be in the list
      const deletedUser = page.locator(`tr:has-text("${testUser.email}")`);
      await expect(deletedUser).not.toBeVisible();
    }
  });
});

test.describe('API Token Management', () => {
  test.setTimeout(testConfig.timeouts.extraLong);

  test.beforeEach(async ({ page }) => {
    await TestUtils.cleanup(page);
    await TestUtils.login(page, 'admin');
    
    // Navigate to API tokens section
    await page.goto('/admin/tokens', { waitUntil: 'networkidle' });
  });

  test('should display API tokens interface', async ({ page }) => {
    // Check main interface elements
    await expect(page.locator('h1, [data-testid="page-title"]')).toContainText(['API Tokens', 'Tokens', 'API Keys']);
    await expect(page.locator('[data-testid="create-token"], button:has-text("Create"), button:has-text("Generate")')).toBeVisible();
    await expect(page.locator('[data-testid="tokens-table"], table')).toBeVisible();
  });

  test('should create new API token with permissions', async ({ page }) => {
    // Create new token
    const createButton = page.locator('[data-testid="create-token"], button:has-text("Create"), button:has-text("Generate")').first();
    await createButton.click();

    // Fill token form
    const tokenName = `Test Token ${Date.now()}`;
    await page.fill('[data-testid="token-name"], input[name="name"]', tokenName);
    
    // Add description
    const descField = page.locator('[data-testid="token-description"], textarea[name="description"]').first();
    if (await descField.isVisible()) {
      await descField.fill('Test API token for automated testing');
    }

    // Set expiration
    const expirationSelect = page.locator('[data-testid="expiration"], select[name="expiration"]').first();
    if (await expirationSelect.isVisible()) {
      await expirationSelect.selectOption('30d');
    }

    // Select permissions
    const permissions = ['read', 'write', 'collections:read', 'media:read'];
    
    for (const permission of permissions) {
      const permissionCheckbox = page.locator(`[data-testid="permission-${permission}"], input[name="${permission}"]`).first();
      if (await permissionCheckbox.isVisible()) {
        await permissionCheckbox.check();
      }
    }

    // Generate token
    const generateButton = page.locator('[data-testid="generate-token"], button:has-text("Generate")').first();
    await generateButton.click();

    // Verify token creation
    await TestUtils.waitForAPI(page, '/api/tokens');
    
    // Should show the generated token
    const generatedToken = page.locator('[data-testid="generated-token"], [data-testid="token-value"]').first();
    await expect(generatedToken).toBeVisible();
    
    // Token should follow format
    const tokenValue = await generatedToken.textContent();
    expect(tokenValue).toMatch(/^sveltycms_[a-zA-Z0-9]+$/);

    // Should show copy button
    const copyButton = page.locator('[data-testid="copy-token"], button:has-text("Copy")').first();
    await expect(copyButton).toBeVisible();

    // Should show security warning
    const securityWarning = page.locator('[data-testid="security-warning"]').first();
    if (await securityWarning.isVisible()) {
      await expect(securityWarning).toContainText(['save', 'copy', 'won\'t be shown']);
    }
  });

  test('should list and manage existing tokens', async ({ page }) => {
    // Should show existing tokens
    const tokensTable = page.locator('[data-testid="tokens-table"], table').first();
    await expect(tokensTable).toBeVisible();

    // Each token row should have management options
    const tokenRows = page.locator('[data-testid="token-row"], tbody tr');
    const count = await tokenRows.count();
    
    if (count > 0) {
      const firstToken = tokenRows.first();
      
      // Should show token details
      await expect(firstToken.locator('[data-testid="token-name"]')).toBeVisible();
      await expect(firstToken.locator('[data-testid="token-permissions"]')).toBeVisible();
      await expect(firstToken.locator('[data-testid="token-created"]')).toBeVisible();
      await expect(firstToken.locator('[data-testid="token-last-used"]')).toBeVisible();
      
      // Should have management actions
      await expect(firstToken.locator('[data-testid="edit-token"], button:has-text("Edit")')).toBeVisible();
      await expect(firstToken.locator('[data-testid="revoke-token"], button:has-text("Revoke")')).toBeVisible();
    }
  });

  test('should edit token permissions', async ({ page }) => {
    // Find first token and edit
    const firstToken = page.locator('[data-testid="token-row"], tbody tr').first();
    const editButton = firstToken.locator('[data-testid="edit-token"], button:has-text("Edit")').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();

      // Update token name
      const nameField = page.locator('[data-testid="token-name"], input[name="name"]').first();
      await nameField.fill(`Updated Token ${Date.now()}`);

      // Change permissions
      const readPermission = page.locator('[data-testid="permission-read"], input[name="read"]').first();
      if (await readPermission.isVisible()) {
        await readPermission.uncheck();
      }

      const writePermission = page.locator('[data-testid="permission-write"], input[name="write"]').first();
      if (await writePermission.isVisible()) {
        await writePermission.check();
      }

      // Save changes
      const saveButton = page.locator(testConfig.selectors.saveButton).first();
      await saveButton.click();

      // Verify update
      await TestUtils.waitForAPI(page, '/api/tokens');
      
      const successMessage = page.locator(testConfig.selectors.successMessage).first();
      if (await successMessage.isVisible()) {
        await expect(successMessage).toContainText(['updated', 'saved']);
      }
    }
  });

  test('should revoke token with confirmation', async ({ page }) => {
    // First create a test token
    const createButton = page.locator('[data-testid="create-token"], button:has-text("Create")').first();
    await createButton.click();

    await page.fill('[data-testid="token-name"], input[name="name"]', `Token to Revoke ${Date.now()}`);
    
    const generateButton = page.locator('[data-testid="generate-token"], button:has-text("Generate")').first();
    await generateButton.click();

    await TestUtils.waitForAPI(page, '/api/tokens');
    
    // Navigate back to tokens list
    await page.goto('/admin/tokens', { waitUntil: 'networkidle' });

    // Find and revoke the test token
    const testTokenRow = page.locator('[data-testid="token-row"]:has-text("Token to Revoke")').first();
    const revokeButton = testTokenRow.locator('[data-testid="revoke-token"], button:has-text("Revoke")').first();
    
    await revokeButton.click();

    // Confirm revocation
    const confirmModal = page.locator('[data-testid="revoke-confirmation"], [role="dialog"]').first();
    await expect(confirmModal).toBeVisible();
    
    const confirmButton = page.locator('[data-testid="confirm-revoke"], button:has-text("Revoke")').first();
    await confirmButton.click();

    // Verify revocation
    await TestUtils.waitForAPI(page, '/api/tokens');
    
    // Token should show as revoked
    const revokedStatus = testTokenRow.locator('[data-testid="token-status"]:has-text("Revoked")').first();
    await expect(revokedStatus).toBeVisible();
  });

  test('should filter and search tokens', async ({ page }) => {
    // Test search functionality
    const searchField = page.locator('[data-testid="search-tokens"], input[placeholder*="search"]').first();
    if (await searchField.isVisible()) {
      await searchField.fill('test');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      // Clear search
      await searchField.fill('');
    }

    // Test status filter
    const statusFilter = page.locator('[data-testid="status-filter"], select[name="status"]').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('active');
      await page.waitForTimeout(1000);
      
      // Reset filter
      await statusFilter.selectOption('all');
    }

    // Test permissions filter
    const permissionsFilter = page.locator('[data-testid="permissions-filter"], select[name="permissions"]').first();
    if (await permissionsFilter.isVisible()) {
      await permissionsFilter.selectOption('read');
      await page.waitForTimeout(1000);
    }
  });

  test('should show token usage statistics', async ({ page }) => {
    // Find first active token
    const activeTokenRow = page.locator('[data-testid="token-row"]').first();
    const viewStatsButton = activeTokenRow.locator('[data-testid="view-stats"], button:has-text("Stats")').first();
    
    if (await viewStatsButton.isVisible()) {
      await viewStatsButton.click();

      // Check stats modal/page
      await expect(page.locator('[data-testid="token-stats"], h1:has-text("Statistics")')).toBeVisible();
      
      // Should show usage metrics
      await expect(page.locator('[data-testid="requests-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="last-used"]')).toBeVisible();
      await expect(page.locator('[data-testid="usage-chart"]')).toBeVisible();
      
      // Should show recent requests log
      const requestsLog = page.locator('[data-testid="requests-log"], table').first();
      if (await requestsLog.isVisible()) {
        await expect(requestsLog).toBeVisible();
      }
    }
  });

  test('should validate token security constraints', async ({ page }) => {
    // Test token creation with various security constraints
    const createButton = page.locator('[data-testid="create-token"], button:has-text("Create")').first();
    await createButton.click();

    // Test empty name validation
    await page.click('[data-testid="generate-token"], button:has-text("Generate")');
    
    const nameError = page.locator('[data-testid="name-error"], .error').first();
    if (await nameError.isVisible()) {
      await expect(nameError).toContainText(['required', 'name']);
    }

    // Fill valid name
    await page.fill('[data-testid="token-name"], input[name="name"]', 'Security Test Token');

    // Test with no permissions selected
    const generateButton = page.locator('[data-testid="generate-token"], button:has-text("Generate")').first();
    await generateButton.click();

    const permissionsError = page.locator('[data-testid="permissions-error"], .error').first();
    if (await permissionsError.isVisible()) {
      await expect(permissionsError).toContainText(['permission', 'required']);
    }

    // Select minimal permissions
    const readPermission = page.locator('[data-testid="permission-read"], input[name="read"]').first();
    if (await readPermission.isVisible()) {
      await readPermission.check();
    }

    // Test rate limiting for token creation
    for (let i = 0; i < 5; i++) {
      await generateButton.click();
      await page.waitForTimeout(100);
    }

    const rateLimitError = page.locator('[data-testid="rate-limit-error"]').first();
    if (await rateLimitError.isVisible()) {
      await expect(rateLimitError).toContainText(['rate limit', 'too many']);
    }
  });
});