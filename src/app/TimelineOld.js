"use client";

import cn from "@/utils/cn";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { FaLightbulb, FaLock } from "react-icons/fa6";
import { BiSolidParty } from "react-icons/bi";
import { GoMultiSelect } from "react-icons/go";
import { motion, useScroll, useTransform } from "framer-motion";

import "./timeline-styles.css";
import StackedText from "@/components/StackedText";

export default function Timeline() {
	const [width, setWidth] = useState(
		typeof window !== "undefined" ? window.innerWidth : 0
	);

	useEffect(() => {
		const handleWindowSizeChange = () => setWidth(window.innerWidth);
		window.addEventListener("resize", handleWindowSizeChange);
		return () => {
			window.removeEventListener("resize", handleWindowSizeChange);
		};
	}, []);

	const listRef = useRef(null);
	const { scrollYProgress } = useScroll({
		target: listRef,
		offset: ["start start", "end end"],
	});

	const timelineProgress = useTransform(scrollYProgress, [0, 1], [0.1, 0.8], {
		clamp: true,
	});

	const isMobile = width && width <= 1024;
	return (
		<div
			className={cn(
				"overflow-hidden timeline-background w-full bg-gradient-to-b from-[#080f1e] via-[#0c162d] to-[#060a15] text-white",
				"py-20 px-4 md:px-12",
				"relative"
			)}
		>
			<div className="text-center mb-4">
				<StackedText text="Timeline" fontSize="72px" />
				<p className="text-sky-200/80 text-base md:text-lg max-w-xl mx-auto mt-4 font-medium">
					Key milestones and schedule for <span className="text-[#00c8ff] font-semibold">Promptathon 2026</span>
				</p>
			</div>
			<div
				className={cn("w-full py-8 ok", "flex flex-col-reverse gap-y-12")}
				ref={listRef}
			>
				<div className="lg:px-20 lg:flex lg:items-center lg:justify-center">
					<ol
						className={cn(
							"relative border-s border-[#00c8ff]/40 border-l-2 lg:border-none",
							"lg:grid lg:grid-cols-2 lg:max-w-[80%]"
						)}
					>
						<motion.div
							id="progress"
							style={{
								scaleY: timelineProgress,
							}}
						></motion.div>
						<div></div>
						<TimelineItem
							date="30th September 2026"
							title="Preptember Begins"
							content="Preptember is the official preparation month for Promptathon. Delve into prompt engineering, LLM workflows, and master the tools for the upcoming hackathon."
							link="/preptember"
							icon={<FaLightbulb fontSize={12} />}
							multiplier={1}
						/>
						<TimelineItem
							date="8th October 2026"
							title="Registrations Open"
							content="Registrations for Promptathon 2026 officially open online. Assemble your team and reserve your spot."
							icon={<BiSolidParty fontSize={12} />}
							multiplier={isMobile ? 1 : -1}
						/>
						<div></div>
						<div></div>
						<TimelineItem
							date="24th October 2026"
							title="Registrations Close"
							content="Registrations close. Team rosters and problem statement tracks are finalized."
							icon={<GoMultiSelect fontSize={12} />}
							multiplier={1}
						/>
						<TimelineItem
							date="26th October 2026"
							title="Day 1 Begins"
							content={
								<>
									4:00 PM - Opening Ceremony
									<br />
									6:00 PM - Problem Statements Released
									<br />
									6:45 PM - Track Finalization
									<br />
									7:15 PM - Hacking Begins
									<br />
									2:00 AM - Midnight Mentor Sync
								</>
							}
							icon={<BiSolidParty fontSize={12} />}
							multiplier={isMobile ? 1 : -1}
						/>
						<div></div>
						<div></div>
						<TimelineItem
							date="27th October 2026"
							title="Day 2 & Finale"
							content={
								<>
									9:30 AM - Morning Check-in
									<br />
									2:00 PM - Project Submissions Open
									<br />
									2:30 PM - Submissions Close
									<br />
									3:30 PM - Live Demos & Judging
									<br />
									8:30 PM - Awards Ceremony
								</>
							}
							icon={<BiSolidParty fontSize={12} />}
							multiplier={1}
						/>
					</ol>
				</div>
			</div>
		</div>
	);
}

function TimelineItem({ date, title, content, link, icon, multiplier = 1 }) {
	const [width, setWidth] = useState(null);

	useEffect(() => {
		const handleResize = () => setWidth(window.innerWidth);
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const isMobile = width && width <= 1024;

	return (
		<motion.li
			className="mb-10 ms-4 lg:flex timeline-item"
			initial={{ opacity: 0, x: isMobile ? 100 : 100 * multiplier }}
			whileInView={{ opacity: 1, x: 0 }}
			viewport={{ once: true, amount: 0.5 }}
			transition={{ duration: 0.5 }}
		>
			{/* Node dot: light green and black */}
			<div className="flex justify-center items-center absolute w-7 h-7 bg-[#070e09] rounded-full mt-2 -start-3.5 border-2 border-[#4ade80] text-[#4ade80] shadow-[0_0_14px_rgba(74,222,128,0.7)] z-20">
				{icon}
			</div>
			<div className="my-auto">
				<time className="mb-1.5 text-xs sm:text-sm font-mono font-bold leading-none text-[#00c8ff] uppercase tracking-wider block">
					{date}
				</time>
				<h3 className="text-xl font-bold font-orbitron text-white mb-2">{title}</h3>
				<div className="mb-4 text-sm font-normal text-slate-300 leading-relaxed">
					{content}
				</div>
				{link && (
					<Link
						href={link}
						className={cn(
							"inline-flex items-center px-4 py-2",
							"text-xs font-semibold rounded-full",
							"text-white bg-[#004bff] border border-blue-400/40",
							"hover:bg-[#003cb3] hover:shadow-[0_0_16px_rgba(0,200,255,0.4)] transition-all",
							"focus:outline-none focus:ring-2 focus:ring-cyan-400"
						)}
					>
						Learn more{" "}
						<svg
							className="w-4 h-4 ms-2 rtl:rotate-180"
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 14 10"
						>
							<path
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M1 5h12m0 0L9 1m4 4L9 9"
							/>
						</svg>
					</Link>
				)}
			</div>
		</motion.li>
	);
}
