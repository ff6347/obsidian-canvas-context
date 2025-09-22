/* oxlint-disable eslint/max-lines-per-function */
import { Select } from "@base-ui-components/react/select";
import { Field } from "@base-ui-components/react/field";
import { Separator } from "@base-ui-components/react/separator";
import { useState } from "react";
import type CanvasContextPlugin from "../../main.ts";
import { PLUGIN_DISPLAY_NAME } from "../../lib/constants.ts";
import { useSettings } from "../../contexts/settings-context.tsx";

interface ReactViewProps {
	plugin: CanvasContextPlugin;
}

export const ReactView: React.FC<ReactViewProps> = ({ plugin }) => {
	const { settings, updateSettings } = useSettings();
	const [isRunningInference, setIsRunningInference] = useState(false);

	const currentModel = settings.currentModel;
	const modelConfigs = settings.modelConfigurations;

	const handleModelChange = async (value: string | null) => {
		const selectedValue = value || "";
		await updateSettings((prev) => ({
			...prev,
			currentModel: selectedValue,
		}));
	};

	const handleRunInference = async () => {
		if (isRunningInference) {
			return;
		}

		setIsRunningInference(true);
		try {
			await plugin.runInferenceFromSidebar();
		} catch (error) {
			console.error("Error running inference:", error);
		} finally {
			setIsRunningInference(false);
		}
	};

	const enabledModels = modelConfigs.filter((config) => config.enabled);
	const currentModelConfig = modelConfigs.find(
		(config) => config.id === currentModel,
	);

	// Create items for Base UI Select
	const selectItems = [
		{ label: "Select a model", value: null },
		...enabledModels.map((config) => ({
			label: config.name,
			value: config.id,
			description: `${config.provider} • ${config.modelName}`,
		})),
	];

	return (
		<div className={"canvas-context__wrapper"}>
			<div className="canvas-context__header">
				<h3 className="canvas-context__title">{PLUGIN_DISPLAY_NAME}</h3>
			</div>

			<Separator className={"canvas-context__hr"} />

			<Field.Root>
				<Field.Label className={"canvas-context__label"}>
					Current Model
				</Field.Label>

				<Select.Root
					items={selectItems}
					value={currentModel || null}
					onValueChange={handleModelChange}
				>
					<Select.Trigger className={"canvas-context__select-trigger"}>
						<Select.Value className={"canvas-context__select-value"}>
							{currentModelConfig ? (
								<div>
									<div className="canvas-context__select-value-label">
										{currentModelConfig.name}
									</div>
									<div className="canvas-context__select-value-description">
										{currentModelConfig.provider} •{" "}
										{currentModelConfig.modelName}
									</div>
								</div>
							) : (
								<span className="canvas-context__select-placeholder">
									Select a model
								</span>
							)}
						</Select.Value>
						<Select.Icon className="canvas-context__select-icon">▼</Select.Icon>
					</Select.Trigger>

					<Select.Portal>
						<Select.Positioner>
							<Select.Popup className="canvas-context__select-popup">
								{enabledModels.length === 0 ? (
									<div className="canvas-context__select-empty-state">
										No models configured.
										<br />
										<span className="canvas-context__select-empty-subtext">
											Go to settings to add models.
										</span>
									</div>
								) : (
									selectItems.map((item) => (
										<Select.Item
											key={item.label}
											value={item.value}
											className="canvas-context__select-item"
										>
											<Select.ItemIndicator className="canvas-context__select-item-indicator">
												✓
											</Select.ItemIndicator>
											<Select.ItemText className="canvas-context__select-item-text">
												{item.value ? (
													<div>
														<div className="canvas-context__select-item-label">
															{item.label}
														</div>
														{item.description && (
															<div className="canvas-context__select-item-description">
																{item.description}
															</div>
														)}
													</div>
												) : (
													<span className="canvas-context__select-placeholder">
														{item.label}
													</span>
												)}
											</Select.ItemText>
										</Select.Item>
									))
								)}
							</Select.Popup>
						</Select.Positioner>
					</Select.Portal>
				</Select.Root>
			</Field.Root>

			{currentModelConfig && (
				<>
					<Separator className="canvas-context__separator" />

					<div className="canvas-context__model-details">
						<div className="canvas-context__model-details-title">
							Model Details
						</div>
						<div className="canvas-context__model-details-grid">
							<div className="canvas-context__model-details-row">
								<span className="canvas-context__model-details-label">
									Provider:
								</span>
								<span className="canvas-context__model-details-value">
									{currentModelConfig.provider}
								</span>
							</div>
							<div className="canvas-context__model-details-row">
								<span className="canvas-context__model-details-label">
									Model:
								</span>
								<span className="canvas-context__model-details-value--monospace">
									{currentModelConfig.modelName}
								</span>
							</div>
							<div className="canvas-context__model-details-row">
								<span className="canvas-context__model-details-label">
									Base URL:
								</span>
								<span className="canvas-context__model-details-value--small">
									{currentModelConfig.baseURL}
								</span>
							</div>
						</div>
					</div>
				</>
			)}

			{plugin.getRecentErrors().length > 0 && (
				<>
					<Separator className="canvas-context__separator" />

					<div className="canvas-context__error-section">
						<div className="canvas-context__error-title">⚠️ Recent Errors</div>
						{plugin
							.getRecentErrors()
							.slice(0, 3)
							.map((error: any, index: number) => (
								<div key={index} className="canvas-context__error-item">
									<div className="canvas-context__error-type">
										{error.errorType || "Unknown"} Error
									</div>
									<div className="canvas-context__error-message">
										{error.error}
									</div>
									{typeof error === "object" &&
										error !== null &&
										"timestamp" in error &&
										typeof error.timestamp === "number" && (
											<div className="canvas-context__error-timestamp">
												{new Date(error.timestamp).toLocaleTimeString()}
											</div>
										)}
								</div>
							))}
					</div>
				</>
			)}

			<Separator className="canvas-context__separator" />

			<button
				onClick={handleRunInference}
				disabled={isRunningInference || !currentModelConfig}
				className={`canvas-context__run-button ${
					currentModelConfig && !isRunningInference
						? "canvas-context__run-button--enabled"
						: "canvas-context__run-button--disabled"
				}`}
			>
				{isRunningInference ? (
					<>
						<span className="canvas-context__run-button-spinner" />
						{`Running ${PLUGIN_DISPLAY_NAME}...`}
					</>
				) : (
					<>{`${PLUGIN_DISPLAY_NAME} - Run Inference`}</>
				)}
			</button>
		</div>
	);
};
