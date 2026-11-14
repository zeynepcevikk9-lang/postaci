'use client';

// Postacı: hesap türü. "agency" müşterileri olan ajans, "business" yalnızca kendi
// hesaplarını yöneten işletme. İşletme kipinde müşteri seçimi ve müşteriye onaya
// gönderme gibi ajans işleri gösterilmez. Tür, Ayarlar > Marka içinden seçilir.

import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export type AccountType = 'agency' | 'business';

export const useAccountType = (): AccountType => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const response = await fetch('/brand');
    return response.ok ? response.json() : null;
  }, []);
  const { data } = useSWR<{ accountType?: string } | null>('/brand', load, {
    revalidateOnFocus: false,
  });
  return data?.accountType === 'business' ? 'business' : 'agency';
};
