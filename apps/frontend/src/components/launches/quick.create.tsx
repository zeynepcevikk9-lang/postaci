'use client';

// Postacı: ana sayfadan gelen "gönderi oluştur" isteği. Adres /launches?new=1
// ise (isteğe bağlı date=YYYY-AA-GG ve text=...) gönderi düzenleyicisi açılır,
// sonra adres temizlenir.

import { FC, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';

export const QuickCreate: FC = () => {
  const query = useSearchParams();
  const router = useRouter();
  const modal = useModals();
  const { integrations, reloadCalendarView } = useCalendar();
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current || query.get('new') !== '1' || !integrations.length) {
      return;
    }
    opened.current = true;

    const dateParam = query.get('date');
    const text = (query.get('text') || '').slice(0, 2000);
    const date =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? newDayjs(`${dateParam}T10:00:00`)
        : newDayjs().add(1, 'hour').startOf('hour');

    modal.openModal({
      id: 'add-edit-modal',
      closeOnClickOutside: false,
      removeLayout: true,
      closeOnEscape: false,
      withCloseButton: false,
      askClose: true,
      fullScreen: true,
      classNames: {
        modal: 'w-[100%] max-w-[1400px] text-textColor',
      },
      children: (
        <AddEditModal
          allIntegrations={integrations.map((p) => ({ ...p }))}
          integrations={integrations.slice(0).map((p) => ({ ...p }))}
          mutate={reloadCalendarView}
          {...(text ? { onlyValues: [{ content: text }] } : {})}
          date={date}
          reopenModal={() => ({})}
        />
      ),
      size: '80%',
    });
    router.replace('/launches');
  }, [integrations, query]);

  return null;
};
