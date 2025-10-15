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
- Mocking is a code smell. If you need to mock something, you are probably doing something wrong
- Write small unit tests that test only one thing. If you find yourself writing big tests that test multiple things, you are probably doing something wrong
- ALWAYS fail first and fast
- oxlint-disable should only be used in test files. You areon t allowed to add these linter directives
- types and interfaces should always be located in `src/types/`. Never export from where the function or class is located. Types that are local to a class or function can be in the head of that file. If you need to export them you also need to move them to the types folder
- Only ceate code that we actually need. Don't scaffold things we might need somewhere in the future or ask before doing so. Extendability is good but keep it simple

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
- run `pnpm knip` to check for unused code and exports. BE AWARE THAT THERE MIGHT BE FALSE POSITIVES.
- remember to run `pnpm lint` `pnpm test` and `pnpm typecheck` and `pnpm format` after you did changes
- Dont alter tests just to match the result. Investigate!

## Task Management with GitHub Issues

To manage our tasks throughout our sessions we need to write them down. Using PLAN.md for this is not optimal as it is does not allow for easy tracking of progress. Therefore we use the GitHub issues and the `gh` CLI to manage our tasks.

- ALWAYS break down large tasks into smaller, manageable subtasks
- ALWAYS use github issues to track tasks and subtasks
- Keep the issues as concise as possible
- You have access to the gh CLI to manage issues
- You can use the gh CLI to create, update, and close issues
- You can use the gh CLI to add comments to issues
- Use the labels feat, fix, chore, refactor, docs, test, ci, perf, style to categorize issues (derived from conventional commits). create new labels if necessary
- Use consistent naming conventions for issues. Review old issues for reference
- Use the assignee feature to assign me (ff6347) to these issues
- when you want to see only linter errors use the `--quiet` flag
