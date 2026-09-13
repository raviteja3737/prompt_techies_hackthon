"use client";

import React, { useEffect } from "react";
import TypingEffect2 from "@/app/TypingEffect2";
import "../styles/registration.css";
import { FaInstagram, FaLinkedin, FaGithub } from "react-icons/fa6";
import { Sparkles, Users, ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/utils/contexts/AuthContext";
import { SOCIAL_LINKS } from "@/utils/socialLinks";
import Link from "next/link";

const RegisterPage = () => {
	const router = useRouter();
	const { user, isRegistered } = useAuth();

	useEffect(() => {
		if (user && isRegistered) {
			router.push("/teamdetails");
		}
	}, [user, isRegistered, router]);

	return (
		<div className="min-h-screen bg-[#060a12] text-white flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
			{/* Neon Glow Accents */}
			<div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#004bff]/20 blur-[140px] rounded-full pointer-events-none" />
			<div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-[#00c8ff]/15 blur-[120px] rounded-full pointer-events-none" />

			<div className="w-full max-w-lg p-8 space-y-8 bg-[#0d1525]/85 backdrop-blur-xl border border-[#00c8ff]/30 rounded-2xl shadow-[0_0_40px_rgba(0,200,255,0.15)] relative z-10 text-center">
				<div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#00c8ff]/30 bg-[#00c8ff]/10 text-[#00c8ff] text-xs font-semibold tracking-wider uppercase">
					<Sparkles className="w-3.5 h-3.5" /> Promptathon 2026 Registration
				</div>

				<div className="space-y-2">
					<h1 className="text-3xl lg:text-4xl font-bold font-orbitron text-white">
						Build Future-Ready AI
					</h1>
					<p className="text-slate-300 text-sm">
						Register your <strong>3-Member Team</strong> (1 Team Leader + 2 Team Members) for Promptathon 2026!
					</p>
				</div>

				<div className="p-4 rounded-xl bg-[#070c18] border border-white/10 text-left space-y-2 text-xs text-slate-300">
					<p className="font-semibold text-white flex items-center gap-1.5 text-sm">
						<Users className="w-4 h-4 text-[#00c8ff]" /> Team Format Requirements:
					</p>
					<ul className="list-disc pl-5 space-y-1 text-slate-300">
						<li>Every team must consist of exactly <strong>3 members</strong>.</li>
						<li>The Team Leader signs up first and registers the team roster.</li>
						<li>All 3 members must provide College/University, Branch, and Roll Number.</li>
					</ul>
				</div>

				<div className="space-y-3 pt-2">
					<Link
						href="/login"
						className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-[#004bff] to-[#00c8ff] hover:shadow-[0_0_25px_rgba(0,200,255,0.4)] transition-all flex items-center justify-center gap-2 text-sm"
					>
						<span>Proceed to Register / Login</span>
						<ArrowRight className="w-4 h-4" />
					</Link>
				</div>

				<hr className="border-white/10" />

				<div className="space-y-3">
					<p className="text-xs text-slate-400">
						Follow Prompt Techies for hackathon tracks, updates & announcements:
					</p>
					<div className="flex justify-center gap-4">
						{SOCIAL_LINKS.instagram && (
							<a
								href={SOCIAL_LINKS.instagram}
								target="_blank"
								rel="noopener noreferrer"
								className="p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-pink-400 hover:border-pink-400/50 transition-all"
								aria-label="Instagram"
							>
								<FaInstagram size={18} />
							</a>
						)}
						{SOCIAL_LINKS.hackathonLinkedin && (
							<a
								href={SOCIAL_LINKS.hackathonLinkedin}
								target="_blank"
								rel="noopener noreferrer"
								className="p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-blue-400 hover:border-blue-400/50 transition-all"
								aria-label="LinkedIn"
							>
								<FaLinkedin size={18} />
							</a>
						)}
						{SOCIAL_LINKS.github && (
							<a
								href={SOCIAL_LINKS.github}
								target="_blank"
								rel="noopener noreferrer"
								className="p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/50 transition-all"
								aria-label="GitHub"
							>
								<FaGithub size={18} />
							</a>
						)}
					</div>

					<div>
						<button
							type="button"
							onClick={() => router.push("/")}
							className="text-xs text-slate-400 hover:text-[#00c8ff] transition-colors"
						>
							&larr; Return to Promptathon Home
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default RegisterPage;

