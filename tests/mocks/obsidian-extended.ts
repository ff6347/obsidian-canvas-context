import { vi } from "vitest";

/**
 * Extended Obsidian mock utilities for UI components and service testing.
 * These mocks support the service layer testing without requiring real Obsidian dependencies.
 */

/**
 * Mock ButtonComponent for settings and modal UI testing
 */
export class MockButtonComponent {
	buttonEl = {
		textContent: "Mock Button",
		style: { display: "" },
		disabled: false,
		classList: {
			add: vi.fn(),
			remove: vi.fn(),
			contains: vi.fn(),
		},
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	};

	setButtonText = vi.fn().mockReturnThis();
	setDisabled = vi.fn((disabled: boolean) => {
		this.buttonEl.disabled = disabled;
		return this;
	});
	setTooltip = vi.fn().mockReturnThis();
	setCta = vi.fn().mockReturnThis();
	setWarning = vi.fn().mockReturnThis();
	onClick = vi.fn().mockReturnThis();
	onClickEvent = vi.fn().mockReturnThis();
}

/**
 * Mock Setting component for settings panel testing
 */
export class MockSetting {
	settingEl = {
		style: { display: "" },
		classList: {
			add: vi.fn(),
			remove: vi.fn(),
		},
	};

	nameEl = {
		textContent: "",
		style: { fontWeight: "" },
	};

	descEl = {
		empty: vi.fn(),
		createDiv: vi.fn().mockReturnValue({
			textContent: "",
			style: { marginBottom: "" },
			innerHTML: "",
		}),
		createEl: vi.fn().mockReturnValue({
			textContent: "",
			href: "",
		}),
		appendChild: vi.fn(),
	};

	controlEl = {
		appendChild: vi.fn(),
		createDiv: vi.fn().mockReturnValue({
			style: { display: "", marginTop: "", fontSize: "" },
		}),
	};

	setName = vi.fn((name: string) => {
		this.nameEl.textContent = name;
		return this;
	});

	setDesc = vi.fn().mockReturnThis();
	setClass = vi.fn().mockReturnThis();
	setTooltip = vi.fn().mockReturnThis();
	setHeading = vi.fn().mockReturnThis();

	addText = vi.fn((callback?: (text: MockTextComponent) => void) => {
		const textComponent = new MockTextComponent();
		if (callback) callback(textComponent);
		return this;
	});

	addDropdown = vi.fn((callback?: (dropdown: MockDropdownComponent) => void) => {
		const dropdownComponent = new MockDropdownComponent();
		if (callback) callback(dropdownComponent);
		return this;
	});

	addToggle = vi.fn((callback?: (toggle: MockToggleComponent) => void) => {
		const toggleComponent = new MockToggleComponent();
		if (callback) callback(toggleComponent);
		return this;
	});

	addButton = vi.fn((callback?: (button: MockButtonComponent) => void) => {
		const buttonComponent = new MockButtonComponent();
		if (callback) callback(buttonComponent);
		return this;
	});
}

/**
 * Mock TextComponent for input fields
 */
export class MockTextComponent {
	inputEl = {
		value: "",
		placeholder: "",
		disabled: false,
		type: "text",
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		focus: vi.fn(),
		select: vi.fn(),
	};

	setValue = vi.fn((value: string) => {
		this.inputEl.value = value;
		return this;
	});

	setPlaceholder = vi.fn((placeholder: string) => {
		this.inputEl.placeholder = placeholder;
		return this;
	});

	setDisabled = vi.fn((disabled: boolean) => {
		this.inputEl.disabled = disabled;
		return this;
	});

	onChange = vi.fn().mockReturnThis();
	onChanged = vi.fn().mockReturnThis();
}

/**
 * Mock DropdownComponent for select elements
 */
export class MockDropdownComponent {
	selectEl = {
		value: "",
		disabled: false,
		options: [] as any[],
		selectedIndex: -1,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	};

	addOption = vi.fn((value: string, display: string) => {
		const option = { value, text: display };
		this.selectEl.options.push(option);
		return this;
	});

	addOptions = vi.fn((options: Record<string, string>) => {
		Object.entries(options).forEach(([value, display]) => {
			this.addOption(value, display);
		});
		return this;
	});

	setValue = vi.fn((value: string) => {
		this.selectEl.value = value;
		const index = this.selectEl.options.findIndex((opt) => opt.value === value);
		this.selectEl.selectedIndex = index;
		return this;
	});

