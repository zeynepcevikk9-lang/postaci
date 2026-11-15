'use client';

// Postacı: davet bağlantısının sayfasında, bağlantıyı gönderen ajansın (ya da
// işletmenin) marka adı ve logosu. Marka ayarlanmamışsa Postacı görünür.

import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

interface ConnectLinkBrand {
  name: string | null;
  logo: string | null;
}

export const useConnectLinkBrand = (token: string) => {
  const fetch = useFetch();
  const load = useCallback(async (): Promise<ConnectLinkBrand | null> => {
    const response = await fetch(`/public/brand/connect/${token}`);
    return response.ok ? response.json() : null;
  }, [token]);
  const { data } = useSWR(`connect-link-brand-${token}`, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });
  return {
    name: data?.name || 'Postacı',
    logo: data?.logo || '',
  };
};
