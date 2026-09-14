"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import cn from "@/utils/cn";

export const BoxesCore = ({
  className,
  ...rest
}) => {
  // Desktop keeps the full 150x100 grid. Mobile / reduced-motion render a
  // much smaller grid so low-end devices don't mount ~15k motion nodes.
  const [isCompact, setIsCompact] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 768px)");
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setIsCompact(mobileQuery.matches);
      setPrefersReduced(reducedQuery.matches);
    };
    sync();
    mobileQuery.addEventListener("change", sync);
    reducedQuery.addEventListener("change", sync);
    return () => {
      mobileQuery.removeEventListener("change", sync);
      reducedQuery.removeEventListener("change", sync);
    };
  }, []);

  const rows = useMemo(
    () => new Array(prefersReduced ? 24 : isCompact ? 40 : 150).fill(1),
    [isCompact, prefersReduced]
  );
  const cols = useMemo(
    () => new Array(prefersReduced ? 10 : isCompact ? 20 : 100).fill(1),
    [isCompact, prefersReduced]
  );
  const enableHover = !prefersReduced;
  let colors = [
    "#004bff",
    "#00c8ff",
  ];
  const getRandomColor = () => {
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div
      style={{
        transform: `translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)`,
      }}
      className={cn(
        "absolute left-1/4 p-4 -top-1/4 flex -translate-x-1/2 -translate-y-1/2 w-full h-full z-0 pointer-events-auto",
        className
      )}
      {...rest}>
      {rows.map((_, i) => (
        <motion.div key={`row` + i} className="w-[72px] h-[36px] border-l-[1.5px] border-white/25 relative">
          {cols.map((_, j) => (
            <motion.div
              {...(enableHover
                ? {
                    whileHover: {
                      backgroundColor: `#00c8ff`,
                      transition: { duration: 0 },
                    },
                  }
                : {})}
              animate={{
                transition: { duration: 2 },
              }}
              key={`col` + j}
              className="w-[72px] h-[36px] border-r-[1.5px] border-t-[1.5px] border-white/25 relative">
              {j % 2 === 0 && i % 2 === 0 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="absolute h-6 w-10 -top-[14px] -left-[22px] text-white/35 stroke-[1.5px] pointer-events-none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                </svg>
              ) : null}
            </motion.div>
          ))}
        </motion.div>
      ))}
    </div>
  );
};
const Boxes = React.memo(BoxesCore);
export default Boxes;