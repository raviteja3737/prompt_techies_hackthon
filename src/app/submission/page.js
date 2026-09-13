"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Send, Github, Globe, Video, FileText, CheckCircle2, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/utils/contexts/AuthContext";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

const GITHUB_REGEX = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/;

export default function SubmissionPage() {
	const { user, loading: authLoading } = useAuth();
	const router = useRouter();

	const [repoUrl, setRepoUrl] = useState("");
	const [liveUrl, setLiveUrl] = useState("");
	const [videoUrl, setVideoUrl] = useState("");
	const [techTags, setTechTags] = useState("");
	const [isLocked, setIsLocked] = useState(false);
	const [pitchDeckKey, setPitchDeckKey] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
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
					setTechTags(Array.isArray(sub.techTags) ? sub.techTags.join(", ") : (sub.techTags || ""));
					setIsLocked(sub.status === "SUBMITTED");
					setPitchDeckKey(sub.pitchDeckKey || "");
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

	const handleUploadPitchDeck = async () => {
		if (!selectedFile) {
			toast.error("Please choose a PDF file first.");
			return;
		}

		if (selectedFile.type !== "application/pdf") {
			toast.error("Only PDF format is supported for pitch decks.");
			return;
		}

		setIsUploading(true);
		try {
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
			await api.post("/api/team/submission/pitch-deck", { key });
			setPitchDeckKey(key);
			toast.success("Pitch deck PDF uploaded successfully!");
		} catch (err) {
			toast.error(err.response?.data?.message || err.message || "Failed to upload pitch deck.");
		} finally {
			setIsUploading(false);
		}
	};

	const handleSubmit = async (submitFinal = false) => {
		if (!repoUrl.trim() || !GITHUB_REGEX.test(repoUrl.trim())) {
			toast.error("Please enter a valid GitHub repository URL (e.g. https://github.com/org/repo).");
			return;
		}

		if (submitFinal && !confirm("Are you sure you want to permanently submit? Once submitted, your project cannot be edited!")) {
			return;
		}

		setIsSaving(true);
		try {
			const tagsArray = techTags
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);

			await api.post("/api/team/submission", {
				repoUrl: repoUrl.trim(),
				liveUrl: liveUrl.trim() || undefined,
				videoUrl: videoUrl.trim() || undefined,
				techTags: tagsArray,
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
				<div className="w-10 h-10 border-4 border-[#00c8ff]/20 border-t-[#00c8ff] rounded-full animate-spin mb-4" />
				<p className="text-xs text-slate-400 font-orbitron">Loading Submission Portal...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#060a12] text-white px-4 py-12 relative overflow-hidden">
			<div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#004bff]/15 blur-[140px] rounded-full pointer-events-none" />

			<div className="max-w-3xl mx-auto space-y-8 relative z-10">
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
							<p className="text-xs text-slate-400">Promptathon 2026 Deliverables</p>
						</div>
					</div>

					{isLocked && (
						<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/30">
							<Lock className="w-3.5 h-3.5" /> Permanently Submitted
						</span>
					)}
				</div>

				{/* Submission Form */}
				<div className="p-8 bg-[#0d1525]/90 backdrop-blur-xl border border-[#00c8ff]/20 rounded-2xl shadow-xl space-y-6">
					{isLocked && (
						<div className="p-4 rounded-xl bg-green-950/30 border border-green-500/30 flex items-center gap-3 text-xs text-green-300">
							<CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
							<span>Your submission has been locked and queued for jury evaluation. Great work!</span>
						</div>
					)}

					<div className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
								<Github className="w-4 h-4 text-[#00c8ff]" /> GitHub Repository URL *
							</label>
							<input
								type="url"
								disabled={isLocked}
								value={repoUrl}
								onChange={(e) => setRepoUrl(e.target.value)}
								placeholder="https://github.com/username/project"
								className="w-full px-3.5 py-2.5 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] disabled:opacity-60"
							/>
							<p className="text-[11px] text-slate-500">Must be a public GitHub repository link.</p>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
								<Globe className="w-4 h-4 text-[#00c8ff]" /> Live Demo / Deployment URL (Optional)
							</label>
							<input
								type="url"
								disabled={isLocked}
								value={liveUrl}
								onChange={(e) => setLiveUrl(e.target.value)}
								placeholder="https://my-app.vercel.app"
								className="w-full px-3.5 py-2.5 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] disabled:opacity-60"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
								<Video className="w-4 h-4 text-[#00c8ff]" /> Demo Video URL (Loom / YouTube / Drive)
							</label>
							<input
								type="url"
								disabled={isLocked}
								value={videoUrl}
								onChange={(e) => setVideoUrl(e.target.value)}
								placeholder="https://www.youtube.com/watch?v=..."
								className="w-full px-3.5 py-2.5 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] disabled:opacity-60"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
								<Sparkles className="w-4 h-4 text-[#00c8ff]" /> Technologies & AI Models Used
							</label>
							<input
								type="text"
								disabled={isLocked}
								value={techTags}
								onChange={(e) => setTechTags(e.target.value)}
								placeholder="e.g. Gemini 1.5 Pro, Next.js, Express, LangChain, Tailwind"
								className="w-full px-3.5 py-2.5 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] disabled:opacity-60"
							/>
							<p className="text-[11px] text-slate-500">Comma-separated tags</p>
						</div>

						{/* Pitch Deck Upload Section */}
						<div className="pt-4 border-t border-white/10 space-y-3">
							<label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
								<FileText className="w-4 h-4 text-[#00c8ff]" /> Pitch Deck Slide Deck (PDF)
							</label>
							{pitchDeckKey && (
								<div className="p-3 rounded-lg bg-green-950/20 border border-green-500/20 text-xs text-green-300 flex items-center gap-2">
									<CheckCircle2 className="w-4 h-4 text-green-400" />
									<span>Pitch deck file stored: {pitchDeckKey}</span>
								</div>
							)}
							{!isLocked && (
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
							)}
						</div>
					</div>

					{/* Action Buttons */}
					{!isLocked && (
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
