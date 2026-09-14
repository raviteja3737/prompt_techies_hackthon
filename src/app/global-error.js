"use client";

import React, { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Global Application Error Boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#060a12] text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-8 bg-[#0d1525] border border-red-500/30 rounded-2xl text-center space-y-4 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-2xl font-bold">
            !
          </div>
          <h1 className="text-2xl font-bold text-white">Application Error</h1>
          <p className="text-xs text-slate-400">
            A critical system error occurred while rendering the application shell.
          </p>
          {error?.digest && (
            <p className="text-[11px] font-mono text-slate-500 bg-black/40 py-1 px-2 rounded">
              Error Digest: {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => reset()}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#00c8ff] text-black hover:bg-[#38bdf8] transition-all cursor-pointer"
            >
              Reload Interface
            </button>
            <a
              href="/"
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              Return Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
