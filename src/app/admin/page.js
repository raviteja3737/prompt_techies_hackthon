"use client";

import React, { useState, useEffect } from "react";
import {
	ArrowLeft,
	Layers,
	Lock,
	Unlock,
	ShieldAlert,
	BarChart3,
	Plus,
	Trash2,
	Clock,
	Sparkles,
	Edit,
	UserCheck,
	Megaphone,
	Users,
	FileText,
	CheckCircle2,
	X,
} from "lucide-react";
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
	const [juryAssignments, setJuryAssignments] = useState([]);
	const [adminAnnouncements, setAdminAnnouncements] = useState([]);
	const [availableTeams, setAvailableTeams] = useState([]);
	const [scoresFrozen, setScoresFrozen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isTogglingFreeze, setIsTogglingFreeze] = useState(false);
	const [activeTab, setActiveTab] = useState("overview");

	// Track creation & edit states
	const [newTrackTitle, setNewTrackTitle] = useState("");
	const [newTrackDesc, setNewTrackDesc] = useState("");
	const [isCreatingTrack, setIsCreatingTrack] = useState(false);
	const [editingTrack, setEditingTrack] = useState(null);
	const [editTitle, setEditTitle] = useState("");
	const [editDesc, setEditDesc] = useState("");
	const [isUpdatingTrack, setIsUpdatingTrack] = useState(false);

	// Jury Assignment states
	const [assignJuryId, setAssignJuryId] = useState("");
	const [assignTeamId, setAssignTeamId] = useState("");
	const [assignTrackId, setAssignTrackId] = useState("");
	const [isAssigningJury, setIsAssigningJury] = useState(false);

	// Announcement Creator states
	const [annTitle, setAnnTitle] = useState("");
	const [annMessage, setAnnMessage] = useState("");
	const [annPriority, setAnnPriority] = useState("NORMAL");
	const [isPublishingAnn, setIsPublishingAnn] = useState(false);

	const fetchAdminData = async () => {
		try {
			const [dashRes, tracksRes, scoreRes, assignRes, annRes, teamsRes] = await Promise.allSettled([
				api.get("/api/admin/dashboard"),
				api.get("/api/tracks"),
				api.get("/api/admin/score-status"),
				api.get("/api/admin/jury-assignments"),
				api.get("/api/admin/announcements"),
				api.get("/api/leaderboard"),
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
			if (assignRes.status === "fulfilled") {
				setJuryAssignments(assignRes.value.data?.assignments || []);
			}
			if (annRes.status === "fulfilled") {
				setAdminAnnouncements(annRes.value.data?.announcements || []);
			}
			if (teamsRes.status === "fulfilled") {
				setAvailableTeams(teamsRes.value.data?.leaderboard || []);
			}
		} catch (err) {
			console.error("Failed to load admin data:", err);
		} finally {
			setIsLoading(false);
		}
	};

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

		if (user?.role === "ADMIN") {
			fetchAdminData();
		}
	}, [user, authLoading, router]);

	const handleToggleFreeze = async () => {
		setIsTogglingFreeze(true);
		try {
			const res = await api.post("/api/admin/freeze-scores", { frozen: !scoresFrozen });
			setScoresFrozen(Boolean(res.data?.scoresFrozen));
			toast.success(
				res.data?.scoresFrozen
					? "Leaderboard scores are now FROZEN!"
					: "Leaderboard scores UNFREEZED!"
			);
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to toggle freeze state");
		} finally {
			setIsTogglingFreeze(false);
		}
	};

	const handleCreateTrack = async (e) => {
		e.preventDefault();
		if (!newTrackTitle.trim() || newTrackTitle.trim().length < 2) {
			toast.error("Track title must be at least 2 characters.");
			return;
		}
		if (!newTrackDesc.trim() || newTrackDesc.trim().length < 2) {
			toast.error("Track description must be at least 2 characters.");
			return;
		}

		setIsCreatingTrack(true);
		try {
			const res = await api.post("/api/tracks", {
				title: newTrackTitle.trim(),
				description: newTrackDesc.trim(),
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

	const handleStartEditTrack = (track) => {
		setEditingTrack(track);
		setEditTitle(track.title);
		setEditDesc(track.description || "");
	};

	const handleSaveTrackEdit = async (e) => {
		e.preventDefault();
		if (!editingTrack) return;
		if (!editTitle.trim() || editTitle.trim().length < 2) {
			toast.error("Track title must be at least 2 characters.");
			return;
		}
		if (!editDesc.trim() || editDesc.trim().length < 2) {
			toast.error("Track description must be at least 2 characters.");
			return;
		}

		setIsUpdatingTrack(true);
		try {
			const res = await api.patch(`/api/tracks/${editingTrack.id}`, {
				title: editTitle.trim(),
				description: editDesc.trim(),
			});
			setTracks((prev) => prev.map((t) => (t.id === editingTrack.id ? res.data.track : t)));
			setEditingTrack(null);
			toast.success("Track updated successfully!");
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to update track");
		} finally {
			setIsUpdatingTrack(false);
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

	const handleCreateJuryAssignment = async (e) => {
		e.preventDefault();
		if (!assignJuryId.trim()) {
			toast.error("Jury User ID is required.");
			return;
		}
		if (!assignTeamId.trim()) {
			toast.error("Team ID is required.");
			return;
		}

		setIsAssigningJury(true);
		try {
			const res = await api.post("/api/admin/jury-assignments", {
				juryId: assignJuryId.trim(),
				teamId: assignTeamId.trim(),
				trackId: assignTrackId.trim() || undefined,
			});
			toast.success("Jury assigned successfully!");
			setAssignJuryId("");
			setAssignTeamId("");
			setAssignTrackId("");
			// Refresh assignments
			const updated = await api.get("/api/admin/jury-assignments");
			setJuryAssignments(updated.data?.assignments || []);
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to create jury assignment");
		} finally {
			setIsAssigningJury(false);
		}
	};

	const handleDeleteJuryAssignment = async (id) => {
		if (!confirm("Are you sure you want to remove this jury assignment?")) return;
		try {
			await api.delete(`/api/admin/jury-assignments/${id}`);
			setJuryAssignments((prev) => prev.filter((a) => a.id !== id));
			toast.success("Assignment removed!");
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to delete jury assignment");
		}
	};

	const handleCreateAnnouncement = async (e) => {
		e.preventDefault();
		if (!annTitle.trim() || annTitle.trim().length < 2) {
			toast.error("Announcement title must be at least 2 characters.");
			return;
		}
		if (!annMessage.trim() || annMessage.trim().length < 1) {
			toast.error("Announcement message is required.");
			return;
		}

		setIsPublishingAnn(true);
		try {
			const res = await api.post("/api/admin/announcements", {
				title: annTitle.trim(),
				message: annMessage.trim(),
				priority: annPriority,
				published: true,
			});
			toast.success("Announcement published!");
			setAnnTitle("");
			setAnnMessage("");
			setAnnPriority("NORMAL");
			// Refresh list
			const updated = await api.get("/api/admin/announcements");
			setAdminAnnouncements(updated.data?.announcements || []);
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to publish announcement");
		} finally {
			setIsPublishingAnn(false);
		}
	};

	const handleDeleteAnnouncement = async (id) => {
		if (!confirm("Are you sure you want to delete this announcement?")) return;
		try {
			await api.delete(`/api/admin/announcements/${id}`);
			setAdminAnnouncements((prev) => prev.filter((a) => a.id !== id));
			toast.success("Announcement removed!");
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to delete announcement");
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
				<div className="flex flex-wrap items-center justify-between gap-4">
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
							<p className="text-xs text-slate-400">Manage tracks, jury assignments, announcements & score freeze</p>
						</div>
					</div>

					{/* Navigation Tabs */}
					<div className="flex flex-wrap rounded-lg bg-[#0d1525] p-1 border border-white/10 text-xs">
						<button
							onClick={() => setActiveTab("overview")}
							className={`px-3.5 py-1.5 rounded-md font-medium transition-all ${
								activeTab === "overview"
									? "bg-[#00c8ff] text-black font-semibold shadow"
									: "text-slate-400 hover:text-white"
							}`}
						>
							Overview
						</button>
						<button
							onClick={() => setActiveTab("tracks")}
							className={`px-3.5 py-1.5 rounded-md font-medium transition-all ${
								activeTab === "tracks"
									? "bg-[#00c8ff] text-black font-semibold shadow"
									: "text-slate-400 hover:text-white"
							}`}
						>
							Tracks ({tracks.length})
						</button>
						<button
							onClick={() => setActiveTab("jury")}
							className={`px-3.5 py-1.5 rounded-md font-medium transition-all ${
								activeTab === "jury"
									? "bg-[#00c8ff] text-black font-semibold shadow"
									: "text-slate-400 hover:text-white"
							}`}
						>
							Jury Assignments ({juryAssignments.length})
						</button>
						<button
							onClick={() => setActiveTab("announcements")}
							className={`px-3.5 py-1.5 rounded-md font-medium transition-all ${
								activeTab === "announcements"
									? "bg-[#00c8ff] text-black font-semibold shadow"
									: "text-slate-400 hover:text-white"
							}`}
						>
							Announcements ({adminAnnouncements.length})
						</button>
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
							{dashboardStats?.users?.participants ??
								dashboardStats?.participantsCount ??
								dashboardStats?.participants ??
								0}
						</p>
					</div>
					<div className="p-4 rounded-xl bg-[#0d1525]/85 border border-white/10 space-y-1">
						<span className="text-xs text-slate-400">Submissions Locked</span>
						<p className="text-2xl font-bold font-mono text-[#00c8ff]">
							{dashboardStats?.submissions?.submitted ??
								(typeof dashboardStats?.submissions === "number" ? dashboardStats.submissions : 0)}
						</p>
						<span className="text-[10px] text-slate-500">
							{dashboardStats?.submissions?.draft || 0} drafts
						</span>
					</div>
					<div className="p-4 rounded-xl bg-[#0d1525]/85 border border-white/10 space-y-1">
						<span className="text-xs text-slate-400">Jury Evaluations</span>
						<p className="text-2xl font-bold font-mono text-purple-400">
							{dashboardStats?.evaluations?.locked ??
								(typeof dashboardStats?.evaluations === "number" ? dashboardStats.evaluations : 0)}
						</p>
						<span className="text-[10px] text-slate-500">
							{dashboardStats?.evaluations?.draft || 0} drafts
						</span>
					</div>
				</div>

				{/* TAB 1: Overview & Freeze Control */}
				{activeTab === "overview" && (
					<div className="space-y-6">
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

						{/* Quick Operations Summary */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div
								onClick={() => setActiveTab("tracks")}
								className="p-5 rounded-2xl bg-[#0d1525]/85 border border-white/10 hover:border-[#00c8ff]/40 cursor-pointer transition-all space-y-2"
							>
								<div className="flex items-center gap-2 text-[#00c8ff]">
									<Layers className="w-4 h-4" />
									<h3 className="text-sm font-bold font-orbitron text-white">Tracks CMS</h3>
								</div>
								<p className="text-xs text-slate-400">
									{tracks.length} problem statements active. Add new tracks or update requirements.
								</p>
							</div>

							<div
								onClick={() => setActiveTab("jury")}
								className="p-5 rounded-2xl bg-[#0d1525]/85 border border-white/10 hover:border-purple-500/40 cursor-pointer transition-all space-y-2"
							>
								<div className="flex items-center gap-2 text-purple-400">
									<UserCheck className="w-4 h-4" />
									<h3 className="text-sm font-bold font-orbitron text-white">Jury Assignments</h3>
								</div>
								<p className="text-xs text-slate-400">
									{juryAssignments.length} active assignments. Pair judges with teams and tracks.
								</p>
							</div>

							<div
								onClick={() => setActiveTab("announcements")}
								className="p-5 rounded-2xl bg-[#0d1525]/85 border border-white/10 hover:border-amber-500/40 cursor-pointer transition-all space-y-2"
							>
								<div className="flex items-center gap-2 text-amber-400">
									<Megaphone className="w-4 h-4" />
									<h3 className="text-sm font-bold font-orbitron text-white">Broadcast Center</h3>
								</div>
								<p className="text-xs text-slate-400">
									{adminAnnouncements.length} broadcasts published. Send urgent alerts and notifications.
								</p>
							</div>
						</div>
					</div>
				)}

				{/* TAB 2: Tracks CMS & Edit */}
				{activeTab === "tracks" && (
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
									placeholder="Track Title (min 2 chars)"
									className="sm:col-span-1 px-3 py-2 rounded-lg bg-[#0d1525] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff]"
								/>
								<input
									type="text"
									value={newTrackDesc}
									onChange={(e) => setNewTrackDesc(e.target.value)}
									placeholder="Brief description & requirements (min 2 chars)..."
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
									className="p-4 rounded-xl bg-[#070c18] border border-white/5 flex flex-wrap items-center justify-between gap-4"
								>
									<div className="space-y-1 flex-1 min-w-[200px]">
										<h3 className="text-sm font-bold text-white">{track.title}</h3>
										<p className="text-xs text-slate-400">{track.description || "No description provided."}</p>
									</div>

									<div className="flex items-center gap-2">
										<button
											onClick={() => handleStartEditTrack(track)}
											className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
											title="Edit Track"
										>
											<Edit className="w-4 h-4" />
										</button>
										<button
											onClick={() => handleDeleteTrack(track.id)}
											className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
											title="Delete Track"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* TAB 3: Jury Assignments */}
				{activeTab === "jury" && (
					<div className="p-6 rounded-2xl bg-[#0d1525]/85 border border-white/10 space-y-6">
						<div className="flex items-center justify-between border-b border-white/10 pb-4">
							<div>
								<h2 className="text-lg font-bold font-orbitron text-white">Jury Assignments</h2>
								<p className="text-xs text-slate-400">Assign official judges to evaluating teams</p>
							</div>
						</div>

						{/* Assign Form */}
						<form
							onSubmit={handleCreateJuryAssignment}
							className="p-4 rounded-xl bg-[#070c18] border border-white/10 space-y-3"
						>
							<h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">Create New Jury Assignment</h3>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<input
									type="text"
									value={assignJuryId}
									onChange={(e) => setAssignJuryId(e.target.value)}
									placeholder="Jury User ID or Dev ID (e.g. jury-1)"
									className="px-3 py-2 rounded-lg bg-[#0d1525] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
								/>
								<input
									type="text"
									value={assignTeamId}
									onChange={(e) => setAssignTeamId(e.target.value)}
									placeholder="Team ID (e.g. dev-team-1)"
									className="px-3 py-2 rounded-lg bg-[#0d1525] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
								/>
								<select
									value={assignTrackId}
									onChange={(e) => setAssignTrackId(e.target.value)}
									className="px-3 py-2 rounded-lg bg-[#0d1525] border border-white/15 text-xs text-white focus:outline-none focus:border-purple-400"
								>
									<option value="">-- Optional Track Scope --</option>
									{tracks.map((t) => (
										<option key={t.id} value={t.id}>
											{t.title}
										</option>
									))}
								</select>
							</div>
							<div className="flex justify-end">
								<button
									type="submit"
									disabled={isAssigningJury}
									className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
								>
									<UserCheck className="w-3.5 h-3.5" />
									<span>{isAssigningJury ? "Assigning..." : "Assign Judge"}</span>
								</button>
							</div>
						</form>

						{/* Assignments Table */}
						<div className="space-y-3">
							<h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
								Current Assignments ({juryAssignments.length})
							</h3>
							{juryAssignments.length === 0 ? (
								<p className="text-xs text-slate-500 py-6 text-center">No jury assignments registered.</p>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full text-left text-xs text-slate-300">
										<thead className="bg-[#070c18] text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
											<tr>
												<th className="py-3 px-4">Jury Judge</th>
												<th className="py-3 px-4">Assigned Team</th>
												<th className="py-3 px-4">Track Scope</th>
												<th className="py-3 px-4 text-right">Actions</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-white/5 font-medium">
											{juryAssignments.map((a) => (
												<tr key={a.id} className="hover:bg-white/[0.02]">
													<td className="py-3 px-4 text-white">
														{a.jury?.name || "Jury Judge"} ({a.jury?.email || a.juryId})
													</td>
													<td className="py-3 px-4 text-[#00c8ff] font-semibold">
														{a.team?.name || a.teamId}
													</td>
													<td className="py-3 px-4 text-slate-400">
														{a.track?.title || "General / Unrestricted"}
													</td>
													<td className="py-3 px-4 text-right">
														<button
															onClick={() => handleDeleteJuryAssignment(a.id)}
															className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
															title="Remove Assignment"
														>
															<Trash2 className="w-3.5 h-3.5" />
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</div>
				)}

				{/* TAB 4: Announcement Center */}
				{activeTab === "announcements" && (
					<div className="p-6 rounded-2xl bg-[#0d1525]/85 border border-white/10 space-y-6">
						<div className="flex items-center justify-between border-b border-white/10 pb-4">
							<div>
								<h2 className="text-lg font-bold font-orbitron text-white">Announcement Broadcast Center</h2>
								<p className="text-xs text-slate-400">Publish alerts to all participants and judges</p>
							</div>
						</div>

						{/* Announcement Form */}
						<form
							onSubmit={handleCreateAnnouncement}
							className="p-4 rounded-xl bg-[#070c18] border border-white/10 space-y-3"
						>
							<h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Create New Broadcast</h3>
							<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
								<input
									type="text"
									value={annTitle}
									onChange={(e) => setAnnTitle(e.target.value)}
									placeholder="Broadcast Title (min 2 chars)"
									className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#0d1525] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
								/>
								<select
									value={annPriority}
									onChange={(e) => setAnnPriority(e.target.value)}
									className="sm:col-span-1 px-3 py-2 rounded-lg bg-[#0d1525] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
								>
									<option value="NORMAL">NORMAL</option>
									<option value="URGENT">URGENT</option>
									<option value="HIGH">HIGH</option>
									<option value="LOW">INFO / LOW</option>
								</select>
							</div>
							<textarea
								rows={3}
								value={annMessage}
								onChange={(e) => setAnnMessage(e.target.value)}
								placeholder="Announcement content & details..."
								className="w-full p-3 rounded-lg bg-[#0d1525] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
							/>
							<div className="flex justify-end">
								<button
									type="submit"
									disabled={isPublishingAnn}
									className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
								>
									<Megaphone className="w-3.5 h-3.5" />
									<span>{isPublishingAnn ? "Broadcasting..." : "Broadcast Announcement"}</span>
								</button>
							</div>
						</form>

						{/* Announcements List */}
						<div className="space-y-3">
							<h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
								Published Announcements ({adminAnnouncements.length})
							</h3>
							{adminAnnouncements.map((ann) => (
								<div
									key={ann.id}
									className="p-4 rounded-xl bg-[#070c18] border border-white/5 flex flex-wrap items-center justify-between gap-3"
								>
									<div className="space-y-1 flex-1 min-w-[200px]">
										<div className="flex items-center gap-2">
											<span className="text-xs font-bold text-white">{ann.title}</span>
											<span
												className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
													ann.priority === "URGENT"
														? "bg-red-500/10 text-red-400 border-red-500/30"
														: ann.priority === "HIGH"
														? "bg-amber-500/10 text-amber-400 border-amber-500/30"
														: "bg-blue-500/10 text-blue-400 border-blue-500/30"
												}`}
											>
												{ann.priority || "NORMAL"}
											</span>
										</div>
										<p className="text-xs text-slate-400 whitespace-pre-wrap">{ann.message}</p>
										<span className="text-[10px] text-slate-500">
											{new Date(ann.createdAt).toLocaleString()}
										</span>
									</div>

									<button
										onClick={() => handleDeleteAnnouncement(ann.id)}
										className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
										title="Delete Announcement"
									>
										<Trash2 className="w-3.5 h-3.5" />
									</button>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Track Edit Modal */}
			{editingTrack && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
					<form
						onSubmit={handleSaveTrackEdit}
						className="w-full max-w-lg p-6 bg-[#0d1525] border border-[#00c8ff]/40 rounded-2xl shadow-2xl space-y-4"
					>
						<div className="flex items-center justify-between border-b border-white/10 pb-3">
							<h3 className="text-base font-bold font-orbitron text-white">Edit Problem Track</h3>
							<button
								type="button"
								onClick={() => setEditingTrack(null)}
								className="text-slate-400 hover:text-white"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="space-y-1">
							<label className="text-xs text-slate-300">Track Title</label>
							<input
								type="text"
								value={editTitle}
								onChange={(e) => setEditTitle(e.target.value)}
								className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00c8ff]"
							/>
						</div>

						<div className="space-y-1">
							<label className="text-xs text-slate-300">Track Description</label>
							<textarea
								rows={4}
								value={editDesc}
								onChange={(e) => setEditDesc(e.target.value)}
								className="w-full p-3 rounded-lg bg-[#070c18] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00c8ff]"
							/>
						</div>

						<div className="flex items-center justify-end gap-3 pt-2">
							<button
								type="button"
								onClick={() => setEditingTrack(null)}
								className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 transition-all"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isUpdatingTrack}
								className="px-4 py-2 rounded-lg text-xs font-bold text-black bg-[#00c8ff] hover:bg-[#38bdf8] transition-all disabled:opacity-50"
							>
								{isUpdatingTrack ? "Saving..." : "Save Changes"}
							</button>
						</div>
					</form>
				</div>
			)}

			<Toaster position="top-center" />
		</div>
	);
}
