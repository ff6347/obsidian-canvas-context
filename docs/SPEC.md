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


**Enhancement Backlog:**

- [Issue #42](https://github.com/ff6347/obsidian-canvas-context/issues/42) - Additional provider support (Claude, Gemini, Mistral)
- [Issue #43](https://github.com/ff6347/obsidian-canvas-context/issues/43) - Enhanced UI components
- [Issue #44](https://github.com/ff6347/obsidian-canvas-context/issues/44) - Context preview before inference
- [Issue #45](https://github.com/ff6347/obsidian-canvas-context/issues/45) - Context debugging tools
- [Issue #46](https://github.com/ff6347/obsidian-canvas-context/issues/46) - Performance optimization
- [Issue #48](https://github.com/ff6347/obsidian-canvas-context/issues/48) - Visual node styling by role
- [Issue #49](https://github.com/ff6347/obsidian-canvas-context/issues/49) - Advanced workflow features

## Feature Status

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

## Historical Reference

For detailed development history, see [docs/journals/](docs/journals/) for session-by-session notes.

Original PLAN.md with full milestone history backed up to `PLAN.md.backup`.
