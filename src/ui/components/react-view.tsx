import { Switch } from "@base-ui-components/react/switch";
import { useState } from "react";

export const ReactView = () => {
	const [autoRefresh, setAutoRefresh] = useState(false);

	return (
		<div>
			<h4>Canvas Context Settings</h4>
			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<Switch.Root
					checked={autoRefresh}
					onCheckedChange={setAutoRefresh}
					style={{
						width: "48px",
						height: "24px",
						backgroundColor: autoRefresh ? "#007acc" : "#ccc",
						borderRadius: "12px",
						position: "relative",
						cursor: "pointer",
						border: "1px solid #999",
					}}
				>
					<Switch.Thumb
						style={{
							width: "20px",
							height: "20px",
							backgroundColor: "white",
							borderRadius: "50%",
							position: "absolute",
							top: "1px",
							left: "2px",
							transition: "transform 0.2s",
							transform: autoRefresh ? "translateX(24px)" : "translateX(0px)",
							boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
						}}
					/>
				</Switch.Root>
				<span>Enable Auto-refresh!!!!</span>
			</div>
		</div>
	);
};
