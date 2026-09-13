"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	User,
	Users,
	Crown,
	Sparkles,
	ShieldCheck,
	CheckCircle2,
	PlusCircle,
	LogOut,
	Layers,
	Mail,
	ArrowRight,
	ExternalLink,
	Lock,
	Award,
	Send,
	Radio,
	FileText,
	Copy,
	Check,
} from "lucide-react";
import "../styles/registration.css";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/utils/contexts/AuthContext";

export default function TeamDetails() {
	const { user, loading: authLoading, logout, refreshUserData } = useAuth();
	const router = useRouter();

	const [teamData, setTeamData] = useState(null);
	const [myRole, setMyRole] = useState("MEMBER");
	const [tracks, setTracks] = useState([]);
	const [selectedTrackId, setSelectedTrackId] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isLockingTrack, setIsLockingTrack] = useState(false);
	const [joinCodeInput, setJoinCodeInput] = useState("");
	const [isJoining, setIsJoining] = useState(false);
	const [copied, setCopied] = useState(false);

	const fetchTeamAndTracks = useCallback(async () => {
		if (!user) return;
		setIsLoading(true);
		try {
			const [teamRes, tracksRes] = await Promise.allSettled([
				api.get("/api/team/me"),
				api.get("/api/tracks"),
			]);

			if (teamRes.status === "fulfilled") {
				setTeamData(teamRes.value.data?.team || null);
				setMyRole(teamRes.value.data?.myRole || "MEMBER");
				if (teamRes.value.data?.team?.trackId) {
					setSelectedTrackId(teamRes.value.data.team.trackId);
				}
			} else {
				setTeamData(null);
			}

			if (tracksRes.status === "fulfilled") {
				setTracks(tracksRes.value.data?.tracks || []);
			}
		} catch (err) {
			console.error("Error loading team:", err);
		} finally {
			setIsLoading(false);
		}
	}, [user]);

	useEffect(() => {
		if (!authLoading && !user) {
			router.push("/login");
		} else if (user) {
			fetchTeamAndTracks();
		}
	}, [user, authLoading, router, fetchTeamAndTracks]);

	const handleLockTrack = async () => {
		if (!selectedTrackId) {
			toast.error("Please select a problem track first.");
			return;
		}
		setIsLockingTrack(true);
		try {
			const res = await api.post("/api/team/track-lock", { trackId: selectedTrackId });
			toast.success("Track successfully locked!");
			setTeamData(res.data.team);
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to lock track");
		} finally {
			setIsLockingTrack(false);
		}
	};

	const handleJoinTeam = async (e) => {
		e.preventDefault();
		if (!joinCodeInput.trim()) {
			toast.error("Please enter a 6-character team invite code.");
			return;
		}
		setIsJoining(true);
		try {
			await api.post("/api/team/join", { teamCode: joinCodeInput.trim().toUpperCase() });
			toast.success("Successfully joined team!");
			setJoinCodeInput("");
			await fetchTeamAndTracks();
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to join team");
		} finally {
			setIsJoining(false);
		}
	};

	const copyTeamCode = () => {
		if (teamData?.code) {
			navigator.clipboard.writeText(teamData.code);
			setCopied(true);
			toast.success("Team code copied to clipboard!");
			setTimeout(() => setCopied(false), 2000);
		}
	};

	if (authLoading || isLoading) {
		return (
			<div className="min-h-screen bg-[#060a12] text-white flex flex-col items-center justify-center">
				<div className="w-12 h-12 border-4 border-[#00c8ff]/20 border-t-[#00c8ff] rounded-full animate-spin mb-4" />
				<p className="text-sm text-slate-400 font-orbitron">Loading Team Hub...</p>
			</div>
		);
	}

	const isLeader = myRole === "LEADER" || teamData?.leaderId === user?.id;

	return (
		<div className="min-h-screen bg-[#060a12] text-white px-4 py-12 relative overflow-hidden">
			{/* Ambient glows */}
			<div className="absolute top-1/4 left-1/4 w-[600px] h-[400px] bg-[#004bff]/15 blur-[140px] rounded-full pointer-events-none" />
			<div className="absolute bottom-1/3 right-1/4 w-[500px] h-[350px] bg-[#00c8ff]/10 blur-[130px] rounded-full pointer-events-none" />

			<div className="max-w-6xl mx-auto space-y-8 relative z-10">
				{/* Top Bar */}
				<div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-[#0d1525]/80 backdrop-blur-xl border border-[#00c8ff]/20 rounded-2xl shadow-[0_0_30px_rgba(0,200,255,0.08)]">
					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-xl bg-[#00c8ff]/10 border border-[#00c8ff]/30 text-[#00c8ff]">
							<Sparkles className="w-6 h-6" />
						</div>
						<div>
							<h1 className="text-2xl font-bold font-orbitron text-white">
								{teamData ? teamData.name : "Team Portal"}
							</h1>
							<p className="text-xs text-slate-400">
								Promptathon 2026 &bull; Logged in as <span className="text-[#00c8ff] font-medium">{user?.email}</span> ({user?.role})
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={async () => {
								await logout();
								router.push("/login");
							}}
							className="px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
						>
							<LogOut className="w-4 h-4" /> Sign Out
						</button>
					</div>
				</div>

				{/* Quick Navigation Hub */}
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
					<Link
						href="/leaderboard"
						className="p-3.5 rounded-xl bg-[#0d1525]/70 hover:bg-[#0d1525] border border-white/10 hover:border-[#00c8ff]/50 transition-all flex flex-col items-center text-center gap-2 group shadow-sm"
					>
						<Award className="w-5 h-5 text-[#00c8ff] group-hover:scale-110 transition-transform" />
						<span className="text-xs font-semibold text-slate-200">Leaderboard</span>
					</Link>
					<Link
						href="/submission"
						className="p-3.5 rounded-xl bg-[#0d1525]/70 hover:bg-[#0d1525] border border-white/10 hover:border-[#00c8ff]/50 transition-all flex flex-col items-center text-center gap-2 group shadow-sm"
					>
						<Send className="w-5 h-5 text-[#00c8ff] group-hover:scale-110 transition-transform" />
						<span className="text-xs font-semibold text-slate-200">Submission</span>
					</Link>
					<Link
						href="/networking"
						className="p-3.5 rounded-xl bg-[#0d1525]/70 hover:bg-[#0d1525] border border-white/10 hover:border-[#00c8ff]/50 transition-all flex flex-col items-center text-center gap-2 group shadow-sm"
					>
						<Users className="w-5 h-5 text-[#00c8ff] group-hover:scale-110 transition-transform" />
						<span className="text-xs font-semibold text-slate-200">Networking</span>
					</Link>
					<Link
						href="/announcements"
						className="p-3.5 rounded-xl bg-[#0d1525]/70 hover:bg-[#0d1525] border border-white/10 hover:border-[#00c8ff]/50 transition-all flex flex-col items-center text-center gap-2 group shadow-sm"
					>
						<Radio className="w-5 h-5 text-[#00c8ff] group-hover:scale-110 transition-transform" />
						<span className="text-xs font-semibold text-slate-200">Announcements</span>
					</Link>
					{(user?.role === "JURY" || user?.role === "ADMIN") && (
						<Link
							href="/jury"
							className="p-3.5 rounded-xl bg-[#0d1525]/70 hover:bg-[#0d1525] border border-purple-500/30 hover:border-purple-400 transition-all flex flex-col items-center text-center gap-2 group shadow-sm"
						>
							<ShieldCheck className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
							<span className="text-xs font-semibold text-purple-300">Jury Portal</span>
						</Link>
					)}
					{user?.role === "ADMIN" && (
						<Link
							href="/admin"
							className="p-3.5 rounded-xl bg-[#0d1525]/70 hover:bg-[#0d1525] border border-amber-500/30 hover:border-amber-400 transition-all flex flex-col items-center text-center gap-2 group shadow-sm"
						>
							<Layers className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
							<span className="text-xs font-semibold text-amber-300">Admin Control</span>
						</Link>
					)}
				</div>

				{!teamData ? (
					/* No Team State -> Join Team Option */
					<div className="p-8 bg-[#0d1525]/85 backdrop-blur-xl border border-white/10 rounded-2xl space-y-6 text-center max-w-lg mx-auto">
						<div className="w-14 h-14 mx-auto rounded-full bg-[#00c8ff]/10 border border-[#00c8ff]/30 flex items-center justify-center text-[#00c8ff]">
							<Users className="w-7 h-7" />
						</div>
						<div className="space-y-2">
							<h2 className="text-2xl font-bold font-orbitron text-white">Join a Team</h2>
							<p className="text-xs text-slate-400">
								Enter the 6-character team invite code provided by your team leader to join their roster.
							</p>
						</div>

						<form onSubmit={handleJoinTeam} className="space-y-4">
							<input
								type="text"
								maxLength={6}
								value={joinCodeInput}
								onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
								placeholder="e.g. PT26AB"
								className="w-full text-center tracking-widest text-lg font-bold font-mono px-4 py-3 rounded-lg bg-[#070c18] border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-[#00c8ff]"
							/>
							<button
								type="submit"
								disabled={isJoining}
								className="w-full py-2.5 px-4 rounded-lg font-semibold text-black bg-[#00c8ff] hover:bg-[#38bdf8] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
							>
								<span>{isJoining ? "Joining Team..." : "Join Team"}</span>
								<ArrowRight className="w-4 h-4" />
							</button>
						</form>
					</div>
				) : (
					/* Active Team Dashboard */
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Left Column: Team Overview & Code */}
						<div className="space-y-6">
							<div className="p-6 bg-[#0d1525]/85 backdrop-blur-xl border border-[#00c8ff]/25 rounded-2xl space-y-4 shadow-lg">
								<div className="flex items-center justify-between">
									<span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Team Code</span>
									<span className="text-xs px-2.5 py-0.5 rounded-full bg-[#00c8ff]/10 text-[#00c8ff] border border-[#00c8ff]/30 font-semibold">
										{teamData.members?.length || 1} / 3 Members
									</span>
								</div>
								<div className="flex items-center justify-between p-3 rounded-xl bg-[#070c18] border border-white/10">
									<span className="font-mono text-xl font-bold tracking-widest text-white">
										{teamData.code || "N/A"}
									</span>
									<button
										type="button"
										onClick={copyTeamCode}
										className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
										title="Copy Team Code"
									>
										{copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
									</button>
								</div>
								<p className="text-[11px] text-slate-400">
									Share this code with your teammates so they can join your team from their dashboard.
								</p>
							</div>

							{/* Track Selection Card */}
							<div className="p-6 bg-[#0d1525]/85 backdrop-blur-xl border border-[#00c8ff]/25 rounded-2xl space-y-4 shadow-lg">
								<div className="flex items-center gap-2">
									<Layers className="w-4 h-4 text-[#00c8ff]" />
									<h2 className="text-sm font-bold uppercase tracking-wider text-white">Problem Track</h2>
								</div>

								{teamData.trackLocked ? (
									<div className="p-4 rounded-xl bg-green-950/30 border border-green-500/30 space-y-2">
										<div className="flex items-center gap-2 text-green-400 font-semibold text-xs">
											<Lock className="w-3.5 h-3.5" /> Track Locked
										</div>
										<p className="text-sm font-bold text-white">
											{teamData.track?.title || "Assigned Problem Track"}
										</p>
										<p className="text-xs text-slate-300">
											{teamData.track?.description || "Track selection is permanent."}
										</p>
									</div>
								) : (
									<div className="space-y-3">
										<p className="text-xs text-slate-300">
											Select and lock your problem track before the deadline. Track selection is one-way and cannot be altered once locked.
										</p>
										<select
											value={selectedTrackId}
											onChange={(e) => setSelectedTrackId(e.target.value)}
											disabled={!isLeader}
											className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00c8ff]"
										>
											<option value="">-- Choose Problem Track --</option>
											{tracks.map((t) => (
												<option key={t.id} value={t.id}>
													{t.title}
												</option>
											))}
										</select>
										{isLeader && (
											<button
												onClick={handleLockTrack}
												disabled={isLockingTrack || !selectedTrackId}
												className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-black bg-[#00c8ff] hover:bg-[#38bdf8] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
											>
												<Lock className="w-3.5 h-3.5" />
												<span>{isLockingTrack ? "Locking Track..." : "Lock Track Selection"}</span>
											</button>
										)}
									</div>
								)}
							</div>
						</div>

						{/* Right Column: Roster & Members */}
						<div className="lg:col-span-2 space-y-6">
							<div className="p-6 bg-[#0d1525]/85 backdrop-blur-xl border border-[#00c8ff]/25 rounded-2xl space-y-6 shadow-lg">
								<div className="flex items-center justify-between border-b border-white/10 pb-4">
									<div>
										<h2 className="text-lg font-bold font-orbitron text-white">Team Roster</h2>
										<p className="text-xs text-slate-400">All registered team members</p>
									</div>
									<span className="text-xs px-3 py-1 rounded-full bg-[#00c8ff]/10 text-[#00c8ff] border border-[#00c8ff]/30 font-semibold">
										Max 3 Members
									</span>
								</div>

								<div className="space-y-3">
									{teamData.members?.map((m, idx) => (
										<div
											key={m.id || idx}
											className="p-4 rounded-xl bg-[#070c18] border border-white/10 flex flex-wrap items-center justify-between gap-3"
										>
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#004bff] to-[#00c8ff] flex items-center justify-center text-white font-bold text-sm">
													{m.user?.name ? m.user.name.charAt(0).toUpperCase() : "M"}
												</div>
												<div>
													<div className="flex items-center gap-2">
														<span className="text-sm font-semibold text-white">
															{m.user?.name || "Participant"}
														</span>
														{m.role === "LEADER" && (
															<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
																<Crown className="w-3 h-3" /> Leader
															</span>
														)}
													</div>
													<span className="text-xs text-slate-400 flex items-center gap-1">
														<Mail className="w-3 h-3 text-slate-500" /> {m.user?.email}
													</span>
												</div>
											</div>
											<span className="text-[11px] px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300 font-mono">
												{m.role}
											</span>
										</div>
									))}
								</div>

								{/* Action Buttons */}
								<div className="pt-2 flex flex-wrap items-center justify-end gap-3">
									<Link
										href="/submission"
										className="px-4 py-2.5 rounded-lg text-xs font-semibold text-black bg-[#00c8ff] hover:bg-[#38bdf8] transition-all flex items-center gap-1.5 shadow-md"
									>
										<Send className="w-3.5 h-3.5" />
										<span>Go to Submission Portal</span>
									</Link>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
			<Toaster position="top-center" />
		</div>
	);
}
