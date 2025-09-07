import React from "react";

interface LayoutProps {
	children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
	return (
		<div
			className="root"
			style={{
				isolation: "isolate",
				padding: "16px",
			}}
		>
			{children}
		</div>
	);
};
