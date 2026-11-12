'use client';

// Postacı: yönetim paneli, müşteriler. Bütün hesapları plan ve abonelik durumuyla
// listeler; yalnızca süper yönetici görür.

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import i18next from '@gitroom/react/translation/i18next';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

interface Customer {
  id: string;
  name: string;
  createdAt: string;
  owner: {
    id: string;
    email: string;
    name: string | null;
    lastOnline: string;
  } | null;
  members: number;
  channels: number;
  posts: number;
  customers: number;
  plan: string;
  period: 'MONTHLY' | 'YEARLY' | null;
  provider: string | null;
  manual: boolean;
  cancelAt: string | null;
  isLifetime: boolean;
  trialing: boolean;
}

interface CustomersResponse {
  total: number;
  page: number;
  limit: number;
  customers: Customer[];
}

interface Summary {
  accounts: number;
  subscribed: number;
  free: number;
  trialing: number;
  cancelling: number;
  byPlan: { plan: string; count: number }[];
  monthlyRevenue: number | null;
  currency: string | null;
}

const PAGE_SIZE = 20;
const PLANS = ['STANDARD', 'TEAM', 'PRO', 'ULTIMATE'];

const useCustomers = (params: { page: number; search: string; plan: string }) => {
  const fetch = useFetch();
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(PAGE_SIZE),
    ...(params.search ? { search: params.search } : {}),
    ...(params.plan ? { plan: params.plan } : {}),
  });
  return useSWR<CustomersResponse>(
    `/admin/customers?${query.toString()}`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to load customers');
      }
      return res.json();
    },
    { revalidateOnFocus: false, keepPreviousData: true }
  );
};

const useSummary = () => {
  const fetch = useFetch();
  return useSWR<Summary>(
    '/admin/customers/summary',
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to load summary');
      }
      return res.json();
    },
    { revalidateOnFocus: false }
  );
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(i18next.resolvedLanguage || 'tr', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const SummaryCard: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="border border-newTableBorder rounded-[8px] p-[16px] bg-newBgColorInner">
    <div className="text-[12px] opacity-70">{label}</div>
    <div className="text-[26px] font-[600]">{value}</div>
  </div>
);

const fieldClass =
  'h-[38px] bg-newBgColor border border-newTableBorder rounded-[8px] px-[12px] text-[14px] text-newTextColor outline-none';

const COLUMNS =
  'grid-cols-[minmax(160px,1.4fr)_minmax(180px,1.4fr)_110px_minmax(150px,1fr)_60px_70px_70px_110px_110px_190px]';

// Hesaba elle plan verme (havale ile ödeyenler) ya da aboneliği kaldırma.
const PlanModal: FC<{ customer: Customer; onSaved: () => void }> = ({
  customer,
  onSaved,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const modal = useModals();
  const [plan, setPlan] = useState(
    customer.plan === 'FREE' ? 'STANDARD' : customer.plan
  );
  const [period, setPeriod] = useState(customer.period || 'MONTHLY');
  const [until, setUntil] = useState(
    customer.manual && customer.cancelAt ? customer.cancelAt.slice(0, 10) : ''
  );
  const [loading, setLoading] = useState(false);

  // Kartla süren abonelik varken elle plan verilmez; önce kaldırılır.
  const cardSubscription =
    customer.plan !== 'FREE' && !customer.manual && !customer.cancelAt;

  const send = useCallback(
    async (body: { plan: string; period?: string; until?: string }) => {
      setLoading(true);
      try {
        const response = await fetch(`/admin/customers/${customer.id}/plan`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            Array.isArray(data?.message) ? data.message[0] : data?.message
          );
        }
        toast.show(t('admin_plan_saved', 'The plan was updated'), 'success');
        onSaved();
        modal.closeAll();
      } catch (err: any) {
        toast.show(
          `${t('admin_plan_failed', 'The plan could not be updated')}${
            err?.message ? `: ${err.message}` : ''
          }`,
          'warning'
        );
      } finally {
        setLoading(false);
      }
    },
    [customer.id]
  );

  const save = useCallback(() => {
    send({ plan, period, ...(until ? { until } : {}) });
  }, [plan, period, until]);

  const remove = useCallback(async () => {
    if (
      !(await deleteDialog(
        cardSubscription
          ? t(
              'admin_remove_card_confirm',
              'The card subscription is cancelled at iyzico right away and the account loses its plan. No refund is made.'
            )
          : t(
              'admin_remove_confirm',
              'The account loses its plan right away and its channels are disabled.'
            ),
        t('admin_remove_yes', 'Yes, remove'),
        t('admin_remove_title', 'Remove the subscription?'),
        t('no_cancel', 'No, cancel!'),
        true
      ))
    ) {
      return;
    }
    send({ plan: 'FREE' });
  }, [cardSubscription]);

  return (
    <div className="flex flex-col gap-[12px] w-full text-newTextColor">
      <div className="text-[14px]">
        <span className="font-[600]">{customer.name}</span>
        {customer.owner && (
          <span className="opacity-70"> · {customer.owner.email}</span>
        )}
      </div>
      {cardSubscription ? (
        <p className="text-[14px] opacity-80">
          {t(
            'admin_card_subscription_note',
            'This account pays by card. To give a plan manually, remove the card subscription first.'
          )}
        </p>
      ) : (
        <>
          <p className="text-[13px] opacity-70">
            {t(
              'admin_manual_plan_note',
              'For accounts that pay by bank transfer. With an end date the plan closes by itself on that day; without one it stays until you remove it.'
            )}
          </p>
          <div className="flex gap-[8px] flex-wrap">
            <select
              className={fieldClass}
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              {PLANS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'MONTHLY' | 'YEARLY')}
            >
              <option value="MONTHLY">{t('iyzico_monthly', 'Monthly')}</option>
              <option value="YEARLY">{t('iyzico_yearly', 'Yearly')}</option>
            </select>
            <label className="flex items-center gap-[8px] text-[13px]">
              {t('admin_plan_until', 'End date')}
              <input
                type="date"
                className={fieldClass}
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </label>
          </div>
          <Button className="rounded-[8px]" loading={loading} onClick={save}>
            {t('admin_plan_save', 'Save plan')}
          </Button>
        </>
      )}
      {customer.plan !== 'FREE' && !customer.isLifetime && (
        <Button
          secondary={true}
          className="rounded-[8px] border border-newTableBorder"
          loading={loading}
          onClick={remove}
        >
          {t('admin_remove_subscription', 'Remove subscription')}
        </Button>
      )}
    </div>
  );
};

