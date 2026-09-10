"use client";

import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Mail, Lock, User, Sparkles, ShieldCheck, KeyRound } from "lucide-react";
import TypingEffect2 from "@/app/TypingEffect2";
import "../styles/registration.css";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";
import { auth, db } from "@/app/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useAuth } from "@/utils/contexts/AuthContext";
import { createDefault3MemberTeam } from "@/utils/bypassAuth";
import Link from "next/link";

const loginSchema = z.object({
  name: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { loginDemoUser, refreshUserData } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
    getValues,
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const handleContinue = () => {
    const emailVal = getValues("email");
    if (!emailVal || !emailVal.includes("@")) {
      toast.error("Please enter a valid email before continuing");
      return;
    }
    setEmailSubmitted(true);
    setShowPasswordInput(true);
    setTimeout(() => setFocus("password"), 100);
  };

  const handleBypassDirect = () => {
    if (loginDemoUser) loginDemoUser();
    toast.success("Developer Bypass: Logged in with 3-member team!");
    router.push("/teamdetails");
  };

  const handleTypingComplete = useCallback(() => {
    setShowEmailInput(true);
  }, []);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        // Real Firebase Sign Up
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          data.email.trim(),
          data.password
        );
        const user = userCredential.user;

        if (data.name) {
          await updateProfile(user, { displayName: data.name.trim() });
        }

        // Initialize a 3-member team template in Firestore for this new user
        try {
          const defaultTeam = createDefault3MemberTeam({
            uid: user.uid,
            email: user.email,
            displayName: data.name || user.email.split("@")[0],
          });
          await setDoc(doc(db, "teams", user.uid), {
            ...defaultTeam,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } catch (dbErr) {
          console.warn("Firestore auto-seed notice:", dbErr.message);
        }

        toast.success("Account created successfully!");
        if (refreshUserData) refreshUserData();
        router.push("/teamdetails");
      } else {
        // Real Firebase Sign In
        const userCredential = await signInWithEmailAndPassword(
          auth,
          data.email.trim(),
          data.password
        );
        const user = userCredential.user;

        toast.success("Successfully logged in!");
        if (refreshUserData) refreshUserData();
        router.push("/teamdetails");
      }
    } catch (error) {
      console.error("Auth error:", error);
      const code = error.code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        toast.error("Invalid email or password. Please verify and try again.");
      } else if (code === "auth/email-already-in-use") {
        toast.error("An account with this email already exists. Please log in instead.");
        setIsSignUp(false);
      } else if (code === "auth/weak-password") {
        toast.error("Password is too weak. Please use at least 6 characters.");
      } else if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid") {
        toast.error(
          "Firebase API Key in .env.local is not valid. Use the Quick Bypass button below for local testing!"
        );
      } else {
        toast.error(`Authentication error: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = getValues("email");
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success("Password reset email sent! Check your inbox.");
      setForgotPasswordMode(false);
    } catch (error) {
      toast.error(`Reset email failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-white flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Neon Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-[#004bff]/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-[#00c8ff]/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md p-8 space-y-6 bg-[#0d1525]/80 backdrop-blur-xl border border-[#00c8ff]/30 rounded-2xl shadow-[0_0_40px_rgba(0,200,255,0.15)] relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00c8ff]/30 bg-[#00c8ff]/10 text-[#00c8ff] text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Promptathon 2026 Portal
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold font-orbitron text-white tracking-wide">
            {isSignUp ? "Create Account" : "Participant Login"}
          </h1>
          <p className="text-sm text-slate-300">
            {isSignUp
              ? "Join Promptathon 2026 to build and manage your 3-member team"
              : "Sign in to view and manage your team details"}
          </p>
        </div>

        {/* Tab Switcher: Login vs Sign Up */}
        <div className="flex bg-[#070c18] p-1 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setShowEmailInput(true);
              setShowPasswordInput(true);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
              !isSignUp
                ? "bg-gradient-to-r from-[#004bff] to-[#00c8ff] text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setShowEmailInput(true);
              setShowPasswordInput(true);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
              isSignUp
                ? "bg-gradient-to-r from-[#004bff] to-[#00c8ff] text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Typing Intro (only on initial login view if not opened yet) */}
        {!showEmailInput && !isSignUp && (
          <div className="py-4 text-center">
            <h2 className="text-lg font-medium text-[#00c8ff]">
              <TypingEffect2
                text="Welcome back, participant!"
                speed={40}
                onComplete={handleTypingComplete}
              />
            </h2>
          </div>
        )}

        {/* Auth Form */}
        {(showEmailInput || isSignUp) && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Full Name for Sign Up */}
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    {...register("name")}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#070c18]/80 border border-white/15 text-white rounded-lg focus:outline-none focus:border-[#00c8ff] focus:ring-1 focus:ring-[#00c8ff] transition-all text-sm placeholder-slate-500"
                    placeholder="Enter your full name"
                  />
                  <User className="absolute w-4 h-4 text-slate-400 left-3 top-3.5" />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Email Address</label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#070c18]/80 border border-white/15 text-white rounded-lg focus:outline-none focus:border-[#00c8ff] focus:ring-1 focus:ring-[#00c8ff] transition-all text-sm placeholder-slate-500"
                  placeholder="name@example.com"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !showPasswordInput && !isSignUp) {
                      event.preventDefault();
                      handleContinue();
                    }
                  }}
                />
                <Mail className="absolute w-4 h-4 text-slate-400 left-3 top-3.5" />
              </div>
              {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            {/* Password Field */}
            {(showPasswordInput || isSignUp) && !forgotPasswordMode && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setForgotPasswordMode(true)}
                      className="text-xs text-[#00c8ff] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    {...register("password")}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#070c18]/80 border border-white/15 text-white rounded-lg focus:outline-none focus:border-[#00c8ff] focus:ring-1 focus:ring-[#00c8ff] transition-all text-sm placeholder-slate-500"
                    placeholder="••••••••"
                  />
                  <Lock className="absolute w-4 h-4 text-slate-400 left-3 top-3.5" />
                </div>
                {errors.password && <p className="text-xs text-rose-400">{errors.password.message}</p>}
              </div>
            )}

            {/* Single Action Button */}
            {!showPasswordInput && !isSignUp ? (
              <button
                type="button"
                onClick={handleContinue}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 text-white font-semibold bg-gradient-to-r from-[#004bff] to-[#00c8ff] rounded-lg hover:shadow-[0_0_20px_rgba(0,200,255,0.4)] transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              !forgotPasswordMode && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 text-white font-semibold bg-gradient-to-r from-[#004bff] to-[#00c8ff] rounded-lg hover:shadow-[0_0_25px_rgba(0,200,255,0.5)] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSubmitting ? "Authenticating..." : isSignUp ? "Create Account & Team" : "Log In"}</span>
                </button>
              )
            )}

            {/* Forgot Password Sub-flow */}
            {forgotPasswordMode && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-300">
                  Enter your email above to receive a secure password reset link.
                </p>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full py-2.5 px-4 rounded-lg font-semibold text-white bg-[#004bff] hover:bg-[#003cb3] transition-all text-sm"
                >
                  Send Reset Link
                </button>
                <button
                  type="button"
                  onClick={() => setForgotPasswordMode(false)}
                  className="w-full py-2 text-xs text-slate-400 hover:text-white"
                >
                  Back to Login
                </button>
              </div>
            )}
          </form>
        )}

        {/* Developer Bypass Button for Local Testing */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <button
            type="button"
            onClick={handleBypassDirect}
            className="w-full py-2.5 px-4 rounded-lg font-semibold text-black bg-gradient-to-r from-[#00c8ff] to-[#38bdf8] hover:shadow-[0_0_20px_rgba(0,200,255,0.6)] transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-black" />
            <span>Developer Bypass: Quick Login (3-Member Team)</span>
          </button>
          <p className="text-[11px] text-center text-slate-400">
            Instant 3-member team test session for local development
          </p>
        </div>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-slate-400 hover:text-[#00c8ff] transition-colors">
            &larr; Back to Promptathon Home
          </Link>
        </div>
      </div>
      <Toaster position="top-center" />
    </div>
  );
};

export default LoginPage;