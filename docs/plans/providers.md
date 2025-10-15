# LLM Provider Architecture

## Overview

The plugin uses **Vercel's AI SDK** for unified LLM provider support, making it straightforward to add new providers with consistent interfaces.

## Current Provider Support

The plugin supports four LLM providers through the Vercel AI SDK:

### 1. Ollama Integration (`ollama-ai-provider-v2`)
- Local inference server
- Default: http://localhost:11434
- No API key required
- Best for: Privacy, offline work, custom models

### 2. LM Studio Support (`@ai-sdk/openai-compatible`)
- Local inference server
- Default: http://localhost:1234
- No API key required
- Best for: Privacy, offline work, OpenAI-compatible local models

### 3. OpenAI Integration (`@ai-sdk/openai`)
- Cloud service
- Requires API key authentication
- Default endpoint: https://api.openai.com
- Best for: Latest GPT models, reliable performance

### 4. OpenRouter Integration (`@openrouter/ai-sdk-provider`)
- Universal API gateway
- Requires API key authentication
- Default endpoint: https://openrouter.ai/api/v1
- Best for: Access to multiple providers with one API key

## Provider Interface Pattern

All providers in `src/llm/providers/` implement a consistent interface with:

- `providerName` constant for identification
- `createProvider()` function for SDK initialization
- `isProviderAlive()` health check function
- `listModels()` model enumeration function

## Adding New Providers

To add a new LLM provider:

1. **Install AI SDK package** for the provider
   ```bash
   pnpm add @ai-sdk/provider-name
   ```

2. **Create provider file** in `src/llm/providers/`
   ```typescript
   // src/llm/providers/new-provider.ts
   import { createProvider } from '@ai-sdk/provider-name';

   export const providerName = 'new-provider';

   export function createProviderInstance(config) {
     return createProvider({
       apiKey: config.apiKey,
       baseURL: config.baseURL,
     });
   }

   export async function isProviderAlive(baseURL) {
     // Health check implementation
   }

   export async function listModels(baseURL, apiKey?) {
     // Model listing implementation
   }
   ```

3. **Register provider** in `src/llm/providers/providers.ts` registry
   ```typescript
   import * as newProvider from './new-provider.ts';

   export const providers = {
     // ... existing providers
     'new-provider': {
       name: 'New Provider',
       requiresApiKey: true,
       defaultBaseURL: 'https://api.provider.com/v1',
       docs: 'https://docs.provider.com',
       implementation: newProvider,
     },
   };
   ```

4. **Update types** in `src/types/llm-types.ts`
   ```typescript
   export type CurrentProviderType =
     | 'ollama'
     | 'lmstudio'
     | 'openai'
     | 'openrouter'
     | 'new-provider';
   ```

5. **Update UI** by adding option to provider dropdown in settings
   - The dropdown automatically populates from the providers registry
   - No additional UI code needed

## Model Management

### Unified Interface
All providers use Vercel AI SDK's consistent API:
```typescript
const model = provider.chat(modelName);
const result = await generateText({
  model,
  messages,
  temperature,
});
```

### Model Discovery
- **Dynamic Listing**: `listModels()` function per provider
- **Alphabetical Sorting**: Models sorted for easy selection
- **Caching**: Model lists cached to reduce API calls
- **Error Handling**: Graceful fallbacks when listing fails

### Authentication Handling
- **Named API Keys**: Centralized key management
- **Reference Pattern**: Models reference keys by ID
- **Secure Storage**: Keys stored in plugin settings
- **Masking**: Consistent display format (••••••••pVqL)

### Health Checks
- **Provider Availability**: `isProviderAlive()` before use
- **Connection Testing**: Validate base URL and connectivity
- **Error Recovery**: Clear error messages with troubleshooting

### Configuration Storage
- **API Key Configuration**: ID, name, provider, key, description
- **Model Configuration**: ID, name, provider, model name, base URL, enabled state, API key reference
- **Settings Persistence**: Automatic save on changes
- **Backward Compatibility**: Legacy direct API keys supported

## OpenRouter Benefits

OpenRouter provides unique advantages as a universal API gateway:

- **Universal Model Access**: One API key for hundreds of models from leading providers (Anthropic, Google, Meta, Mistral, OpenAI, and more)
- **Cost-Effective**: Pay-as-you-go pricing with transparent per-token costs and no monthly fees
- **High Availability**: Enterprise-grade infrastructure with automatic failover
- **Latest Models**: Immediate access to new models as they're released
- **Simplified Integration**: Standardized API across all models with consistent interfaces

For users who want access to multiple model providers without managing separate API keys, OpenRouter is an excellent choice that complements the direct provider integrations.

## Provider Testing

All providers have comprehensive test coverage using Mock Service Worker (MSW):

### Test Coverage
- Happy path: Successful model listing, health checks
- Authentication: API key validation, header requirements
- Error scenarios: Server errors (500), unauthorized (401)
- Network failures: Timeouts, connection errors
- Malformed responses: Invalid JSON, missing fields

### Testing Infrastructure
- **MSW Setup**: `tests/msw/server.ts` for request interception
- **Mock Handlers**: Realistic API responses per provider
- **Test Isolation**: Clean state between tests
- **No Real Requests**: All tests run without external dependencies

## Provider Registry Structure

```typescript
export const providers: Record<string, ProviderConfig> = {
  providerKey: {
    name: string;              // Display name
    requiresApiKey: boolean;   // Whether API key is needed
    defaultBaseURL: string;    // Default endpoint
    docs: string;              // Documentation URL
    implementation: {          // Provider module
      providerName: string;
      createProvider: Function;
      isProviderAlive: Function;
      listModels: Function;
    };
  },
};
```

## API Key Resolution

Centralized resolution with backward compatibility:

```typescript
export function resolveApiKey(
  config: ModelConfiguration,
  settings: CanvasContextSettings,
): string | undefined {
  // Try named API key first
  if (config.apiKeyId) {
    const apiKey = settings.apiKeys.find(
      (k) => k.id === config.apiKeyId
    );
    return apiKey?.apiKey;
  }

  // Fall back to legacy direct API key
  return config.apiKey;
}
```

## Error Handling

Provider-specific error messages with troubleshooting guidance:

```typescript
export function getErrorTroubleshootingText(
  errorType?: string,
  provider?: string,
): string {
  if (!provider) return genericError;

  const providerConfig = providers[provider];
  if (!providerConfig) return genericError;

  return `Check ${providerConfig.docs} for setup instructions`;
}
```

## Future Enhancements

See [Issue #42](https://github.com/ff6347/obsidian-canvas-context/issues/42) for planned provider additions:
- Anthropic Claude
- Google Gemini
- Mistral AI
- Other community-requested providers
