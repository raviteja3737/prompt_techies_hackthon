"use client";

import React, { useState } from "react";
import StackedTextDark from "./StackedTextdark";
import CardFanCarousel from "@/components/ui/card-fan-carousel";
import GradientBlurBg from "@/components/ui/gradient-blur-bg";
import Link from "next/link";

const TRACKS_DATA = [
	{
		id: "track-llm",
		trackNumber: "TRACK 01",
		badge: "Generative AI",
		title: "LLM & OpenAI",
		description:
			"Build next-gen generative AI apps using OpenAI GPT-4o, advanced prompting, RAG architectures, and autonomous reasoning agents.",
		tags: ["LLMs", "OpenAI", "GPT-4o", "RAG", "Prompting"],
		icon: "ri-brain-line",
		accentColor: "#004bff",
		linkUrl: "/register",
	},
	{
		id: "track-automation",
		trackNumber: "TRACK 02",
		badge: "Autonomous Agents",
		title: "Automation",
		description:
			"Architect autonomous agent workflows, task pipelines, and intelligent automations that streamline operations and eliminate manual friction.",
		tags: ["AutoGPT", "CrewAI", "LangChain", "Workflows", "Agents"],
		icon: "ri-robot-2-line",
		accentColor: "#00c8ff",
		linkUrl: "/register",
	},
	{
		id: "track-aiml",
		trackNumber: "TRACK 03",
		badge: "Machine Learning",
		title: "AI & ML",
		description:
			"Deploy predictive neural networks, computer vision models, and intelligent data systems designed to solve complex real-world challenges.",
		tags: ["Machine Learning", "Neural Nets", "Computer Vision", "PyTorch"],
		icon: "ri-cpu-line",
		accentColor: "#3b82f6",
		linkUrl: "/register",
	},
];

const CATEGORIES = ["All", "Generative AI", "Autonomous Agents", "AI & ML"];

const Tracks = () => {
	const [selectedCategory, setSelectedCategory] = useState("All");

	const filteredTracks = selectedCategory === "All"
		? TRACKS_DATA
		: TRACKS_DATA.filter((t) => {
			if (selectedCategory === "Generative AI") return t.badge.toLowerCase().includes("generative");
			if (selectedCategory === "Autonomous Agents") return t.badge.toLowerCase().includes("autonomous");
			if (selectedCategory === "AI & ML") return t.title.toLowerCase().includes("ml") || t.badge.toLowerCase().includes("machine");
			return true;
		});

	return (
		<GradientBlurBg className="py-24 px-4 md:px-8">
			<div className="tracks-section flex flex-col items-center justify-between relative overflow-hidden">
				{/* Section Header */}
				<div className="w-full text-center flex flex-col items-center justify-center mb-6">
					<StackedTextDark text="Tracks" fontSize="65px" />
					<p className="text-slate-300 text-base md:text-lg font-medium mt-4 max-w-2xl px-4">
						Explore the core innovation domains of <span className="text-[#00c8ff] font-semibold">Promptathon 2026</span>. Pick your track, build the future, and compete for top prizes!
					</p>
				</div>

				{/* Category Filter Tabs */}
				<div className="flex flex-wrap items-center justify-center gap-2 mb-8 z-20">
					{CATEGORIES.map((cat) => (
						<button
							key={cat}
							onClick={() => setSelectedCategory(cat)}
							className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 ${
								selectedCategory === cat
									? "bg-[#00c8ff] text-black shadow-[0_0_15px_rgba(0,200,255,0.4)]"
									: "bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
							}`}
						>
							{cat}
						</button>
					))}
				</div>

				{/* Interactive Fan Carousel Component */}
				<div className="w-full flex justify-center items-center">
					<CardFanCarousel cards={filteredTracks} />
				</div>

				{/* Register CTA */}
				<div className="mt-8 flex items-center justify-center">
					<Link
						href="/register"
						className="bg-primary text-on-primary rounded-full px-8 py-3 text-sm font-semibold tracking-wide shadow-primary-glow hover:shadow-primary-glow-hover hover:bg-primary-container transition-all duration-200"
					>
						Choose Your Track & Register
					</Link>
				</div>
			</div>
		</GradientBlurBg>
	);
};

export default Tracks;
