"use client";
import React from "react";
import Boxes from "@/components/ui/background-boxes";
import cn from "@/utils/cn";
import TypingEffect2 from "./TypingEffect2";
import Link from "next/link";
import { useAuth } from "@/utils/contexts/AuthContext";

export default function HeroMod() {
	const { user } = useAuth();

	return (
		<div
			style={{ backgroundColor: "#0a0a0a" }}
			className="h-[90vh] md:h-[100vh] relative w-full overflow-hidden bg-slate-900 flex flex-col items-center justify-center"
		>
			<div
				style={{ backgroundColor: "#0a0a0a" }}
				className="absolute inset-0 w-full h-full z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none"
			/>
			<Boxes />
			<div className="relative z-20 flex flex-col items-center pointer-events-none px-4">
				{/* Transparent Logo */}
				<div className="flex flex-row items-center justify-center mb-2">
					<img
						src="/assets/prompt_techies_logo.png"
						alt="Prompt Techies"
						className="h-[95px] md:h-[170px] w-auto object-contain drop-shadow-[0_0_35px_rgba(0,200,255,0.4)]"
					/>
				</div>

				{/* Promptathon Title */}
				<h1 className="font-orbitron md:text-6xl text-4xl text-center text-white my-6 font-bold tracking-wider drop-shadow-[0_0_25px_rgba(0,200,255,0.3)]">
					<TypingEffect2
						text="Promptathon 2026"
						speed={70}
					/>
				</h1>

				{/* Single Tagline — exactly matching the reference */}
				<p className="text-center mt-2 text-secondary text-lg md:text-xl font-medium tracking-wide">
					<span className="text-secondary font-bold mr-1.5">&gt;</span> The{" "}
					<span className="text-white font-semibold">Biggest</span> AI Hackathon by{" "}
					<span className="text-white font-semibold">Prompt Techies!</span>
				</p>

				{/* Single Action Button */}
				<div className="flex flex-col items-center justify-center mt-8 w-[30vh] pointer-events-auto">
					{user ? (
						<Link
							href="/teamdetails"
							className={cn(
								"bg-[#0a0a0a]/80 text-center border-secondary border-2 md:h-[7vh] text-secondary",
								"px-8 py-2 rounded-full mt-4 hover:bg-secondary hover:text-[#0a0a0a]",
								"transition-all duration-300 shadow-primary-glow hover:shadow-primary-glow-hover",
								"flex flex-col justify-center items-center font-semibold text-lg"
							)}
						>
							<span>Team Details</span>
						</Link>
					) : (
						<Link
							href="https://forms.gle/L2rvjg4DvLUY6PR26"
							target="_blank"
							className={cn(
								"bg-[#0a0a0a]/80 text-center border-secondary border-2 md:h-[7vh] text-secondary",
								"px-8 py-2 rounded-full mt-4 hover:bg-secondary hover:text-[#0a0a0a]",
								"transition-all duration-300 shadow-primary-glow hover:shadow-primary-glow-hover",
								"flex flex-col justify-center items-center font-semibold text-lg"
							)}
						>
							<span>Register Now</span>
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}
