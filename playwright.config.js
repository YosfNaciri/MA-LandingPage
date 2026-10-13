import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:4175', channel: 'chrome' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://confirmation-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'test-public-key', VITE_SUPABASE_ANON_KEY: 'test-public-key' },
  },
});
