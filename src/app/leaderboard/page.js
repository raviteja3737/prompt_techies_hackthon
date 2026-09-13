"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Award, Trophy, Sparkles, Filter, Lock, Radio, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

export default function LeaderboardPage() {
	const [leaderboardData, setLeaderboardData] = useState([]);
	const [tracks, setTracks] = useState([]);
	const [selectedTrackId, setSelectedTrackId] = useState("");
	const [scoresFrozen, setScoresFrozen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSocketConnected, setIsSocketConnected] = useState(false);

	const fetchLeaderboard = useCallback(async () => {
		try {
			const query = selectedTrackId ? `?trackId=${selectedTrackId}` : "";
			const res = await api.get(`/api/leaderboard${query}`);
			setLeaderboardData(res.data?.leaderboard || []);
			setScoresFrozen(Boolean(res.data?.scoresFrozen));
		} catch (err) {
			console.error("Failed to load leaderboard:", err);
		} finally {
			setIsLoading(false);
		}
	}, [selectedTrackId]);

	useEffect(() => {
		const fetchTracks = async () => {
			try {
				const res = await api.get("/api/tracks");
				setTracks(res.data?.tracks || []);
			} catch (err) {
				console.error("Failed to fetch tracks:", err);
			}
		};
		fetchTracks();
	}, []);

	useEffect(() => {
		fetchLeaderboard();

		const socket = getSocket();
		socket.on("connect", () => setIsSocketConnected(true));
		socket.on("disconnect", () => setIsSocketConnected(false));

		socket.on("leaderboard:update", (data) => {
			if (data?.leaderboard) {
				setLeaderboardData(data.leaderboard);
			}
			if (typeof data?.scoresFrozen !== "undefined") {
				setScoresFrozen(data.scoresFrozen);
			}
		});

		socket.on("leaderboard:freeze-changed", (data) => {
			setScoresFrozen(Boolean(data?.scoresFrozen));
			fetchLeaderboard();
		});

		return () => {
			socket.off("leaderboard:update");
			socket.off("leaderboard:freeze-changed");
		};
	}, [fetchLeaderboard]);

	const top3 = leaderboardData.slice(0, 3);

	return (
		<div className="min-h-screen bg-[#060a12] text-white px-4 py-12 relative overflow-hidden">
			<div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#004bff]/15 blur-[150px] rounded-full pointer-events-none" />
			<div className="absolute bottom-1/4 right-1/4 w-[500px] h-[350px] bg-[#00c8ff]/10 blur-[130px] rounded-full pointer-events-none" />

			<div className="max-w-5xl mx-auto space-y-8 relative z-10">
				{/* Navigation & Header */}
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
								<h1 className="text-3xl font-bold font-orbitron text-white">Live Leaderboard</h1>
								<span
									className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
										isSocketConnected
											? "bg-green-500/10 text-green-400 border-green-500/30"
											: "bg-amber-500/10 text-amber-400 border-amber-500/30"
									}`}
								>
									<Radio className="w-2.5 h-2.5 animate-pulse" />
									{isSocketConnected ? "Live" : "Polling"}
								</span>
							</div>
							<p className="text-xs text-slate-400">
								Real-time evaluation standings &bull; Promptathon 2026
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 bg-[#0d1525]/80 border border-white/15 px-3 py-1.5 rounded-lg text-xs">
							<Filter className="w-3.5 h-3.5 text-[#00c8ff]" />
							<select
								value={selectedTrackId}
								onChange={(e) => setSelectedTrackId(e.target.value)}
								className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
							>
								<option value="" className="bg-[#070c18] text-white">All Tracks</option>
								{tracks.map((t) => (
									<option key={t.id} value={t.id} className="bg-[#070c18] text-white">
										{t.title}
									</option>
								))}
							</select>
						</div>

						<button
							onClick={fetchLeaderboard}
							className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
							title="Refresh Standings"
						>
							<RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
						</button>
					</div>
				</div>

				{/* Score Freeze Alert Banner */}
				{scoresFrozen && (
					<div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
						<div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
							<Lock className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-sm font-bold text-amber-300">Scores are Frozen</h2>
							<p className="text-xs text-amber-200/80">
								The leaderboard is currently locked to maintain suspense for the closing awards ceremony. Numeric points are masked.
							</p>
						</div>
					</div>
				)}

				{/* Podium Top 3 */}
				{!isLoading && top3.length > 0 && (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
						{top3.map((team, idx) => {
							const place = idx + 1;
							const borderGlow =
								place === 1
									? "border-amber-400/60 shadow-[0_0_30px_rgba(251,191,36,0.2)]"
									: place === 2
									? "border-slate-300/50 shadow-[0_0_20px_rgba(203,213,225,0.15)]"
									: "border-amber-700/50 shadow-[0_0_20px_rgba(180,83,9,0.15)]";

							return (
								<div
									key={team.teamId || idx}
									className={`p-6 rounded-2xl bg-[#0d1525]/90 backdrop-blur-xl border ${borderGlow} flex flex-col items-center text-center space-y-3 relative`}
								>
									<div className="w-12 h-12 rounded-full bg-gradient-to-tr from-white/10 to-white/5 border border-white/20 flex items-center justify-center font-orbitron font-bold text-xl text-white">
										{place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉"}
									</div>

									<div>
										<h2 className="text-base font-bold font-orbitron text-white">{team.teamName}</h2>
										<p className="text-[11px] text-[#00c8ff]">{team.track?.title || "General Track"}</p>
									</div>

									<div className="w-full pt-2 border-t border-white/10 flex items-center justify-between text-xs">
										<span className="text-slate-400">Score</span>
										<span className="font-mono font-bold text-white text-sm">
											{scoresFrozen ? "Locked 🔒" : (team.totalScore?.toFixed(1) || "0.0")}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Full Rankings Table */}
				<div className="p-6 bg-[#0d1525]/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg space-y-4">
					<h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">All Teams Ranking</h2>

					{isLoading ? (
						<div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
							<RefreshCw className="w-6 h-6 animate-spin text-[#00c8ff]" />
							<p className="text-xs">Computing live standings...</p>
						</div>
					) : leaderboardData.length === 0 ? (
						<div className="py-12 text-center text-slate-400 text-xs">
							No evaluated submissions yet. Check back soon!
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs text-slate-300">
								<thead className="bg-[#070c18] text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
									<tr>
										<th className="py-3 px-4">Rank</th>
										<th className="py-3 px-4">Team</th>
										<th className="py-3 px-4">Track</th>
										<th className="py-3 px-4 text-center">Reviews</th>
										<th className="py-3 px-4 text-right">Average Score</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5 font-medium">
									{leaderboardData.map((team, index) => (
										<tr key={team.teamId || index} className="hover:bg-white/[0.02] transition-colors">
											<td className="py-3 px-4 font-mono font-bold text-white">#{index + 1}</td>
											<td className="py-3 px-4 text-white font-semibold">{team.teamName}</td>
											<td className="py-3 px-4 text-slate-400">{team.track?.title || "General"}</td>
											<td className="py-3 px-4 text-center font-mono text-slate-400">
												{team.evaluationsCount || 0}
											</td>
											<td className="py-3 px-4 text-right font-mono font-bold text-[#00c8ff]">
												{scoresFrozen ? "Locked 🔒" : (team.totalScore?.toFixed(1) || "0.0")}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
