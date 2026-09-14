import Image from "next/image";
import React from "react";
import {
	FaXTwitter,
	FaInstagram,
	FaLinkedin,
	FaGithub,
} from "react-icons/fa6";

import Logo from "./assets/prompt_techies_logo.png";
import cn from "@/utils/cn";
import Link from "next/link";
import SectionDividerBlur from "@/components/ui/section-divider-blur";

export default function Footer() {
	return (
		<footer className="relative bg-[#070c18] text-base overflow-hidden">
			{/* Seamless optical blur divider from Get In Touch */}
			<SectionDividerBlur className="absolute top-0 inset-x-0 -translate-y-1/2 z-20" />

			{/* Feathered top edge gradient mask */}
			<div className="pointer-events-none absolute inset-x-0 top-0 h-36 md:h-52 bg-gradient-to-b from-[#070c18] via-[#070c18]/80 to-transparent z-[5]" />

			<div className="relative z-10 bg-gradient-to-b from-[#070c18] via-[#050a14] to-[#040810] text-base">
				<div
					className={cn(
						"container mx-auto px-6 py-8",
						"flex flex-col gap-8 justify-between items-center"
					)}
				>
					<div className="flex flex-col-reverse gap-8 lg:flex-row w-full py-6">
						<div className="flex gap-4 flex-col flex-[1]">
							<div>
								<div className="flex gap-4">
									<Image
										src={Logo}
										width={200}
										className="select-none"
										alt="Prompt Techies Logo"
									/>
								</div>
								<p className="text-xl font-bold pt-4 text-inverse-on-surface">
									PROMPT TECHIES
									<br /> Building the AI Infrastructure of Tomorrow
									<br /> DPIIT Recognized Startup | MSME Registered
								</p>
							</div>
							<div>
								<p className="text-inverse-on-surface py-2 text-base">
									Follow us on Social Media for Updates
								</p>
								<div className="flex gap-2 sm:gap-4">
									<Link
										href="https://twitter.com/prompttechies"
										target="_blank"
										rel="noopener noreferrer"
										aria-label="Prompt Techies on X (Twitter)"
										className={cn(
											"text-4xl text-inverse-on-surface",
											" hover:text-secondary transition-all duration-200 ease-out",
											"p-2 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
										)}
									>
										<FaXTwitter />
									</Link>
									<Link
										href="https://www.instagram.com/prompt_techies"
										target="_blank"
										rel="noopener noreferrer"
										aria-label="Prompt Techies on Instagram"
										className={cn(
											"text-4xl text-inverse-on-surface",
											" hover:text-secondary transition-all duration-200 ease-out",
											"p-2 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
										)}
									>
										<FaInstagram />
									</Link>
									<Link
										href="https://www.linkedin.com/company/prompt-techies/"
										target="_blank"
										rel="noopener noreferrer"
										aria-label="Prompt Techies on LinkedIn"
										className={cn(
											"text-4xl text-inverse-on-surface",
											" hover:text-secondary transition-all duration-200 ease-out",
											"p-2 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
										)}
									>
										<FaLinkedin />
									</Link>
									<Link
										href="https://github.com/prompttechies-del"
										target="_blank"
										rel="noopener noreferrer"
										aria-label="Prompt Techies on GitHub"
										className={cn(
											"text-4xl text-inverse-on-surface",
											" hover:text-secondary transition-all duration-200 ease-out",
											"p-2 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
										)}
									>
										<FaGithub />
									</Link>
								</div>
							</div>
						</div>
						<div className="flex-[2] flex flex-col gap-4 justify-between">
							<div>
								<p className="text-inverse-on-surface text-2xl font-bold">
									<span className="text-secondary">&gt;</span> What
									We Do?
								</p>
								<p className="text-inverse-on-surface pl-5 text-lg">
									AI Workshops, Hackathons, Bootcamps & Startup Incubation — empowering students and startups with real-world tech skills and innovation pathways.
								</p>
							</div>
							<div>
								<p className="text-inverse-on-surface text-2xl font-bold">
									<span className="text-secondary">&gt;</span> Join
									Us on This Journey
								</p>
								<p className="text-inverse-on-surface pl-5 text-lg">
									Join Prompt Techies to learn, build, and innovate. Whether you're a curious beginner or a seasoned developer, our ecosystem of AI bootcamps, national hackathons, and startup incubation is built for builders like you.
								</p>
							</div>
						</div>
					</div>
					<div className="w-full flex flex-col justify-start items-start gap-4 lg:flex-row lg:justify-between">
						<Link
							href="/#about"
							className="text-inverse-on-surface/60 border-b-2 border-inverse-on-surface/30 transition-all duration-200 ease-out text-base hover:text-inverse-on-surface"
						>
							About ↗
						</Link>
						<Link
							href="/#tracks"
							className="text-inverse-on-surface/60 border-b-2 border-inverse-on-surface/30 transition-all duration-200 ease-out text-base hover:text-inverse-on-surface"
						>
							Tracks ↗
						</Link>
						<Link
							href="https://prompttechies.in"
							target="_blank"
							rel="noopener noreferrer"
							className="text-inverse-on-surface/60 border-b-2 border-inverse-on-surface/30 transition-all duration-200 ease-out text-base hover:text-inverse-on-surface"
						>
							Campus Chapters ↗
						</Link>
						<Link
							href="/#contact"
							className="text-inverse-on-surface/60 border-b-2 border-inverse-on-surface/30 transition-all duration-200 ease-out text-base hover:text-inverse-on-surface"
						>
							Contact Us ↗
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}
