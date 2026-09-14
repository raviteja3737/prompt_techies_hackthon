"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Mail, Lock, User, Sparkles, ShieldCheck, Eye, EyeOff } from "lucide-react";
import "../styles/registration.css";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/utils/contexts/AuthContext";
import Link from "next/link";

const loginSchema = z.object({
  name: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();
  const { user, login, register: authRegister } = useAuth();

  const redirectByRole = (role) => {
    if (role === "ADMIN") {
      router.push("/admin");
    } else if (role === "JURY") {
      router.push("/jury");
    } else {
      router.push("/teamdetails");
    }
  };

  useEffect(() => {
    if (user) {
      redirectByRole(user.role);
    }
  }, [user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const handleQuickSeedLogin = async () => {
    setIsSubmitting(true);
    try {
      const res = await login("admin@promptothon.dev", "ChangeMe123!");
      toast.success("Logged in as Admin!");
      redirectByRole(res?.user?.role || "ADMIN");
    } catch (err) {
      toast.error("Could not log in: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const fallbackName = data.email.split("@")[0];
        const res = await authRegister({
          intent: "solo",
          name: data.name?.trim() || (fallbackName.length >= 2 ? fallbackName : "Participant"),
          email: data.email.trim(),
          password: data.password,
        });
        toast.success("Account created successfully!");
        redirectByRole(res?.user?.role || "PARTICIPANT");
      } else {
        const res = await login(data.email.trim(), data.password);
        toast.success("Successfully logged in!");
        redirectByRole(res?.user?.role || "PARTICIPANT");
      }
    } catch (error) {
      console.error("Auth error:", error);
      const msg = error.response?.data?.message || error.response?.data?.error || error.message || "Authentication failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-white flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#004bff]/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[200px] bg-[#00c8ff]/15 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md p-8 space-y-6 bg-[#0d1525]/90 backdrop-blur-xl border border-[#00c8ff]/30 rounded-2xl shadow-[0_0_30px_rgba(0,200,255,0.15)] relative z-10">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-[#00c8ff]" />
          <span className="text-xs uppercase tracking-widest text-[#00c8ff] font-semibold">
            Promptathon 2026 Portal
          </span>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold font-orbitron text-white">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-xs text-slate-400">
            {isSignUp
              ? "Join the premier AI Prompt Engineering Hackathon"
              : "Access your dashboard, team, and submissions"}
          </p>
        </div>

        <div className="flex rounded-lg bg-[#070c18] p-1 border border-white/10">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              !isSignUp ? "bg-[#00c8ff] text-black font-semibold shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              isSignUp ? "bg-[#00c8ff] text-black font-semibold shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-xs text-slate-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#00c8ff]" /> Full Name
              </label>
              <input
                {...register("name")}
                placeholder="e.g. Alex Rivera"
                className="w-full px-3.5 py-2 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] focus:ring-1 focus:ring-[#00c8ff] transition-all"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-slate-300 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-[#00c8ff]" /> Email Address
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="you@university.edu"
              className="w-full px-3.5 py-2 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] focus:ring-1 focus:ring-[#00c8ff] transition-all"
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-[#00c8ff]" /> Password
            </label>
            <div className="relative">
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 pr-10 rounded-lg bg-[#070c18] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00c8ff] focus:ring-1 focus:ring-[#00c8ff] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded bg-[#070c18] border-white/20 text-[#00c8ff] focus:ring-[#00c8ff] focus:ring-offset-0"
              />
              <span>Remember Me</span>
            </label>
            <Link href="/register" className="text-[#00c8ff] hover:underline">
              Don&apos;t have an account? Register here
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-lg font-semibold text-black bg-[#00c8ff] hover:bg-[#38bdf8] hover:shadow-[0_0_20px_rgba(0,200,255,0.4)] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
          >
            <span>{isSubmitting ? "Authenticating..." : isSignUp ? "Create Account" : "Sign In"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-white/10 space-y-2">
          <button
            type="button"
            onClick={handleQuickSeedLogin}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-[#00c8ff]" />
            <span>Quick Login with Dev Admin (admin@promptothon.dev)</span>
          </button>
        </div>

        <div className="text-center pt-1 space-y-2">
          <p className="text-xs text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#00c8ff] font-semibold hover:underline">
              Register here
            </Link>
          </p>
          <div>
            <Link href="/" className="text-xs text-slate-400 hover:text-[#00c8ff] transition-colors">
              &larr; Back to Promptathon Home
            </Link>
          </div>
        </div>
      </div>
      <Toaster position="top-center" />
    </div>
  );
};

export default LoginPage;
