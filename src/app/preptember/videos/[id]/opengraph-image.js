import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Promptathon 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
	return new ImageResponse(
		(
			<div
				style={{
					fontSize: 48,
					background: "#060a12",
					color: "#00c8ff",
					width: "100%",
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: "sans-serif",
				}}
			>
				Promptathon 2026
			</div>
		),
		{ ...size }
	);
}
