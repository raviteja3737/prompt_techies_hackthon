"use client";

import React, { useState, useEffect } from "react";
import {
	ArrowLeft,
	ShieldCheck,
	ExternalLink,
	Lock,
	Github,
	Globe,
	Video,
	FileText,
	CheckCircle2,
	AlertTriangle,
} from "lucide-react";
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
	const [isLocked, setIsLocked] = useState(false);
	const [showLockModal, setShowLockModal] = useState(false);

	// 4x25 Rubric scoring fields
	const [scores, setScores] = useState({
		innovation: 20,
		technical: 20,
		design: 20,
		viability: 20,
	});
	const [feedback, setFeedback] = useState("");

	const handleSelectQueueItem = (item) => {
		setSelectedTeam(item);
		if (item?.evaluation) {
			setScores({
				innovation: item.evaluation.innovation ?? 20,
				technical: item.evaluation.technical ?? 20,
				design: item.evaluation.design ?? 20,
				viability: item.evaluation.viability ?? 20,
			});
			setFeedback(item.evaluation.feedback || "");
			setIsLocked(item.evaluation.status === "LOCKED" || item.status === "LOCKED");
		} else {
			setScores({ innovation: 20, technical: 20, design: 20, viability: 20 });
			setFeedback("");
			setIsLocked(item?.status === "LOCKED");
		}
	};

	useEffect(() => {
		if (!authLoading && !user) {
			router.push("/login");
			return;
		}

		if (!authLoading && user && user.role !== "JURY") {
			toast.error("Access restricted to Hackathon Jury.");
			router.push(user.role === "ADMIN" ? "/admin" : "/teamdetails");
			return;
		}

		const fetchQueue = async () => {
			try {
				const res = await api.get("/api/jury/queue");
				const assignments = res.data?.queue || res.data?.assignments || [];
				setQueue(assignments);
				if (assignments.length > 0) {
					handleSelectQueueItem(assignments[0]);
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

	const totalScore =
		(Number(scores.innovation) || 0) +
		(Number(scores.technical) || 0) +
		(Number(scores.design) || 0) +
		(Number(scores.viability) || 0);

	const handleEvaluate = async (lockFinal = false) => {
		if (!selectedTeam) return;

		setIsSubmitting(true);
		try {
			const res = await api.post("/api/jury/evaluate", {
				teamId: selectedTeam.team?.id || selectedTeam.teamId,
				innovation: Number(scores.innovation),
				technical: Number(scores.technical),
				design: Number(scores.design),
				viability: Number(scores.viability),
				feedback,
				lock: lockFinal,
			});

			if (lockFinal) {
				setIsLocked(true);
				toast.success("Evaluation locked & submitted permanently!");
			} else {
				toast.success("Draft evaluation saved!");
			}

			// Synchronize queue item state
			setQueue((prev) =>
				prev.map((item) => {
					const id = item.team?.id || item.teamId;
					const targetId = selectedTeam.team?.id || selectedTeam.teamId;
					if (id === targetId) {
						return {
							...item,
							status: lockFinal ? "LOCKED" : "DRAFT",
							evaluation: res.data?.evaluation || {
								...item.evaluation,
								innovation: Number(scores.innovation),
								technical: Number(scores.technical),
								design: Number(scores.design),
								viability: Number(scores.viability),
								feedback,
								status: lockFinal ? "LOCKED" : "DRAFT",
							},
						};
					}
					return item;
				})
			);
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to submit evaluation");
		} finally {
			setIsSubmitting(false);
		}
	};

	const submission = selectedTeam?.submission || selectedTeam?.team?.submission;

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
										const isSelected =
											(selectedTeam?.team?.id || selectedTeam?.id) === (item.team?.id || item.id);
										const itemLocked =
											item.status === "LOCKED" || item.evaluation?.status === "LOCKED";

										return (
											<button
												key={item.id || item.assignmentId || idx}
												onClick={() => handleSelectQueueItem(item)}
												className={`w-full p-3 rounded-lg text-left text-xs transition-all border ${
													isSelected
														? "bg-purple-950/40 border-purple-500/50 text-white"
														: "bg-[#070c18] border-white/5 text-slate-300 hover:bg-white/5"
												}`}
											>
												<div className="flex items-center justify-between">
													<span className="font-semibold">{team.name}</span>
													{itemLocked && (
														<span className="text-[10px] text-purple-400 font-mono font-bold flex items-center gap-1">
															<Lock className="w-2.5 h-2.5" /> Sealed
														</span>
													)}
												</div>
												<div className="text-[11px] text-slate-400">
													{item.track?.title || team.track?.title || "General Track"}
												</div>
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
								{/* Team Header & Deliverables */}
								<div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
									<div>
										<div className="flex items-center gap-2">
											<h2 className="text-xl font-bold font-orbitron text-white">
												{selectedTeam.team?.name || selectedTeam.name}
											</h2>
											{isLocked && (
												<span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold">
													Evaluation Locked 🔒
												</span>
											)}
										</div>
										<p className="text-xs text-[#00c8ff]">
											{selectedTeam.track?.title || selectedTeam.team?.track?.title || "Assigned Problem Track"}
										</p>
									</div>

									{/* Submission Deliverables Links */}
									<div className="flex flex-wrap items-center gap-2">
										{submission?.repoUrl && (
											<a
												href={submission.repoUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
											>
												<Github className="w-3.5 h-3.5" />
												<span>GitHub Repo</span>
												<ExternalLink className="w-3 h-3" />
											</a>
										)}
										{submission?.liveUrl && (
											<a
												href={submission.liveUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="px-3 py-1.5 rounded-lg bg-[#00c8ff]/10 hover:bg-[#00c8ff]/20 border border-[#00c8ff]/30 text-xs text-[#00c8ff] flex items-center gap-1.5 transition-colors"
											>
												<Globe className="w-3.5 h-3.5" />
												<span>Live Demo</span>
												<ExternalLink className="w-3 h-3" />
											</a>
										)}
										{submission?.videoUrl && (
											<a
												href={submission.videoUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs text-red-400 flex items-center gap-1.5 transition-colors"
											>
												<Video className="w-3.5 h-3.5" />
												<span>Video</span>
												<ExternalLink className="w-3 h-3" />
											</a>
										)}
										{(submission?.pitchDeckUrl || submission?.pitchDeckKey) && (
											<a
												href={submission.pitchDeckUrl || `/api/team/submission/pitch-deck-url?teamId=${selectedTeam.team?.id || selectedTeam.id}`}
												target="_blank"
												rel="noopener noreferrer"
												className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-xs text-purple-300 flex items-center gap-1.5 transition-colors"
											>
												<FileText className="w-3.5 h-3.5" />
												<span>Pitch Deck</span>
												<ExternalLink className="w-3 h-3" />
											</a>
										)}
									</div>
								</div>

								{/* Locked Warning Banner */}
								{isLocked && (
									<div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs text-purple-300 flex items-center gap-2">
										<Lock className="w-4 h-4 text-purple-400 flex-shrink-0" />
										<span>
											Evaluation Locked: This evaluation has been submitted and sealed. Rubric scores and notes are now read-only.
										</span>
									</div>
								)}

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
											disabled={isLocked || isSubmitting}
											value={scores.innovation}
											onChange={(e) => setScores({ ...scores, innovation: Number(e.target.value) })}
											className="w-full accent-purple-500 cursor-pointer disabled:opacity-50"
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
											disabled={isLocked || isSubmitting}
											value={scores.technical}
											onChange={(e) => setScores({ ...scores, technical: Number(e.target.value) })}
											className="w-full accent-purple-500 cursor-pointer disabled:opacity-50"
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
											disabled={isLocked || isSubmitting}
											value={scores.design}
											onChange={(e) => setScores({ ...scores, design: Number(e.target.value) })}
											className="w-full accent-purple-500 cursor-pointer disabled:opacity-50"
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
											disabled={isLocked || isSubmitting}
											value={scores.viability}
											onChange={(e) => setScores({ ...scores, viability: Number(e.target.value) })}
											className="w-full accent-purple-500 cursor-pointer disabled:opacity-50"
										/>
									</div>
								</div>

								{/* Feedback Field */}
								<div className="space-y-1.5">
									<label className="text-xs font-semibold text-slate-300">Constructive Feedback Notes</label>
									<textarea
										rows={3}
										disabled={isLocked || isSubmitting}
										value={feedback}
										onChange={(e) => setFeedback(e.target.value)}
										placeholder="Strengths, architectural highlights, or improvement areas..."
										className="w-full p-3 rounded-lg bg-[#070c18] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 disabled:opacity-60"
									/>
								</div>

								{/* Score Summary & Actions */}
								<div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
									<div className="flex items-center gap-2">
										<span className="text-xs text-slate-400">Computed Total:</span>
										<span className="text-2xl font-bold font-mono text-purple-300">{totalScore} / 100</span>
									</div>

									{isLocked ? (
										<div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold px-4 py-2 rounded-lg bg-purple-950/40 border border-purple-500/30">
											<Lock className="w-3.5 h-3.5" />
											<span>Evaluation Sealed</span>
										</div>
									) : (
										<div className="flex items-center gap-3">
											<button
												type="button"
												onClick={() => handleEvaluate(false)}
												disabled={isSubmitting}
												className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-50"
											>
												{isSubmitting ? "Saving..." : "Save Draft"}
											</button>
											<button
												type="button"
												onClick={() => setShowLockModal(true)}
												disabled={isSubmitting}
												className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
											>
												<Lock className="w-3.5 h-3.5" />
												<span>Lock & Submit Score</span>
											</button>
										</div>
									)}
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

			{/* Lock Confirmation Modal */}
			{showLockModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
					<div className="w-full max-w-md p-6 bg-[#0d1525] border border-purple-500/40 rounded-2xl shadow-2xl space-y-4">
						<div className="flex items-center gap-3 text-purple-400">
							<Lock className="w-6 h-6" />
							<h3 className="text-lg font-bold font-orbitron text-white">Confirm Score Lock</h3>
						</div>
						<p className="text-xs text-slate-300 leading-relaxed">
							Are you sure you want to permanently submit and lock this evaluation for{" "}
							<span className="text-purple-300 font-bold">
								{selectedTeam?.team?.name || selectedTeam?.name}
							</span>
							?
						</p>
						<div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs space-y-1">
							<div className="flex justify-between text-slate-300">
								<span>Total Rubric Score:</span>
								<span className="font-mono font-bold text-purple-300">{totalScore} / 100</span>
							</div>
						</div>
						<p className="text-xs text-amber-400/90 font-medium bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/20">
							⚠️ Warning: Once locked, your evaluation score is final, sealed, and cannot be updated. It will directly update the official leaderboard.
						</p>
						<div className="flex items-center justify-end gap-3 pt-2">
							<button
								type="button"
								onClick={() => setShowLockModal(false)}
								disabled={isSubmitting}
								className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={async () => {
									await handleEvaluate(true);
									setShowLockModal(false);
								}}
								disabled={isSubmitting}
								className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all flex items-center gap-1.5 cursor-pointer"
							>
								<Lock className="w-3.5 h-3.5" />
								<span>{isSubmitting ? "Locking..." : "Confirm & Lock Permanently"}</span>
							</button>
						</div>
					</div>
				</div>
			)}

			<Toaster position="top-center" />
		</div>
	);
}
