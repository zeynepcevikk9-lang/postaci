'use client';

// Postacı: iyzico ile TL abonelik ekranı. Planlar ve fiyatlar arka uçtan
// (iyzico'daki planlardan) gelir. Kart bilgisi iyzico'nun ödeme formuna girilir.

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import clsx from 'clsx';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import i18next from '@gitroom/react/translation/i18next';

export interface IyzicoPlan {
  billing: string;
  period: 'MONTHLY' | 'YEARLY';
  name: string;
  price: number;
  currency: string;
  trialDays: number;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  created: number;
  status: 'paid' | 'pending' | 'failed' | 'void';
}

const fieldClass =
  'w-full h-[42px] bg-newBgColor border border-newTableBorder rounded-[8px] px-[12px] text-[14px] text-newTextColor outline-none';

export const useIyzicoPlans = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/iyzico/plans')).json();
  }, []);
  return useSWR<{ enabled: boolean; plans: IyzicoPlan[] }>(
    '/iyzico/plans',
    load,
    { revalidateOnFocus: false }
  );
};

const useRenewal = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/billing/renewal')).json();
  }, []);
  return useSWR<{ renewsAt: number | null; trialing: boolean }>(
    '/billing/renewal',
    load,
    { revalidateOnFocus: false }
  );
};

const usePayments = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const response = await fetch('/billing/invoices');
    return response.ok ? response.json() : [];
  }, []);
  return useSWR<Payment[]>('/billing/invoices', load, {
    revalidateOnFocus: false,
  });
};

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat(i18next.resolvedLanguage || 'tr', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);

const formatDate = (date: number | string | Date) =>
  new Date(date).toLocaleDateString(i18next.resolvedLanguage || 'tr', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

// 05xx, 5xx ya da +90 5xx biçiminde yazılan numarayı +905xxxxxxxxx yapar.
const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '').replace(/^(90|0)/, '');
  return /^5\d{9}$/.test(digits) ? `+90${digits}` : '';
};

// iyzico'nun ödeme formu bir betik olarak gelir; betiğin çalışması için içerik
// sayfaya parça (fragment) olarak eklenir. Form "iyzipay-checkout-form" kutusuna çizilir.
const IyzicoForm: FC<{ content: string }> = ({ content }) => {
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!holder.current) {
      return;
    }
    // Aynı sayfada ikinci kez açılırsa iyzico'nun önceki kurulumu temizlenir.
    (window as any).iyziInit = undefined;
    holder.current.innerHTML = '';
    holder.current.appendChild(
      document.createRange().createContextualFragment(content)
    );
  }, [content]);

  return (
    <div className="w-full">
      <div id="iyzipay-checkout-form" className="responsive" />
      <div ref={holder} />
    </div>
  );
};

