"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
	Sparkles,
	Users,
	ArrowRight,
	Lock,
	Mail,
	User,
	GraduationCap,
	Eye,
	EyeOff,
	UserPlus,
	ShieldCheck,
	Key,
} from "lucide-react";
import { FaInstagram, FaLinkedin, FaGithub } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import { useAuth } from "@/utils/contexts/AuthContext";
import { SOCIAL_LINKS } from "@/utils/socialLinks";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

const registerFormSchema = z
	.object({
		name: z.string().min(2, { message: "Name must be at least 2 characters" }).max(80),
		email: z.string().email({ message: "Please enter a valid email address" }),
		college: z.string().max(120).optional(),
		intent: z.enum(["solo", "create", "join"]),
		teamName: z.string().optional(),
		teamCode: z.string().optional(),
		password: z.string().min(8, { message: "Password must be at least 8 characters" }),
		confirmPassword: z.string().min(8, { message: "Please confirm your password" }),
		terms: z.literal(true, {
			errorMap: () => ({ message: "You must accept the terms and conditions" }),
		}),
	})
	.superRefine((data, ctx) => {
		if (data.password !== data.confirmPassword) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["confirmPassword"],
				message: "Passwords do not match",
			});
		}
		if (data.intent === "create") {
			if (!data.teamName || data.teamName.trim().length < 2) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["teamName"],
					message: "Team name must be at least 2 characters",
				});
			}
		}
		if (data.intent === "join") {
			if (!data.teamCode || data.teamCode.trim().length < 4) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["teamCode"],
					message: "Team code must be at least 4 characters",
				});
			}
		}
	});

function getPasswordStrength(password) {
	if (!password) return { score: 0, label: "None", color: "bg-slate-700", width: "0%" };
	let score = 0;
	if (password.length >= 8) score += 1;
	if (/[A-Z]/.test(password)) score += 1;
	if (/[0-9]/.test(password)) score += 1;
	if (/[^A-Za-z0-9]/.test(password)) score += 1;

	if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500", width: "25%" };
	if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500", width: "50%" };
	if (score === 3) return { score: 3, label: "Good", color: "bg-blue-400", width: "75%" };
	return { score: 4, label: "Strong", color: "bg-green-400", width: "100%" };
}

