/** Ocular wordmark + stylized eye mark (reference-inspired). */
export function OcularLogo({ className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 ring-1 ring-cyan-400/50">
        <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden>
          <defs>
            <linearGradient id="og-eye" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="og-iris" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
          <path
            d="M8 32c7-9 15-14 24-14s17 5 24 14c-7 9-15 14-24 14S15 41 8 32z"
            fill="none"
            stroke="url(#og-eye)"
            strokeWidth="3"
          />
          <circle cx="32" cy="32" r="12" fill="url(#og-iris)" opacity="0.95" />
          <circle cx="32" cy="32" r="5" fill="#082f49" />
          <circle cx="28" cy="28" r="2.5" fill="#ffffff" />
          <circle cx="32" cy="32" r="16" fill="none" stroke="#67e8f9" strokeOpacity="0.25" strokeWidth="1.5" />
          <path d="M18 27l6-4" stroke="#93c5fd" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M14 33h7" stroke="#93c5fd" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M46 26l-6-4" stroke="#93c5fd" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M50 33h-7" stroke="#93c5fd" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
          <path
            d="M10 32c7-7 14-11 22-11s15 4 22 11"
            fill="none"
            stroke="#7dd3fc"
            strokeOpacity="0.25"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <div>
        <p className="text-lg font-bold tracking-tight text-white">Ocular</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Attendance</p>
      </div>
    </div>
  );
}
