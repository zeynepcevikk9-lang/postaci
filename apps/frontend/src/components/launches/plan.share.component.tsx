'use client';

// Postacı: ajansın toplu onay bağlantısı oluşturduğu düğme ve pencere. Müşteri ve
// ay seçilir; oluşan bağlantı kopyalanır ya da WhatsApp'ta paylaşılır.

import { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import copy from 'copy-to-clipboard';
import i18next from '@gitroom/react/translation/i18next';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';

const fieldClass =
  'w-full h-[42px] bg-newBgColor border border-newTableBorder rounded-[8px] px-[12px] text-[14px] text-newTextColor outline-none';

const useCustomers = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/integrations/customers')).json();
  }, []);
  return useSWR<{ id: string; name: string }[]>('/customers', load);
};

// Bu ay ve sonraki üç ay; değer ayın ilk günüdür (yerel saat).
const monthOptions = (language: string) => {
  const now = new Date();
  return [0, 1, 2, 3].map((offset) => {
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

const PlanShareModal: FC<{ defaultCustomer?: string | null }> = ({
  defaultCustomer,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const { data: customers } = useCustomers();
  const months = useMemo(
    () => monthOptions(i18next.resolvedLanguage || 'tr'),
    []
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
          autoSchedule,
        }),
      });
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      const { id } = await response.json();
      setLink(`${window.location.origin}/p/plan/${id}`);
    } catch (err) {
      toast.show(
        t('approval_plan_create_failed', 'The approval link could not be created'),
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, [customerId, month, autoSchedule]);

  const copyLink = useCallback(() => {
    copy(link);
    toast.show(
      t('link_copied_to_clipboard', 'Link copied to clipboard'),
      'success'
    );
  }, [link]);

  const shareOnWhatsapp = useCallback(() => {
    const message = `${t(
      'approval_plan_whatsapp_message',
      'Your content plan is ready for approval. You can review and approve it here:'
    )}\n${link}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }, [link]);

  return (
    <div className="flex flex-col gap-[14px] w-full text-newTextColor">
      <p className="text-[14px] text-textItemBlur">
        {t(
          'approval_plan_modal_description',
          'Your client sees all draft and scheduled posts of the selected month on one page and approves them without logging in.'
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

      {!link ? (
        <Button className="rounded-[8px]" loading={loading} onClick={create}>
          {t('approval_plan_create', 'Create approval link')}
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
          </div>
        </div>
      )}
    </div>
  );
};

export const PlanShareButton: FC = () => {
  const t = useT();
  const modal = useModals();
  const calendar = useCalendar();

  const open = useCallback(() => {
    modal.openModal({
      classNames: {
        modal: 'md',
      },
      title: t('approval_plan_modal_title', 'Send monthly plan for approval'),
      withCloseButton: true,
      closeOnEscape: true,
      closeOnClickOutside: true,
      children: <PlanShareModal defaultCustomer={calendar.customer} />,
    });
  }, [calendar.customer]);

  return (
    <button
      type="button"
      onClick={open}
      className="h-[42px] px-[14px] rounded-[8px] border border-newTableBorder text-[14px] font-[500] whitespace-nowrap cursor-pointer hover:bg-boxHover"
    >
      {t('approval_plan_button', 'Send for approval')}
    </button>
  );
};
