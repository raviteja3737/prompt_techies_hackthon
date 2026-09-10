"use client";

import React, { useEffect, useRef } from "react";
import { motion, useInView, useAnimation } from "framer-motion";
import "./styles/timer.css";
import StackedText from "./StackedText";
import { AnimatedCountdown } from "@/components/ui/animated-countdown";
import SmokeyBackground from "@/components/ui/smokey-background";

const Timer = ({
	launchDate = "2026-09-26T16:00:00",
	variant = "modern",
	size = "lg",
}) => {
	const ref = useRef(null);
	const isInView = useInView(ref, { amount: 0.1, once: true });
	const controls = useAnimation();

	useEffect(() => {
		if (isInView) {
			controls.start("visible");
		}
	}, [isInView, controls]);

	return (
		<div suppressHydrationWarning className="w-full">
			<section
				ref={ref}
				className="py-24 bg-[#070c18] relative w-full flex flex-col justify-between items-center overflow-hidden"
			>
				{/* Interactive WebGL Smokey / Foggy Background */}
				<SmokeyBackground color="#004bff" className="opacity-75" />

				<div className="relative z-10 w-full flex flex-col items-center justify-center px-4">
					<h1 className="text-4xl w-full text-center flex flex-col items-center justify-center">
						<StackedText text="Coming Soon" fontSize="75px" />
						<span className="text-sky-200/90 text-xl md:text-2xl font-semibold mt-6 tracking-wide">
							Next Event Begins In..
						</span>
					</h1>
					<div className="flex flex-col w-full justify-center items-center mt-8">
						<aside className="w-full text-center flex items-center justify-center px-4">
							<AnimatedCountdown
								targetDate={launchDate}
								variant={variant}
								size={size}
								className="shadow-[0_20px_50px_rgba(0,75,255,0.25)] border-primary/40 bg-black/40 backdrop-blur-xl"
							/>
						</aside>
					</div>
				</div>
			</section>
		</div>
	);
};

export default Timer;
