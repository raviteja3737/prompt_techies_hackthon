"use client";

import React from "react";
import StackedTextDark from "./StackedTextdark";
import CardFanCarousel from "@/components/ui/card-fan-carousel";

const TRACKS_DATA = [
	{
		id: "track-llm",
		trackNumber: "TRACK 01",
		badge: "Generative AI",
		title: "LLM & OpenAI",
		description:
			"Build advanced applications using Large Language Models, OpenAI GPT-4o, prompt engineering, agentic reasoning, and retrieval-augmented generation (RAG).",
		tags: ["LLMs", "OpenAI", "GPT-4o", "RAG", "Prompting"],
		icon: "ri-brain-line",
		accentColor: "#004bff",
	},
	{
		id: "track-automation",
		trackNumber: "TRACK 02",
		badge: "Autonomous Agents",
		title: "Automation",
		description:
			"Design autonomous systems, multi-agent frameworks, task workflows, and smart robotic automations that eliminate repetitive manual operations.",
		tags: ["AutoGPT", "CrewAI", "LangChain", "Workflows", "Agents"],
		icon: "ri-robot-2-line",
		accentColor: "#00c8ff",
	},
	{
		id: "track-aiml",
		trackNumber: "TRACK 03",
		badge: "Machine Learning",
		title: "AI & ML",
		description:
			"Train and deploy predictive models, neural architectures, computer vision pipelines, and intelligent data systems that solve real-world problems.",
		tags: ["Machine Learning", "Neural Nets", "Computer Vision", "PyTorch"],
		icon: "ri-cpu-line",
		accentColor: "#3b82f6",
	},
];

const Tracks = () => {
	return (
		<div className="tracks-section flex flex-col items-center justify-between bg-surface-container-low py-16 px-4 md:px-8 relative overflow-hidden">
			{/* Section Header */}
			<div className="w-full text-center flex flex-col items-center justify-center mb-6">
				<StackedTextDark text="Tracks" fontSize="65px" />
				<p className="text-on-surface-variant text-base md:text-lg font-medium mt-4 max-w-2xl px-4">
					Explore the core innovation domains of <span className="text-primary font-semibold">Promptathon 2026</span>. Pick your track, build the future, and compete for top prizes!
				</p>
			</div>

			{/* Interactive Fan Carousel Component */}
			<div className="w-full flex justify-center items-center">
				<CardFanCarousel cards={TRACKS_DATA} />
			</div>

			{/* Register CTA */}
			<div className="mt-8 flex items-center justify-center">
				<a
					href="/register"
					className="bg-primary text-on-primary rounded-full px-8 py-3 text-sm font-semibold tracking-wide shadow-primary-glow hover:shadow-primary-glow-hover hover:bg-primary-container transition-all duration-200"
				>
					Choose Your Track & Register
				</a>
			</div>
		</div>
	);
};

export default Tracks;
