/**
 * Nalapaka logo mark — a terracotta handi (cooking pot) with a wisp of steam,
 * on a deep kitchen-green tile. Warm, minimal, and readable at small sizes.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Nalapaka logo"
      className={className}
    >
      <rect x="2" y="2" width="60" height="60" rx="18" fill="#415636" />
      {/* steam */}
      <path
        d="M32 17 c-3.5 -2.5 3.5 -5.5 0 -8"
        stroke="#fdfbf7"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* lid knob */}
      <circle cx="32" cy="21" r="3.2" fill="#d9a441" />
      {/* rim */}
      <rect x="15" y="30" width="34" height="5.5" rx="2.75" fill="#f2ebdd" />
      {/* handi body */}
      <path
        d="M18 34 h28 c0 8.5 -6 14 -14 14 s-14 -5.5 -14 -14 z"
        fill="#c2622b"
      />
    </svg>
  );
}