const IyzicoCheckoutModal: FC<{ plan: IyzicoPlan }> = ({ plan }) => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const [values, setValues] = useState({
    name: '',
    surname: '',
    phone: '',
    identityNumber: '',
    address: '',
    city: '',
  });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<string | null>(null);

  const change = useCallback(
    (key: keyof typeof values) => (e: { target: { value: string } }) => {
      setValues((current) => ({ ...current, [key]: e.target.value }));
    },
    []
  );

  const submit = useCallback(async () => {
    const gsmNumber = normalizePhone(values.phone);
    const identityNumber = values.identityNumber.replace(/\D/g, '');
    if (
      values.name.trim().length < 2 ||
      values.surname.trim().length < 2 ||
      values.address.trim().length < 5 ||
      values.city.trim().length < 2
    ) {
      toast.show(
        t('iyzico_fill_fields', 'Please fill in all the fields'),
        'warning'
      );
      return;
    }
    if (!gsmNumber) {
      toast.show(
        t('iyzico_phone_invalid', 'Enter a mobile number like 05xx xxx xx xx'),
        'warning'
      );
      return;
    }
    if (identityNumber.length !== 11) {
      toast.show(
        t('iyzico_identity_invalid', 'The national ID number must be 11 digits'),
        'warning'
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/iyzico/checkout', {
        method: 'POST',
        body: JSON.stringify({
          billing: plan.billing,
          period: plan.period,
          name: values.name.trim(),
          surname: values.surname.trim(),
          gsmNumber,
          identityNumber,
          address: values.address.trim(),
          city: values.city.trim(),
        }),
      });
      const data = await response.json();
      if (data?.blocked) {
        toast.show(
          t(
            'iyzico_blocked',
            'There is already an active subscription on another account with this email address'
          ),
          'warning'
        );
        return;
      }
      if (!response.ok || !data.checkoutFormContent) {
        throw new Error(
          Array.isArray(data?.message) ? data.message[0] : data?.message
        );
      }
      setForm(data.checkoutFormContent);
    } catch (err: any) {
      toast.show(
        `${t('iyzico_checkout_failed', 'The payment form could not be opened')}${
          err?.message ? `: ${err.message}` : ''
        }`,
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, [values, plan]);

  if (form) {
    return <IyzicoForm content={form} />;
  }

  return (
    <div className="flex flex-col gap-[12px] w-full text-newTextColor">
      <div className="text-[14px] text-textItemBlur">
        {plan.name} · {formatMoney(plan.price, plan.currency)}{' '}
        {plan.period === 'YEARLY'
          ? t('iyzico_per_year', '/ year')
          : t('iyzico_per_month', '/ month')}
        {plan.trialDays > 0 &&
          ` · ${t('iyzico_trial_days', '{{days}} days free trial', {
            days: plan.trialDays,
          })}`}
      </div>
      <div className="text-[15px] font-[600]">
        {t('iyzico_invoice_details', 'Invoice details')}
      </div>
      <div className="flex gap-[8px]">
        <input
          className={fieldClass}
          placeholder={t('iyzico_name', 'First name')}
          value={values.name}
          maxLength={60}
          onChange={change('name')}
        />
        <input
          className={fieldClass}
          placeholder={t('iyzico_surname', 'Last name')}
          value={values.surname}
          maxLength={60}
          onChange={change('surname')}
        />
      </div>
      <div className="flex gap-[8px]">
        <input
          className={fieldClass}
          placeholder={t('iyzico_phone', 'Mobile number')}
          value={values.phone}
          maxLength={20}
          inputMode="tel"
          onChange={change('phone')}
        />
        <input
          className={fieldClass}
          placeholder={t('iyzico_identity', 'National ID number')}
          value={values.identityNumber}
          maxLength={11}
          inputMode="numeric"
          onChange={change('identityNumber')}
        />
      </div>
      <input
        className={fieldClass}
        placeholder={t('iyzico_address', 'Address')}
        value={values.address}
        maxLength={300}
        onChange={change('address')}
      />
      <input
        className={fieldClass}
        placeholder={t('iyzico_city', 'City')}
        value={values.city}
        maxLength={60}
        onChange={change('city')}
      />
      <p className="text-[13px] text-textItemBlur">
        {t(
          'iyzico_card_note',
          'Your card details are entered on the secure iyzico form in the next step; we never see or store them.'
        )}
      </p>
      <Button className="rounded-[8px]" loading={loading} onClick={submit}>
        {t('iyzico_continue_to_payment', 'Continue to payment')}
      </Button>
    </div>
  );
};

const IyzicoPlans: FC<{ plans: IyzicoPlan[] }> = ({ plans }) => {
  const t = useT();
  const modal = useModals();
  const hasYearly = plans.some((plan) => plan.period === 'YEARLY');
  const hasMonthly = plans.some((plan) => plan.period === 'MONTHLY');
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY'>(
    hasMonthly ? 'MONTHLY' : 'YEARLY'
  );

  const choose = useCallback(
    (plan: IyzicoPlan) => () => {
      modal.openModal({
        classNames: {
          modal: 'md',
        },
        title: t('iyzico_subscribe_title', 'Start your subscription'),
        withCloseButton: true,
        closeOnEscape: true,
        closeOnClickOutside: false,
        children: <IyzicoCheckoutModal plan={plan} />,
      });
    },
    []
  );

  if (!plans.length) {
    return (
      <div className="text-[14px] text-textItemBlur">
        {t(
          'iyzico_no_plans',
          'Plans are not available right now. Please try again later.'
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[16px]">
      {hasMonthly && hasYearly && (
        <div className="flex gap-[4px] p-[4px] rounded-[10px] border border-newTableBorder self-start">
          {(['MONTHLY', 'YEARLY'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={clsx(
                'h-[34px] px-[14px] rounded-[7px] text-[14px] font-[500] cursor-pointer',
                period === value
                  ? 'bg-btnPrimary text-white'
                  : 'text-textItemBlur hover:text-newTextColor'
              )}
            >
              {value === 'MONTHLY'
                ? t('iyzico_monthly', 'Monthly')
                : t('iyzico_yearly', 'Yearly')}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 mobile:grid-cols-1 gap-[12px]">
        {plans
          .filter((plan) => plan.period === period)
          .map((plan) => {
            const tier = pricing[plan.billing];
            return (
              <div
                key={plan.billing}
                className="flex flex-col gap-[10px] border border-newTableBorder rounded-[12px] p-[18px] bg-newBgColorInner"
              >
                <div className="text-[16px] font-[600]">{plan.name}</div>
                <div>
                  <span className="text-[28px] font-[700]">
                    {formatMoney(plan.price, plan.currency)}
                  </span>{' '}
                  <span className="text-[14px] text-textItemBlur">
                    {plan.period === 'YEARLY'
                      ? t('iyzico_per_year', '/ year')
                      : t('iyzico_per_month', '/ month')}
                  </span>
                </div>
                <ul className="flex flex-col gap-[6px] text-[14px] flex-1">
                  <li>
                    {t(
                      'iyzico_feature_channels',
                      '{{count}} social media channels',
                      { count: tier?.channel || 0 }
                    )}
                  </li>
                  <li>
                    {t('iyzico_feature_posts', 'Unlimited scheduled posts')}
                  </li>
                  {tier?.team_members && (
                    <li>{t('iyzico_feature_team', 'Team members')}</li>
                  )}
                  {!!tier?.image_generation_count && (
                    <li>
                      {t(
                        'iyzico_feature_images',
                        '{{count}} AI images per month',
                        { count: tier.image_generation_count }
                      )}
                    </li>
                  )}
                </ul>
                <Button className="rounded-[8px]" onClick={choose(plan)}>
                  {plan.trialDays > 0
                    ? t('iyzico_start_trial', 'Try free for {{days}} days', {
                        days: plan.trialDays,
                      })
                    : t('iyzico_subscribe', 'Subscribe')}
                </Button>
              </div>
            );
          })}
      </div>
    </div>
  );
};

const IyzicoCurrent: FC<{ sub: any; plans: IyzicoPlan[] }> = ({
  sub,
  plans,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const { mutate } = useSWRConfig();
  const { data: renewal } = useRenewal();
  const { data: payments } = usePayments();
  const [loading, setLoading] = useState(false);

  const plan = plans.find(
    (p) => p.billing === sub.subscriptionTier && p.period === sub.period
  );

  const cancel = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'iyzico_cancel_confirm',
          'Your subscription will not renew. You can keep using your plan until the end of the period you already paid for.'
        ),
        t('iyzico_cancel_yes', 'Yes, cancel'),
        t('iyzico_cancel_title', 'Cancel subscription?'),
        t('iyzico_cancel_no', 'Keep my subscription'),
        true
      ))
    ) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/billing/cancel', { method: 'POST' });
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      await Promise.all([
        mutate('/user/subscription'),
        mutate('/billing/renewal'),
        mutate('/user/self'),
      ]);
      toast.show(
        t('iyzico_cancel_done', 'Your subscription will not renew'),
        'success'
      );
    } catch (err) {
      toast.show(
        t('iyzico_cancel_failed', 'The subscription could not be cancelled'),
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center gap-[12px] flex-wrap border border-newTableBorder rounded-[12px] p-[18px] bg-newBgColorInner">
        <div className="flex-1 min-w-[220px]">
          <div className="text-[13px] text-textItemBlur">
            {t('iyzico_current_plan', 'Your plan')}
          </div>
          <div className="text-[18px] font-[600]">
            {plan?.name || sub.subscriptionTier}
            {plan && (
              <span className="text-[14px] font-[400] text-textItemBlur">
                {' '}
                · {formatMoney(plan.price, plan.currency)}{' '}
                {plan.period === 'YEARLY'
                  ? t('iyzico_per_year', '/ year')
                  : t('iyzico_per_month', '/ month')}
              </span>
            )}
          </div>
          <div className="text-[14px] text-textItemBlur mt-[4px]">
            {sub.cancelAt
              ? t('iyzico_ends_on', 'Your subscription ends on {{date}}', {
                  date: formatDate(sub.cancelAt),
                })
              : renewal?.renewsAt
              ? renewal.trialing
                ? t(
                    'iyzico_trial_ends_on',
                    'Free trial; the first payment is on {{date}}',
                    { date: formatDate(renewal.renewsAt * 1000) }
                  )
                : t('iyzico_renews_on', 'Renews on {{date}}', {
                    date: formatDate(renewal.renewsAt * 1000),
                  })
              : ''}
          </div>
        </div>
        {!sub.cancelAt && !sub.isLifetime && (
          <Button
            secondary={true}
            className="rounded-[8px] border border-newTableBorder"
            loading={loading}
            onClick={cancel}
          >
            {t('iyzico_cancel', 'Cancel subscription')}
          </Button>
        )}
      </div>

      {!!payments?.length && (
        <div className="flex flex-col gap-[8px]">
          <div className="text-[15px] font-[600]">
            {t('iyzico_payments', 'Payments')}
          </div>
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center gap-[12px] text-[14px] border-b border-newTableBorder pb-[8px]"
            >
              <div className="flex-1">{formatDate(payment.created * 1000)}</div>
              <div>{formatMoney(payment.amount / 100, payment.currency)}</div>
              <div
                className={clsx(
                  'w-[110px] text-end',
                  payment.status === 'paid'
                    ? 'text-[#12B76A]'
                    : 'text-[#F97066]'
                )}
              >
                {payment.status === 'paid'
                  ? t('billing_status_paid', 'Paid')
                  : t('billing_status_failed', 'Failed')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const IyzicoBillingComponent: FC<{ sub?: any }> = ({ sub }) => {
  const t = useT();
  const toast = useToaster();
  const router = useRouter();
  const query = useSearchParams();
  const { mutate } = useSWRConfig();
  const { data, isLoading } = useIyzicoPlans();

  // iyzico'nun ödeme formundan dönüş: /billing?iyzico=success|failed
  useEffect(() => {
    const result = query.get('iyzico');
    if (!result) {
      return;
    }
    if (result === 'success') {
      toast.show(
        t('iyzico_payment_success', 'Your subscription has started'),
        'success'
      );
      mutate('/user/self');
      mutate('/user/subscription');
    } else {
      toast.show(
        t(
          'iyzico_payment_failed',
          'The payment could not be completed. No subscription was started.'
        ),
        'warning'
      );
    }
    router.replace('/billing');
  }, []);

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="flex flex-col gap-[18px] w-full text-newTextColor">
      {sub ? (
        <IyzicoCurrent sub={sub} plans={data?.plans || []} />
      ) : (
        <IyzicoPlans plans={data?.plans || []} />
      )}
    </div>
  );
};
