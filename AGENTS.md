# Claude Project Instructions

## Project Overview

This is an Obsidian plugin that transforms canvas into a spatial context-aware LLM interface. Canvas nodes become conversation elements and spatial relationships define context flow.

## Build & Development

- `pnpm dev` - Development build with watch mode (using Rolldown)
- `pnpm build` - Production build (using Rolldown)
- `pnpm typecheck` - TypeScript compilation check: `npx tsc --noEmit`

### Build System

- **Migrated from esbuild to Rolldown** (January 2025)
- Native TypeScript support without Babel transpilation
- Uses `builtin-modules` package for Node.js externals
- TypeScript config enables `allowImportingTsExtensions` for .ts/.tsx imports

## Code Style

- Uses TypeScript with strict settings
- Prettier configured with tabs, semicolons, double quotes
- Target: Obsidian plugin development

## Current Progress

### ✅ Completed (Sep 2025 - Jan 2025)

1. **Canvas Tree Walking Algorithm**: Defined simplified rules
   - Walk UP parent chain (main conversation thread)
   - Include horizontal context from all nodes in parent chain
   - Exclude sibling conversation branches
   - No complex left/right distinctions

2. **Frontmatter Properties**: Simplified to essentials only
   - `role: system | user | assistant` (maps to LLM completion APIs)
   - `tags: ["context"]` for basic organization
   - Model/temperature selection in plugin UI (not per-node)
   - Removed all over-engineered properties

3. **Multi-Provider LLM Integration**: Complete provider architecture with Vercel AI SDK
   - **Ollama**: Local inference via `ollama-ai-provider-v2`
   - **LM Studio**: OpenAI-compatible API via `@ai-sdk/openai-compatible`
   - **OpenAI**: Cloud inference with API key authentication via `@ai-sdk/openai`
   - **Extensible Architecture**: Easy addition of new providers (Anthropic, Google, etc.)
   - **Unified Interface**: Consistent provider pattern for createProvider, listModels, isProviderAlive
   - **Model Discovery**: Dynamic model listing with alphabetical sorting for all providers
   - **Authentication**: Secure API key storage and handling for cloud providers

4. **Advanced Model Configuration UI**: Complete settings interface
   - **Provider Selection**: Dropdown with Ollama, LM Studio, OpenAI options
   - **Dynamic Fields**: API key input appears only for providers that require authentication
   - **Model Discovery**: Real-time model listing from selected providers
   - **Connection Testing**: Verify provider availability and authentication
   - **Configuration Management**: Add, edit, delete, enable/disable model configurations
   - **Secure Display**: API key masking in settings (shows only last 4 characters)

5. **React UI with Base UI Components**: Modern settings interface
   - Fixed Layout component with proper React.FC typing
   - Integrated Base UI Switch components with state management
   - Resolved object rendering errors in React components
   - Added proper TypeScript interfaces and event handlers

6. **Release Workflow Enhancement**: Fully automated deployment
   - Configured semantic-release GitHub plugin for asset uploads
   - Automated upload of main.js, manifest.json, styles.css, versions.json
   - Removed manual asset upload steps from CI workflow
   - Enhanced version-bump.js to only update versions.json when needed

### 🎯 Next Implementation Steps

1. **Additional Provider Support**: Add Anthropic Claude, Google Gemini, Mistral AI
2. **Enhanced UI Components**: Advanced Base UI components (Select, Input, Dialog)
3. **Context Preview**: Show users what context will be sent before inference
4. **Debugging Tools**: Context visualization and troubleshooting features
5. **Performance Optimization**: Caching, batch processing, large canvas handling

## Key Design Decisions

- **Multi-provider Architecture**: Support local (Ollama/LMStudio) and cloud (OpenAI/Anthropic) providers
- **Vercel AI SDK**: Unified interface for all LLM providers
- **Secure Authentication**: API key storage with masking for cloud providers
- **Extensible Design**: Easy addition of new providers following standard pattern
- **Minimal complexity**: Focus on core spatial context value
- **Standard roles only**: No invented LLM API properties
- **Plugin-level config**: Model selection in UI, not per-node

## Adding New Providers

To add a new LLM provider (example: Anthropic Claude):

1. **Install dependency**: `pnpm add @ai-sdk/anthropic`
2. **Create provider file**: `src/llm/providers/anthropic.ts`
3. **Follow standard pattern**:
   ```typescript
   import { createAnthropic } from "@ai-sdk/anthropic";
   
   export const providerName = "anthropic" as const;
   
   export function createProvider(apiKey: string, baseURL?: string) {
     return createAnthropic({ apiKey, baseURL });
   }
   
   export async function listModels(apiKey: string, baseURL?: string): Promise<string[]> {
     // Implement model discovery
   }
   
   export async function isProviderAlive(apiKey: string, baseURL?: string): Promise<boolean> {
     // Implement health check
   }
   ```
4. **Register in providers.ts**: Add to providers registry
5. **Update types**: Add to `CurrentProviderType`
6. **Update UI**: Add to provider dropdown

This pattern ensures all providers work seamlessly with the existing UI and authentication system.
