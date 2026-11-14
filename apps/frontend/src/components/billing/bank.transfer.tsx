'use client';

// Postacı: havale / EFT ile ödeme. Kullanıcı banka bilgilerini görür, ödemeyi
// yapınca bildirir; yönetici ödemeyi görünce onaylar ve plan açılır.

import { FC, useCallback, useState } from 'react';
import { useSWRConfig } from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import i18next from '@gitroom/react/translation/i18next';

export interface TransferInfo {
  iban: string;
  accountName: string;
  bankName: string | null;
  code: string;
  pending: {
    billing: string;
    period: 'MONTHLY' | 'YEARLY';
    amount: number;
    createdAt: string;
  } | null;
}

interface TransferPlan {
  billing: string;
  period: 'MONTHLY' | 'YEARLY';
  name: string;
  price: number;
  currency: string;
}

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat(i18next.resolvedLanguage || 'tr', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);

const Row: FC<{ label: string; value: string; copy?: boolean }> = ({
  label,
  value,
  copy,
}) => {
  const t = useT();
  const toast = useToaster();
  const copyValue = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.show(t('transfer_copied', 'Copied'), 'success');
    } catch (err) {
      // pano kullanılamıyorsa kullanıcı metni elle seçer
    }
  }, [value]);

  return (
    <div className="flex items-center gap-[12px] border-b border-newTableBorder py-[8px] text-[14px]">
      <div className="w-[130px] shrink-0 text-textItemBlur">{label}</div>
      <div className="flex-1 font-[600] break-all select-all">{value}</div>
      {copy && (
        <button
          type="button"
          onClick={copyValue}
          className="text-[13px] underline text-textItemBlur cursor-pointer whitespace-nowrap"
        >
          {t('transfer_copy', 'Copy')}
        </button>
      )}
    </div>
  );
};

export const BankTransferModal: FC<{
  plan: TransferPlan;
  transfer: TransferInfo;
}> = ({ plan, transfer }) => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const modal = useModals();
  const { mutate } = useSWRConfig();
  const [loading, setLoading] = useState(false);

  const notify = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/bank-transfer/requests', {
        method: 'POST',
        body: JSON.stringify({ billing: plan.billing, period: plan.period }),
      });
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      await mutate('/iyzico/plans');
      toast.show(
        t(
          'transfer_notified',
          'We received your notice. Your plan opens once we see the payment.'
        ),
        'success'
      );
      modal.closeAll();
    } catch (err) {
      toast.show(
        t('transfer_notify_failed', 'The notice could not be sent'),
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, [plan]);

  return (
    <div className="flex flex-col gap-[12px] w-full text-newTextColor">
      <p className="text-[14px] text-textItemBlur">
        {t(
          'transfer_intro',
          'Send the amount to the account below and write the code in the transfer description. Then let us know with the button.'
        )}
      </p>
      <div className="flex flex-col">
        <Row
          label={t('transfer_plan', 'Plan')}
          value={`${plan.name} · ${
            plan.period === 'YEARLY'
              ? t('iyzico_yearly', 'Yearly')
              : t('iyzico_monthly', 'Monthly')
          }`}
        />
        <Row
          label={t('transfer_amount', 'Amount')}
          value={formatMoney(plan.price, plan.currency)}
        />
        <Row
          label={t('transfer_account_name', 'Recipient')}
          value={transfer.accountName}
          copy={true}
        />
        {!!transfer.bankName && (
          <Row label={t('transfer_bank', 'Bank')} value={transfer.bankName} />
        )}
        <Row label="IBAN" value={transfer.iban} copy={true} />
        <Row
          label={t('transfer_code', 'Description code')}
          value={transfer.code}
          copy={true}
        />
      </div>
      <Button className="rounded-[8px]" loading={loading} onClick={notify}>
        {t('transfer_notify', 'I made the transfer')}
      </Button>
    </div>
  );
};

// Bekleyen havale bildirimi varsa plan ekranının üstünde gösterilir.
export const TransferPending: FC<{
  transfer?: TransferInfo | null;
  plans: TransferPlan[];
}> = ({ transfer, plans }) => {
  const t = useT();
  if (!transfer?.pending) {
    return null;
  }
  const plan = plans.find(
    (p) =>
      p.billing === transfer.pending!.billing &&
      p.period === transfer.pending!.period
  );
  return (
    <div className="border border-newTableBorder rounded-[12px] p-[14px] bg-newBgColorInner text-[14px]">
      <span className="font-[600]">
        {t('transfer_pending_title', 'We received your transfer notice.')}
      </span>{' '}
      {plan?.name || transfer.pending.billing} ·{' '}
      {formatMoney(transfer.pending.amount, plan?.currency || 'TRY')} ·{' '}
      {t('transfer_code', 'Description code')}: {transfer.code}.{' '}
      {t(
        'transfer_pending_note',
        'Your plan opens once we see the payment, and you get a notification.'
      )}
    </div>
  );
};