const RegisterPage = () => {
	const router = useRouter();
	const { user, register: authRegister } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(registerFormSchema),
		defaultValues: {
			name: "",
			email: "",
			college: "",
			intent: "solo",
			teamName: "",
			teamCode: "",
			password: "",
			confirmPassword: "",
			terms: false,
		},
	});

	const currentIntent = watch("intent");
	const passwordValue = watch("password");
	const strength = getPasswordStrength(passwordValue);

	useEffect(() => {
		if (user) {
			if (user.role === "ADMIN") router.push("/admin");
			else if (user.role === "JURY") router.push("/jury");
			else router.push("/teamdetails");
		}
	}, [user, router]);

	const onSubmit = async (data) => {
		setIsSubmitting(true);
		try {
			const payload = {
				name: data.name.trim(),
				email: data.email.trim(),
				password: data.password,
				college: data.college?.trim() || undefined,
				intent: data.intent,
			};

			if (data.intent === "create") {
				payload.teamName = data.teamName.trim();
			} else if (data.intent === "join") {
				payload.teamCode = data.teamCode.trim().toUpperCase();
			}

			const res = await authRegister(payload);
			toast.success("Account created successfully!");
			const role = res?.user?.role || "PARTICIPANT";
			if (role === "ADMIN") {
				router.push("/admin");
			} else if (role === "JURY") {
				router.push("/jury");
			} else {
				router.push("/teamdetails");
			}
		} catch (error) {
			console.error("Registration error:", error);
			const msg =
				error.response?.data?.message ||
				error.response?.data?.error ||
				error.message ||
				"Registration failed. Please check your inputs.";
			toast.error(msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#060a12] text-white flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
			{/* Neon Glow Accents */}
			<div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#004bff]/20 blur-[140px] rounded-full pointer-events-none" />
			<div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-[#00c8ff]/15 blur-[120px] rounded-full pointer-events-none" />

			<div className="w-full max-w-xl p-8 space-y-6 bg-[#0d1525]/90 backdrop-blur-xl border border-[#00c8ff]/30 rounded-2xl shadow-[0_0_40px_rgba(0,200,255,0.15)] relative z-10">
				{/* Badge */}
				<div className="flex items-center justify-center gap-2">
					<div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#00c8ff]/30 bg-[#00c8ff]/10 text-[#00c8ff] text-xs font-semibold tracking-wider uppercase">
						<Sparkles className="w-3.5 h-3.5" /> Promptathon 2026 Registration
					</div>
				</div>

				<div className="text-center space-y-1">
					<h1 className="text-3xl font-bold font-orbitron text-white">Create Your Account</h1>
					<p className="text-xs text-slate-400">
						Join India&apos;s biggest student AI hackathon as a Solo Hacker, Team Leader, or Team Member
					</p>
				</div>

				{/* Intent Selector Tabs */}
				<div className="space-y-1.5">
					<label className="text-xs text-slate-300 font-medium">Registration Track & Role</label>
					<div className="grid grid-cols-3 gap-2 rounded-xl bg-[#070c18] p-1.5 border border-white/10">
						<button
							type="button"
							onClick={() => setValue("intent", "solo")}
							className={`py-2 px-3 text-xs rounded-lg font-medium transition-all flex flex-col items-center gap-1 ${
								currentIntent === "solo"
									? "bg-[#00c8ff] text-black font-semibold shadow"
									: "text-slate-400 hover:text-white"
							}`}
						>
							<User className="w-3.5 h-3.5" />
							<span>Solo Hacker</span>
						</button>
						<button
							type="button"
							onClick={() => setValue("intent", "create")}
							className={`py-2 px-3 text-xs rounded-lg font-medium transition-all flex flex-col items-center gap-1 ${
								currentIntent === "create"
									? "bg-[#00c8ff] text-black font-semibold shadow"
									: "text-slate-400 hover:text-white"
							}`}
						>
							<Users className="w-3.5 h-3.5" />
							<span>Create Team</span>
						</button>
						<button
							type="button"
							onClick={() => setValue("intent", "join")}
							className={`py-2 px-3 text-xs rounded-lg font-medium transition-all flex flex-col items-center gap-1 ${
								currentIntent === "join"
									? "bg-[#00c8ff] text-black font-semibold shadow"
									: "text-slate-400 hover:text-white"
							}`}
						>
							<UserPlus className="w-3.5 h-3.5" />
							<span>Join Team</span>
						</button>
					</div>
				</div>

				{/* Registration Form */}
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					{/* Intent-specific fields */}
					{currentIntent === "create" && (
						<div className="space-y-1 p-3 rounded-lg bg-[#00c8ff]/5 border border-[#00c8ff]/20">
							<label className="text-xs text-[#00c8ff] font-medium flex items-center gap-1">
								<Users className="w-3.5 h-3.5" /> Team Name (Leader Role)
							</label>
							<input
								{...register("teamName")}
								placeholder="e.g. Neural Pioneers"
								className="w-full px-3.5 py-2 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] focus:ring-1 focus:ring-[#00c8ff]"
							/>
							{errors.teamName && <p className="text-xs text-red-400">{errors.teamName.message}</p>}
						</div>
					)}

					{currentIntent === "join" && (
						<div className="space-y-1 p-3 rounded-lg bg-[#00c8ff]/5 border border-[#00c8ff]/20">
							<label className="text-xs text-[#00c8ff] font-medium flex items-center gap-1">
								<Key className="w-3.5 h-3.5" /> 6-Character Team Invite Code
							</label>
							<input
								{...register("teamCode")}
								placeholder="e.g. AB12CD"
								className="w-full px-3.5 py-2 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white uppercase placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] focus:ring-1 focus:ring-[#00c8ff]"
							/>
							{errors.teamCode && <p className="text-xs text-red-400">{errors.teamCode.message}</p>}
						</div>
					)}

					{/* Profile fields */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1">
							<label className="text-xs text-slate-300 flex items-center gap-1">
								<User className="w-3.5 h-3.5 text-[#00c8ff]" /> Full Name
							</label>
							<input
								{...register("name")}
								placeholder="e.g. Alex Rivera"
								className="w-full px-3.5 py-2 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] focus:ring-1 focus:ring-[#00c8ff]"
							/>
							{errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
						</div>

						<div className="space-y-1">
							<label className="text-xs text-slate-300 flex items-center gap-1">
								<Mail className="w-3.5 h-3.5 text-[#00c8ff]" /> Email Address
							</label>
							<input
								{...register("email")}
								type="email"
								placeholder="you@university.edu"
								className="w-full px-3.5 py-2 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] focus:ring-1 focus:ring-[#00c8ff]"
							/>
							{errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
						</div>
					</div>

					<div className="space-y-1">
						<label className="text-xs text-slate-300 flex items-center gap-1">
							<GraduationCap className="w-3.5 h-3.5 text-[#00c8ff]" /> College / University (Optional)
						</label>
						<input
							{...register("college")}
							placeholder="e.g. Stanford University / IIT Delhi"
							className="w-full px-3.5 py-2 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] focus:ring-1 focus:ring-[#00c8ff]"
						/>
						{errors.college && <p className="text-xs text-red-400">{errors.college.message}</p>}
					</div>

					{/* Password fields */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1">
							<label className="text-xs text-slate-300 flex items-center gap-1">
								<Lock className="w-3.5 h-3.5 text-[#00c8ff]" /> Password
							</label>
							<div className="relative">
								<input
									{...register("password")}
									type={showPassword ? "text" : "password"}
									placeholder="Min 8 chars"
									className="w-full px-3.5 py-2 pr-10 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] focus:ring-1 focus:ring-[#00c8ff]"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
									aria-label={showPassword ? "Hide password" : "Show password"}
								>
									{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
								</button>
							</div>
							{errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
						</div>

						<div className="space-y-1">
							<label className="text-xs text-slate-300 flex items-center gap-1">
								<Lock className="w-3.5 h-3.5 text-[#00c8ff]" /> Confirm Password
							</label>
							<div className="relative">
								<input
									{...register("confirmPassword")}
									type={showConfirmPassword ? "text" : "password"}
									placeholder="Confirm password"
									className="w-full px-3.5 py-2 pr-10 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] focus:ring-1 focus:ring-[#00c8ff]"
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
									aria-label={showConfirmPassword ? "Hide password" : "Show password"}
								>
									{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
								</button>
							</div>
							{errors.confirmPassword && (
								<p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
							)}
						</div>
					</div>

					{/* Live Password Strength Meter */}
					{passwordValue && (
						<div className="space-y-1 pt-1">
							<div className="flex items-center justify-between text-[11px] text-slate-400">
								<span>Password Strength</span>
								<span className="font-semibold text-slate-300">{strength.label}</span>
							</div>
							<div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
								<div
									className={`h-full ${strength.color} transition-all duration-300 rounded-full`}
									style={{ width: strength.width }}
								/>
							</div>
						</div>
					)}

					{/* Terms and Conditions */}
					<div className="pt-2">
						<label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer select-none">
							<input
								type="checkbox"
								{...register("terms")}
								className="mt-0.5 rounded bg-[#070c18] border-white/20 text-[#00c8ff] focus:ring-[#00c8ff] focus:ring-offset-0"
							/>
							<span>
								I agree to the Promptathon 2026 Terms, Rules, and Code of Conduct. I acknowledge that hackathon submissions and evaluations are subject to organizer guidelines.
							</span>
						</label>
						{errors.terms && <p className="text-xs text-red-400 mt-1">{errors.terms.message}</p>}
					</div>

					{/* Submit Button */}
					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full py-3 px-4 rounded-lg font-semibold text-black bg-[#00c8ff] hover:bg-[#38bdf8] hover:shadow-[0_0_25px_rgba(0,200,255,0.4)] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
					>
						<span>{isSubmitting ? "Creating Account..." : "Complete Registration"}</span>
						<ArrowRight className="w-4 h-4" />
					</button>
				</form>

				{/* Sign in link */}
				<div className="text-center pt-2 border-t border-white/10">
					<p className="text-xs text-slate-400">
						Already have an account?{" "}
						<Link href="/login" className="text-[#00c8ff] font-semibold hover:underline">
							Sign in here
						</Link>
					</p>
				</div>

				{/* Social Links & Home */}
				<div className="space-y-3 pt-2 text-center">
					<p className="text-xs text-slate-400">
						Follow Prompt Techies for tracks, updates & announcements:
					</p>
					<div className="flex justify-center gap-4">
						{SOCIAL_LINKS.instagram && (
							<a
								href={SOCIAL_LINKS.instagram}
								target="_blank"
								rel="noopener noreferrer"
								className="p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-pink-400 hover:border-pink-400/50 transition-all"
								aria-label="Instagram"
							>
								<FaInstagram size={18} />
							</a>
						)}
						{SOCIAL_LINKS.hackathonLinkedin && (
							<a
								href={SOCIAL_LINKS.hackathonLinkedin}
								target="_blank"
								rel="noopener noreferrer"
								className="p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-blue-400 hover:border-blue-400/50 transition-all"
								aria-label="LinkedIn"
							>
								<FaLinkedin size={18} />
							</a>
						)}
						{SOCIAL_LINKS.github && (
							<a
								href={SOCIAL_LINKS.github}
								target="_blank"
								rel="noopener noreferrer"
								className="p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/50 transition-all"
								aria-label="GitHub"
							>
								<FaGithub size={18} />
							</a>
						)}
					</div>

					<div>
						<button
							type="button"
							onClick={() => router.push("/")}
							className="text-xs text-slate-400 hover:text-[#00c8ff] transition-colors"
						>
							&larr; Return to Promptathon Home
						</button>
					</div>
				</div>
			</div>
			<Toaster position="top-center" />
		</div>
	);
};

export default RegisterPage;
