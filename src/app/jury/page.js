"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, ShieldCheck, ExternalLink, Lock } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/utils/contexts/AuthContext";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function JuryPage() {
	const { user, loading: authLoading } = useAuth();
	const router = useRouter();

	const [queue, setQueue] = useState([]);
	const [selectedTeam, setSelectedTeam] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// 4x25 Rubric scoring fields
	const [scores, setScores] = useState({
		innovation: 20,
		technical: 20,
		design: 20,
		viability: 20,
	});
	const [feedback, setFeedback] = useState("");

	useEffect(() => {
		if (!authLoading && !user) {
			router.push("/login");
			return;
		}

		const fetchQueue = async () => {
			try {
				const res = await api.get("/api/jury/queue");
				const assignments = res.data?.queue || res.data?.assignments || [];
				setQueue(assignments);
				if (assignments.length > 0) {
					setSelectedTeam(assignments[0]);
				}
			} catch (err) {
				console.error("Failed to load jury queue:", err);
			} finally {
				setIsLoading(false);
			}
		};

		if (user) {
			fetchQueue();
		}
	}, [user, authLoading, router]);

	const totalScore = (Number(scores.innovation) || 0) +
		(Number(scores.technical) || 0) +
		(Number(scores.design) || 0) +
		(Number(scores.viability) || 0);

	const handleEvaluate = async (lockFinal = false) => {
		if (!selectedTeam) return;

		setIsSubmitting(true);
		try {
			await api.post("/api/jury/evaluate", {
				teamId: selectedTeam.team?.id || selectedTeam.teamId,
				innovation: Number(scores.innovation),
				technical: Number(scores.technical),
				design: Number(scores.design),
				viability: Number(scores.viability),
				feedback,
				lock: lockFinal,
			});

			toast.success(lockFinal ? "Evaluation locked & submitted!" : "Draft evaluation saved!");
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to submit evaluation");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (authLoading || isLoading) {
		return (
			<div className="min-h-screen bg-[#060a12] text-white flex flex-col items-center justify-center">
				<div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
				<p className="text-xs text-slate-400 font-orbitron">Loading Jury Queue...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#060a12] text-white px-4 py-12 relative overflow-hidden">
			<div className="absolute top-1/4 left-1/3 w-[600px] h-[400px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none" />

			<div className="max-w-6xl mx-auto space-y-8 relative z-10">
				{/* Top Bar */}
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Link
							href="/teamdetails"
							className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
						>
							<ArrowLeft className="w-4 h-4" />
						</Link>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-2xl font-bold font-orbitron text-white">Jury Evaluation Portal</h1>
								<span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-semibold">
									Official Judge
								</span>
							</div>
							<p className="text-xs text-slate-400">Evaluate assigned team submissions (4x25 Rubric)</p>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Assigned Queue */}
					<div className="space-y-4">
						<div className="p-4 bg-[#0d1525]/85 backdrop-blur-xl border border-white/10 rounded-xl">
							<h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
								Assigned Queue ({queue.length})
							</h2>

							{queue.length === 0 ? (
								<p className="text-xs text-slate-500 py-4 text-center">No teams currently assigned.</p>
							) : (
								<div className="space-y-2">
									{queue.map((item, idx) => {
										const team = item.team || item;
										const isSelected = selectedTeam?.id === item.id;
										return (
											<button
												key={item.id || idx}
												onClick={() => setSelectedTeam(item)}
												className={`w-full p-3 rounded-lg text-left text-xs transition-all border ${
													isSelected
														? "bg-purple-950/40 border-purple-500/50 text-white"
														: "bg-[#070c18] border-white/5 text-slate-300 hover:bg-white/5"
												}`}
											>
												<div className="font-semibold">{team.name}</div>
												<div className="text-[11px] text-slate-400">{team.track?.title || "General Track"}</div>
											</button>
										);
									})}
								</div>
							)}
						</div>
					</div>

					{/* Evaluation Panel */}
					<div className="lg:col-span-2 space-y-6">
						{selectedTeam ? (
							<div className="p-6 bg-[#0d1525]/85 backdrop-blur-xl border border-white/10 rounded-2xl space-y-6 shadow-xl">
								<div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
									<div>
										<h2 className="text-xl font-bold font-orbitron text-white">
											{selectedTeam.team?.name || selectedTeam.name}
										</h2>
										<p className="text-xs text-[#00c8ff]">
											{selectedTeam.team?.track?.title || "Assigned Problem Track"}
										</p>
									</div>

									{/* Submission Links */}
									<div className="flex items-center gap-2">
										{selectedTeam.team?.submission?.repoUrl && (
											<a
												href={selectedTeam.team.submission.repoUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center gap-1"
											>
												<span>GitHub</span> <ExternalLink className="w-3 h-3" />
											</a>
										)}
										{selectedTeam.team?.submission?.liveUrl && (
											<a
												href={selectedTeam.team.submission.liveUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="px-3 py-1.5 rounded-lg bg-[#00c8ff]/10 hover:bg-[#00c8ff]/20 border border-[#00c8ff]/30 text-xs text-[#00c8ff] flex items-center gap-1"
											>
												<span>Demo</span> <ExternalLink className="w-3 h-3" />
											</a>
										)}
									</div>
								</div>

								{/* 4x25 Rubric Sliders */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="p-4 rounded-xl bg-[#070c18] border border-white/10 space-y-2">
										<div className="flex justify-between text-xs">
											<span className="font-semibold text-slate-300">Innovation & Creativity</span>
											<span className="font-bold text-purple-400">{scores.innovation} / 25</span>
										</div>
										<input
											type="range"
											min={0}
											max={25}
											value={scores.innovation}
											onChange={(e) => setScores({ ...scores, innovation: Number(e.target.value) })}
											className="w-full accent-purple-500 cursor-pointer"
										/>
									</div>

									<div className="p-4 rounded-xl bg-[#070c18] border border-white/10 space-y-2">
										<div className="flex justify-between text-xs">
											<span className="font-semibold text-slate-300">Technical Execution</span>
											<span className="font-bold text-purple-400">{scores.technical} / 25</span>
										</div>
										<input
											type="range"
											min={0}
											max={25}
											value={scores.technical}
											onChange={(e) => setScores({ ...scores, technical: Number(e.target.value) })}
											className="w-full accent-purple-500 cursor-pointer"
										/>
									</div>

									<div className="p-4 rounded-xl bg-[#070c18] border border-white/10 space-y-2">
										<div className="flex justify-between text-xs">
											<span className="font-semibold text-slate-300">UI / UX & Design</span>
											<span className="font-bold text-purple-400">{scores.design} / 25</span>
										</div>
										<input
											type="range"
											min={0}
											max={25}
											value={scores.design}
											onChange={(e) => setScores({ ...scores, design: Number(e.target.value) })}
											className="w-full accent-purple-500 cursor-pointer"
										/>
									</div>

									<div className="p-4 rounded-xl bg-[#070c18] border border-white/10 space-y-2">
										<div className="flex justify-between text-xs">
											<span className="font-semibold text-slate-300">Commercial Viability</span>
											<span className="font-bold text-purple-400">{scores.viability} / 25</span>
										</div>
										<input
											type="range"
											min={0}
											max={25}
											value={scores.viability}
											onChange={(e) => setScores({ ...scores, viability: Number(e.target.value) })}
											className="w-full accent-purple-500 cursor-pointer"
										/>
									</div>
								</div>

								{/* Feedback Field */}
								<div className="space-y-1.5">
									<label className="text-xs font-semibold text-slate-300">Constructive Feedback Notes</label>
									<textarea
										rows={3}
										value={feedback}
										onChange={(e) => setFeedback(e.target.value)}
										placeholder="Strengths, architectural highlights, or improvement areas..."
										className="w-full p-3 rounded-lg bg-[#070c18] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
									/>
								</div>

								{/* Score Summary & Submit */}
								<div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
									<div className="flex items-center gap-2">
										<span className="text-xs text-slate-400">Computed Total:</span>
										<span className="text-2xl font-bold font-mono text-purple-300">{totalScore} / 100</span>
									</div>

									<div className="flex items-center gap-3">
										<button
											type="button"
											onClick={() => handleEvaluate(false)}
											disabled={isSubmitting}
											className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10"
										>
											Save Draft
										</button>
										<button
											type="button"
											onClick={() => handleEvaluate(true)}
											disabled={isSubmitting}
											className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all flex items-center gap-1.5"
										>
											<Lock className="w-3.5 h-3.5" />
											<span>Lock & Submit Score</span>
										</button>
									</div>
								</div>
							</div>
						) : (
							<div className="p-12 text-center text-slate-400 text-xs bg-[#0d1525]/85 rounded-xl border border-white/10">
								Select a team from the queue to start judging.
							</div>
						)}
					</div>
				</div>
			</div>
			<Toaster position="top-center" />
		</div>
	);
}
