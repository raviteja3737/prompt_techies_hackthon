"use client";
import React, { useState } from "react";

const StackedText = ({ text, fontSize = "48px" }) => {
	const [isHovered, setIsHovered] = useState(false);

	// Cap fixed px sizes to viewport width so long headings (e.g. 70-80px)
	// don't clip on 280-360px phones. On desktop `min()` resolves to the
	// original prop, preserving the exact visual design.
	const responsiveFontSize = `min(${fontSize}, 11vw)`;

	const baseStyle = {
		fontWeight: "bold",
		fontSize: responsiveFontSize,
		lineHeight: "1.1",
		position: "absolute",
		whiteSpace: "nowrap",
		maxWidth: "100%",
		transition: "all 0.3s ease",
	};

	return (
		<div
			style={{
				position: "relative",
				display: "inline-block",
				maxWidth: "100%",
			}}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{/* First layer */}
			<span
				style={{
					...baseStyle,
					left: isHovered ? "0" : "12px",
					top: isHovered ? "0" : "12px",
					color: "#003cb3",
					textShadow: `
						-1px -1px 0 #003cb3, 
						1px -1px 0 #003cb3, 
						-1px 1px 0 #003cb3, 
						1px 1px 0 #003cb3`,
				}}
			>
				{text}
			</span>

			{/* Second layer */}
			<span
				style={{
					...baseStyle,
					left: isHovered ? "0" : "6px",
					top: isHovered ? "0" : "6px",
					color: "#00c8ff",
					textShadow: `
						-1px -1px 0 #00c8ff, 
						1px -1px 0 #00c8ff, 
						-1px 1px 0 #00c8ff, 
						1px 1px 0 #00c8ff`,
				}}
			>
				{text}
			</span>

			{/* Third (top) layer */}
			<span
				style={{
					...baseStyle,
					color: "#ffffff",
					textShadow: `
						-1px -1px 0 #ffffff, 
						1px -1px 0 #ffffff, 
						-1px 1px 0 #ffffff, 
						1px 1px 0 #ffffff`,
					position: "relative",
				}}
			>
				{text}
			</span>
      
		</div>
	);
};

export default StackedText;
