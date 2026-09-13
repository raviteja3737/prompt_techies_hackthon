"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Search, UserPlus, Sparkles, School } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/utils/contexts/AuthContext";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function NetworkingPage() {
	const { user, loading: authLoading } = useAuth();
	const router = useRouter();

	const [attendees, setAttendees] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isCheckedIn, setIsCheckedIn] = useState(false);
	const [showCheckInModal, setShowCheckInModal] = useState(false);

	// Check-in fields
	const [bio, setBio] = useState("");
	const [skills, setSkills] = useState("");
	const [college, setCollege] = useState("");
	const [branch, setBranch] = useState("");
	const [lookingForTeam, setLookingForTeam] = useState(true);

	const fetchAttendees = useCallback(async () => {
		try {
			const query = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : "";
			const res = await api.get(`/api/networking/attendees${query}`);
			setAttendees(res.data?.attendees || []);
		} catch (err) {
			console.error("Failed to load attendees:", err);
		} finally {
			setIsLoading(false);
		}
	}, [searchQuery]);

	useEffect(() => {
		if (!authLoading && !user) {
			router.push("/login");
			return;
		}
		if (user) {
			fetchAttendees();
		}
	}, [user, authLoading, router, fetchAttendees]);

	const handleCheckIn = async (e) => {
		e.preventDefault();
		try {
			const skillsArray = skills.split(",").map((s) => s.trim()).filter(Boolean);
			await api.post("/api/networking/check-in", {
				bio,
				skills: skillsArray,
				college,
				branch,
				lookingForTeam,
			});
			toast.success("Checked in to networking directory!");
			setIsCheckedIn(true);
			setShowCheckInModal(false);
			fetchAttendees();
		} catch (err) {
			toast.error(err.response?.data?.message || "Check-in failed");
		}
	};

	const handleConnect = async (targetUserId) => {
		try {
			await api.post("/api/networking/connect", { targetUserId, message: "Let's connect for Promptathon 2026!" });
			toast.success("Connection request sent!");
		} catch (err) {
			toast.error(err.response?.data?.message || "Could not send connection request");
		}
	};

	return (
		<div className="min-h-screen bg-[#060a12] text-white px-4 py-12 relative overflow-hidden">
			<div className="absolute top-1/4 left-1/4 w-[600px] h-[350px] bg-[#004bff]/15 blur-[140px] rounded-full pointer-events-none" />

			<div className="max-w-6xl mx-auto space-y-8 relative z-10">
				{/* Header */}
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Link
							href="/teamdetails"
							className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
						>
							<ArrowLeft className="w-4 h-4" />
						</Link>
						<div>
							<h1 className="text-2xl font-bold font-orbitron text-white">Attendee Directory</h1>
							<p className="text-xs text-slate-400">Discover teammates, mentors & collaborate</p>
						</div>
					</div>

					<button
						onClick={() => setShowCheckInModal(true)}
						className="px-4 py-2 rounded-lg text-xs font-semibold text-black bg-[#00c8ff] hover:bg-[#38bdf8] transition-all flex items-center gap-1.5"
					>
						<Sparkles className="w-3.5 h-3.5" />
						<span>{isCheckedIn ? "Update Profile" : "Check-in to Directory"}</span>
					</button>
				</div>

				{/* Search Bar */}
				<div className="flex items-center gap-3 p-2 rounded-xl bg-[#0d1525]/90 border border-white/10 max-w-md">
					<Search className="w-4 h-4 text-slate-400 ml-2" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search by name, college, or skill..."
						className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
					/>
				</div>

				{/* Attendees Grid */}
				{isLoading ? (
					<div className="py-16 text-center text-slate-400 text-xs">Loading attendees...</div>
				) : attendees.length === 0 ? (
					<div className="py-16 text-center text-slate-400 text-xs p-8 rounded-2xl bg-[#0d1525]/50 border border-white/5">
						No participants found matching your criteria.
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{attendees.map((attendee) => (
							<div
								key={attendee.id}
								className="p-5 rounded-2xl bg-[#0d1525]/80 backdrop-blur-xl border border-white/10 hover:border-[#00c8ff]/40 transition-all flex flex-col justify-between space-y-4 shadow-sm"
							>
								<div className="space-y-3">
									<div className="flex items-start justify-between gap-2">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#004bff] to-[#00c8ff] flex items-center justify-center font-bold text-sm text-white">
												{attendee.name?.charAt(0).toUpperCase() || "P"}
											</div>
											<div>
												<h2 className="text-sm font-bold text-white">{attendee.name}</h2>
												<span className="text-[11px] text-slate-400 flex items-center gap-1">
													<School className="w-3 h-3 text-slate-500" />
													{attendee.college || "Participant"}
												</span>
											</div>
										</div>

										{attendee.lookingForTeam && (
											<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00c8ff]/10 text-[#00c8ff] border border-[#00c8ff]/30">
												Looking
											</span>
										)}
									</div>

									{attendee.bio && (
										<p className="text-xs text-slate-300 line-clamp-2">{attendee.bio}</p>
									)}

									{attendee.skills && attendee.skills.length > 0 && (
										<div className="flex flex-wrap gap-1.5 pt-1">
											{attendee.skills.map((skill, i) => (
												<span
													key={i}
													className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10"
												>
													{skill}
												</span>
											))}
										</div>
									)}
								</div>

								<div className="pt-2 border-t border-white/10 flex items-center justify-between">
									<span className="text-[11px] text-slate-400">{attendee.branch || "Promptathon"}</span>
									{attendee.id !== user?.id && (
										<button
											onClick={() => handleConnect(attendee.id)}
											className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#00c8ff] hover:text-white flex items-center gap-1 transition-colors"
										>
											<UserPlus className="w-3 h-3" /> Connect
										</button>
									)}
								</div>
							</div>
						))}
					</div>
				)}

				{/* Check-In Modal */}
				{showCheckInModal && (
					<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
						<div className="w-full max-w-md p-6 rounded-2xl bg-[#0d1525] border border-[#00c8ff]/30 space-y-4">
							<h2 className="text-lg font-bold font-orbitron text-white">Attendee Profile & Check-in</h2>
							<form onSubmit={handleCheckIn} className="space-y-3 text-xs">
								<div>
									<label className="text-slate-300 font-semibold">Short Bio / Interests</label>
									<textarea
										rows={2}
										value={bio}
										onChange={(e) => setBio(e.target.value)}
										placeholder="e.g. AI enthusiast interested in LLM evaluation and agents..."
										className="w-full p-2.5 rounded-lg bg-[#070c18] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] mt-1"
									/>
								</div>
								<div>
									<label className="text-slate-300 font-semibold">Skills (Comma-separated)</label>
									<input
										type="text"
										value={skills}
										onChange={(e) => setSkills(e.target.value)}
										placeholder="e.g. Next.js, Python, LangChain, UI/UX"
										className="w-full p-2.5 rounded-lg bg-[#070c18] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] mt-1"
									/>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="text-slate-300 font-semibold">College / Org</label>
										<input
											type="text"
											value={college}
											onChange={(e) => setCollege(e.target.value)}
											placeholder="University"
											className="w-full p-2.5 rounded-lg bg-[#070c18] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] mt-1"
										/>
									</div>
									<div>
										<label className="text-slate-300 font-semibold">Branch / Dept</label>
										<input
											type="text"
											value={branch}
											onChange={(e) => setBranch(e.target.value)}
											placeholder="CSE / AI"
											className="w-full p-2.5 rounded-lg bg-[#070c18] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] mt-1"
										/>
									</div>
								</div>
								<label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
									<input
										type="checkbox"
										checked={lookingForTeam}
										onChange={(e) => setLookingForTeam(e.target.checked)}
										className="rounded accent-[#00c8ff]"
									/>
									<span>Actively looking for a team / open to invitations</span>
								</label>
								<div className="flex justify-end gap-2 pt-2 border-t border-white/10">
									<button
										type="button"
										onClick={() => setShowCheckInModal(false)}
										className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
									>
										Cancel
									</button>
									<button
										type="submit"
										className="px-4 py-1.5 rounded-lg bg-[#00c8ff] text-black font-semibold hover:bg-[#38bdf8]"
									>
										Save Profile
									</button>
								</div>
							</form>
						</div>
					</div>
				)}
			</div>
			<Toaster position="top-center" />
		</div>
	);
}
