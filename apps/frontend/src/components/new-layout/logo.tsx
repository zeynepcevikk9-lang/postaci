'use client';

// Postacı simgesi (zarf ve bildirim noktası).
export const Logo = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      className="mt-[8px] min-w-[60px] min-h-[60px]"
    >
      <rect x="8" y="16" width="44" height="31" rx="8" fill="#3D4FE0" />
      <path
        d="M12.5 21.5L30 35L47.5 21.5"
        stroke="white"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="45" cy="18" r="7.5" fill="#FF6B4A" stroke="white" strokeWidth="2.6" />
    </svg>
  );
};
