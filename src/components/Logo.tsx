export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="5" y="12" width="4" height="8" rx="1.5" fill="var(--primary)" />
      <rect x="23" y="12" width="4" height="8" rx="1.5" fill="var(--primary)" />
      <rect x="9" y="10" width="3" height="12" rx="1" fill="#F2F4F8" />
      <rect x="20" y="10" width="3" height="12" rx="1" fill="#F2F4F8" />
      <rect x="12" y="15" width="8" height="2" fill="#F2F4F8" />
    </svg>
  )
}
