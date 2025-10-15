# Service Architecture

## Design Pattern: Service-Based Delegation

The codebase follows a service-based architecture where the main plugin class (`CanvasContextPlugin`) delegates specific responsibilities to focused service classes. This pattern reduces complexity and improves maintainability.

## Core Services

### 1. InferenceService (`src/services/inference-service.ts`)

- **Responsibility**: LLM operations and error management
- **Key Features**:
  - Executes inference with model configuration
  - Tracks recent errors with timestamps
  - Provides provider-specific troubleshooting guidance
  - Manages loading status coordination
- **Dependencies**: App instance, settings accessor, UI callbacks

### 2. CanvasService (`src/services/canvas-service.ts`)

- **Responsibility**: Canvas operations and node management
- **Key Features**:
  - Canvas discovery and file operations
  - Inference context capturing and preservation
  - Response node creation with proper positioning
  - Canvas file opening and persistence
  - Error handling via UINotificationAdapter
- **Dependencies**: App instance, UINotificationAdapter

### 3. MenuService (`src/services/menu-service.ts`)

- **Responsibility**: Canvas menu management and UI integration
- **Key Features**:
  - Selection menu building for canvas toolbar
  - Mutation observer setup for menu changes
  - Canvas button injection for inference triggers
  - Proper cleanup of DOM observers
- **Dependencies**: Inference callback function, UINotificationAdapter

### 4. StatusService (`src/services/status-service.ts`)

- **Responsibility**: Status bar management
- **Key Features**:
  - Loading status display with custom text
  - Status bar element manipulation
  - Simple show/hide operations
- **Dependencies**: Status bar element reference

## Architecture Benefits

- **Separation of Concerns**: Each service handles one specific domain
- **Reduced Complexity**: Main plugin class reduced from 936 to 399 lines (57% reduction)
- **Improved Testability**: Services can be tested independently
- **Better Maintainability**: Changes isolated to specific service boundaries
- **Minimal Coupling**: Services use dependency injection rather than tight coupling

## Service Initialization Pattern

```typescript
export default class CanvasContextPlugin extends Plugin {
	private inferenceService!: InferenceService;
	private canvasService!: CanvasService;
	private menuService!: MenuService;
	private statusService!: StatusService;
	private notificationAdapter!: ObsidianNotificationAdapter;

	override async onload() {
		// Initialize adapters first
		this.notificationAdapter = new ObsidianNotificationAdapter();

		// Initialize services with dependency injection
		this.canvasService = new CanvasService(this.app, this.notificationAdapter);
		this.statusService = new StatusService(this.addStatusBarItem());
		this.inferenceService = new InferenceService(
			this.app,
			() => this.settings,
			(text) => this.statusService.showLoadingStatus(text),
			() => this.statusService.hideLoadingStatus(),
		);
		this.menuService = new MenuService(
			(nodeId, canvas) => this.runInference(nodeId, canvas),
			this.notificationAdapter,
		);
	}
}
```

## Service Communication

- **Event-Driven**: Services communicate through callbacks and events
- **Unidirectional Flow**: Main plugin coordinates, services execute
- **Shared State**: Settings and configuration passed through accessors
- **Clean Interfaces**: Services expose minimal public APIs

## Layered Architecture Pattern

Services are further organized into layers for improved testability:

### Core Layer (Pure Business Logic)

- `src/lib/canvas-logic.ts` - Node positioning, edge creation, context capture
- `src/lib/inference-logic.ts` - Model config, validation, error handling
- `src/lib/menu-logic.ts` - Selection validation, button config
- `src/lib/api-key-logic.ts` - API key validation, dependency checking
- `src/lib/settings-utils.ts` - Settings utility functions

Pure functions with:

- Zero external dependencies
- 100% testable without mocks
- ~5ms test execution time
- Functional, immutable approach

### Adapter Layer (Platform Integration)

- `src/adapters/obsidian-ui-notifications.ts` - UINotificationAdapter implementation
- Direct Obsidian API integration where needed

Minimal adapters that:

- Abstract platform-specific APIs
- Enable dependency injection
- Support test doubles

### Service Layer (Orchestration)

Services delegate to pure functions and adapters:

- Receive dependencies via constructor injection
- Coordinate between core logic and adapters
- Handle async operations and error boundaries

## Service Design Principles

1. **Domain Boundaries**: Each service handles exactly one aspect of the system
2. **Dependency Flow**: Services receive all dependencies through constructor injection
3. **Callback Coordination**: Parent class provides callbacks for cross-service coordination
4. **Interface Minimalism**: Services expose only methods needed by their coordinator
5. **Stateless Operations**: Services operate on provided data when possible

## Refactoring Strategy

1. **Identify Domain Boundaries**: Group related methods by primary responsibility
2. **Extract Services One by One**: Create individual services with atomic commits
3. **Maintain Delegation**: Replace method calls with service calls, preserving behavior
4. **Verify Continuously**: Run tests after each extraction
5. **Document Pattern**: Update architecture docs with lessons learned

## Key Design Decisions

- **Multi-provider Architecture**: Support local and cloud providers
- **Vercel AI SDK**: Unified interface for all LLM providers
- **Secure Authentication**: API key storage with masking
- **Extensible Design**: Easy addition of new providers
- **Minimal Complexity**: Focus on core value
- **Standard Roles**: No invented LLM API properties
- **Plugin-Level Config**: Model selection in UI, not per-node
- **Reference-Based API Keys**: Keys stored separately, referenced by models
- **DOM-First UI**: Direct DOM manipulation for Obsidian compatibility
- **Service-Based Architecture**: Extract focused services for maintainability
- **Dependency Injection**: Constructor injection over global state
- **Single Responsibility**: Each service has one clear domain

## Implementation Patterns

### API Key Management

- **Reference Pattern**: Use ID-based references for sensitive data
- **Validation Strategy**: Check dependencies before deletions
- **Migration Approach**: Support old and new patterns simultaneously
- **Security Best Practices**: Consistent masking for display

### Obsidian UI Development

- **DOM Manipulation**: Direct DOM APIs over React for modals
- **Line Breaks**: Use `descEl.createDiv()` not string concatenation
- **TypeScript Strict Mode**: Use `delete` operator for optional properties
- **State Management**: Store UI references as class properties

### User Experience Patterns

- **Progressive Enhancement**: Advanced features with simple alternatives
- **Contextual Help**: Documentation links in relevant UI sections
- **Visual Consistency**: Standardized spacing, sizing, layout
- **Error Prevention**: Disable conflicting options vs error messages

### Code Architecture Patterns

- **Service Extraction**: Break classes at ~300-400 lines
- **Constructor Injection**: Pass dependencies through constructors
- **Interface Consistency**: Minimal public APIs per service
- **Definite Assignment**: Use `!:` for lifecycle-initialized properties
- **Atomic Commits**: Document refactoring with conventional commits
- **Backward Compatibility**: Preserve functionality through delegation
