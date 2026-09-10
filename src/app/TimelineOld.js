"use client";

import React from "react";
import StackedTextDark from "@/components/StackedTextdark";
import GradientBlurBg from "@/components/ui/gradient-blur-bg";
import HowItWorksTimeline from "@/components/ui/how-it-works-timeline";

export default function Timeline() {
  return (
    <GradientBlurBg className="py-24 px-4 md:px-8">
      {/* Section Header with Blue Top Text matching Tracks header */}
      <div className="text-center mb-6 flex flex-col items-center justify-center">
        <StackedTextDark text="Timeline" fontSize="72px" />
        <p className="text-slate-300 text-base md:text-lg max-w-xl mx-auto mt-4 font-medium px-4">
          Key milestones and schedule for{" "}
          <span className="text-[#00c8ff] font-semibold">Promptathon 2026</span>
        </p>
      </div>

      {/* Interactive Zigzag How-It-Works Timeline with Light Green Nodes and Animated Dashed Connector */}
      <HowItWorksTimeline />
    </GradientBlurBg>
  );
}
