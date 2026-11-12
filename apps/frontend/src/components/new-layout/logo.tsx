'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

// Ajans, Ayarlar > Ajans Markası'nda logo seçtiyse panelde o gösterilir.
const useBrandLogo = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const response = await fetch('/brand');
    return response.ok ? response.json() : null;
  }, []);
  return useSWR<{ name: string | null; logo: string | null } | null>(
    '/brand',
    load,
    { revalidateOnFocus: false }
  );
};

// Postacı simgesi (zarf ve bildirim noktası) ya da ajansın kendi logosu.
export const Logo = () => {
  const { data: brand } = useBrandLogo();

  if (brand?.logo) {
    return (
      <img
        className="mt-[8px] w-[60px] h-[60px] min-w-[60px] object-contain p-[6px]"
        src={brand.logo}
        alt={brand.name || ''}
      />
    );
  }

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
