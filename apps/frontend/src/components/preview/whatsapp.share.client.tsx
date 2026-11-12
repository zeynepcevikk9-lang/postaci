'use client';

// Postacı: ajans, önizleme bağlantısını hazır mesajla WhatsApp'ta müşterisine
// gönderir. wa.me bağlantısı kullanıcının kendi WhatsApp'ını açar; mesaj ajansın
// kendi numarasından gider.

import { useCallback } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const WhatsappShareClient = () => {
  const t = useT();
  const share = useCallback(() => {
    const link = window.location.href.split?.('?')?.shift()!;
    const message = `${t(
      'approval_whatsapp_message',
      'Your post is ready for approval. You can review and approve it here:'
    )}\n${link}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }, []);
  return (
    <Button className="!bg-[#17915C]" onClick={share}>
      {t('approval_share_whatsapp', 'Share on WhatsApp')}
    </Button>
  );
};
