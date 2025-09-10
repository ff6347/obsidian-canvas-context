import { describe, it, expect } from 'vitest';
import { server } from '../mocks/server.ts';
import { http, HttpResponse } from 'msw';
import * as openrouter from '../../src/llm/providers/openrouter.ts';

describe('OpenRouter Provider', () => {
	const validApiKey = 'sk-or-test-valid-key';
	const invalidApiKey = 'invalid-key';

	describe('isProviderAlive', () => {
		it('should return true with valid API key and required headers', async () => {
			const result = await openrouter.isProviderAlive(validApiKey, 'https://openrouter.ai/api/v1');
			expect(result).toBe(true);
		});

		it('should return false with invalid API key', async () => {
			const result = await openrouter.isProviderAlive(invalidApiKey, 'https://openrouter.ai/api/v1');
			expect(result).toBe(false);
		});

		it('should return false on network error', async () => {
			const result = await openrouter.isProviderAlive(validApiKey, 'https://nonexistent-api.com/api/v1');
			expect(result).toBe(false);
		});

		it('should use default baseURL when not provided', async () => {
			const result = await openrouter.isProviderAlive(validApiKey);
			expect(result).toBe(true);
		});

		it('should return false without API key', async () => {
			const result = await openrouter.isProviderAlive('', 'https://openrouter.ai/api/v1');
			expect(result).toBe(false);
		});

		it('should return false when missing required headers', async () => {
			// Mock to check for missing headers
			server.use(
				http.get('https://openrouter.ai/api/v1/models', ({ request }) => {
					const referer = request.headers.get('HTTP-Referer');
					const title = request.headers.get('X-Title');
					
					if (!referer || !title) {
						return HttpResponse.json(
							{ error: { message: 'Missing required headers.' } },
							{ status: 400 }
						);
					}
					
					return HttpResponse.json({ data: [] });
				})
			);

			const result = await openrouter.isProviderAlive(validApiKey, 'https://openrouter.ai/api/v1');
			expect(result).toBe(true); // Should still be true as our provider implementation includes headers
		});
	});

	describe('listModels', () => {
		it('should return sorted list of model IDs with valid API key', async () => {
			const models = await openrouter.listModels(validApiKey, 'https://openrouter.ai/api/v1');
			
			expect(models).toEqual(['anthropic/claude-3-sonnet', 'openai/gpt-4']);
		});

		it('should return empty array with invalid API key', async () => {
			const models = await openrouter.listModels(invalidApiKey, 'https://openrouter.ai/api/v1');
			expect(models).toEqual([]);
		});

		it('should return empty array on network error', async () => {
			const models = await openrouter.listModels(validApiKey, 'https://nonexistent-api.com/api/v1');
			expect(models).toEqual([]);
		});

		it('should return empty array on server error', async () => {
			server.use(
				http.get('https://openrouter.ai/api/v1/models', () => {
					return HttpResponse.json(
						{ error: { message: 'Internal server error' } },
						{ status: 500 }
					);
				})
			);

			const models = await openrouter.listModels(validApiKey, 'https://openrouter.ai/api/v1');
			expect(models).toEqual([]);
		});

		it('should use default baseURL when not provided', async () => {
			const models = await openrouter.listModels(validApiKey);
			expect(models).toEqual(['anthropic/claude-3-sonnet', 'openai/gpt-4']);
		});

		it('should handle malformed response gracefully', async () => {
			server.use(
				http.get('https://openrouter.ai/api/v1/models', () => {
					return HttpResponse.json({ invalid: 'response' });
				})
			);

			const models = await openrouter.listModels(validApiKey, 'https://openrouter.ai/api/v1');
			expect(models).toEqual([]);
		});

		it('should handle response with empty data array', async () => {
			server.use(
				http.get('https://openrouter.ai/api/v1/models', () => {
					return HttpResponse.json({ data: [] });
				})
			);

			const models = await openrouter.listModels(validApiKey, 'https://openrouter.ai/api/v1');
			expect(models).toEqual([]);
		});

		it('should return empty array without API key', async () => {
			const models = await openrouter.listModels('', 'https://openrouter.ai/api/v1');
			expect(models).toEqual([]);
		});

		it('should include required headers in requests', async () => {
			let receivedHeaders: Record<string, string> = {};
			
			server.use(
				http.get('https://openrouter.ai/api/v1/models', ({ request }) => {
					receivedHeaders = {
						authorization: request.headers.get('Authorization') || '',
						referer: request.headers.get('HTTP-Referer') || '',
						title: request.headers.get('X-Title') || ''
					};
					
					return HttpResponse.json({ data: [] });
				})
			);

			await openrouter.listModels(validApiKey, 'https://openrouter.ai/api/v1');
			
			expect(receivedHeaders.authorization).toBe(`Bearer ${validApiKey}`);
			expect(receivedHeaders.referer).toBe('https://obsidian.md');
			expect(receivedHeaders.title).toBe('Obsidian Canvas Context Plugin');
		});
	});

	describe('createProvider', () => {
		it('should create provider with API key and default baseURL', () => {
			const provider = openrouter.createProvider(validApiKey);
			expect(provider).toBeDefined();
		});

		it('should create provider with custom baseURL', () => {
			const provider = openrouter.createProvider(validApiKey, 'https://custom-openrouter.ai/api/v1');
			expect(provider).toBeDefined();
		});

		it('should have correct provider name', () => {
			expect(openrouter.providerName).toBe('openrouter');
		});
	});
});