"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const vertexSmokeySource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

const fragmentSmokeySource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

    // Subtle, gentle drift speed
    float time = iTime * 0.35;

    // Normalize mouse input
    vec2 mouse = iMouse / iResolution;
    vec2 rippleCenter = (2.0 * mouse - 1.0) * vec2(1.0, -1.0);

    // Fine, delicate foggy distortion
    vec2 distortion = centeredUV * 1.6;
    for (float i = 1.0; i < 7.0; i++) {
        distortion.x += 0.45 / i * cos(i * 2.2 * distortion.y + time + rippleCenter.x * 2.5);
        distortion.y += 0.45 / i * cos(i * 2.2 * distortion.x + time + rippleCenter.y * 2.5);
    }

    // Refined glowing mist waves (smaller, delicate foggy wisps)
    float wave = abs(sin(distortion.x + distortion.y + time));
    float glow = smoothstep(0.8, 0.12, wave) * 0.75;

    // Ethereal gradient blend
    vec3 baseCol = u_color;
    vec3 highlightCol = u_color * 1.2 + vec3(0.0, 0.15, 0.25);
    vec3 finalCol = mix(baseCol, highlightCol, glow * 0.5);

    fragColor = vec4(finalCol * glow, glow * 0.85);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

export interface SmokeyBackgroundProps {
	color?: string; // Hex color for fog, defaults to #004bff (Cobalt Blue)
	className?: string;
	backdropBlur?: boolean;
}

export function SmokeyBackground({
	color = "#004bff",
	className = "",
	backdropBlur = true,
}: SmokeyBackgroundProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const [isHovering, setIsHovering] = useState(false);

	const hexToRgb = (hex: string): [number, number, number] => {
		const cleanHex = hex.replace("#", "");
		const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
		const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
		const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
		return [r || 0, g || 0.3, b || 1.0];
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas) return;

		const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
		if (!gl) {
			console.warn("WebGL not supported for SmokeyBackground");
			return;
		}

		const compileShader = (type: number, source: string): WebGLShader | null => {
			const shader = gl.createShader(type);
			if (!shader) return null;
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				gl.deleteShader(shader);
				return null;
			}
			return shader;
		};

		const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSmokeySource);
		const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSmokeySource);
		if (!vertexShader || !fragmentShader) return;

		const program = gl.createProgram();
		if (!program) return;
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			return;
		}

		gl.useProgram(program);

		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
			gl.STATIC_DRAW
		);

		const positionLocation = gl.getAttribLocation(program, "a_position");
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

		const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
		const iTimeLocation = gl.getUniformLocation(program, "iTime");
		const iMouseLocation = gl.getUniformLocation(program, "iMouse");
		const uColorLocation = gl.getUniformLocation(program, "u_color");

		const startTime = Date.now();
		const [r, g, b] = hexToRgb(color);
		gl.uniform3f(uColorLocation, r, g, b);

		let animationFrameId: number;

		const render = () => {
			const width = canvas.clientWidth || window.innerWidth;
			const height = canvas.clientHeight || window.innerHeight;
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
				gl.viewport(0, 0, width, height);
			}

			const currentTime = (Date.now() - startTime) / 1000;

			gl.uniform2f(iResolutionLocation, width, height);
			gl.uniform1f(iTimeLocation, currentTime);
			gl.uniform2f(
				iMouseLocation,
				isHovering ? mousePosition.x : width / 2,
				isHovering ? height - mousePosition.y : height / 2
			);

			gl.drawArrays(gl.TRIANGLES, 0, 6);
			animationFrameId = requestAnimationFrame(render);
		};

		const handleMouseMove = (event: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			setMousePosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
		};
		const handleMouseEnter = () => setIsHovering(true);
		const handleMouseLeave = () => setIsHovering(false);

		const targetElement = container || canvas;
		targetElement.addEventListener("mousemove", handleMouseMove);
		targetElement.addEventListener("mouseenter", handleMouseEnter);
		targetElement.addEventListener("mouseleave", handleMouseLeave);

		render();

		return () => {
			cancelAnimationFrame(animationFrameId);
			targetElement.removeEventListener("mousemove", handleMouseMove);
			targetElement.removeEventListener("mouseenter", handleMouseEnter);
			targetElement.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [isHovering, mousePosition, color]);

	return (
		<div
			ref={containerRef}
			className={cn(
				"pointer-events-none absolute inset-0 w-full h-full overflow-hidden select-none",
				className
			)}
		>
			<canvas ref={canvasRef} className="w-full h-full block" />
			{backdropBlur && <div className="absolute inset-0 backdrop-blur-[6px] pointer-events-none" />}
		</div>
	);
}

export default SmokeyBackground;
