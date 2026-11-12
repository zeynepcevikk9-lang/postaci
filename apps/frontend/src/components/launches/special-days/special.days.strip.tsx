'use client';

// Postacı: takvimin üstündeki "Özel günler" şeridi. Görünen tarih aralığındaki ve
// hemen sonrasındaki özel günleri gösterir; bir güne tıklanınca o gün için hazır
// metinli taslak gönderi penceresi açılır.

import { FC, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import i18next from '@gitroom/react/translation/i18next';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  SpecialDay,
  SpecialDayKind,
  specialDaysBetween,
} from '@gitroom/frontend/components/launches/special-days/tr.special.days';

// Görünen aralığın bitişinden sonra kaç günlük özel gün de gösterilsin.
const LOOK_AHEAD_DAYS = 30;
const MAX_CHIPS = 8;

const kindClass: Record<SpecialDayKind, string> = {
  resmi: 'bg-[#D9482B]/10 text-[#B93A21]',
  dini: 'bg-[#17915C]/10 text-[#17915C]',
  ozel: 'bg-[#3D4FE0]/10 text-[#3D4FE0]',
  ticari: 'bg-[#D98A00]/15 text-[#8A5A00]',
};

export const SpecialDaysStrip: FC = () => {
  const t = useT();
  const modal = useModals();
  const { startDate, endDate, integrations, reloadCalendarView } =
    useCalendar();

  const days = useMemo(() => {
    const today = newDayjs().format('YYYY-MM-DD');
    const from = startDate > today ? startDate : today;
    const to = newDayjs(endDate)
      .add(LOOK_AHEAD_DAYS, 'day')
      .format('YYYY-MM-DD');
    if (from > to) {
      return [];
    }
    return specialDaysBetween(from, to).slice(0, MAX_CHIPS);
  }, [startDate, endDate]);

  const language = i18next.resolvedLanguage || 'tr';
  const dateLabel = useCallback(
    (date: string) =>
      new Date(`${date}T12:00:00`).toLocaleDateString(language, {
        day: 'numeric',
        month: 'short',
      }),
    [language]
  );

  const createDraft = useCallback(
    (day: SpecialDay) => () => {
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
            onlyValues={[{ content: day.draft }]}
            date={newDayjs(day.date).hour(10).minute(0)}
            reopenModal={() => ({})}
          />
        ),
        size: '80%',
      });
    },
    [integrations, reloadCalendarView]
  );

  if (!days.length || !integrations.length) {
    return null;
  }

  return (
    <div className="flex items-center gap-[8px] overflow-x-auto pb-[2px] mobile:hidden">
      <span className="text-[13px] font-[600] text-textItemBlur whitespace-nowrap">
        {t('special_days_title', 'Special days')}
      </span>
      {days.map((day) => (
        <button
          key={day.date + day.name}
          type="button"
          onClick={createDraft(day)}
          className={clsx(
            'flex items-center gap-[6px] h-[30px] px-[10px] rounded-full text-[13px] whitespace-nowrap cursor-pointer hover:opacity-80',
            kindClass[day.kind]
          )}
          data-tooltip-id="tooltip"
          data-tooltip-content={t(
            'special_days_create_draft',
            'Create a draft post for this day'
          )}
        >
          <span className="font-[700]">{dateLabel(day.date)}</span>
          <span>{day.name}</span>
          <span className="font-[700]">+</span>
        </button>
      ))}
    </div>
  );
};
