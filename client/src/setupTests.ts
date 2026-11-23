import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  // Each test starts with an empty tab: the app autosaves to sessionStorage.
  // Cleared after unmounting so no late update can save into the next test.
  if (typeof window !== 'undefined') window.sessionStorage.clear();
});
