"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useInView, useAnimation } from "framer-motion";
import "./styles/timer.css";
import StackedTextDark from "./StackedTextdark";

const getTimeLeft = (expiry) => {
	let days = "0";
	let hours = "0";
	let minutes = "0";
	let seconds = "0";
	const difference = new Date(expiry).getTime() - new Date().getTime();
	if (difference <= 0) {
		return { days, hours, minutes, seconds };
	}
	const ds = Math.floor(difference / (1000 * 60 * 60 * 24));
	const hs = Math.floor((difference / (1000 * 60 * 60)) % 24);
	const ms = Math.floor((difference / (1000 * 60)) % 60);
	const ss = Math.floor((difference / 1000) % 60);
	days = ds < 10 ? `0${ds}` : ds.toString();
	hours = hs < 10 ? `0${hs}` : hs.toString();
	minutes = ms < 10 ? `0${ms}` : ms.toString();
	seconds = ss < 10 ? `0${ss}` : ss.toString();
	return { days, hours, minutes, seconds };
};

const Timer = ({ launchDate = "2026-09-26T16:00:00" }) => {
	const [timeLeft, setTimeLeft] = useState(getTimeLeft(launchDate));
	const [mounted, setMounted] = useState(false);
	const ref = useRef(null);
	const isInView = useInView(ref, { amount: 0.1, once: true });
	const controls = useAnimation();

	useEffect(() => {
		setMounted(true);
		let frame;
		const update = () => {
			setTimeLeft(getTimeLeft(launchDate));
			frame = requestAnimationFrame(update);
		};
		frame = requestAnimationFrame(update);
		return () => cancelAnimationFrame(frame);
	}, [launchDate]);

	useEffect(() => {
		if (isInView) {
			controls.start("visible");
		}
	}, [isInView, controls]);

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				when: "beforeChildren",
				staggerChildren: 0.1,
			},
		},
	};

	const itemVariants = {
		hidden: { y: 50, opacity: 0 },
		visible: {
			y: 0,
			opacity: 1,
			transition: {
				type: "spring",
				stiffness: 100,
				damping: 15,
			},
		},
	};

	return (
		<div suppressHydrationWarning className="w-full">
			<section
				ref={ref}
				className="py-20 bg-surface-container-low timer-gradient-bg w-full flex flex-col justify-between items-center"
			>
				<h1 className="text-4xl w-full text-center flex flex-col items-center justify-center">
					<StackedTextDark text="Coming Soon" fontSize="75px" />
					<span className="text-on-surface text-xl md:text-2xl font-semibold mt-6 tracking-wide">
						Next Event Begins In..
					</span>
				</h1>
				<div className="flex-col w-full justify-between items-center lg:flex-row mt-6">
					<aside className="w-full text-center flex items-center justify-center">
						<motion.div
							className="lg:flex-row flex flex-col justify-center items-center gap-4 px-4"
							variants={containerVariants}
							initial="hidden"
							animate={controls}
						>
							{[
								{ value: mounted ? timeLeft.days : "16", label: "Days" },
								{ value: mounted ? timeLeft.hours : "00", label: "Hours" },
								{ value: mounted ? timeLeft.minutes : "00", label: "Minutes" },
								{ value: mounted ? timeLeft.seconds : "00", label: "Seconds" },
							].map((item) => (
								<motion.span
									key={item.label}
									variants={itemVariants}
									className="flex flex-col justify-center items-center bg-primary text-on-primary text-5xl lg:w-36 w-56 py-5 shadow-primary-glow rounded-xl hover:shadow-primary-glow-hover transition-all duration-200"
								>
									<span className="font-bold tracking-wider">{item.value}</span>
									<small className="text-xs lg:text-sm uppercase font-semibold text-on-primary/80 mt-1 tracking-widest">
										{item.label}
									</small>
								</motion.span>
							))}
						</motion.div>
					</aside>
				</div>
			</section>
		</div>
	);
};

export default Timer;
