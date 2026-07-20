export default function Logo({ size = 28, rounded = true }: { size?: number; rounded?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx={rounded ? 8 : 0} fill="#2F3B6B" />
      {/* Narrowing bars = the recruiting funnel: applied -> interviewing -> offer */}
      <rect x="6.5" y="9" width="19" height="3.4" rx="1.7" fill="#F6F4EF" />
      <rect x="10" y="14.3" width="12" height="3.4" rx="1.7" fill="#F6F4EF" fillOpacity="0.82" />
      <rect x="13.5" y="19.6" width="5" height="3.4" rx="1.7" fill="#F6F4EF" fillOpacity="0.64" />
    </svg>
  );
}
