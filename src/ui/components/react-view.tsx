import { Select } from "@base-ui-components/react/select";
import { Field } from "@base-ui-components/react/field";
import { Separator } from "@base-ui-components/react/separator";
import { useState, useEffect } from "react";
import type CanvasContextPlugin from "../../main.ts";

interface ReactViewProps {
	plugin: CanvasContextPlugin;
}

export const ReactView: React.FC<ReactViewProps> = ({ plugin }) => {
	const [currentModel, setCurrentModel] = useState(plugin.settings.currentModel);
	const [modelConfigs, setModelConfigs] = useState(plugin.settings.modelConfigurations);

	// Update local state when plugin settings change
	useEffect(() => {
		setCurrentModel(plugin.settings.currentModel);
		setModelConfigs(plugin.settings.modelConfigurations);
	}, [plugin.settings.currentModel, plugin.settings.modelConfigurations]);

	const handleModelChange = async (value: string | null) => {
		const selectedValue = value || "";
		plugin.settings.currentModel = selectedValue;
		await plugin.saveSettings();
		setCurrentModel(selectedValue);
	};

	const enabledModels = modelConfigs.filter(config => config.enabled);
	const currentModelConfig = modelConfigs.find(config => config.id === currentModel);

	// Create items for Base UI Select
	const selectItems = [
		{ label: "Select a model", value: null },
		...enabledModels.map(config => ({
			label: config.name,
			value: config.id,
			description: `${config.provider} • ${config.modelName}`
		}))
	];

	return (
		<div style={{ padding: "20px", maxWidth: "400px" }}>
			<div style={{ 
				display: "flex", 
				alignItems: "center", 
				gap: "12px",
				marginBottom: "24px" 
			}}>
				<h3 style={{ 
					margin: 0, 
					fontSize: "18px", 
					fontWeight: "600",
					color: "var(--text-normal)" 
				}}>
					Canvas Context
				</h3>
			</div>

			<Separator style={{
				height: "1px",
				backgroundColor: "var(--background-modifier-border)",
				marginBottom: "20px",
				border: "none"
			}} />
			
			<Field.Root>
				<Field.Label style={{ 
					display: "block", 
					marginBottom: "12px", 
					fontSize: "14px", 
					fontWeight: "500",
					color: "var(--text-normal)"
				}}>
					Current Model
				</Field.Label>
				
				<Select.Root 
					items={selectItems} 
					value={currentModel || null}
					onValueChange={handleModelChange}
				>
					<Select.Trigger
						style={{
							width: "100%",
							minHeight: "36px",
							padding: "8px 12px",
							border: "1px solid var(--background-modifier-border)",
							borderRadius: "6px",
							backgroundColor: "var(--background-primary)",
							color: "var(--text-normal)",
							fontSize: "14px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							transition: "border-color 0.2s, box-shadow 0.2s"
						}}
					>
						<Select.Value style={{ flex: 1 }}>
							{currentModelConfig ? (
								<div>
									<div style={{ fontWeight: "500" }}>{currentModelConfig.name}</div>
									<div style={{ 
										fontSize: "12px", 
										color: "var(--text-muted)",
										marginTop: "2px" 
									}}>
										{currentModelConfig.provider} • {currentModelConfig.modelName}
									</div>
								</div>
							) : (
								<span style={{ color: "var(--text-muted)" }}>Select a model</span>
							)}
						</Select.Value>
						<Select.Icon style={{ 
							marginLeft: "8px",
							fontSize: "12px",
							color: "var(--text-muted)" 
						}}>
							▼
						</Select.Icon>
					</Select.Trigger>
					
					<Select.Portal>
						<Select.Positioner>
							<Select.Popup
								style={{
									backgroundColor: "var(--background-primary)",
									border: "1px solid var(--background-modifier-border)",
									borderRadius: "8px",
									boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
									padding: "8px",
									minWidth: "300px",
									zIndex: 1000
								}}
							>
								{enabledModels.length === 0 ? (
									<div style={{ 
										padding: "12px", 
										color: "var(--text-muted)",
										textAlign: "center",
										fontSize: "14px"
									}}>
										No models configured.<br />
										<span style={{ fontSize: "12px" }}>Go to settings to add models.</span>
									</div>
								) : (
									selectItems.map((item) => (
										<Select.Item 
											key={item.label} 
											value={item.value}
											style={{
												padding: "10px 12px",
												cursor: "pointer",
												borderRadius: "4px",
												display: "flex",
												alignItems: "center",
												gap: "8px",
												fontSize: "14px",
												transition: "background-color 0.2s"
											}}
										>
											<Select.ItemIndicator style={{ 
												fontSize: "12px", 
												color: "var(--text-accent)" 
											}}>
												✓
											</Select.ItemIndicator>
											<Select.ItemText style={{ flex: 1 }}>
												{item.value ? (
													<div>
														<div style={{ fontWeight: "500" }}>{item.label}</div>
														{item.description && (
															<div style={{ 
																fontSize: "12px", 
																color: "var(--text-muted)",
																marginTop: "2px" 
															}}>
																{item.description}
															</div>
														)}
													</div>
												) : (
													<span style={{ color: "var(--text-muted)" }}>{item.label}</span>
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
					<Separator style={{
						height: "1px",
						backgroundColor: "var(--background-modifier-border)",
						margin: "20px 0",
						border: "none"
					}} />
					
					<div style={{ 
						padding: "16px", 
						backgroundColor: "var(--background-secondary)", 
						borderRadius: "8px",
						fontSize: "13px",
						lineHeight: "1.4"
					}}>
						<div style={{ 
							fontWeight: "600", 
							marginBottom: "12px",
							color: "var(--text-normal)",
							fontSize: "14px"
						}}>
							Model Details
						</div>
						<div style={{ 
							display: "grid",
							gap: "8px"
						}}>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span style={{ color: "var(--text-muted)" }}>Provider:</span>
								<span style={{ fontWeight: "500", textTransform: "capitalize" }}>
									{currentModelConfig.provider}
								</span>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span style={{ color: "var(--text-muted)" }}>Model:</span>
								<span style={{ fontWeight: "500", fontFamily: "var(--font-monospace)" }}>
									{currentModelConfig.modelName}
								</span>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span style={{ color: "var(--text-muted)" }}>Base URL:</span>
								<span style={{ 
									fontWeight: "400", 
									fontFamily: "var(--font-monospace)",
									fontSize: "11px",
									wordBreak: "break-all"
								}}>
									{currentModelConfig.baseURL}
								</span>
							</div>
						</div>
					</div>
				</>
			)}

			{plugin.recentErrors.length > 0 && (
				<>
					<Separator style={{
						height: "1px",
						backgroundColor: "var(--background-modifier-border)",
						margin: "20px 0",
						border: "none"
					}} />
					
					<div style={{ 
						padding: "16px", 
						backgroundColor: "var(--background-primary-alt)", 
						borderRadius: "8px",
						border: "1px solid var(--background-modifier-error)",
						fontSize: "13px",
						lineHeight: "1.4"
					}}>
						<div style={{ 
							fontWeight: "600", 
							marginBottom: "12px",
							color: "var(--text-error)",
							fontSize: "14px",
							display: "flex",
							alignItems: "center",
							gap: "6px"
						}}>
							⚠️ Recent Errors
						</div>
						{plugin.recentErrors.slice(0, 3).map((error, index) => (
							<div key={index} style={{ 
								marginBottom: index < 2 ? "12px" : "0",
								paddingBottom: index < 2 ? "12px" : "0",
								borderBottom: index < 2 ? "1px solid var(--background-modifier-border)" : "none"
							}}>
								<div style={{ 
									fontSize: "12px", 
									color: "var(--text-error)",
									fontWeight: "500",
									marginBottom: "4px",
									textTransform: "capitalize"
								}}>
									{error.errorType || 'Unknown'} Error
								</div>
								<div style={{ 
									fontSize: "11px", 
									color: "var(--text-muted)",
									wordBreak: "break-word",
									lineHeight: "1.3"
								}}>
									{error.error}
								</div>
								{(error as any).timestamp && (
									<div style={{ 
										fontSize: "10px", 
										color: "var(--text-faint)",
										marginTop: "4px"
									}}>
										{new Date((error as any).timestamp).toLocaleTimeString()}
									</div>
								)}
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
};
