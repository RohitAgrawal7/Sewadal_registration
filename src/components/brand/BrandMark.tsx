/** Brand mark used in header and login. */
export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Sewadal Management Sewa"
    >
      <defs>
        <linearGradient id="mr-g" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#mr-g)" />
      <path
        d="M32 12c-1.2 0-2.2.5-3 1.3L18 25.2c-.7.8-.2 2.1.9 2.1h4.2V40c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V27.3H46c1.1 0 1.6-1.3.9-2.1L35 13.3c-.8-.8-1.8-1.3-3-1.3z"
        fill="#fff"
        opacity="0.95"
      />
      <circle cx="22" cy="46" r="4.2" fill="#fbbf24" />
      <circle cx="32" cy="48.5" r="4.8" fill="#fff" />
      <circle cx="42" cy="46" r="4.2" fill="#fbbf24" />
    </svg>
  );
}
