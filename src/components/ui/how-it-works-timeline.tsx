"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Pin Icon matching the 21st.dev how-it-works specification
const PinIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M16 3a1 1 0 0 1 .117 1.993l-.117 .007v4.764l1.894 3.789a1 1 0 0 1 .1 .331l.006 .116v2a1 1 0 0 1 -.883 .993l-.117 .007h-4v4a1 1 0 0 1 -1.993 .117l-.007 -.117v-4h-4a1 1 0 0 1 -.993 -.883l-.007 -.117v-2a1 1 0 0 1 .06 -.34l.046 -.107l1.894 -3.791v-4.762a1 1 0 0 1 -.117 -1.993l.117 -.007h8z" />
  </svg>
);

export interface MilestoneStep {
  number: string;
  date: string;
  title: string;
  description: React.ReactNode;
  link?: string;
  accentColor?: string;
}

interface TimelineCardProps {
  step: MilestoneStep;
  rotate: string;
  className?: string;
}

const TimelineCard: React.FC<TimelineCardProps> = ({ step, rotate, className }) => {
  return (
    <div
      className={cn(
        "relative w-full max-w-full mx-auto md:mx-0 md:w-[350px] lg:w-[380px] transition-transform duration-300 hover:z-30 md:hover:scale-105",
        rotate,
        className
      )}
    >
      {/* Outer Card Shell with Dark Glassmorphism */}
      <div className="group relative rounded-[26px] bg-[#091124]/90 p-2.5 backdrop-blur-md border border-[#004bff]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)] hover:border-[#00c8ff]/60 hover:shadow-[0_0_30px_rgba(0,200,255,0.25)] transition-all duration-300">
        
        {/* Light Green & Black Pin Node matching user specification */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#070e09] border-2 border-[#4ade80] text-[#4ade80] shadow-[0_0_16px_rgba(74,222,128,0.7)] group-hover:scale-110 transition-transform">
          <PinIcon className="h-4 w-4" />
        </div>

        {/* Inner Card Container */}
        <div className="relative flex h-full flex-col overflow-hidden rounded-[18px] bg-[#070c18]/90 border border-blue-500/15 p-5 pt-7">
          {/* Header Row: Step Number + Date Badge */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span
              className="text-3xl font-black tracking-tight text-[#00c8ff]"
              style={{ fontFamily: '"Orbitron", sans-serif' }}
            >
              {step.number}
            </span>
            <span className="rounded-full bg-[#004bff]/15 px-3 py-1 text-xs font-mono font-semibold tracking-wider text-sky-300 border border-[#004bff]/30">
              {step.date}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xl md:text-2xl font-bold font-orbitron text-white leading-snug mb-2 group-hover:text-[#00c8ff] transition-colors">
            {step.title}
          </h3>

          {/* Decorative Divider */}
          <div className="w-12 h-[2px] bg-gradient-to-r from-[#00c8ff] to-[#004bff] mb-3 opacity-80" />

          {/* Description */}
          <div className="text-slate-300 text-sm md:text-[15px] leading-relaxed flex-grow">
            {step.description}
          </div>

          {/* Optional CTA Link */}
          {step.link && (
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <Link
                href={step.link}
                className="inline-flex items-center text-xs font-semibold text-[#00c8ff] hover:text-white hover:translate-x-1 transition-all"
              >
                Learn more
                <svg
                  className="w-3.5 h-3.5 ms-1.5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DEFAULT_MILESTONES: MilestoneStep[] = [
  {
    number: "01",
    date: "30th Sept 2026",
    title: "Preptember Begins",
    description:
      "The official preparation month for Promptathon. Deep-dive into prompt engineering, LLM workflows, autonomous agents, and master AI tools before hacking begins.",
    link: "/preptember",
  },
  {
    number: "02",
    date: "8th Oct 2026",
    title: "Registrations Open",
    description:
      "Registrations officially open online. Assemble your team of up to 4 innovators, select your domain preferences, and secure your place.",
  },
  {
    number: "03",
    date: "24th Oct 2026",
    title: "Registrations Close",
    description:
      "Team registrations close. Team rosters, problem statement tracks, and mentor alignments are finalized.",
  },
  {
    number: "04",
    date: "26th Oct 2026",
    title: "Day 1: Hacking Begins",
    description: (
      <div className="space-y-1.5 font-sans">
        <div className="flex items-center gap-2">
          <span className="text-[#4ade80] text-xs font-mono font-bold">4:00 PM</span>
          <span>Opening Ceremony & Keynote</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#4ade80] text-xs font-mono font-bold">6:00 PM</span>
          <span>Problem Statements Released</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#4ade80] text-xs font-mono font-bold">7:15 PM</span>
          <span>Hacking Officially Commences</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#4ade80] text-xs font-mono font-bold">2:00 AM</span>
          <span>Midnight Mentor Sync</span>
        </div>
      </div>
    ),
  },
  {
    number: "05",
    date: "27th Oct 2026",
    title: "Day 2: Finale & Awards",
    description: (
      <div className="space-y-1.5 font-sans">
        <div className="flex items-center gap-2">
          <span className="text-[#4ade80] text-xs font-mono font-bold">9:30 AM</span>
          <span>Morning Check-in</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#4ade80] text-xs font-mono font-bold">2:00 PM</span>
          <span>Submissions Open</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#4ade80] text-xs font-mono font-bold">2:30 PM</span>
          <span>Submissions Close & Code Freeze</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#4ade80] text-xs font-mono font-bold">3:30 PM</span>
          <span>Live Demos & Jury Evaluations</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#4ade80] text-xs font-mono font-bold">8:30 PM</span>
          <span>Grand Awards & Closing Ceremony</span>
        </div>
      </div>
    ),
  },
];

// Desktop positioning presets with alternating tilt rotation.
// Tilt is md+ only so narrow phones never get shadow/edge bleed.
const STEP_POSITIONS = [
  { className: "md:absolute md:top-0 md:left-[10%] lg:left-[12%]", rotate: "md:rotate-3" },
  { className: "md:absolute md:top-[230px] md:right-[10%] lg:right-[12%]", rotate: "md:-rotate-3" },
  { className: "md:absolute md:top-[560px] md:left-[10%] lg:left-[12%]", rotate: "md:rotate-3" },
  { className: "md:absolute md:top-[850px] md:right-[10%] lg:right-[12%]", rotate: "md:-rotate-3" },
  { className: "md:absolute md:top-[1220px] md:left-[10%] lg:left-[12%]", rotate: "md:rotate-3" },
];

// Extra milestones beyond the five presets fall back to centered static flow
// on desktop so they never overlap the absolute zigzag.
const EXTRA_POSITION = {
  className: "md:static md:mx-auto md:mt-12 md:max-w-[380px]",
  rotate: "md:rotate-0",
};

export default function HowItWorksTimeline({
  milestones = DEFAULT_MILESTONES,
  className,
}: {
  milestones?: MilestoneStep[];
  className?: string;
}) {
  const totalHeight = 1580;
  const baseMilestones = milestones.slice(0, STEP_POSITIONS.length);
  const extraMilestones = milestones.slice(STEP_POSITIONS.length);

  // Connecting snaking cubic-bezier SVG curve between the 5 cards across zigzag
  const svgConnectorPath =
    "M 300 130 C 580 130, 480 340, 720 340 C 920 340, 520 670, 300 670 C 120 670, 520 980, 720 980 C 920 980, 520 1330, 300 1330";

  return (
    <div className={cn("relative w-full py-12 px-4 md:px-8", className)}>
      <div className="max-w-6xl mx-auto relative z-10">
        <div
          className="relative w-full max-w-[1050px] mx-auto flex flex-col space-y-12 md:space-y-0 md:block h-auto md:h-[1600px]"
        >
          {/* Animated Connecting Dashed SVG Curve (Desktop) */}
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none hidden md:block z-0"
            viewBox={`0 0 1000 ${totalHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="timeline-path-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="30%" stopColor="#00c8ff" />
                <stop offset="70%" stopColor="#004bff" />
                <stop offset="100%" stopColor="#4ade80" />
              </linearGradient>
            </defs>

            {/* Glowing background guide path */}
            <path
              d={svgConnectorPath}
              stroke="#004bff"
              strokeWidth="4"
              strokeOpacity="0.25"
              fill="none"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Moving animated dashed laser line */}
            <motion.path
              d={svgConnectorPath}
              stroke="url(#timeline-path-glow)"
              strokeWidth="2.5"
              strokeDasharray="12 8"
              fill="none"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: -160 }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
            />
          </svg>

          {/* Cards rendered at staggered zigzag positions */}
          {baseMilestones.map((milestone, idx) => {
            const pos = STEP_POSITIONS[idx];
            return (
              <TimelineCard
                key={milestone.number}
                step={milestone}
                rotate={pos.rotate}
                className={pos.className}
              />
            );
          })}
        </div>
        {extraMilestones.length > 0 && (
          <div className="w-full max-w-[1050px] mx-auto flex flex-col items-center space-y-12 mt-12 md:mt-16">
            {extraMilestones.map((milestone) => (
              <TimelineCard
                key={milestone.number}
                step={milestone}
                rotate={EXTRA_POSITION.rotate}
                className={EXTRA_POSITION.className}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
