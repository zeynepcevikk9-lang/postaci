'use client';

// Postacı: gönderilen onay planları ve durumları. Ajans, hangi müşterinin planı
// onayladığını, hangisinin beklediğini görür; bekleyene WhatsApp'tan hatırlatır.

import { FC, useCallback } from 'react';
import useSWR from 'swr';
import copy from 'copy-to-clipboard';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import i18next from '@gitroom/react/translation/i18next';

export interface SentPlan {
  id: string;
  customerName: string | null;
  autoSchedule: boolean;
  from: string;
  to: string;
  createdAt: string;
  total: number;
  approved: number;
  changes: number;
  pending: number;
}

export const useSentPlans = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const response = await fetch('/approvals/plans');
    return response.ok ? response.json() : [];
  }, []);
  return useSWR<SentPlan[]>('/approvals/plans', load, {
    revalidateOnFocus: false,
  });
};

const planLink = (id: string) => `${window.location.origin}/p/plan/${id}`;

export const SentPlans: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const { data: plans, mutate } = useSentPlans();
  const language = i18next.resolvedLanguage || 'tr';

  const copyLink = useCallback(
    (plan: SentPlan) => () => {
      copy(planLink(plan.id));
      toast.show(
        t('link_copied_to_clipboard', 'Link copied to clipboard'),
        'success'
      );
    },
    []
  );

  const remind = useCallback(
    (plan: SentPlan) => () => {
      const message = `${t(
        'sent_plans_reminder_message',
        'A reminder: {{count}} posts in your content plan are waiting for your approval. You can review them here:',
        { count: plan.pending }
      )}\n${planLink(plan.id)}`;
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener,noreferrer'
      );
    },
    []
  );

  const remove = useCallback(
    (plan: SentPlan) => async () => {
      if (
        !(await deleteDialog(
          t(
            'sent_plans_remove_confirm',
            'The link your client has will stop working. The posts and the decisions already given stay as they are.'
          ),
          t('sent_plans_remove_yes', 'Yes, remove'),
          t('sent_plans_remove_title', 'Remove the approval plan?')
        ))
      ) {
        return;
      }
      await fetch(`/approvals/plans/${plan.id}`, { method: 'DELETE' });
      await mutate();
    },
    []
  );

  if (!plans?.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[10px] border-t border-newTableBorder pt-[16px]">
      <div className="text-[15px] font-[600]">
        {t('sent_plans_title', 'Plans you sent')}
      </div>
      {plans.map((plan) => {
        const percent = (value: number) =>
          plan.total ? `${(value / plan.total) * 100}%` : '0%';
        return (
          <div
            key={plan.id}
            className="flex flex-col gap-[8px] border border-newTableBorder rounded-[10px] p-[12px]"
          >
            <div className="flex items-center justify-between gap-[10px] flex-wrap">
              <div className="text-[14px] font-[600]">
                {plan.customerName ||
                  t('approval_plan_all_channels', 'All channels')}
                <span className="font-[400] text-textItemBlur">
                  {' '}
                  ·{' '}
                  {new Date(plan.from).toLocaleDateString(language, {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="text-[13px] text-textItemBlur">
                {plan.total
                  ? t(
                      'sent_plans_progress',
                      '{{approved}} of {{total}} approved',
                      { approved: plan.approved, total: plan.total }
                    )
                  : t('sent_plans_empty', 'No posts in this period')}
              </div>
            </div>

            {!!plan.total && (
              <div className="flex h-[8px] rounded-full overflow-hidden bg-newBgColor">
                <div className="bg-[#12B76A]" style={{ width: percent(plan.approved) }} />
                <div className="bg-[#F5A524]" style={{ width: percent(plan.changes) }} />
              </div>
            )}

            <div className="flex items-center gap-[12px] flex-wrap text-[13px]">
              {!!plan.changes && (
                <span className="text-[#B26A00]">
                  {t('sent_plans_changes', '{{count}} change requests', {
                    count: plan.changes,
                  })}
                </span>
              )}
              {!!plan.pending && (
                <span className="text-textItemBlur">
                  {t('sent_plans_pending', '{{count}} waiting', {
                    count: plan.pending,
                  })}
                </span>
              )}
              <div className="flex-1" />
              {!!plan.pending && (
                <button
                  type="button"
                  onClick={remind(plan)}
                  className="h-[30px] px-[10px] rounded-[7px] bg-[#17915C] text-white cursor-pointer whitespace-nowrap"
                >
                  {t('sent_plans_remind', 'Remind on WhatsApp')}
                </button>
              )}
              <button
                type="button"
                onClick={copyLink(plan)}
                className="underline cursor-pointer whitespace-nowrap"
              >
                {t('copy_link', 'Copy Link')}
              </button>
              <a
                className="underline whitespace-nowrap"
                href={`/p/plan/${plan.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {t('sent_plans_open', 'Open')}
              </a>
              <button
                type="button"
                onClick={remove(plan)}
                className="underline cursor-pointer whitespace-nowrap text-textItemBlur"
              >
                {t('remove', 'Remove')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
