"use client";

import React, { useState, useEffect } from "react";
import {
	ArrowLeft,
	Send,
	Github,
	Globe,
	Video,
	FileText,
	CheckCircle2,
	Lock,
	Sparkles,
	ShieldAlert,
	ExternalLink,
	Download,
	Plus,
	X,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/utils/contexts/AuthContext";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

const GITHUB_REGEX = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/;

export default function SubmissionPage() {
	const { user, loading: authLoading, isTeamLeader, isRegistered } = useAuth();
	const router = useRouter();

	const [repoUrl, setRepoUrl] = useState("");
	const [liveUrl, setLiveUrl] = useState("");
	const [videoUrl, setVideoUrl] = useState("");
	const [techTagsList, setTechTagsList] = useState([]);
	const [tagInput, setTagInput] = useState("");
	const [isLocked, setIsLocked] = useState(false);
	const [pitchDeckKey, setPitchDeckKey] = useState("");
	const [pitchDeckUrl, setPitchDeckUrl] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [isSavingDeckUrl, setIsSavingDeckUrl] = useState(false);
	const [selectedFile, setSelectedFile] = useState(null);

	useEffect(() => {
		if (!authLoading && !user) {
			router.push("/login");
			return;
		}

		const fetchSubmission = async () => {
			try {
				const res = await api.get("/api/team/submission");
				const sub = res.data?.submission;
				if (sub) {
					setRepoUrl(sub.repoUrl || "");
					setLiveUrl(sub.liveUrl || "");
					setVideoUrl(sub.videoUrl || "");
					if (Array.isArray(sub.techTags)) {
						setTechTagsList(sub.techTags);
					} else if (typeof sub.techTags === "string" && sub.techTags) {
						setTechTagsList(sub.techTags.split(",").map((t) => t.trim()).filter(Boolean));
					}
					setIsLocked(sub.status === "SUBMITTED");
					setPitchDeckKey(sub.pitchDeckKey || "");
					setPitchDeckUrl(sub.pitchDeckUrl || "");
				}
			} catch (err) {
				console.error("Failed to load submission:", err);
			} finally {
				setIsLoading(false);
			}
		};

		if (user) {
			fetchSubmission();
		}
	}, [user, authLoading, router]);

	const handleAddTag = () => {
		const trimmed = tagInput.trim().replace(/^,+|,+$/g, "");
		if (!trimmed) return;
		if (!techTagsList.includes(trimmed)) {
			setTechTagsList((prev) => [...prev, trimmed]);
		}
		setTagInput("");
	};

	const handleRemoveTag = (tagToRemove) => {
		setTechTagsList((prev) => prev.filter((t) => t !== tagToRemove));
	};

	const handleUploadPitchDeck = async () => {
		if (!isTeamLeader) {
			toast.error("Only the team leader can upload deliverables.");
			return;
		}

		if (!selectedFile) {
			toast.error("Please choose a PDF file first.");
			return;
		}

		if (selectedFile.type !== "application/pdf") {
			toast.error("Only PDF format is supported for pitch decks.");
			return;
		}

		if (!repoUrl.trim() || !GITHUB_REGEX.test(repoUrl.trim())) {
			toast.error("Please provide a valid GitHub repository URL first so a draft can be created.");
			return;
		}

		setIsUploading(true);
		try {
			// Auto-save / upsert draft first so submissions.controller.js:157 does not throw 409
			await api.post("/api/team/submission", {
				repoUrl: repoUrl.trim(),
				liveUrl: liveUrl.trim() || undefined,
				videoUrl: videoUrl.trim() || undefined,
				techTags: techTagsList,
				submit: false,
			});

			// Step 1: Request presigned upload URL
			const presignedRes = await api.post("/api/team/submission/upload-url", {
				contentType: "application/pdf",
				sizeBytes: selectedFile.size,
			});

			const { uploadUrl, key } = presignedRes.data;

			// Step 2: Upload file directly
			await fetch(uploadUrl, {
				method: "PUT",
				headers: { "Content-Type": "application/pdf" },
				body: selectedFile,
			});

			// Step 3: Confirm storage key with backend
			await api.post("/api/team/submission/pitch-deck", {
				key,
				url: uploadUrl.split("?")[0],
			});
			setPitchDeckKey(key);
			setPitchDeckUrl(uploadUrl.split("?")[0]);
			toast.success("Pitch deck PDF uploaded and linked successfully!");
		} catch (err) {
			toast.error(err.response?.data?.message || err.message || "Failed to upload pitch deck.");
		} finally {
			setIsUploading(false);
		}
	};

	const handleSaveDeckUrl = async () => {
		if (!isTeamLeader) {
			toast.error("Only the team leader can manage deliverables.");
			return;
		}

		if (!pitchDeckUrl.trim()) {
			toast.error("Please enter a valid Pitch Deck link.");
			return;
		}

		if (!/^https?:\/\//i.test(pitchDeckUrl.trim())) {
			toast.error("Pitch Deck URL must begin with http:// or https://");
			return;
		}

		if (!repoUrl.trim() || !GITHUB_REGEX.test(repoUrl.trim())) {
			toast.error("Please enter a valid GitHub repository URL first to initialize your draft.");
			return;
		}

		setIsSavingDeckUrl(true);
		try {
			// Ensure draft exists
			await api.post("/api/team/submission", {
				repoUrl: repoUrl.trim(),
				liveUrl: liveUrl.trim() || undefined,
				videoUrl: videoUrl.trim() || undefined,
				techTags: techTagsList,
				submit: false,
			});

			const key = "url:" + encodeURIComponent(pitchDeckUrl.trim().slice(0, 80));
			await api.post("/api/team/submission/pitch-deck", {
				key,
				url: pitchDeckUrl.trim(),
			});
			setPitchDeckKey(key);
			toast.success("Pitch deck link saved successfully!");
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to save pitch deck link.");
		} finally {
			setIsSavingDeckUrl(false);
		}
	};

	const handleViewPitchDeck = async () => {
		try {
			const res = await api.get("/api/team/submission/pitch-deck-url");
			const url = res.data?.downloadUrl || res.data?.url || pitchDeckUrl;
			if (url) {
				window.open(url, "_blank", "noopener,noreferrer");
			} else {
				toast.error("Pitch deck download URL unavailable.");
			}
		} catch (err) {
			if (pitchDeckUrl) {
				window.open(pitchDeckUrl, "_blank", "noopener,noreferrer");
			} else {
				toast.error(err.response?.data?.message || "Could not retrieve pitch deck download link.");
			}
		}
	};

	const handleSubmit = async (submitFinal = false) => {
		if (!isTeamLeader) {
			toast.error("Only the team leader can manage or submit the project deliverables.");
			return;
		}

		if (!repoUrl.trim() || !GITHUB_REGEX.test(repoUrl.trim())) {
			toast.error("Please enter a valid GitHub repository URL (e.g. https://github.com/org/repo).");
			return;
		}

		if (liveUrl.trim() && !/^https?:\/\//i.test(liveUrl.trim())) {
			toast.error("Live Demo URL must begin with http:// or https://");
			return;
		}

		if (videoUrl.trim() && !/^https?:\/\//i.test(videoUrl.trim())) {
			toast.error("Demo Video URL must begin with http:// or https://");
			return;
		}

		if (
			submitFinal &&
			!confirm("Are you sure you want to permanently submit? Once submitted, your project deliverables become immutable!")
		) {
			return;
		}

		setIsSaving(true);
		try {
			await api.post("/api/team/submission", {
				repoUrl: repoUrl.trim(),
				liveUrl: liveUrl.trim() || undefined,
				videoUrl: videoUrl.trim() || undefined,
				techTags: techTagsList,
				submit: submitFinal,
			});

			if (submitFinal) {
				setIsLocked(true);
				toast.success("Project permanently submitted for evaluation!");
			} else {
				toast.success("Draft saved successfully!");
			}
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to save submission.");
		} finally {
			setIsSaving(false);
		}
	};

	if (authLoading || isLoading) {
		return (
			<div className="min-h-screen bg-[#060a12] text-white flex flex-col items-center justify-center">
				<div className="w-12 h-12 border-4 border-[#00c8ff]/20 border-t-[#00c8ff] rounded-full animate-spin mb-4" />
				<p className="text-sm text-slate-400 font-orbitron">Loading Submission Hub...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#060a12] text-white px-4 py-12 relative overflow-hidden">
			<div className="absolute top-1/4 left-1/3 w-[600px] h-[350px] bg-[#004bff]/15 blur-[150px] rounded-full pointer-events-none" />
			<div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-[#00c8ff]/10 blur-[120px] rounded-full pointer-events-none" />

			<div className="max-w-4xl mx-auto space-y-8 relative z-10">
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
							<h1 className="text-2xl font-bold font-orbitron text-white">Project Submission</h1>
							<p className="text-xs text-slate-400">Deliverables, repository links & pitch presentation</p>
						</div>
					</div>

					{isLocked && (
						<div className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
							<Lock className="w-3.5 h-3.5" />
							<span>Submission Finalized</span>
						</div>
					)}
				</div>

				{/* Submission Form Container */}
				<div className="p-8 bg-[#0d1525]/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl space-y-6">
					{!isTeamLeader && (
						<div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
							<ShieldAlert className="w-4 h-4 flex-shrink-0" />
							<span>
								You are viewing this submission as a team member. Only your Team Leader can edit or finalize deliverables.
							</span>
						</div>
					)}

					<div className="space-y-4">
						{/* Repository URL */}
						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
								<Github className="w-4 h-4 text-[#00c8ff]" /> GitHub Repository URL *
							</label>
							<input
								type="url"
								disabled={isLocked || !isTeamLeader}
								value={repoUrl}
								onChange={(e) => setRepoUrl(e.target.value)}
								placeholder="https://github.com/your-org/your-repo"
								className="w-full px-3.5 py-2.5 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] disabled:opacity-60"
							/>
							<p className="text-[11px] text-slate-500">
								Must be a valid GitHub repo link (e.g. https://github.com/org/repo).
							</p>
						</div>

						{/* Live Demo URL */}
						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
								<Globe className="w-4 h-4 text-[#00c8ff]" /> Live Demo / Deployment URL (Optional)
							</label>
							<input
								type="url"
								disabled={isLocked || !isTeamLeader}
								value={liveUrl}
								onChange={(e) => setLiveUrl(e.target.value)}
								placeholder="https://my-app.vercel.app"
								className="w-full px-3.5 py-2.5 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] disabled:opacity-60"
							/>
							<p className="text-[11px] text-slate-500">Must begin with http:// or https://</p>
						</div>

						{/* Demo Video URL */}
						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
								<Video className="w-4 h-4 text-[#00c8ff]" /> Demo Video URL (Loom / YouTube / Drive)
							</label>
							<input
								type="url"
								disabled={isLocked || !isTeamLeader}
								value={videoUrl}
								onChange={(e) => setVideoUrl(e.target.value)}
								placeholder="https://www.youtube.com/watch?v=..."
								className="w-full px-3.5 py-2.5 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] disabled:opacity-60"
							/>
							<p className="text-[11px] text-slate-500">Must begin with http:// or https://</p>
						</div>

						{/* Interactive Tech Stack Tags */}
						<div className="space-y-2">
							<label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
								<Sparkles className="w-4 h-4 text-[#00c8ff]" /> Technologies & AI Models Used
							</label>
							{!isLocked && isTeamLeader && (
								<div className="flex gap-2">
									<input
										type="text"
										value={tagInput}
										onChange={(e) => setTagInput(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === ",") {
												e.preventDefault();
												handleAddTag();
											}
										}}
										placeholder="Add technology tag (e.g. Gemini 1.5, Next.js, PyTorch) and press Enter"
										className="w-full px-3.5 py-2 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff]"
									/>
									<button
										type="button"
										onClick={handleAddTag}
										className="px-3.5 py-2 rounded-lg bg-[#00c8ff]/10 hover:bg-[#00c8ff]/20 text-[#00c8ff] border border-[#00c8ff]/30 text-xs font-semibold whitespace-nowrap"
									>
										Add Tag
									</button>
								</div>
							)}
							<div className="flex flex-wrap gap-2 min-h-[38px] p-2.5 rounded-lg bg-[#070c18] border border-white/10 items-center">
								{techTagsList.length === 0 ? (
									<span className="text-xs text-slate-500 italic">No technology tags added yet.</span>
								) : (
									techTagsList.map((tag, idx) => (
										<span
											key={idx}
											className="px-2.5 py-1 rounded-md bg-[#00c8ff]/15 border border-[#00c8ff]/30 text-[#00c8ff] text-xs font-medium flex items-center gap-1.5"
										>
											{tag}
											{!isLocked && isTeamLeader && (
												<button
													type="button"
													onClick={() => handleRemoveTag(tag)}
													className="text-slate-400 hover:text-red-400 font-bold transition-colors ml-0.5"
												>
													&times;
												</button>
											)}
										</span>
									))
								)}
							</div>
						</div>

						{/* Pitch Deck Section */}
						<div className="pt-4 border-t border-white/10 space-y-4">
							<div>
								<h3 className="text-sm font-bold font-orbitron text-white flex items-center gap-2">
									<FileText className="w-4 h-4 text-[#00c8ff]" /> Pitch Deck Slide Deck
								</h3>
								<p className="text-xs text-slate-400">
									Provide your presentation as a direct file upload or via external presentation URL.
								</p>
							</div>

							{/* Active Pitch Deck Indicator & Download */}
							{(pitchDeckKey || pitchDeckUrl) && (
								<div className="p-3.5 rounded-xl bg-green-950/20 border border-green-500/20 text-xs text-green-300 flex flex-wrap items-center justify-between gap-3">
									<div className="flex items-center gap-2">
										<CheckCircle2 className="w-4 h-4 text-green-400" />
										<span>Pitch deck linked: {pitchDeckKey || pitchDeckUrl}</span>
									</div>
									<button
										type="button"
										onClick={handleViewPitchDeck}
										className="px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
									>
										<ExternalLink className="w-3.5 h-3.5" />
										<span>View / Download Deck</span>
									</button>
								</div>
							)}

							{/* File Upload Option */}
							{!isLocked && isTeamLeader && (
								<div className="p-4 rounded-xl bg-[#070c18] border border-white/10 space-y-2">
									<span className="text-xs text-slate-300 font-medium">Option A: Upload PDF Slide Deck</span>
									<div className="flex flex-wrap items-center gap-3">
										<input
											type="file"
											accept="application/pdf"
											onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
											className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#00c8ff]/10 file:text-[#00c8ff] hover:file:bg-[#00c8ff]/20"
										/>
										<button
											type="button"
											onClick={handleUploadPitchDeck}
											disabled={isUploading || !selectedFile}
											className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white border border-white/15 disabled:opacity-50"
										>
											{isUploading ? "Uploading PDF..." : "Upload Pitch Deck"}
										</button>
									</div>
								</div>
							)}

							{/* Direct URL Fallback Option */}
							<div className="p-4 rounded-xl bg-[#070c18] border border-white/10 space-y-2">
								<span className="text-xs text-slate-300 font-medium">
									Option B: External Pitch Deck Link (Google Slides, Canva, OneDrive, PDF)
								</span>
								<div className="flex gap-2">
									<input
										type="url"
										disabled={isLocked || !isTeamLeader}
										value={pitchDeckUrl}
										onChange={(e) => setPitchDeckUrl(e.target.value)}
										placeholder="https://docs.google.com/presentation/d/... or Canva / PDF link"
										className="w-full px-3.5 py-2 rounded-lg bg-[#0d1525] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] disabled:opacity-60"
									/>
									{!isLocked && isTeamLeader && (
										<button
											type="button"
											onClick={handleSaveDeckUrl}
											disabled={isSavingDeckUrl || !pitchDeckUrl.trim()}
											className="px-3.5 py-2 rounded-lg bg-[#00c8ff]/10 hover:bg-[#00c8ff]/20 text-[#00c8ff] border border-[#00c8ff]/30 text-xs font-semibold whitespace-nowrap disabled:opacity-50"
										>
											{isSavingDeckUrl ? "Saving..." : "Save Link"}
										</button>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Action Buttons */}
					{!isLocked && isTeamLeader && (
						<div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-end gap-3">
							<button
								type="button"
								onClick={() => handleSubmit(false)}
								disabled={isSaving}
								className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-50"
							>
								{isSaving ? "Saving..." : "Save Draft"}
							</button>

							<button
								type="button"
								onClick={() => handleSubmit(true)}
								disabled={isSaving}
								className="px-5 py-2.5 rounded-lg text-xs font-bold text-black bg-[#00c8ff] hover:bg-[#38bdf8] hover:shadow-[0_0_20px_rgba(0,200,255,0.4)] transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
							>
								<Lock className="w-3.5 h-3.5" />
								<span>{isSaving ? "Submitting..." : "Final Submit & Lock"}</span>
							</button>
						</div>
					)}
				</div>
			</div>
			<Toaster position="top-center" />
		</div>
	);
}
