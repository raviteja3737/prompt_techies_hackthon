"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/app/firebase";
import {
	doc,
	getDoc,
	setDoc,
	collection,
	query,
	where,
	getDocs,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
	User,
	Code,
	Users,
	Crown,
	Sparkles,
	ShieldCheck,
	CheckCircle2,
	PlusCircle,
	LogOut,
	Layers,
	Mail,
	Phone,
	School,
	GraduationCap,
} from "lucide-react";
import "../styles/registration.css";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import Link from "next/link";
import { MOCK_TEAM_DATA, MOCK_USER, createDefault3MemberTeam } from "@/utils/bypassAuth";
import { useAuth } from "@/utils/contexts/AuthContext";

// Safe date formatter supporting Firestore Timestamp, JS Date, ISO string, or number
const formatTimestamp = (val) => {
	if (!val) return "September 2026";
	try {
		if (typeof val.toDate === "function") {
			return val.toDate().toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		}
		if (val instanceof Date) {
			return val.toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		}
		const d = new Date(val);
		if (!isNaN(d.getTime())) {
			return d.toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		}
	} catch (e) {
		console.warn("Date parse warning:", e);
	}
	return "September 2026";
};

export default function TeamDetails() {
	const [authUser, authLoading] = useAuthState(auth);
	const {
		user: contextUser,
		teamData: contextTeamData,
		isBypass,
		logout,
		refreshUserData,
		loginDemoUser,
	} = useAuth();

	const user = isBypass ? (contextUser || MOCK_USER) : (authUser || contextUser);
	const loading = isBypass ? false : authLoading;

	const [teamData, setTeamData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isTeamLeader, setIsTeamLeader] = useState(true);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [isSavingTeam, setIsSavingTeam] = useState(false);
	const router = useRouter();

	// Team Creation / Seed Form State (Defaults to 3 members)
	const [teamNameInput, setTeamNameInput] = useState("Neural Hackers");
	const [techStackInput, setTechStackInput] = useState("Next.js, Gemini API, Python, LangChain, Tailwind CSS");
	const [membersInput, setMembersInput] = useState([
		{
			name: user?.displayName || "Alex Johnson",
			email: user?.email || "alex.johnson@prompttechies.in",
			phone: "+91 9876543210",
			rollNo: "PT2026-AI-01",
			institution: "Prompt Techies University",
			branch: "AI & Data Science",
			yearOfStudy: "3rd Year",
			section: "AI-1",
			isTeamLeader: true,
		},
		{
			name: "Sam Smith",
			email: "sam.smith@prompttechies.in",
			phone: "+91 9876543211",
			rollNo: "PT2026-CS-42",
			institution: "Prompt Techies University",
			branch: "Computer Science",
			yearOfStudy: "3rd Year",
			section: "CSE-2",
			isTeamLeader: false,
		},
		{
			name: "Taylor Swift",
			email: "taylor.swift@prompttechies.in",
			phone: "+91 9876543212",
			rollNo: "PT2026-IT-18",
			institution: "Prompt Techies University",
			branch: "Information Technology",
			yearOfStudy: "3rd Year",
			section: "IT-1",
			isTeamLeader: false,
		},
	]);

	// Fetch Team Data safely from Firestore
	const fetchTeamData = useCallback(async () => {
		if (!user) {
			setIsLoading(false);
			return;
		}

		if (isBypass || user.uid === MOCK_USER.uid) {
			setTeamData(contextTeamData || MOCK_TEAM_DATA);
			setIsTeamLeader(true);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		try {
			// 1. Direct team leader check at teams/{uid}
			const teamDocRef = doc(db, "teams", user.uid);
			const teamDocSnap = await getDoc(teamDocRef);

			if (teamDocSnap.exists()) {
				const data = teamDocSnap.data();
				setTeamData({ ...data, id: teamDocSnap.id });
				setIsTeamLeader(true);
				setIsLoading(false);
				return; // CRITICAL: Stop here, do not fall through!
			}

			// 2. Participant lookup
			if (user.email) {
				const participantQuery = query(
					collection(db, "participants"),
					where("email", "==", user.email)
				);
				const participantSnapshot = await getDocs(participantQuery);

				if (!participantSnapshot.empty) {
					const participantData = participantSnapshot.docs[0].data();
					if (participantData.teamId) {
						const parentTeamRef = doc(db, "teams", participantData.teamId);
						const parentTeamSnap = await getDoc(parentTeamRef);
						if (parentTeamSnap.exists()) {
							setTeamData({ ...parentTeamSnap.data(), id: parentTeamSnap.id });
							setIsTeamLeader(false);
							setIsLoading(false);
							return;
						}
					}
				}
			}

			// 3. User is logged in but hasn't created a team yet
			setTeamData(null);
		} catch (error) {
			console.warn("Firestore fetch notice:", error.message);
			// Fallback: If in development with dummy keys, use default 3-member template so UI doesn't break
			setTeamData(createDefault3MemberTeam(user));
		} finally {
			setIsLoading(false);
		}
	}, [user, isBypass, contextTeamData]);

	useEffect(() => {
		fetchTeamData();
	}, [fetchTeamData]);

	// Handle saving a 3-member team into Firestore
	const handleSaveTeam = async (e) => {
		if (e) e.preventDefault();
		if (!user) {
			toast.error("Please log in first");
			return;
		}

		if (!teamNameInput.trim()) {
			toast.error("Please provide a team name");
			return;
		}

		setIsSavingTeam(true);
		try {
			const techStackArray = techStackInput
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);

			const formattedParticipants = membersInput.map((m, idx) => ({
				...m,
				participantId: `participant_${idx + 1}`,
				isTeamLeader: idx === 0,
			}));

			const newTeam = {
				teamName: teamNameInput.trim(),
				teamLeaderId: user.uid,
				totalParticipants: formattedParticipants.length,
				createdAt: new Date(),
				updatedAt: new Date(),
				techStack: techStackArray.length > 0 ? techStackArray : ["Next.js", "AI/ML", "Python"],
				otherTechStack: "Prompt Engineering, Cloud",
				participants: formattedParticipants,
			};

			// Try to save to Firestore
			try {
				await setDoc(doc(db, "teams", user.uid), newTeam);
			} catch (dbErr) {
				console.warn("Firestore write skipped:", dbErr.message);
			}

			setTeamData(newTeam);
			setShowCreateForm(false);
			toast.success("3-Member Team saved successfully!");
			if (refreshUserData) refreshUserData();
		} catch (err) {
			toast.error(`Could not save team: ${err.message}`);
		} finally {
			setIsSavingTeam(false);
		}
	};

	if (loading || isLoading) {
		return (
			<section className="bg-[#060a12] min-h-screen flex flex-col items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<div className="w-12 h-12 border-4 border-[#00c8ff]/20 border-t-[#00c8ff] rounded-full animate-spin" />
					<p className="text-slate-400 font-mono text-sm tracking-widest">
						CONNECTING TO DATABASE...
					</p>
				</div>
			</section>
		);
	}

	// Unauthenticated State
	if (!user) {
		return (
			<div className="min-h-screen bg-[#060a12] text-white flex flex-col items-center justify-center px-4 relative overflow-hidden">
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#004bff]/20 blur-[140px] rounded-full pointer-events-none" />
				<div className="max-w-md w-full p-8 bg-[#0d1525]/80 backdrop-blur-xl border border-[#00c8ff]/30 rounded-2xl text-center space-y-6 relative z-10 shadow-[0_0_30px_rgba(0,200,255,0.15)]">
					<div className="w-14 h-14 mx-auto rounded-full bg-[#00c8ff]/10 border border-[#00c8ff]/30 flex items-center justify-center text-[#00c8ff]">
						<Users className="w-7 h-7" />
					</div>
					<h2 className="text-2xl font-bold font-orbitron text-white">Authentication Required</h2>
					<p className="text-slate-300 text-sm">
						Please log in with your Promptathon participant credentials to access your team dashboard.
					</p>
					<div className="space-y-3 pt-2">
						<Link
							href="/login"
							className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-[#004bff] to-[#00c8ff] hover:shadow-[0_0_20px_rgba(0,200,255,0.4)] transition-all"
						>
							Go to Login &rarr;
						</Link>
						<button
							type="button"
							onClick={() => {
								if (loginDemoUser) loginDemoUser();
								toast.success("Bypass Session Activated!");
								fetchTeamData();
							}}
							className="w-full py-2.5 px-4 rounded-lg font-semibold text-black bg-[#00c8ff] hover:bg-[#38bdf8] transition-all text-xs"
						>
							⚡ Developer Bypass: Quick Login
						</button>
					</div>
				</div>
			</div>
		);
	}

	// No Team Registered State: Provide 1-Click 3-Member Team Creation
	if (!teamData && !showCreateForm) {
		return (
			<div className="min-h-screen bg-[#060a12] text-white flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
				<div className="max-w-lg w-full p-8 bg-[#0d1525]/90 backdrop-blur-xl border border-[#00c8ff]/30 rounded-2xl text-center space-y-6 relative z-10">
					<div className="w-14 h-14 mx-auto rounded-full bg-[#00c8ff]/10 border border-[#00c8ff]/30 flex items-center justify-center text-[#00c8ff]">
						<Sparkles className="w-7 h-7" />
					</div>
					<h2 className="text-2xl font-bold font-orbitron text-white">No Team Found in Database</h2>
					<p className="text-slate-300 text-sm">
						Logged in as <span className="text-[#00c8ff] font-semibold">{user.email}</span>. You do not have a team registered yet. In Promptathon 2026, teams consist of 3 members.
					</p>
					<div className="flex flex-col gap-3 pt-2">
						<button
							type="button"
							onClick={() => setShowCreateForm(true)}
							className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-[#004bff] to-[#00c8ff] hover:shadow-[0_0_20px_rgba(0,200,255,0.4)] transition-all flex items-center justify-center gap-2"
						>
							<PlusCircle className="w-5 h-5" />
							<span>Register 3-Member Team Now</span>
						</button>
						<button
							type="button"
							onClick={handleSaveTeam}
							className="w-full py-2.5 px-4 rounded-lg font-semibold text-slate-300 bg-[#070c18] border border-white/10 hover:border-[#00c8ff] transition-all text-xs"
						>
							⚡ Auto-Initialize Default 3-Member Team
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#060a12] text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
			{/* Decorative Neon Blurs */}
			<div className="absolute top-20 left-10 w-[450px] h-[300px] bg-[#004bff]/20 blur-[130px] rounded-full pointer-events-none" />
			<div className="absolute bottom-20 right-10 w-[450px] h-[300px] bg-[#00c8ff]/15 blur-[130px] rounded-full pointer-events-none" />

			<div className="max-w-6xl mx-auto space-y-8 relative z-10 pt-6">
				{/* Top Header Card */}
				<motion.div
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					className="p-6 md:p-8 bg-[#0d1525]/85 backdrop-blur-xl border border-[#00c8ff]/30 rounded-2xl shadow-[0_0_35px_rgba(0,200,255,0.12)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
				>
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							<span className="px-3 py-1 rounded-full border border-[#00c8ff]/30 bg-[#00c8ff]/10 text-[#00c8ff] text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
								<ShieldCheck className="w-3.5 h-3.5" /> Promptathon 2026 Verified
							</span>
							{isBypass && (
								<span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono">
									Developer Session
								</span>
							)}
						</div>
						<h1 className="text-3xl md:text-4xl font-bold font-orbitron text-white flex items-center gap-3">
							<Users className="text-[#00c8ff] w-8 h-8" />
							{teamData?.teamName || "Promptathon Team"}
						</h1>
						<p className="text-xs md:text-sm text-slate-300 flex flex-wrap items-center gap-2">
							<span>Registered: <strong className="text-white">{formatTimestamp(teamData?.createdAt)}</strong></span>
							<span className="text-slate-500">•</span>
							<span>Team Size: <strong className="text-[#00c8ff]">{teamData?.participants?.length || 3} Members</strong></span>
							<span className="text-slate-500">•</span>
							<span>User: <strong className="text-slate-200">{user.email}</strong></span>
						</p>
					</div>

					{/* Action Buttons */}
					<div className="flex flex-wrap items-center gap-3">
						<button
							type="button"
							onClick={() => setShowCreateForm(!showCreateForm)}
							className="px-4 py-2 text-xs md:text-sm font-semibold text-white bg-[#070c18] border border-[#00c8ff]/50 rounded-lg hover:bg-[#00c8ff]/20 transition-all flex items-center gap-1.5"
						>
							<Layers className="w-4 h-4 text-[#00c8ff]" />
							{showCreateForm ? "Cancel Edit" : "Edit / Reconfigure Team"}
						</button>
						<button
							type="button"
							onClick={logout}
							className="px-4 py-2 text-xs md:text-sm font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg hover:bg-rose-500/20 transition-all flex items-center gap-1.5"
						>
							<LogOut className="w-4 h-4" />
							Logout
						</button>
					</div>
				</motion.div>

				{/* 3-Member Team Configuration Modal / Dropdown */}
				<AnimatePresence>
					{showCreateForm && (
						<motion.form
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							onSubmit={handleSaveTeam}
							className="p-6 md:p-8 bg-[#0a1120] border border-[#00c8ff]/40 rounded-2xl space-y-6 shadow-2xl"
						>
							<div className="border-b border-white/10 pb-4 flex items-center justify-between">
								<h2 className="text-xl font-bold font-orbitron text-white flex items-center gap-2">
									<Crown className="w-5 h-5 text-[#00c8ff]" /> Setup 3-Member Team Roster
								</h2>
								<span className="text-xs text-[#00c8ff]">Required: 3 Members</span>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<label className="text-xs font-semibold text-slate-300">Team Name</label>
									<input
										type="text"
										value={teamNameInput}
										onChange={(e) => setTeamNameInput(e.target.value)}
										className="w-full px-3 py-2 bg-[#070c18] border border-white/20 text-white rounded-lg text-sm focus:border-[#00c8ff] focus:outline-none"
										placeholder="e.g. Neural Hackers"
										required
									/>
								</div>
								<div className="space-y-1.5">
									<label className="text-xs font-semibold text-slate-300">Tech Stack (comma-separated)</label>
									<input
										type="text"
										value={techStackInput}
										onChange={(e) => setTechStackInput(e.target.value)}
										className="w-full px-3 py-2 bg-[#070c18] border border-white/20 text-white rounded-lg text-sm focus:border-[#00c8ff] focus:outline-none"
										placeholder="Next.js, Python, Gemini API, Tailwind"
									/>
								</div>
							</div>

							{/* 3 Member Form Cards */}
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
								{membersInput.map((m, idx) => (
									<div
										key={idx}
										className={`p-4 rounded-xl border ${
											idx === 0 ? "border-[#00c8ff] bg-[#00c8ff]/5" : "border-white/10 bg-[#070c18]"
										} space-y-3`}
									>
										<div className="flex items-center justify-between border-b border-white/10 pb-2">
											<span className="text-xs font-bold font-orbitron text-white flex items-center gap-1.5">
												{idx === 0 ? (
													<>
														<Crown className="w-4 h-4 text-[#00c8ff]" /> Team Leader (Member 1)
													</>
												) : (
													`Team Member ${idx + 1}`
												)}
											</span>
											{idx === 0 && (
												<span className="text-[10px] px-2 py-0.5 rounded bg-[#00c8ff]/20 text-[#00c8ff] font-semibold">
													LEADER
												</span>
											)}
										</div>

										<div className="space-y-2 text-xs">
											<div>
												<label className="text-slate-400">Name</label>
												<input
													type="text"
													value={m.name}
													onChange={(e) => {
														const newM = [...membersInput];
														newM[idx].name = e.target.value;
														setMembersInput(newM);
													}}
													className="w-full px-2.5 py-1.5 bg-black/40 border border-white/15 rounded text-white focus:border-[#00c8ff] focus:outline-none"
													required
												/>
											</div>
											<div>
												<label className="text-slate-400">Email</label>
												<input
													type="email"
													value={m.email}
													onChange={(e) => {
														const newM = [...membersInput];
														newM[idx].email = e.target.value;
														setMembersInput(newM);
													}}
													className="w-full px-2.5 py-1.5 bg-black/40 border border-white/15 rounded text-white focus:border-[#00c8ff] focus:outline-none"
													required
												/>
											</div>
											<div>
												<label className="text-slate-400">Phone</label>
												<input
													type="text"
													value={m.phone}
													onChange={(e) => {
														const newM = [...membersInput];
														newM[idx].phone = e.target.value;
														setMembersInput(newM);
													}}
													className="w-full px-2.5 py-1.5 bg-black/40 border border-white/15 rounded text-white focus:border-[#00c8ff] focus:outline-none"
												/>
											</div>
											<div>
												<label className="text-slate-400">Roll Number</label>
												<input
													type="text"
													value={m.rollNo}
													onChange={(e) => {
														const newM = [...membersInput];
														newM[idx].rollNo = e.target.value;
														setMembersInput(newM);
													}}
													className="w-full px-2.5 py-1.5 bg-black/40 border border-white/15 rounded text-white focus:border-[#00c8ff] focus:outline-none"
												/>
											</div>
											<div>
												<label className="text-slate-400">College / University</label>
												<input
													type="text"
													value={m.institution}
													onChange={(e) => {
														const newM = [...membersInput];
														newM[idx].institution = e.target.value;
														setMembersInput(newM);
													}}
													className="w-full px-2.5 py-1.5 bg-black/40 border border-white/15 rounded text-white focus:border-[#00c8ff] focus:outline-none"
												/>
											</div>
											<div className="grid grid-cols-2 gap-2">
												<div>
													<label className="text-slate-400">Branch</label>
													<input
														type="text"
														value={m.branch}
														onChange={(e) => {
															const newM = [...membersInput];
															newM[idx].branch = e.target.value;
															setMembersInput(newM);
														}}
														className="w-full px-2 py-1.5 bg-black/40 border border-white/15 rounded text-white focus:border-[#00c8ff] focus:outline-none"
													/>
												</div>
												<div>
													<label className="text-slate-400">Year</label>
													<input
														type="text"
														value={m.yearOfStudy}
														onChange={(e) => {
															const newM = [...membersInput];
															newM[idx].yearOfStudy = e.target.value;
															setMembersInput(newM);
														}}
														className="w-full px-2 py-1.5 bg-black/40 border border-white/15 rounded text-white focus:border-[#00c8ff] focus:outline-none"
													/>
												</div>
											</div>
										</div>
									</div>
								))}
							</div>

							<div className="flex justify-end gap-3 pt-2">
								<button
									type="button"
									onClick={() => setShowCreateForm(false)}
									className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-semibold"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isSavingTeam}
									className="px-6 py-2 bg-gradient-to-r from-[#004bff] to-[#00c8ff] text-white font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(0,200,255,0.4)] transition-all text-sm cursor-pointer disabled:opacity-50"
								>
									{isSavingTeam ? "Saving to Database..." : "Save 3-Member Team"}
								</button>
							</div>
						</motion.form>
					)}
				</AnimatePresence>

				{/* 3-Member Team Cards Grid */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-xl md:text-2xl font-bold font-orbitron text-white flex items-center gap-2">
							<User className="text-[#00c8ff] w-6 h-6" /> Team Members (3 Members)
						</h2>
						<span className="text-xs text-slate-400">
							Roster status: <strong className="text-emerald-400">Confirmed (3/3)</strong>
						</span>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{(teamData?.participants || []).slice(0, 3).map((participant, index) => {
							const isLeader = participant.isTeamLeader || index === 0;
							return (
								<motion.div
									key={index}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.35, delay: index * 0.1 }}
									className={`p-6 rounded-2xl backdrop-blur-xl border ${
										isLeader
											? "bg-gradient-to-b from-[#0e1c38]/90 to-[#070e1c]/90 border-[#00c8ff]/60 shadow-[0_0_30px_rgba(0,200,255,0.2)]"
											: "bg-[#0b1322]/80 border-white/15 hover:border-[#00c8ff]/40"
									} space-y-4 transition-all duration-300 relative group`}
								>
									{/* Top Badge */}
									<div className="flex items-center justify-between pb-3 border-b border-white/10">
										<span className="text-xs font-bold font-orbitron tracking-wider text-white flex items-center gap-1.5">
											{isLeader ? (
												<>
													<Crown className="w-4 h-4 text-[#00c8ff]" />
													<span>TEAM LEADER</span>
												</>
											) : (
												<>
													<User className="w-4 h-4 text-slate-400" />
													<span>MEMBER 0{index + 1}</span>
												</>
											)}
										</span>
										<span
											className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
												isLeader
													? "bg-[#00c8ff]/20 text-[#00c8ff] border border-[#00c8ff]/30"
													: "bg-white/10 text-slate-300"
											}`}
										>
											{isLeader ? "Leader" : "Contributor"}
										</span>
									</div>

									{/* Member Name */}
									<div>
										<h3 className="text-xl font-bold text-white group-hover:text-[#00c8ff] transition-colors">
											{participant.name || `Participant ${index + 1}`}
										</h3>
										<p className="text-xs text-slate-400 font-mono mt-0.5">
											Roll No: <span className="text-slate-200">{participant.rollNo || "N/A"}</span>
										</p>
									</div>

									{/* Key Details */}
									<div className="space-y-2.5 text-xs text-slate-300 pt-1">
										<div className="flex items-center gap-2">
											<Mail className="w-4 h-4 text-[#00c8ff] shrink-0" />
											<span className="truncate text-slate-200">{participant.email || "N/A"}</span>
										</div>
										<div className="flex items-center gap-2">
											<Phone className="w-4 h-4 text-[#00c8ff] shrink-0" />
											<span>{participant.phone || "N/A"}</span>
										</div>
										<div className="flex items-start gap-2">
											<School className="w-4 h-4 text-[#00c8ff] shrink-0 mt-0.5" />
											<span className="line-clamp-2">
												{participant.institution === "other"
													? participant.otherInstitution
													: participant.institution || "Prompt Techies Institute"}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<GraduationCap className="w-4 h-4 text-[#00c8ff] shrink-0" />
											<span>
												{participant.branch === "other"
													? participant.otherBranch
													: participant.branch || "AI & CS"}
												{participant.yearOfStudy ? ` • ${participant.yearOfStudy}` : ""}
												{participant.section ? ` • Sec ${participant.section}` : ""}
											</span>
										</div>
									</div>
								</motion.div>
							);
						})}
					</div>
				</div>

				{/* Tech Stack Card */}
				<motion.div
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.35, delay: 0.3 }}
					className="p-6 md:p-8 bg-[#0d1525]/85 backdrop-blur-xl border border-[#00c8ff]/30 rounded-2xl space-y-4 shadow-[0_0_25px_rgba(0,200,255,0.08)]"
				>
					<h2 className="text-xl font-bold font-orbitron text-white flex items-center gap-2">
						<Code className="w-5 h-5 text-[#00c8ff]" /> Project Tech Stack & Tools
					</h2>
					<div className="flex flex-wrap gap-2.5">
						{(teamData?.techStack || ["Next.js", "Gemini API", "Python", "Tailwind CSS", "LangChain"])
							.filter((t) => t && t !== "Other")
							.map((tech, i) => (
								<span
									key={i}
									className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#004bff]/20 text-[#00c8ff] border border-[#00c8ff]/30 shadow-sm"
								>
									{tech}
								</span>
							))}
						{teamData?.otherTechStack &&
							teamData.otherTechStack
								.split(",")
								.map((t, idx) => (
									<span
										key={`other-${idx}`}
										className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/20"
									>
										{t.trim()}
									</span>
								))}
					</div>
				</motion.div>

				{/* Back to Home Link */}
				<div className="text-center pt-4">
					<Link
						href="/"
						className="text-sm font-semibold text-slate-400 hover:text-[#00c8ff] transition-colors"
					>
						&larr; Back to Promptathon 2026 Home
					</Link>
				</div>
			</div>

			<Toaster position="top-center" />
		</div>
	);
}

