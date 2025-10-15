# Testing Strategy: Reducing Mock Dependencies

## Status: ✅ PROVEN

Successfully implemented across 4 major services with 100x performance improvement.

## Problems Solved

- ✅ Extracted pure business logic testable without mocks
- ✅ Created adapter pattern for Obsidian API abstraction
- ✅ Achieved 100x faster test execution (5ms vs 400ms)
- ✅ Demonstrated scalable layered architecture pattern
- ✅ Proved approach works with real-world service complexity

## Layered Architecture Pattern

### Core Layer: Pure Business Logic

**Location**: `src/lib/`

Pure functions with zero external dependencies:

- `canvas-logic.ts` - 10 functions, 35 tests, 5ms execution
- `inference-logic.ts` - 8 functions, 25 tests, 6ms execution
- `menu-logic.ts` - 4 functions, 20 tests, 4ms execution
- `api-key-logic.ts` - 6 functions, 17 tests, 4ms execution
- `settings-utils.ts` - Utility functions, 24 tests

**Characteristics**:

- No Obsidian imports
- 100% testable without mocks
- Functional, immutable approach
- ~5ms average test execution
- Simple test data fixtures

### Adapter Layer: Platform Integration

**Location**: `src/adapters/`

Minimal abstractions for platform-specific APIs:

- `obsidian-ui-notifications.ts` - UINotificationAdapter implementation

**Characteristics**:

- Thin wrappers around Obsidian APIs
- Enable dependency injection
- Support test doubles
- Only create when providing real value

### Service Layer: Orchestration

**Location**: `src/services/`

Services delegate to pure functions and adapters:

- Receive dependencies via constructor injection
- Coordinate between core logic and adapters
- Handle async operations
- Manage error boundaries

## Implementation Examples

### Before: Tightly Coupled Service

```typescript
export class CanvasService {
	constructor(private app: App) {}

	createResponseNode(node, response) {
		const data = this.app.workspace.getCanvasData();
		const sourceNode = data.nodes.find((n) => n.id === node.id);
		// Business logic mixed with platform code
		const x = sourceNode?.x ?? 100; // Fallback!
		const y = sourceNode?.y ?? 50;
		// ... more mixed concerns
	}
}
```

### After: Layered Architecture

```typescript
// Pure business logic - tests in 5ms
export function calculateResponseNodePosition(
	sourceNode: CanvasNodeData,
	offset: number = 50,
): Position {
	return {
		x: sourceNode.x,
		y: sourceNode.y + sourceNode.height + offset,
	};
}

// Service orchestrates
export class CanvasService {
	constructor(
		private app: App,
		private notificationAdapter: UINotificationAdapter,
	) {}

	createResponseNode(node, response) {
		const data = this.app.workspace.getCanvasData();
		const sourceNode = data.nodes.find((n) => n.id === node.id);

		if (!sourceNode) {
			this.notificationAdapter.showError("Source node not found");
			return;
		}

		const position = calculateResponseNodePosition(sourceNode);
		// ... use pure function result
	}
}
```

## Testing Strategy by Type

### 1. Pure Unit Tests (80% of tests)

**What**: Test core business logic with zero mocks
**Where**: `tests/unit/`
**Speed**: ~5ms per file
**Example**:

```typescript
describe("calculateResponseNodePosition", () => {
	it("positions node below source with offset", () => {
		const source = { x: 100, y: 200, height: 150 };
		const result = calculateResponseNodePosition(source, 50);
		expect(result).toEqual({ x: 100, y: 400 });
	});
});
```

### 2. Integration Tests (15% of tests)

**What**: Service orchestration and data flow
**Where**: `tests/services/`
**Uses**: Test adapters (not mocks)
**Example**:

```typescript
describe("CanvasService", () => {
	it("shows error when source node missing", () => {
		const adapter = new TestNotificationAdapter();
		const service = new CanvasService(mockApp, adapter);

		service.createResponseNode(invalidNode, "response");

		expect(adapter.errors).toContain("Source node not found");
	});
});
```

### 3. Provider Tests (HTTP Testing)

**What**: API integration with realistic mocking
**Where**: `tests/providers/`
**Uses**: Mock Service Worker (MSW)
**Why**: Appropriate use of mocking for network boundaries

## Refactoring Process

### Phase 1: Extract Pure Logic

1. Identify business logic in service
2. Extract to pure functions in `src/lib/`
3. Remove external dependencies
4. Make functions pure (same input → same output)
5. Write fast unit tests

