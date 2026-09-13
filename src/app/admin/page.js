"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Layers, Lock, Unlock, ShieldAlert, BarChart3, Plus, Trash2, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/utils/contexts/AuthContext";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function AdminPage() {
	const { user, loading: authLoading } = useAuth();
	const router = useRouter();

	const [dashboardStats, setDashboardStats] = useState(null);
	const [tracks, setTracks] = useState([]);
	const [scoresFrozen, setScoresFrozen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isTogglingFreeze, setIsTogglingFreeze] = useState(false);

	// New track creation state
	const [newTrackTitle, setNewTrackTitle] = useState("");
	const [newTrackDesc, setNewTrackDesc] = useState("");
	const [isCreatingTrack, setIsCreatingTrack] = useState(false);

	useEffect(() => {
		if (!authLoading && !user) {
			router.push("/login");
			return;
		}

		if (!authLoading && user && user.role !== "ADMIN") {
			toast.error("Access restricted to Hackathon Administrators.");
			router.push("/teamdetails");
			return;
		}

		const fetchAdminData = async () => {
			try {
				const [dashRes, tracksRes, scoreRes] = await Promise.allSettled([
					api.get("/api/admin/dashboard"),
					api.get("/api/tracks"),
					api.get("/api/admin/score-status"),
				]);

				if (dashRes.status === "fulfilled") {
					setDashboardStats(dashRes.value.data);
				}
				if (tracksRes.status === "fulfilled") {
					setTracks(tracksRes.value.data?.tracks || []);
				}
				if (scoreRes.status === "fulfilled") {
					setScoresFrozen(Boolean(scoreRes.value.data?.scoresFrozen));
				}
			} catch (err) {
				console.error("Failed to load admin data:", err);
			} finally {
				setIsLoading(false);
			}
		};

		if (user?.role === "ADMIN") {
			fetchAdminData();
		}
	}, [user, authLoading, router]);

	const handleToggleFreeze = async () => {
		setIsTogglingFreeze(true);
		try {
			const res = await api.post("/api/admin/freeze-scores", { freeze: !scoresFrozen });
			setScoresFrozen(Boolean(res.data?.scoresFrozen));
			toast.success(res.data?.scoresFrozen ? "Leaderboard scores are now FROZEN!" : "Leaderboard scores UNFREEZED!");
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to toggle freeze state");
		} finally {
			setIsTogglingFreeze(false);
		}
	};

	const handleCreateTrack = async (e) => {
		e.preventDefault();
		if (!newTrackTitle.trim()) {
			toast.error("Track title is required.");
			return;
		}

		setIsCreatingTrack(true);
		try {
			const res = await api.post("/api/tracks", {
				title: newTrackTitle.trim(),
				description: newTrackDesc.trim() || undefined,
			});
			setTracks((prev) => [...prev, res.data.track]);
			setNewTrackTitle("");
			setNewTrackDesc("");
			toast.success("Problem track created!");
		} catch (err) {
			toast.error(err.response?.data?.message || "Could not create track");
		} finally {
			setIsCreatingTrack(false);
		}
	};

	const handleDeleteTrack = async (id) => {
		if (!confirm("Are you sure you want to delete this problem track?")) return;
		try {
			await api.delete(`/api/tracks/${id}`);
			setTracks((prev) => prev.filter((t) => t.id !== id));
			toast.success("Track deleted!");
		} catch (err) {
			toast.error(err.response?.data?.message || "Could not delete track");
		}
	};

	if (authLoading || isLoading) {
		return (
			<div className="min-h-screen bg-[#060a12] text-white flex flex-col items-center justify-center">
				<div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
				<p className="text-xs text-slate-400 font-orbitron">Loading Admin Center...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#060a12] text-white px-4 py-12 relative overflow-hidden">
			<div className="absolute top-1/4 right-1/3 w-[600px] h-[350px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />

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
								<h1 className="text-2xl font-bold font-orbitron text-white">Admin Operations Panel</h1>
								<span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
									Master Governance
								</span>
							</div>
							<p className="text-xs text-slate-400">Manage tracks, system settings & control score freeze</p>
						</div>
					</div>
				</div>

				{/* Metric Stats Cards */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
					<div className="p-4 rounded-xl bg-[#0d1525]/85 border border-white/10 space-y-1">
						<span className="text-xs text-slate-400">Total Teams</span>
						<p className="text-2xl font-bold font-mono text-white">
							{dashboardStats?.teamsCount ?? dashboardStats?.teams ?? 0}
						</p>
					</div>
					<div className="p-4 rounded-xl bg-[#0d1525]/85 border border-white/10 space-y-1">
						<span className="text-xs text-slate-400">Registered Participants</span>
						<p className="text-2xl font-bold font-mono text-white">
							{dashboardStats?.participantsCount ?? dashboardStats?.participants ?? 0}
						</p>
					</div>
					<div className="p-4 rounded-xl bg-[#0d1525]/85 border border-white/10 space-y-1">
						<span className="text-xs text-slate-400">Submissions Locked</span>
						<p className="text-2xl font-bold font-mono text-[#00c8ff]">
							{dashboardStats?.submissionsCount ?? dashboardStats?.submissions ?? 0}
						</p>
					</div>
					<div className="p-4 rounded-xl bg-[#0d1525]/85 border border-white/10 space-y-1">
						<span className="text-xs text-slate-400">Jury Evaluations</span>
						<p className="text-2xl font-bold font-mono text-purple-400">
							{dashboardStats?.evaluationsCount ?? dashboardStats?.evaluations ?? 0}
						</p>
					</div>
				</div>

				{/* Score Freeze Control & System Status */}
				<div className="p-6 rounded-2xl bg-[#0d1525]/85 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<ShieldAlert className="w-5 h-5 text-amber-400" />
							<h2 className="text-base font-bold font-orbitron text-white">Leaderboard Score Freeze</h2>
						</div>
						<p className="text-xs text-slate-400">
							Current Status:{" "}
							<span className={`font-bold ${scoresFrozen ? "text-amber-400" : "text-green-400"}`}>
								{scoresFrozen ? "FROZEN (Public scores masked)" : "ACTIVE (Live public rankings)"}
							</span>
						</p>
					</div>

					<button
						onClick={handleToggleFreeze}
						disabled={isTogglingFreeze}
						className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
							scoresFrozen
								? "bg-green-500 hover:bg-green-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]"
								: "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]"
						}`}
					>
						{scoresFrozen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
						<span>{isTogglingFreeze ? "Updating..." : scoresFrozen ? "Unfreeze Leaderboard" : "Freeze Leaderboard"}</span>
					</button>
				</div>

				{/* Track Problem Statements Management */}
				<div className="p-6 rounded-2xl bg-[#0d1525]/85 border border-white/10 space-y-6">
					<div className="flex items-center justify-between border-b border-white/10 pb-4">
						<div>
							<h2 className="text-lg font-bold font-orbitron text-white">Problem Tracks ({tracks.length})</h2>
							<p className="text-xs text-slate-400">Hackathon problem statements available for teams</p>
						</div>
					</div>

					{/* Create Track Form */}
					<form onSubmit={handleCreateTrack} className="p-4 rounded-xl bg-[#070c18] border border-white/10 space-y-3">
						<h3 className="text-xs font-bold uppercase tracking-wider text-[#00c8ff]">Add New Problem Track</h3>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<input
								type="text"
								value={newTrackTitle}
								onChange={(e) => setNewTrackTitle(e.target.value)}
								placeholder="Track Title (e.g. Generative Agents in FinTech)"
								className="sm:col-span-1 px-3 py-2 rounded-lg bg-[#0d1525] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff]"
							/>
							<input
								type="text"
								value={newTrackDesc}
								onChange={(e) => setNewTrackDesc(e.target.value)}
								placeholder="Brief description & requirements..."
								className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#0d1525] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff]"
							/>
						</div>
						<div className="flex justify-end">
							<button
								type="submit"
								disabled={isCreatingTrack}
								className="px-3.5 py-1.5 rounded-lg bg-[#00c8ff] hover:bg-[#38bdf8] text-black font-semibold text-xs flex items-center gap-1.5"
							>
								<Plus className="w-3.5 h-3.5" />
								<span>{isCreatingTrack ? "Adding..." : "Add Track"}</span>
							</button>
						</div>
					</form>

					{/* Tracks List */}
					<div className="space-y-3">
						{tracks.map((track) => (
							<div
								key={track.id}
								className="p-4 rounded-xl bg-[#070c18] border border-white/5 flex items-center justify-between gap-4"
							>
								<div>
									<h3 className="text-sm font-bold text-white">{track.title}</h3>
									<p className="text-xs text-slate-400">{track.description || "No description provided."}</p>
								</div>

								<button
									onClick={() => handleDeleteTrack(track.id)}
									className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
									title="Delete Track"
								>
									<Trash2 className="w-4 h-4" />
								</button>
							</div>
						))}
					</div>
				</div>
			</div>
			<Toaster position="top-center" />
		</div>
	);
}
