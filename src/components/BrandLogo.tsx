export function BrandLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="immoGrad" x1="6" y1="10" x2="58" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0e4d5f" />
          <stop offset="55%" stopColor="#1ca7b8" />
          <stop offset="100%" stopColor="#2eb086" />
        </linearGradient>
      </defs>
      <path d="M8 28L32 10L56 28" stroke="url(#immoGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 24V44M49 24V44" stroke="url(#immoGrad)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M4 38H18L24 23L31 52L38 30L43 38H60" stroke="url(#immoGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
