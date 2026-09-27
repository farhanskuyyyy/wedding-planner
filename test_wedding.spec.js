const { test, expect } = require('@playwright/test');

test('wedding planner loads without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  await page.goto('https://wedding.kreasifarhan.id/');
  await page.waitForTimeout(3000);
  
  // Check page title
  const title = await page.title();
  console.log('Title:', title);
  
  // Check if main content loaded
  const body = await page.textContent('body');
  console.log('Has content:', body.length > 100);
  
  // Check for errors
  if (errors.length > 0) {
    console.log('Errors found:', errors);
  }
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/wedding-test.png', fullPage: true });
  console.log('Screenshot saved');
  
  expect(errors.length).toBe(0);
});
