// Vitest setup file for MSW integration
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server.ts';

// Start request interception before all tests
beforeAll(() => server.listen({ 
	// Don't warn about unhandled requests since we're intentionally testing network failures
	onUnhandledRequest: 'bypass' 
}));

// Reset handlers after each test so they don't affect other tests
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());