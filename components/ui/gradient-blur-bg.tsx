"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GradientBlurBgProps {
  children?: ReactNode;
  className?: string;
  gridColor?: string;
  gridSize?: string;
  primaryGlowColor?: string;
  secondaryGlowColor?: string;
  fadeEdges?: boolean;
}

export default function GradientBlurBg({
  children,
  className,
  gridColor = "rgba(0, 200, 255, 0.05)",
  gridSize = "64px",
  primaryGlowColor = "rgba(0, 75, 255, 0.22)",
  secondaryGlowColor = "rgba(0, 200, 255, 0.16)",
  fadeEdges = true,
}: GradientBlurBgProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-[#070c18] text-white",
        className
      )}
    >
      {/* Background layer with subtle grid & multi-stop radial glow blur */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${gridColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${gridColor} 1px, transparent 1px),
            radial-gradient(circle 750px at 15% 25%, ${primaryGlowColor}, transparent 70%),
            radial-gradient(circle 650px at 85% 75%, ${secondaryGlowColor}, transparent 70%),
            radial-gradient(circle 800px at 50% 50%, rgba(10, 22, 48, 0.6), transparent 85%)
          `,
          backgroundSize: `${gridSize} ${gridSize}, ${gridSize} ${gridSize}, 100% 100%, 100% 100%, 100% 100%`,
        }}
      />

      {/* Floating blurred orb accents for depth */}
      <div
        className="pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-[#004bff]/15 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-[#00c8ff]/10 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-[#004bff]/15 blur-[100px]"
        aria-hidden="true"
      />

      {/* Multi-stop feathered edge gradient vignettes to seamlessly blend with adjacent sections */}
      {fadeEdges && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 md:h-56 bg-gradient-to-b from-[#070c18] via-[#070c18]/80 to-transparent z-[1]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 md:h-56 bg-gradient-to-t from-[#070c18] via-[#070c18]/80 to-transparent z-[1]" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
