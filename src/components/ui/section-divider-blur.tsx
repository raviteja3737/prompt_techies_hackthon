"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SectionDividerBlurProps {
  className?: string;
  glowColor?: string;
  secondaryGlow?: string;
}

export default function SectionDividerBlur({
  className,
  glowColor = "#00c8ff",
  secondaryGlow = "#004bff",
}: SectionDividerBlurProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative -my-12 md:-my-16 z-20 pointer-events-none w-full flex items-center justify-center overflow-hidden h-24 md:h-32",
        className
      )}
    >
      {/* Backdrop blur lens that diffuses canvas edges and visual noise */}
      <div className="absolute inset-0 backdrop-blur-[12px] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_50%,black_30%,transparent_100%)]" />

      {/* Atmospheric horizontal glow aura */}
      <div
        className="w-full max-w-5xl h-20 bg-gradient-to-r from-transparent via-[#00c8ff]/15 via-[#004bff]/12 to-transparent blur-3xl opacity-70"
        style={{
          background: `radial-gradient(ellipse 65% 100% at 50% 50%, rgba(0, 200, 255, 0.16) 0%, rgba(0, 75, 255, 0.10) 45%, transparent 75%)`,
        }}
      />

      {/* Central subtle light core */}
      <div className="absolute w-64 md:w-96 h-4 bg-[#00c8ff]/25 rounded-full blur-xl" />

      {/* Soft feather gradient from dark navy to transparent */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070c18]/40 via-transparent to-[#070c18]/40" />
    </div>
  );
}
