# Claude Project Instructions

## Project Overview

This is an Obsidian plugin that transforms canvas into a spatial context-aware LLM interface. Canvas nodes become conversation elements and spatial relationships define context flow.

## Build & Development

- `pnpm dev` - Development build with watch mode (using Rolldown)
- `pnpm build` - Production build (using Rolldown)
- `pnpm typecheck` - TypeScript compilation check: `npx tsc --noEmit`
- `pnpm test` - Run unit tests with Vitest
- `pnpm format` - Run prettier on all source files

## Code Style

- Uses TypeScript with strict settings
- Prettier configured with tabs, semicolons, double quotes
- Target: Obsidian plugin development
- DO NOT ADD COMMENTS unless asked

## Agent Behavior Guidelines

- ALWAYS prefer editing existing files in the codebase
- NEVER write new files unless explicitly required
- NEVER proactively create documentation files (\*.md) or README files
- Only use emojis if the user explicitly requests it
- When making changes to files, first understand the file's code conventions
- Mimic code style, use existing libraries and utilities, and follow existing patterns
- Always follow security best practices - never introduce code that exposes or logs secrets
- Run `pnpm typecheck` after making significant code changes
- Run `pnpm test` after making significant code changes