	setDisabled = vi.fn((disabled: boolean) => {
		this.selectEl.disabled = disabled;
		return this;
	});

	onChange = vi.fn().mockReturnThis();
	onChanged = vi.fn().mockReturnThis();
}

/**
 * Mock ToggleComponent for boolean settings
 */
export class MockToggleComponent {
	toggleEl = {
		checked: false,
		disabled: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	};

	setValue = vi.fn((value: boolean) => {
		this.toggleEl.checked = value;
		return this;
	});

	setDisabled = vi.fn((disabled: boolean) => {
		this.toggleEl.disabled = disabled;
		return this;
	});

	onChange = vi.fn().mockReturnThis();
	onChanged = vi.fn().mockReturnThis();
}

/**
 * Mock Notice for user feedback testing
 */
export class MockNotice {
	static notices: string[] = [];
	message: string;

	constructor(message: string, timeout?: number) {
		this.message = message;
		MockNotice.notices.push(message);
	}

	static clear() {
		MockNotice.notices = [];
	}

	static getLastNotice() {
		return MockNotice.notices[MockNotice.notices.length - 1];
	}

	static getAllNotices() {
		return [...MockNotice.notices];
	}

	hide = vi.fn();
}

/**
 * Mock Modal for dialog testing
 */
export class MockModal {
	modalEl = {
		style: { display: "" },
		classList: {
			add: vi.fn(),
			remove: vi.fn(),
		},
	};

	titleEl = {
		textContent: "",
	};

	contentEl = {
		empty: vi.fn(),
		createDiv: vi.fn().mockReturnValue({
			style: { marginBottom: "" },
			appendChild: vi.fn(),
		}),
		createEl: vi.fn().mockReturnValue({
			textContent: "",
			style: {},
		}),
		appendChild: vi.fn(),
	};

	isOpen = false;

	constructor(app?: any) {
		// Mock constructor
	}

	open = vi.fn(() => {
		this.isOpen = true;
		return this;
	});

	close = vi.fn(() => {
		this.isOpen = false;
		return this;
	});

	onOpen = vi.fn();
	onClose = vi.fn();
}

/**
 * Mock StatusBarItem for status updates
 */
export class MockStatusBarItem {
	private text = "";
	private isVisible = true;

	el = {
		textContent: "",
		style: {
			display: "",
			fontWeight: "",
			backgroundColor: "",
			animation: "",
		},
		classList: {
			add: vi.fn(),
			remove: vi.fn(),
			contains: vi.fn(),
		},
		innerHTML: "",
	};

	setText = vi.fn((text: string) => {
		this.text = text;
		this.el.textContent = text;
		return this;
	});

	setAttr = vi.fn().mockReturnThis();

	show = vi.fn(() => {
		this.isVisible = true;
		this.el.style.display = "";
		return this;
	});

	hide = vi.fn(() => {
		this.isVisible = false;
		this.el.style.display = "none";
		return this;
	});

	remove = vi.fn();

	getText() {
		return this.text;
	}

	getIsVisible() {
		return this.isVisible;
	}
}

/**
 * Create a mock Obsidian App with extended functionality
 */
export const createMockApp = () => ({
	vault: {
		getAbstractFileByPath: vi.fn(),
		cachedRead: vi.fn(),
		read: vi.fn(),
		modify: vi.fn(),
		create: vi.fn(),
		adapter: {
			exists: vi.fn(),
			read: vi.fn(),
			write: vi.fn(),
		},
	},
	metadataCache: {
		getFileCache: vi.fn(),
		getCache: vi.fn(),
		getFrontmatterInfo: vi.fn(),
	},
	workspace: {
		getActiveFile: vi.fn(),
		getActiveViewOfType: vi.fn(),
		getLeavesOfType: vi.fn(),
		openLinkText: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
		trigger: vi.fn(),
	},
	plugins: {
		plugins: {},
		getPlugin: vi.fn(),
	},
});

/**
 * Create a mock plugin instance for testing services
 */
export const createMockPlugin = (settings = {}) => ({
	app: createMockApp(),
	settings,
	saveSettings: vi.fn(),
	generateId: vi.fn(() => `test-id-${Date.now()}`),
	addStatusBarItem: vi.fn(() => new MockStatusBarItem()),
	registerEvent: vi.fn(),
	registerInterval: vi.fn(),
	registerDomEvent: vi.fn(),
});