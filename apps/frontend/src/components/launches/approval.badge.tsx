'use client';

// Postacı: takvimdeki gönderinin köşesinde müşteri onayı rozeti. Karar yoksa
// (onaya gönderilmemiş ya da henüz yanıtlanmamış) rozet gösterilmez.

import { FC, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

type Decision = 'APPROVED' | 'CHANGES_REQUESTED';

// Takvimde görünen bütün gönderiler için tek istek; rozetler aynı sonucu paylaşır.
const useApprovalStatuses = () => {
  const fetch = useFetch();
  const { posts } = useCalendar();
  const ids = useMemo(
    () => [...new Set(posts.map((p) => p.id))].sort().slice(0, 500),
    [posts]
  );
  const key = ids.length ? `/approvals/statuses?${ids.join(',')}` : null;
  const load = useCallback(async () => {
    return (
      await fetch('/approvals/statuses', {
        method: 'POST',
        body: JSON.stringify({ postIds: ids }),
      })
    ).json();
  }, [key]);
  return useSWR<Record<string, Decision>>(key, load);
};

export const ApprovalBadge: FC<{ postId: string }> = ({ postId }) => {
  const t = useT();
  const { data } = useApprovalStatuses();
  const status = data?.[postId];
  if (!status) {
    return null;
  }
  const approved = status === 'APPROVED';
  return (
    <div
      className={
        'absolute -top-[6px] -end-[6px] z-20 w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[11px] font-bold ' +
        (approved ? 'bg-[#3D4FE0]' : 'bg-[#D98A00]')
      }
      data-tooltip-id="tooltip"
      data-tooltip-content={
        approved
          ? t('approval_badge_approved', 'Approved by the client')
          : t('approval_badge_changes', 'The client requested a change')
      }
    >
      {approved ? '✓' : '!'}
    </div>
  );
};
