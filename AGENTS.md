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

### ✅ Completed

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
   - **OpenRouter**: Universal API gateway via `@openrouter/ai-sdk-provider` with access to hundreds of models from Anthropic, Google, Meta, Mistral, and more
   - **Extensible Architecture**: Easy addition of new providers following established patterns
   - **Unified Interface**: Consistent provider pattern for createProvider, listModels, isProviderAlive
   - **Model Discovery**: Dynamic model listing with alphabetical sorting for all providers
   - **Authentication**: Secure API key storage and handling for cloud providers

4. **Advanced Model Configuration UI**: Complete settings interface
   - **Provider Selection**: Dropdown with Ollama, LM Studio, OpenAI, and OpenRouter options
   - **Dynamic Fields**: API key input appears only for providers that require authentication (OpenAI, OpenRouter)
   - **Model Discovery**: Real-time model listing from selected providers with alphabetical sorting
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

7. **Named API Key Management System**: Reusable API key infrastructure
   - **Centralized API Key Storage**: Named API keys with user-friendly names (e.g., "Personal OpenAI", "Work Account")
   - **Reference-Based System**: Model configurations reference API keys by ID instead of storing keys directly
   - **Backward Compatibility**: Legacy model configurations with embedded API keys continue to work
   - **CRUD Interface**: Complete create, read, update, delete functionality for API keys via dedicated modal
   - **Validation & Protection**: Prevents deletion of API keys in use by existing models
   - **Secure Display**: Consistent API key masking showing 8 masked characters + last 4 characters
   - **Provider Support**: Full integration with OpenAI and OpenRouter authentication

8. **Provider Documentation Links**: Direct access to model information
   - **Comprehensive Provider Docs**: Links to documentation for Ollama, LM Studio, OpenAI, and OpenRouter
   - **Model-Specific Pages**: Direct links to individual model documentation where available
   - **Contextual Integration**: Documentation buttons in both model creation and API key modals
   - **Centralized Management**: Provider documentation data managed in `/src/lib/provider-docs.ts`

9. **Enhanced Model Configuration UI**: Improved layout and usability
   - **Multi-line Layout**: Model configuration details displayed on separate lines for better readability
   - **Model Duplication**: One-click duplication of model configurations with intelligent naming
   - **Smart API Key Selection**: Dropdown for selecting named API keys with automatic text input disable
   - **Consistent Visual Design**: Standardized spacing and layout for all configuration elements
   - **DOM-Based Rendering**: Proper line breaks using direct DOM manipulation for Obsidian compatibility

### 🎯 Next Implementation Steps

1. **Additional Provider Support**: Add Anthropic Claude, Google Gemini, Mistral AI (Note: OpenRouter already provides access to these models)
2. **Enhanced UI Components**: Advanced Base UI components (Select, Input, Dialog)
3. **Context Preview**: Show users what context will be sent before inference
4. **Debugging Tools**: Context visualization and troubleshooting features
5. **Performance Optimization**: Caching, batch processing, large canvas handling

## Key Design Decisions

- **Multi-provider Architecture**: Support local (Ollama/LMStudio) and cloud (OpenAI/OpenRouter) providers
- **Vercel AI SDK**: Unified interface for all LLM providers
- **Secure Authentication**: API key storage with masking for cloud providers
- **Extensible Design**: Easy addition of new providers following standard pattern
- **Minimal complexity**: Focus on core spatial context value
- **Standard roles only**: No invented LLM API properties
- **Plugin-level config**: Model selection in UI, not per-node
- **Reference-based API Keys**: API keys stored separately and referenced by models for reusability
- **Backward Compatibility**: Legacy configurations continue working while new features are added
- **DOM-first UI**: Direct DOM manipulation for Obsidian compatibility instead of complex React components

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

   export async function listModels(
   	apiKey: string,
   	baseURL?: string,
   ): Promise<string[]> {
   	// Implement model discovery
   }

   export async function isProviderAlive(
   	apiKey: string,
   	baseURL?: string,
   ): Promise<boolean> {
   	// Implement health check
   }
   ```

4. **Register in providers.ts**: Add to providers registry
5. **Update types**: Add to `CurrentProviderType`
6. **Update UI**: Add to provider dropdown

This pattern ensures all providers work seamlessly with the existing UI and authentication system.

## OpenRouter Benefits

OpenRouter provides unique advantages as a universal API gateway:

- **Universal Model Access**: One API key for hundreds of models from leading providers (Anthropic, Google, Meta, Mistral, OpenAI, and more)
- **Cost-Effective**: Pay-as-you-go pricing with transparent per-token costs and no monthly fees
- **High Availability**: Enterprise-grade infrastructure with automatic failover
- **Latest Models**: Immediate access to new models as they're released
- **Simplified Integration**: Standardized API across all models with consistent interfaces

For users who want access to multiple model providers without managing separate API keys, OpenRouter is an excellent choice that complements the direct provider integrations.

## Implementation Patterns & Lessons Learned

### API Key Management
- **Reference Pattern**: Use ID-based references instead of embedding sensitive data directly
- **Validation Strategy**: Check dependencies before allowing deletions to maintain data integrity
- **Migration Approach**: Support both old and new patterns simultaneously during transitions
- **Security Best Practices**: Consistent masking patterns for displaying sensitive information

### Obsidian UI Development
- **DOM Manipulation**: Direct DOM APIs work better than React for Obsidian's modal system
- **Line Breaks**: Use `descEl.createDiv()` instead of string concatenation with `\n` for proper line breaks
- **TypeScript Strict Mode**: Use `delete` operator instead of assigning `undefined` for optional properties
- **State Management**: Store UI references as class properties when they need to persist across events

### User Experience Patterns
- **Progressive Enhancement**: Add advanced features while keeping simple alternatives
- **Contextual Help**: Place documentation links directly in relevant UI sections
- **Visual Consistency**: Standardize spacing, sizing, and layout across all configuration elements
- **Error Prevention**: Disable conflicting options instead of showing error messages after submission
