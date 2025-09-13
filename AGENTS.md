# Claude Project Instructions

## Project Overview

This is an Obsidian plugin that transforms canvas into a spatial context-aware LLM interface. Canvas nodes become conversation elements and spatial relationships/connections define context flow.

## Build & Development

- `pnpm dev` - Development build with watch mode (using Rolldown)
- `pnpm build` - Production build (using Rolldown)
- `pnpm typecheck` - TypeScript compilation check (using tsc)
- `pnpm test` - Run unit tests with Vitest
- `pnpm format` - Run prettier on all source files
- `pnpm lint` - Run ESLint on all source files

## Code Style

- Uses TypeScript with strict settings
- Prettier configured with tabs, semicolons, double quotes
- Target: Obsidian plugin development
- Prefer arrow functions within classes
- Prefer `const` and `let`. `var` should not be used
- Prefer desctructuring when possible
- Use `async/await` for asynchronous code
- DO NOT ADD COMMENTS unless asked

## Agent Behavior Guidelines

- ALWAYS check if there are uncommit files before you start a new task. If so ask the user what to do!
- ALWAYS prefer editing existing files in the codebase
- NEVER write new files unless explicitly required
- NEVER proactively create documentation files (\*.md) or README files
- Only use emojis if the user explicitly requests it
- When making changes to files, first understand the file's code conventions
- Mimic code style, use existing libraries and utilities, and follow existing patterns
- Always follow security best practices - never introduce code that exposes or logs secrets
- Run `pnpm typecheck` after making significant code changes
- Run `pnpm test` after making significant code changes
- Run `pnpm lint` after making significant code changes
- Run `pnpm format` after making significant code changes
- remember to run `pnpm lint` `pnpm test` and `pnpm typecheck` and `pnpm format` after you did changes
