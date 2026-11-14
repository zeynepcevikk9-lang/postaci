'use client';

// Postacı: ajansın müşterisine göndereceği bağlantıları oluşturduğu düğmeler ve
// pencere. İki tür bağlantı var: onay planı (gelecek gönderiler) ve aylık rapor
// (yayımlanmış gönderiler). Müşteri ve ay seçilir; oluşan bağlantı kopyalanır ya
// da WhatsApp'ta paylaşılır.

import { FC, useCallback, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import copy from 'copy-to-clipboard';
import i18next from '@gitroom/react/translation/i18next';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import {
  SentPlans,
  useSentPlans,
} from '@gitroom/frontend/components/launches/sent.plans';

type Kind = 'plan' | 'report';

const fieldClass =
  'w-full h-[42px] bg-newBgColor border border-newTableBorder rounded-[8px] px-[12px] text-[14px] text-newTextColor outline-none';

const useCustomers = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/integrations/customers')).json();
  }, []);
  return useSWR<{ id: string; name: string }[]>('/customers', load);
};

// Onay planı için bu ay ve sonraki üç ay, rapor için bu ay ve önceki üç ay.
// Değer ayın ilk günüdür (yerel saat).
const monthOptions = (language: string, kind: Kind) => {
  const now = new Date();
  const offsets = kind === 'plan' ? [0, 1, 2, 3] : [-1, 0, -2, -3];
  return offsets.map((offset) => {
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return {
      value: `${first.getFullYear()}-${first.getMonth()}`,
      label: first.toLocaleDateString(language, {
        month: 'long',
        year: 'numeric',
      }),
      from: first,
      to: new Date(
        first.getFullYear(),
        first.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      ),
    };
  });
};