### Phase 2: Create Adapters (If Needed)

1. Identify platform-specific code
2. Create minimal adapter interface
3. Implement for production
4. Create test double
5. Only if providing real abstraction value

### Phase 3: Refactor Service

1. Inject adapters via constructor
2. Delegate to pure functions
3. Keep orchestration logic
4. Maintain existing API
5. Verify all tests pass

### Phase 4: Verify

- All existing tests pass
- New pure tests added
- Type checking succeeds
- Performance improved
- Code more maintainable

## Successfully Refactored Services

### CanvasService (Issue #55)

- **Extracted**: `src/lib/canvas-logic.ts` (10 functions)
- **Tests**: 35 unit tests, 5ms execution
- **Adapter**: UINotificationAdapter
- **Result**: 100x faster business logic tests

### InferenceService (Issue #56)

- **Extracted**: `src/lib/inference-logic.ts` (8 functions)
- **Tests**: 25 unit tests, 6ms execution
- **Adapter**: Minimal dependencies
- **Result**: Clean separation of concerns

### MenuService (Issue #57)

- **Extracted**: `src/lib/menu-logic.ts` (4 functions)
- **Tests**: 20 unit tests, 4ms execution
- **Adapter**: UINotificationAdapter
- **Result**: KISS principle applied, reused existing functions

### ApiKeyConfigurationService (Issue #65)

- **Extracted**: `src/lib/api-key-logic.ts` (6 functions)
- **Tests**: 17 unit tests, 4ms execution
- **Adapter**: UINotificationAdapter with enhanced interface
- **Result**: Fourth successful pattern application

## Benefits Achieved

### Performance

- **Test Execution**: 5ms vs 400ms (100x faster)
- **Total Test Suite**: < 2 seconds for 305 tests
- **Developer Experience**: Instant feedback

### Code Quality

- **Separation of Concerns**: Clear boundaries
- **Testability**: Pure functions easily tested
- **Maintainability**: Easier to understand and modify
- **Reliability**: Tests don't break from mock changes

### Architecture

- **Scalability**: Pattern proven across diverse services
- **Consistency**: Same approach throughout codebase
- **Documentation**: Clear examples for future work
- **Flexibility**: Easy to swap implementations

## Success Metrics

- ✅ Test files with zero `vi.mock()` calls in pure logic
- ✅ Average test file < 100 lines
- ✅ Test execution time < 1 second for unit tests
- ✅ Code coverage focused on business logic, not mocks

## Anti-Patterns to Avoid

### ❌ Over-Mocking

```typescript
// BAD: Mocking everything
vi.mock("obsidian");
vi.mock("../utils");
vi.mock("../services");
// Tests become fragile and slow
```

### ❌ Testing Mock Behavior

```typescript
// BAD: Testing that mocks work
it("calls mocked function", () => {
	mockFunction.mockReturnValue(42);
	expect(service.doThing()).toBe(42);
	// This tests the mock, not real behavior
});
```

### ❌ Over-Engineering Adapters

```typescript
// BAD: Adapter for everything
interface FileSystemAdapter {
  readFile, writeFile, deleteFile, copyFile, moveFile, ...
}
// Only create adapters when they provide value
```

## Best Practices

### ✅ Pure Functions First

```typescript
// GOOD: Extract pure logic
export function calculateTotal(items: Item[]): number {
	return items.reduce((sum, item) => sum + item.price, 0);
}
```

### ✅ Minimal Adapters

```typescript
// GOOD: Only essential abstraction
export interface UINotificationAdapter {
	showError(message: string): void;
	showSuccess(message: string): void;
}
```

### ✅ Test Real Behavior

```typescript
// GOOD: Test business logic
it("calculates total correctly", () => {
	const items = [{ price: 10 }, { price: 20 }];
	expect(calculateTotal(items)).toBe(30);
});
```

## Future Work

See GitHub Issues for remaining refactoring opportunities:

- [Issue #67](https://github.com/ff6347/obsidian-canvas-context/issues/67): Replace remaining direct Notice usage
- Apply pattern to remaining modal services
- Apply pattern to remaining settings services
- Update test structure organization

## References

- **Implementation Examples**: `src/lib/` directory
- **Test Examples**: `tests/unit/` directory
- **Architecture**: `docs/plans/architecture.md`
- **GitHub Issues**: #55, #56, #57, #60, #65