export const AdminCustomersComponent: FC = () => {
  const user = useUser();
  const t = useT();
  const fetch = useFetch();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(0);
  const modal = useModals();
  const { data, isLoading, error, mutate } = useCustomers({
    page,
    search,
    plan,
  });
  const { data: summary, mutate: mutateSummary } = useSummary();

  const editPlan = useCallback(
    (customer: Customer) => () => {
      modal.openModal({
        classNames: {
          modal: 'md',
        },
        title: t('admin_edit_plan', 'Edit plan'),
        withCloseButton: true,
        closeOnEscape: true,
        closeOnClickOutside: true,
        children: (
          <PlanModal
            customer={customer}
            onSaved={() => {
              mutate();
              mutateSummary();
            }}
          />
        ),
      });
    },
    [mutate, mutateSummary]
  );

  const applySearch = useCallback(() => {
    setPage(0);
    setSearch(searchInput.trim());
  }, [searchInput]);

  // Hesabı sahibinin gözünden açar; üstteki yönetici çubuğundan geri dönülür.
  const enter = useCallback(
    (userId: string) => async () => {
      await fetch('/user/impersonate', {
        method: 'POST',
        body: JSON.stringify({ id: userId }),
      });
      window.location.href = '/';
    },
    []
  );

  // @ts-ignore isSuperAdmin kullanıcı kaydından gelir
  if (!user?.isSuperAdmin) {
    return (
      <div className="text-textColor p-[20px]">
        {t('admin_no_access', 'You do not have access to this page.')}
      </div>
    );
  }

  const status = (customer: Customer) => {
    if (customer.plan === 'FREE') {
      return t('admin_status_none', 'No subscription');
    }
    if (customer.isLifetime) {
      return t('admin_status_lifetime', 'Lifetime');
    }
    if (customer.manual) {
      return customer.cancelAt
        ? t('admin_status_manual_until', 'Manual, until {{date}}', {
            date: formatDate(customer.cancelAt),
          })
        : t('admin_status_manual', 'Manual');
    }
    if (customer.cancelAt) {
      return t('admin_status_ends', 'Ends on {{date}}', {
        date: formatDate(customer.cancelAt),
      });
    }
    if (customer.trialing) {
      return t('admin_status_trial', 'Free trial');
    }
    return t('admin_status_active', 'Active');
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-[16px] text-textColor">
      <div className="text-[20px] font-[600]">
        {t('admin_customers', 'Customers')}
      </div>

      {summary && (
        <div className="grid grid-cols-5 mobile:grid-cols-2 gap-[12px]">
          <SummaryCard
            label={t('admin_accounts', 'Accounts')}
            value={summary.accounts.toLocaleString()}
          />
          <SummaryCard
            label={t('admin_subscribed', 'Subscribed')}
            value={summary.subscribed.toLocaleString()}
          />
          <SummaryCard
            label={t('admin_trialing', 'On free trial')}
            value={summary.trialing.toLocaleString()}
          />
          <SummaryCard
            label={t('admin_cancelling', 'Ending')}
            value={summary.cancelling.toLocaleString()}
          />
          <SummaryCard
            label={t('admin_monthly_revenue', 'Estimated monthly revenue')}
            value={
              summary.monthlyRevenue === null
                ? '—'
                : new Intl.NumberFormat(i18next.resolvedLanguage || 'tr', {
                    style: 'currency',
                    currency: summary.currency || 'TRY',
                    maximumFractionDigits: 0,
                  }).format(summary.monthlyRevenue)
            }
          />
        </div>
      )}

      <div className="flex flex-wrap gap-[8px] items-center">
        <input
          className={clsx(fieldClass, 'w-[280px] max-w-full')}
          placeholder={t(
            'admin_search_placeholder',
            'Search by account name or email'
          )}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
        />
        <button
          type="button"
          onClick={applySearch}
          className="h-[38px] px-[14px] rounded-[8px] bg-btnPrimary text-white text-[14px] cursor-pointer"
        >
          {t('search', 'Search')}
        </button>
        <select
          className={fieldClass}
          value={plan}
          onChange={(e) => {
            setPage(0);
            setPlan(e.target.value);
          }}
        >
          <option value="">{t('admin_all_plans', 'All plans')}</option>
          <option value="FREE">
            {t('admin_status_none', 'No subscription')}
          </option>
          {PLANS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        {data && (
          <div className="text-[13px] opacity-70">
            {t('admin_total', '{{count}} accounts', { count: data.total })}
          </div>
        )}
      </div>

      <div className="border border-newTableBorder rounded-[8px] overflow-x-auto">
        <div className="min-w-[1270px]">
          <div
            className={clsx(
              'grid gap-[12px] px-[12px] py-[10px] bg-newBgColorInner text-[12px] font-[600] opacity-70 border-b border-newTableBorder',
              COLUMNS
            )}
          >
            <div>{t('admin_col_account', 'Account')}</div>
            <div>{t('admin_col_owner', 'Owner')}</div>
            <div>{t('admin_col_plan', 'Plan')}</div>
            <div>{t('admin_col_status', 'Status')}</div>
            <div className="text-end">{t('admin_col_channels', 'Channels')}</div>
            <div className="text-end">{t('admin_col_posts', 'Posts')}</div>
            <div className="text-end">{t('admin_col_clients', 'Clients')}</div>
            <div>{t('admin_col_created', 'Signed up')}</div>
            <div>{t('admin_col_last_seen', 'Last seen')}</div>
            <div />
          </div>
          {isLoading && (
            <div className="px-[12px] py-[10px] text-[13px] opacity-70">
              {t('loading', 'Loading...')}
            </div>
          )}
          {!!error && (
            <div className="px-[12px] py-[10px] text-[13px] text-[#F97066]">
              {t('admin_load_failed', 'The list could not be loaded')}
            </div>
          )}
          {data && !data.customers.length && (
            <div className="px-[12px] py-[10px] text-[13px] opacity-70">
              {t('admin_no_results', 'No accounts found')}
            </div>
          )}
          {(data?.customers || []).map((customer) => (
            <div
              key={customer.id}
              className={clsx(
                'grid gap-[12px] px-[12px] py-[10px] text-[13px] items-center border-b border-newTableBorder last:border-b-0',
                COLUMNS
              )}
            >
              <div className="truncate font-[600]">{customer.name}</div>
              <div className="truncate">{customer.owner?.email || '—'}</div>
              <div>
                {customer.plan === 'FREE' ? '—' : customer.plan}
                {customer.period && (
                  <span className="opacity-70">
                    {' '}
                    ·{' '}
                    {customer.period === 'YEARLY'
                      ? t('iyzico_yearly', 'Yearly')
                      : t('iyzico_monthly', 'Monthly')}
                  </span>
                )}
              </div>
              <div
                className={clsx(
                  'truncate',
                  customer.cancelAt && !customer.manual && 'text-[#F97066]',
                  customer.plan !== 'FREE' &&
                    !customer.cancelAt &&
                    !customer.trialing &&
                    'text-[#12B76A]'
                )}
              >
                {status(customer)}
              </div>
              <div className="text-end">{customer.channels}</div>
              <div className="text-end">{customer.posts}</div>
              <div className="text-end">{customer.customers}</div>
              <div>{formatDate(customer.createdAt)}</div>
              <div>
                {customer.owner ? formatDate(customer.owner.lastOnline) : '—'}
              </div>
              <div className="flex gap-[12px] justify-end">
                <button
                  type="button"
                  onClick={editPlan(customer)}
                  className="underline cursor-pointer whitespace-nowrap"
                >
                  {t('admin_edit_plan', 'Edit plan')}
                </button>
                {customer.owner && (
                  <button
                    type="button"
                    onClick={enter(customer.owner.id)}
                    className="underline cursor-pointer whitespace-nowrap"
                  >
                    {t('admin_enter_account', 'Open account')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-[12px] text-[13px]">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="h-[32px] px-[12px] rounded-[8px] border border-newTableBorder cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            {t('previous', 'Previous')}
          </button>
          <div>
            {page + 1} / {pages}
          </div>
          <button
            type="button"
            disabled={page + 1 >= pages}
            onClick={() => setPage(page + 1)}
            className="h-[32px] px-[12px] rounded-[8px] border border-newTableBorder cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            {t('next', 'Next')}
          </button>
        </div>
      )}
    </div>
  );
};
