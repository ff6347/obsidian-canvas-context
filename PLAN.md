# Obsidian Canvas Context Plugin

## Project Overview

Transform Obsidian's canvas into a spatial context-aware LLM interface where canvas nodes become conversation elements and spatial relationships define context flow.

### Core Vision

- **Spatial Context Building**: Use canvas node positioning and connections to build rich LLM context
- **Local-First LLM Integration**: Start with Ollama/LMStudio for privacy and speed
- **Minimal UI Disruption**: Enhance existing canvas workflow rather than replacing it
- **Frontmatter-Driven Configuration**: Use markdown frontmatter for fine-grained control

## Quick Links

### Planning Documents

- **[Architecture](docs/plans/architecture.md)** - Service architecture, design patterns, lessons learned
- **[Canvas Algorithm](docs/plans/canvas-algorithm.md)** - Tree walking algorithm, frontmatter system, context building
- **[Providers](docs/plans/providers.md)** - LLM provider integration, adding new providers
- **[Testing Strategy](docs/plans/testing-strategy.md)** - Layered architecture, reducing mock dependencies

### Development

- **[Journals](docs/journals/)** - Session notes and insights
- **[GitHub Issues](https://github.com/ff6347/obsidian-canvas-context/issues)** - Current work tracking
- **[HANDOFF.md](HANDOFF.md)** - Session handoff notes

## Current Status

### Project Health

- **Core Functionality**: ✅ Complete and stable
- **Service Architecture**: ✅ Fully refactored and tested
- **Testing Infrastructure**: ✅ Comprehensive framework established
- **Multi-Provider Support**: ✅ Four providers integrated (Ollama, LM Studio, OpenAI, OpenRouter)
- **Test Coverage**: 305 tests passing, ~2 second execution

### Recent Work

See [docs/journals/](docs/journals/) for detailed session notes.

Latest: **2025-10-15** - Completed Issue #66 (CanvasService UINotificationAdapter integration)

### Active Development

All work tracked in [GitHub Issues](https://github.com/ff6347/obsidian-canvas-context/issues):

**Refactoring in Progress:**
- [Issue #67](https://github.com/ff6347/obsidian-canvas-context/issues/67) - Replace remaining direct Notice usage

**Enhancement Backlog:**
- [Issue #42](https://github.com/ff6347/obsidian-canvas-context/issues/42) - Additional provider support (Claude, Gemini, Mistral)
- [Issue #43](https://github.com/ff6347/obsidian-canvas-context/issues/43) - Enhanced UI components
- [Issue #44](https://github.com/ff6347/obsidian-canvas-context/issues/44) - Context preview before inference
- [Issue #45](https://github.com/ff6347/obsidian-canvas-context/issues/45) - Context debugging tools
- [Issue #46](https://github.com/ff6347/obsidian-canvas-context/issues/46) - Performance optimization
- [Issue #48](https://github.com/ff6347/obsidian-canvas-context/issues/48) - Visual node styling by role
- [Issue #49](https://github.com/ff6347/obsidian-canvas-context/issues/49) - Advanced workflow features

## File Structure

```
src/
├── main.ts                    # Plugin entry point (399 lines, refactored)
├── canvas/
│   ├── walker.ts              # Tree walking algorithm
│   └── nodes-actions.ts       # Canvas node actions and context menu
├── lib/                       # Pure business logic (fast tests)
│   ├── canvas-logic.ts        # Node positioning, edge creation (35 tests, 5ms)
│   ├── inference-logic.ts     # Model config, validation (25 tests, 6ms)
│   ├── menu-logic.ts          # Selection validation (20 tests, 4ms)
│   ├── api-key-logic.ts       # API key validation (17 tests, 4ms)
│   ├── constants.ts           # Plugin constants
│   └── settings-utils.ts      # Settings utilities (24 tests)
├── llm/
│   ├── llm.ts                 # Main LLM inference logic
│   └── providers/             # Provider implementations
│       ├── providers.ts       # Provider registry
│       ├── ollama.ts          # Ollama provider
│       ├── lmstudio.ts        # LM Studio provider
│       ├── openai.ts          # OpenAI provider
│       └── openrouter.ts      # OpenRouter provider
├── services/                  # Service layer (orchestration)
│   ├── inference-service.ts   # LLM operations (118 lines)
│   ├── canvas-service.ts      # Canvas operations (232 lines)
│   ├── menu-service.ts        # Menu management (147 lines)
│   └── status-service.ts      # Status bar (18 lines)
├── adapters/                  # Platform integration
│   └── obsidian-ui-notifications.ts  # UI notification adapter
├── types/
│   ├── canvas-types.ts        # Canvas-related types
│   ├── llm-types.ts           # LLM and provider types
│   ├── adapter-types.ts       # Adapter interfaces
│   └── settings-types.ts      # Settings types
└── ui/
    ├── settings.ts            # Settings panel
    ├── add-model-modal.ts     # Model configuration modal
    ├── api-key-modal.ts       # API key management modal
    ├── layout.tsx             # React layout component
    ├── view.tsx               # Main plugin view
    └── components/
        └── react-view.tsx     # React component wrapper

tests/
├── unit/                      # Pure logic tests (no mocks, ~5ms each)
├── services/                  # Service orchestration tests
├── providers/                 # Provider tests (MSW)
├── canvas/                    # Canvas walker tests
├── mocks/                     # Test utilities
│   ├── factories.ts           # Test data generation
│   └── obsidian-extended.ts  # Obsidian API mocks
└── adapters/                  # Test adapters
    └── test-notification-adapter.ts
```

## Build & Development

```bash
pnpm dev         # Development build with watch mode (Rolldown)
pnpm build       # Production build
pnpm typecheck   # TypeScript compilation check
pnpm test        # Run unit tests (305 tests, ~2s)
pnpm format      # Run prettier
pnpm lint        # Run ESLint
pnpm knip        # Check for unused code
```

### Build System

- **Rolldown**: Native TypeScript support, fast builds
- **Semantic Release**: Automated versioning and publishing
- **GitHub Actions**: CI/CD pipeline with automatic releases

## MVP Feature Set

### Core Features ✅

- ✅ Canvas tree walking (parent chain + horizontal context)
- ✅ Frontmatter properties (role, tags)
- ✅ Multi-provider LLM integration (4 providers)
- ✅ Right-click "Send to LLM" functionality
- ✅ Canvas selection toolbar integration
- ✅ Response node creation and positioning
- ✅ API key authentication and secure storage
- ✅ Error handling and user feedback

### Enhanced Features

- ✅ Multi-provider support (Ollama, LM Studio, OpenAI, OpenRouter)
- ✅ Settings panel with model configuration UI
- ✅ API key authentication for cloud providers
- ✅ Model listing and validation
- 🔗 Visual node styling by role → [Issue #48](https://github.com/ff6347/obsidian-canvas-context/issues/48)
- 🔗 Context preview before sending → [Issue #44](https://github.com/ff6347/obsidian-canvas-context/issues/44)

### Advanced Features (Future)

- 🔗 Enhanced UI components → [Issue #43](https://github.com/ff6347/obsidian-canvas-context/issues/43)
- 🔗 Additional providers → [Issue #42](https://github.com/ff6347/obsidian-canvas-context/issues/42)
- 🔗 Context debugging → [Issue #45](https://github.com/ff6347/obsidian-canvas-context/issues/45)
- 🔗 Performance optimization → [Issue #46](https://github.com/ff6347/obsidian-canvas-context/issues/46)
- 🔗 Advanced workflows → [Issue #49](https://github.com/ff6347/obsidian-canvas-context/issues/49)

## Success Metrics

### Technical Performance

- ✅ Canvas parsing: < 100ms for 100+ nodes
- ✅ Context building: < 50ms for complex graphs
- ✅ Test execution: < 2 seconds for 305 tests
- ✅ Memory usage: < 50MB additional overhead

### Code Quality

- ✅ Service-based architecture with clear boundaries
- ✅ Layered architecture (Core → Adapter → Service)
- ✅ 100x faster tests for pure business logic (5ms vs 400ms)
- ✅ Comprehensive test coverage (305 tests)
- ✅ Type-safe codebase (strict TypeScript)

### User Experience

- ✅ Setup time: < 5 minutes from install to first use
- ✅ Intuitive for existing canvas users
- ✅ Graceful error handling with clear messages
- ✅ Seamless Obsidian integration

## Historical Reference

The original detailed PLAN.md with full development history (31+ milestones) has been backed up to `PLAN.md.backup` for reference.

For recent work, see [docs/journals/](docs/journals/) for session-by-session notes.
