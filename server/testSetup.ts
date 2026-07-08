import { teardown } from "./testCleanup";

/**
 * Vitest globalSetup: runs once before all test files.
 * The teardown function runs once after all tests complete.
 * It cleans all business data created by tests, keeping only admin users.
 */
export async function setup() {
  // No pre-test setup needed - tests create their own data
  return teardown;
}
