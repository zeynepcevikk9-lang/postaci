'use client';

import { FC } from 'react';
import { fromUtc } from '@gitroom/frontend/components/layout/set.timezone';
import i18next from '@gitroom/react/translation/i18next';

export const RenderPreviewDate: FC<{ date: string }> = ({ date }) => {
  console.log(date);
  // Postacı: tarih, arayüz dilinin biçimiyle yazılır (tr: 15 Kasım 2026 17:57).
  return (
    <>
      {fromUtc(date)
        .toDate()
        .toLocaleString(i18next.resolvedLanguage || 'tr', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
    </>
  );
};