const PlanShareModal: FC<{
  kind: Kind;
  defaultCustomer?: string | null;
}> = ({ kind, defaultCustomer }) => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const { data: customers } = useCustomers();
  const { mutate } = useSWRConfig();
  const months = useMemo(
    () => monthOptions(i18next.resolvedLanguage || 'tr', kind),
    [kind]
  );

  const [customerId, setCustomerId] = useState(defaultCustomer || '');
  const [month, setMonth] = useState(months[0].value);
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState('');

  const create = useCallback(async () => {
    const selected = months.find((m) => m.value === month)!;
    setLoading(true);
    try {
      const response = await fetch('/approvals/plans', {
        method: 'POST',
        body: JSON.stringify({
          ...(customerId ? { customerId } : {}),
          from: selected.from.toISOString(),
          to: selected.to.toISOString(),
          kind,
          ...(kind === 'plan' ? { autoSchedule } : {}),
        }),
      });
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      const { id } = await response.json();
      if (kind === 'plan') {
        mutate('/approvals/plans');
      }
      setLink(
        `${window.location.origin}/p/${
          kind === 'plan' ? 'plan' : 'report'
        }/${id}`
      );
    } catch (err) {
      toast.show(
        t('approval_plan_create_failed', 'The link could not be created'),
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, [customerId, month, autoSchedule, kind]);

  const copyLink = useCallback(() => {
    copy(link);
    toast.show(
      t('link_copied_to_clipboard', 'Link copied to clipboard'),
      'success'
    );
  }, [link]);

  const shareOnWhatsapp = useCallback(() => {
    const message = `${
      kind === 'plan'
        ? t(
            'approval_plan_whatsapp_message',
            'Your content plan is ready for approval. You can review and approve it here:'
          )
        : t(
            'report_whatsapp_message',
            'Your monthly social media report is ready. You can view it here:'
          )
    }\n${link}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }, [link, kind]);

  return (
    <div className="flex flex-col gap-[14px] w-full text-newTextColor">
      <p className="text-[14px] text-textItemBlur">
        {kind === 'plan'
          ? t(
              'approval_plan_modal_description',
              'Your client sees all draft and scheduled posts of the selected month on one page and approves them without logging in.'
            )
          : t(
              'report_modal_description',
              'Creates a report of the posts published in the selected month. The report keeps the numbers of the moment it is created; your client can view it online and save it as PDF.'
            )}
      </p>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="plan-customer" className="text-[14px]">
          {t('customer', 'Customer:')}
        </label>
        <select
          id="plan-customer"
          className={fieldClass}
          value={customerId}
          onChange={(e) => {
            setCustomerId(e.target.value);
            setLink('');
          }}
        >
          <option value="">
            {t('approval_plan_all_channels', 'All channels')}
          </option>
          {(customers || []).map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="plan-month" className="text-[14px]">
          {t('month', 'Month')}
        </label>
        <select
          id="plan-month"
          className={fieldClass}
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setLink('');
          }}
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {kind === 'plan' && (
        <label className="flex items-start gap-[10px] text-[14px] cursor-pointer">
          <input
            type="checkbox"
            className="mt-[3px] w-[16px] h-[16px]"
            checked={autoSchedule}
            onChange={(e) => {
              setAutoSchedule(e.target.checked);
              setLink('');
            }}
          />
          <span>
            {t(
              'approval_plan_auto_schedule',
              'Schedule drafts automatically when the client approves'
            )}
            <span className="block text-[13px] text-textItemBlur">
              {t(
                'approval_plan_auto_schedule_hint',
                'Save the posts as drafts: nothing is published before approval. If the client requests a change, a scheduled post goes back to draft.'
              )}
            </span>
          </span>
        </label>
      )}

      {!link ? (
        <Button className="rounded-[8px]" loading={loading} onClick={create}>
          {kind === 'plan'
            ? t('approval_plan_create', 'Create approval link')
            : t('report_create', 'Create report')}
        </Button>
      ) : (
        <div className="flex flex-col gap-[10px]">
          <input
            className={fieldClass}
            readOnly={true}
            value={link}
            onFocus={(e) => e.target.select()}
          />
          <div className="flex gap-[8px] flex-wrap">
            <Button className="rounded-[8px]" onClick={copyLink}>
              {t('copy_link', 'Copy Link')}
            </Button>
            <Button
              className="!bg-[#17915C] rounded-[8px]"
              onClick={shareOnWhatsapp}
            >
              {t('approval_share_whatsapp', 'Share on WhatsApp')}
            </Button>
            {kind === 'report' && (
              <a
                className="h-[40px] px-[16px] flex items-center rounded-[8px] border border-newTableBorder text-[14px]"
                href={link}
                target="_blank"
                rel="noreferrer"
              >
                {t('report_open', 'Open report')}
              </a>
            )}
          </div>
        </div>
      )}

      {kind === 'plan' && <SentPlans />}
    </div>
  );
};

const toolbarButtonClass =
  'relative h-[42px] px-[14px] rounded-[8px] border border-newTableBorder text-[14px] font-[500] whitespace-nowrap cursor-pointer hover:bg-boxHover flex items-center gap-[8px]';

export const PlanShareButton: FC = () => {
  const t = useT();
  const modal = useModals();
  const calendar = useCalendar();
  // Müşteriden yanıt bekleyen plan sayısı düğmenin köşesinde gösterilir
  const { data: plans } = useSentPlans();
  const waiting = (plans || []).filter((plan) => plan.pending > 0).length;

  const open = useCallback(
    (kind: Kind) => () => {
      modal.openModal({
        classNames: {
          modal: 'md',
        },
        title:
          kind === 'plan'
            ? t('approval_plan_modal_title', 'Send monthly plan for approval')
            : t('report_modal_title', 'Monthly report'),
        withCloseButton: true,
        closeOnEscape: true,
        closeOnClickOutside: true,
        children: (
          <PlanShareModal kind={kind} defaultCustomer={calendar.customer} />
        ),
      });
    },
    [calendar.customer]
  );

  return (
    <>
      <button type="button" onClick={open('plan')} className={toolbarButtonClass}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>
        {t('approval_plan_button', 'Send for approval')}
        {!!waiting && (
          <span
            className="absolute -top-[6px] -end-[6px] min-w-[18px] h-[18px] px-[4px] rounded-full bg-[#F5A524] text-white text-[11px] font-bold flex items-center justify-center"
            data-tooltip-id="tooltip"
            data-tooltip-content={t(
              'sent_plans_waiting_tooltip',
              'Plans waiting for a client response'
            )}
          >
            {waiting}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={open('report')}
        className={toolbarButtonClass}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
        {t('report_button', 'Monthly report')}
      </button>
    </>
  );
};
