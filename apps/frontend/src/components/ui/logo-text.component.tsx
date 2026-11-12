import React from 'react';

// Postacı logosu: simge ve yazı. Yazı rengi bulunduğu yerin metin rengini alır.
export const LogoTextComponent = () => {
  return (
    <div className="flex items-center gap-[9px]">
      <svg
        width="36"
        height="36"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="3" y="8" width="34" height="24" rx="6" fill="#3D4FE0" />
        <path
          d="M6.5 12.5L20 23L33.5 12.5"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="31.5" cy="10.5" r="6" fill="#FF6B4A" stroke="white" strokeWidth="2" />
      </svg>
      <span className="text-[26px] font-[800] tracking-[-0.03em] leading-none">
        Postacı
      </span>
    </div>
  );
};
