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

### ✅ Completed (Sep 2025)
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

3. **Test Structure**: Complete example ready for implementation
   - 9 markdown files with realistic ML conversation content
   - Canvas structure at `/Users/tomato/Documents/obsidian/development-canvas-context/`
   - Clear branching scenario to validate tree walking algorithm

4. **React UI with Base UI Components**: Modern settings interface
   - Fixed Layout component with proper React.FC typing
   - Integrated Base UI Switch components with state management
   - Resolved object rendering errors in React components
   - Added proper TypeScript interfaces and event handlers

5. **Release Workflow Enhancement**: Fully automated deployment
   - Configured semantic-release GitHub plugin for asset uploads
   - Automated upload of main.js, manifest.json, styles.css, versions.json
   - Removed manual asset upload steps from CI workflow
   - Enhanced version-bump.js to only update versions.json when needed

### 🎯 Next Implementation Steps
1. Advanced UI components with Base UI (Select, Input, Dialog)
2. Settings panel implementation with provider configuration
3. Enhanced LLM provider integration (multiple providers)
4. Context preview and debugging visualization

## Key Design Decisions
- **Local-first**: Start with Ollama/LMStudio for privacy
- **Minimal complexity**: Focus on core spatial context value
- **Standard roles only**: No invented LLM API properties
- **Plugin-level config**: Model selection in UI, not per-node