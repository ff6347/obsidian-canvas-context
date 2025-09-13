import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { CanvasContextSettings } from "../ui/settings.ts";
import type CanvasContextPlugin from "../main.ts";

interface SettingsContextType {
	settings: CanvasContextSettings;
	updateSettings: (
		updater: (prev: CanvasContextSettings) => CanvasContextSettings,
	) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

interface SettingsProviderProps {
	children: ReactNode;
	plugin: CanvasContextPlugin;
}

export function SettingsProvider({ children, plugin }: SettingsProviderProps) {
	const [settings, setSettings] = useState<CanvasContextSettings>(
		plugin.settings,
	);

	const updateSettings = async (
		updater: (prev: CanvasContextSettings) => CanvasContextSettings,
	) => {
		const newSettings = updater(settings);
		setSettings(newSettings);
		plugin.settings = newSettings;
		await plugin.saveSettings();
	};

	useEffect(() => {
		const handleSettingsChange = (...data: unknown[]) => {
			const newSettings = data[0] as CanvasContextSettings;
			setSettings({ ...newSettings });
		};

		plugin.settingsEvents.on("settings-changed", handleSettingsChange);

		return () => {
			plugin.settingsEvents.off("settings-changed", handleSettingsChange);
		};
	}, [plugin]);

	const contextValue = useMemo(
		() => ({
			settings,
			updateSettings,
		}),
		[settings, updateSettings],
	);

	return (
		<SettingsContext.Provider value={contextValue}>
			{children}
		</SettingsContext.Provider>
	);
}

export function useSettings(): SettingsContextType {
	const context = useContext(SettingsContext);
	if (!context) {
		throw new Error("useSettings must be used within a SettingsProvider");
	}
	return context;
}
