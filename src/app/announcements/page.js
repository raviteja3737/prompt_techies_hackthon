"use client";

import React, { useState, useEffect } from "react";
import {
	ArrowLeft,
	Radio,
	Bell,
	AlertTriangle,
	Clock,
	Search,
	Filter,
	User,
	Info,
	CheckCircle,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/utils/contexts/AuthContext";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

const PRIORITIES = ["All", "URGENT", "NORMAL", "INFO"];

export default function AnnouncementsPage() {
	const { user, loading: authLoading } = useAuth();
	const router = useRouter();

	const [announcements, setAnnouncements] = useState([]);
	const [notifications, setNotifications] = useState([]);
	const [activeTab, setActiveTab] = useState("announcements");
	const [selectedPriority, setSelectedPriority] = useState("All");
	const [searchQuery, setSearchQuery] = useState("");
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (!authLoading && !user) {
			router.push("/login");
			return;
		}

		const fetchData = async () => {
			try {
				const [annRes, notifRes] = await Promise.allSettled([
					api.get("/api/announcements"),
					api.get("/api/notifications"),
				]);

				if (annRes.status === "fulfilled") {
					setAnnouncements(annRes.value.data?.announcements || []);
				}
				if (notifRes.status === "fulfilled") {
					setNotifications(notifRes.value.data?.notifications || []);
				}
			} catch (err) {
				console.error("Failed to load feed:", err);
			} finally {
				setIsLoading(false);
			}
		};

		if (user) {
			fetchData();
		}

		// Socket.IO listener for live real-time announcements
		const socket = getSocket();
		const handleNewAnnouncement = (newAnn) => {
			toast(
				(t) => (
					<div className="flex flex-col gap-0.5">
						<span className="text-xs font-bold text-[#00c8ff]">New Announcement!</span>
						<span className="text-xs font-semibold text-white">{newAnn.title}</span>
						<span className="text-[11px] text-slate-300 line-clamp-2">{newAnn.message}</span>
					</div>
				),
				{ icon: "📢", duration: 6000 }
			);

			setAnnouncements((prev) => {
				if (prev.some((a) => a.id === newAnn.id)) return prev;
				return [newAnn, ...prev];
			});
		};

		socket.on("announcement:new", handleNewAnnouncement);

		return () => {
			socket.off("announcement:new", handleNewAnnouncement);
		};
	}, [user, authLoading, router]);

	const markAllNotificationsRead = async () => {
		try {
			await api.patch("/api/notifications/read-all");
			setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
			toast.success("All notifications marked as read!");
		} catch (err) {
			toast.error("Could not update notifications");
		}
	};

	const filteredAnnouncements = announcements.filter((ann) => {
		if (selectedPriority !== "All") {
			const prio = ann.priority?.toUpperCase() || "NORMAL";
			if (selectedPriority === "INFO") {
				if (prio !== "LOW" && prio !== "INFO") return false;
			} else if (prio !== selectedPriority) {
				return false;
			}
		}

		if (searchQuery.trim()) {
			const q = searchQuery.trim().toLowerCase();
			const matchTitle = ann.title?.toLowerCase().includes(q);
			const matchMsg = (ann.message || ann.content || "")?.toLowerCase().includes(q);
			return matchTitle || matchMsg;
		}

		return true;
	});

	return (
		<div className="min-h-screen bg-[#060a12] text-white px-4 py-12 relative overflow-hidden">
			<div className="absolute top-1/4 right-1/4 w-[600px] h-[350px] bg-[#004bff]/15 blur-[140px] rounded-full pointer-events-none" />

			<div className="max-w-4xl mx-auto space-y-8 relative z-10">
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
							<h1 className="text-2xl font-bold font-orbitron text-white">Broadcast Center</h1>
							<p className="text-xs text-slate-400">Official hackathon announcements & direct alerts</p>
						</div>
					</div>

					<div className="flex rounded-lg bg-[#0d1525] p-1 border border-white/10 text-xs">
						<button
							onClick={() => setActiveTab("announcements")}
							className={`px-3 py-1.5 rounded-md font-medium transition-all ${
								activeTab === "announcements"
									? "bg-[#00c8ff] text-black font-semibold"
									: "text-slate-400 hover:text-white"
							}`}
						>
							Announcements ({announcements.length})
						</button>
						<button
							onClick={() => setActiveTab("notifications")}
							className={`px-3 py-1.5 rounded-md font-medium transition-all ${
								activeTab === "notifications"
									? "bg-[#00c8ff] text-black font-semibold"
									: "text-slate-400 hover:text-white"
							}`}
						>
							Notifications ({notifications.filter((n) => !n.read).length})
						</button>
					</div>
				</div>

				{/* Content Feed */}
				{activeTab === "announcements" ? (
					<div className="space-y-6">
						{/* Search & Priority Filter Controls */}
						<div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#0d1525]/85 border border-white/10">
							{/* Priority Filter Tabs */}
							<div className="flex items-center gap-1.5">
								<span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
									<Filter className="w-3.5 h-3.5 text-[#00c8ff]" /> Filter:
								</span>
								{PRIORITIES.map((prio) => (
									<button
										key={prio}
										onClick={() => setSelectedPriority(prio)}
										className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
											selectedPriority === prio
												? "bg-[#00c8ff] text-black font-semibold shadow"
												: "bg-[#070c18] text-slate-400 hover:text-white border border-white/5"
										}`}
									>
										{prio}
									</button>
								))}
							</div>

							{/* Search Input */}
							<div className="flex items-center gap-2 bg-[#070c18] border border-white/15 px-3 py-1.5 rounded-lg text-xs w-full sm:w-64">
								<Search className="w-3.5 h-3.5 text-slate-400" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search announcements..."
									className="bg-transparent text-white placeholder-slate-500 text-xs focus:outline-none w-full"
								/>
							</div>
						</div>

						{isLoading ? (
							<div className="py-12 text-center text-xs text-slate-400">Loading announcements...</div>
						) : filteredAnnouncements.length === 0 ? (
							<div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-[#0d1525]/60 border border-white/5">
								{searchQuery || selectedPriority !== "All"
									? "No announcements matched your filters."
									: "No announcements broadcasted yet."}
							</div>
						) : (
							filteredAnnouncements.map((ann) => {
								const prio = ann.priority?.toUpperCase() || "NORMAL";
								const isUrgent = prio === "URGENT";
								const isHigh = prio === "HIGH";
								const isInfo = prio === "LOW" || prio === "INFO";

								return (
									<div
										key={ann.id}
										className={`p-6 rounded-2xl bg-[#0d1525]/85 backdrop-blur-xl border space-y-3 shadow-lg ${
											isUrgent
												? "border-red-500/40 bg-red-950/20"
												: isHigh
												? "border-amber-500/30"
												: isInfo
												? "border-blue-500/30"
												: "border-white/10"
										}`}
									>
										<div className="flex items-center justify-between gap-3">
											<div className="flex items-center gap-2">
												{isUrgent ? (
													<AlertTriangle className="w-4 h-4 text-red-400" />
												) : isInfo ? (
													<Info className="w-4 h-4 text-blue-400" />
												) : (
													<Radio className="w-4 h-4 text-[#00c8ff]" />
												)}
												<h2 className="text-base font-bold text-white font-orbitron">{ann.title}</h2>
											</div>

											<span
												className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
													isUrgent
														? "bg-red-500/10 text-red-400 border-red-500/30"
														: isHigh
														? "bg-amber-500/10 text-amber-400 border-amber-500/30"
														: isInfo
														? "bg-blue-500/10 text-blue-400 border-blue-500/30"
														: "bg-slate-500/10 text-slate-300 border-slate-500/30"
												}`}
											>
												{prio}
											</span>
										</div>

										<p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
											{ann.message || ann.content}
										</p>

										<div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 pt-3 border-t border-white/5">
											<div className="flex items-center gap-1.5">
												<User className="w-3 h-3 text-[#00c8ff]" />
												<span>Broadcast by: {ann.author?.name || ann.authorName || "Hackathon Organizer"}</span>
											</div>
											<div className="flex items-center gap-1.5">
												<Clock className="w-3 h-3" />
												<span>{new Date(ann.createdAt).toLocaleString()}</span>
											</div>
										</div>
									</div>
								);
							})
						)}
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex justify-end">
							<button
								onClick={markAllNotificationsRead}
								className="text-xs text-[#00c8ff] hover:underline cursor-pointer"
							>
								Mark all as read
							</button>
						</div>

						{isLoading ? (
							<div className="py-12 text-center text-xs text-slate-400">Loading notifications...</div>
						) : notifications.length === 0 ? (
							<div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-[#0d1525]/60 border border-white/5">
								You have no unread notifications.
							</div>
						) : (
							notifications.map((notif) => (
								<div
									key={notif.id}
									className={`p-4 rounded-xl bg-[#0d1525]/85 border transition-all flex items-start gap-3 ${
										notif.read ? "border-white/5 text-slate-400" : "border-[#00c8ff]/30 text-white"
									}`}
								>
									<Bell className={`w-4 h-4 mt-0.5 ${notif.read ? "text-slate-500" : "text-[#00c8ff]"}`} />
									<div className="space-y-1 flex-1">
										<div className="text-xs font-semibold">{notif.title}</div>
										<div className="text-xs text-slate-300">{notif.body || notif.message}</div>
										<div className="text-[10px] text-slate-500">
											{new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
										</div>
									</div>
								</div>
							))
						)}
					</div>
				)}
			</div>
			<Toaster position="top-center" />
		</div>
	);
}
