'use client';

import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 150);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--background)]">
      {/* Background racing lines */}
      <div className="absolute inset-0 overflow-hidden opacity-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-white to-transparent"
            style={{
              top: `${15 + i * 12}%`,
              left: '-100%',
              right: '-100%',
              transform: `rotate(${-2 + i * 0.5}deg)`,
              animation: `shimmer ${2 + i * 0.3}s linear infinite`,
            }}
          />
        ))}
      </div>

      {/* Logo / Title */}
      <div className="relative mb-8">
        <h1 className="font-racing text-3xl font-bold tracking-wider text-gradient">
          F1 MANAGER
        </h1>
        <p className="text-center text-xs text-[var(--foreground-muted)] mt-2 tracking-widest uppercase">
          Loading race data...
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-56 h-1.5 bg-[var(--background-elevated)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${Math.min(progress, 100)}%`,
            background: 'var(--gradient-racing)',
          }}
        />
      </div>

      {/* Progress percentage */}
      <p className="font-racing text-xs text-[var(--foreground-muted)] mt-3">
        {Math.min(Math.round(progress), 100)}%
      </p>
    </div>
  );
}
