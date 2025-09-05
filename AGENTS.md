# Claude Project Instructions

## Project Overview
This is an Obsidian plugin that transforms canvas into a spatial context-aware LLM interface. Canvas nodes become conversation elements and spatial relationships define context flow.

## Build & Development
- `pnpm dev` - Development build with watch mode
- `pnpm build` - Production build
- TypeScript compilation: `npx tsc --noEmit`

## Code Style
- Uses TypeScript with strict settings
- Prettier configured with tabs, semicolons, double quotes
- Target: Obsidian plugin development

## Current Progress

### ✅ Completed (Dec 2024)
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

### 🎯 Next Implementation Steps
1. Canvas JSON parser for .canvas files
2. Tree walking algorithm implementation
3. Basic Obsidian plugin structure (context menu, settings)
4. Ollama local LLM integration

## Key Design Decisions
- **Local-first**: Start with Ollama/LMStudio for privacy
- **Minimal complexity**: Focus on core spatial context value
- **Standard roles only**: No invented LLM API properties
- **Plugin-level config**: Model selection in UI, not per-node