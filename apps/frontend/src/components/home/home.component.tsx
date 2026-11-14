'use client';

// Postacı: ana sayfa. İçerik oluşturma öndedir; altında bu haftanın gönderileri,
// yanıt bekleyen onay planları, yaklaşan özel günler ve mağazadaki yeni ürünler
// tek bakışta görünür.

import { FC, ReactNode, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { expandPosts } from '@gitroom/helpers/utils/posts.list.minify';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import i18next from '@gitroom/react/translation/i18next';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { useSentPlans } from '@gitroom/frontend/components/launches/sent.plans';
import { specialDaysBetween } from '@gitroom/frontend/components/launches/special-days/tr.special.days';
import { useAccountType } from '@gitroom/frontend/components/layout/account.type';

interface HomePost {
  id: string;
  content: string;
  publishDate: string;
  status: string;
  integration?: { name?: string; providerIdentifier?: string };
}

const useUpcomingPosts = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const params = new URLSearchParams({
      display: 'week',
      customer: '',
      startDate: newDayjs().startOf('day').utc().format(),
      endDate: newDayjs().add(7, 'day').endOf('day').utc().format(),
    }).toString();
    const response = await fetch(`/posts?${params}`);
    if (!response.ok) {
      return [];
    }
    const data = expandPosts(await response.json());
    return ((data?.posts || []) as HomePost[])
      .filter((post) => newDayjs(post.publishDate).isAfter(newDayjs()))
      .sort((a, b) => (a.publishDate > b.publishDate ? 1 : -1))
      // aynı içeriğin birden çok kanala giden kopyaları tek satır görünür
      .filter(
        (post, index, all) =>
          all.findIndex(
            (other) =>
              other.publishDate === post.publishDate &&
              other.content === post.content
          ) === index
      );
  }, []);
  return useSWR<HomePost[]>('/home/upcoming-posts', load, {
    revalidateOnFocus: false,
  });
};

const useNewProducts = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const response = await fetch('/product-feeds/new-items');
    return response.ok ? response.json() : [];
  }, []);
  return useSWR<{ id: string }[]>('/product-feeds/new-items', load, {
    revalidateOnFocus: false,
  });
};

const plainText = (html: string) =>
  (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const Card: FC<{
  title: string;
  action?: { label: string; href: string };
  children: ReactNode;
}> = ({ title, action, children }) => (
  <section className="bg-newBgColorInner border border-newTableBorder rounded-[14px] p-[18px] flex flex-col gap-[12px]">
    <div className="flex items-center justify-between gap-[12px]">
      <h2 className="text-[16px] font-[600]">{title}</h2>
      {action && (
        <Link
          href={action.href}
          className="text-[13px] text-textItemFocused font-[600] whitespace-nowrap"
        >
          {action.label} →
        </Link>
      )}
    </div>
    {children}
  </section>
);

const Empty: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="text-[14px] text-textItemBlur">{children}</p>
);

const CreateCard: FC<{
  href: string;
  title: string;
  text: string;
  primary?: boolean;
  icon: ReactNode;
}> = ({ href, title, text, primary, icon }) => (
  <Link
    href={href}
    className={
      primary
        ? 'flex items-start gap-[14px] rounded-[14px] p-[18px] bg-btnPrimary text-white hover:opacity-95 transition-opacity'
        : 'flex items-start gap-[14px] rounded-[14px] p-[18px] bg-newBgColorInner border border-newTableBorder hover:bg-boxHover transition-colors'
    }
  >
    <span
      className={
        primary
          ? 'w-[44px] h-[44px] rounded-[12px] bg-white/20 flex items-center justify-center shrink-0'
          : 'w-[44px] h-[44px] rounded-[12px] bg-boxFocused text-textItemFocused flex items-center justify-center shrink-0'
      }
    >
      {icon}
    </span>
    <span className="flex flex-col gap-[4px]">
      <span className="text-[16px] font-[600]">{title}</span>
      <span
        className={
          primary ? 'text-[13px] text-white/80' : 'text-[13px] text-textItemBlur'
        }
      >
        {text}
      </span>
    </span>
  </Link>
);

const icon = (path: ReactNode) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

export const HomeComponent: FC = () => {
  const t = useT();
  const language = i18next.resolvedLanguage || 'tr';
  const business = useAccountType() === 'business';
  const { data: integrations } = useIntegrationList();
  const { data: posts } = useUpcomingPosts();
  const { data: plans } = useSentPlans();
  const { data: products } = useNewProducts();

  const days = useMemo(() => {
    const from = newDayjs().format('YYYY-MM-DD');
    const to = newDayjs().add(45, 'day').format('YYYY-MM-DD');
    return specialDaysBetween(from, to).slice(0, 4);
  }, []);

  const waitingPlans = (plans || []).filter(
    (plan) => plan.pending > 0 || plan.changes > 0
  );

  const dateTime = (value: string) =>
    newDayjs(value).toDate().toLocaleString(language, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  const dayLabel = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString(language, {
      day: 'numeric',
      month: 'long',
    });

  const channelCount = (integrations || []).length;

  return (
    <div className="flex flex-col gap-[20px] text-newTextColor w-full max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-[26px] font-[600]">
          {t('home_title', 'What are we sharing today?')}
        </h1>
        <p className="text-[14px] text-textItemBlur mt-[4px]">
          {new Date().toLocaleDateString(language, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* İçerik oluşturma */}
      <div className="grid grid-cols-3 mobile:grid-cols-1 gap-[14px]">
        <CreateCard
          primary={true}
          href="/launches?new=1"
          title={t('home_create_post', 'Create a post')}
          text={t(
            'home_create_post_text',
            'Write the text, add images or video, choose the channels and the time.'
          )}
          icon={icon(
            <>
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </>
          )}
        />
        <CreateCard
          href="/agents"
          title={t('home_create_ai', 'Create with the assistant')}
          text={t(
            'home_create_ai_text',
            'Tell it what you need; it prepares the text, the image and the video and puts them on the calendar.'
          )}
          icon={icon(
            <>
              <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" />
              <path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8L19 15Z" />
            </>
          )}
        />
        <CreateCard
          href="/media"
          title={t('home_media', 'Upload images and video')}
          text={t(
            'home_media_text',
            'Keep your photos and videos in the media library and use them in any post.'
          )}
          icon={icon(
            <>
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="m10 9 5 3-5 3V9Z" />
            </>
          )}
        />
      </div>

      {!channelCount && (
        <Card
          title={t('home_no_channels', 'Connect your first channel')}
          action={{ label: t('home_add_channel', 'Add channel'), href: '/launches' }}
        >
          <Empty>
            {t(
              'home_no_channels_text',
              'Connect Instagram, Facebook or another channel to start scheduling posts.'
            )}
          </Empty>
        </Card>
      )}

      <div className="grid grid-cols-2 mobile:grid-cols-1 gap-[14px] items-start">
        <Card
          title={t('home_upcoming', 'Coming up in the next 7 days')}
          action={{ label: t('home_open_calendar', 'Open calendar'), href: '/launches' }}
        >
          {!posts?.length ? (
            <Empty>
              {t('home_upcoming_empty', 'Nothing is scheduled for the next 7 days.')}
            </Empty>
          ) : (
            <ul className="flex flex-col">
              {posts.slice(0, 6).map((post, index) => (
                <li
                  key={post.id + index}
                  className="flex items-center gap-[12px] py-[9px] border-t border-newTableBorder first:border-t-0 text-[14px]"
                >
                  <span className="w-[150px] shrink-0 text-textItemBlur text-[13px]">
                    {dateTime(post.publishDate)}
                  </span>
                  <span className="flex-1 min-w-0 truncate">
                    {plainText(post.content) ||
                      t('home_post_no_text', 'Post without text')}
                  </span>
                  <span className="text-[12px] text-textItemBlur whitespace-nowrap">
                    {post.status === 'draft'
                      ? t('draft', 'Draft')
                      : post.integration?.name || ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-[14px]">
          {!business && (
            <Card
              title={t('home_approvals', 'Waiting for client approval')}
              action={{ label: t('home_open_plans', 'Open plans'), href: '/launches' }}
            >
              {!waitingPlans.length ? (
                <Empty>
                  {t(
                    'home_approvals_empty',
                    'No plan is waiting for a client response.'
                  )}
                </Empty>
              ) : (
                <ul className="flex flex-col">
                  {waitingPlans.slice(0, 4).map((plan) => (
                    <li
                      key={plan.id}
                      className="flex items-center justify-between gap-[12px] py-[9px] border-t border-newTableBorder first:border-t-0 text-[14px]"
                    >
                      <span className="font-[600] truncate">
                        {plan.customerName ||
                          t('approval_plan_all_channels', 'All channels')}
                      </span>
                      <span className="text-[13px] text-textItemBlur whitespace-nowrap">
                        {t(
                          'sent_plans_progress',
                          '{{approved}} of {{total}} approved',
                          { approved: plan.approved, total: plan.total }
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card title={t('home_special_days', 'Upcoming special days')}>
            {!days.length ? (
              <Empty>
                {t('home_special_days_empty', 'No special day in the coming weeks.')}
              </Empty>
            ) : (
              <ul className="flex flex-col">
                {days.map((day) => (
                  <li
                    key={day.date + day.name}
                    className="flex items-center gap-[12px] py-[9px] border-t border-newTableBorder first:border-t-0 text-[14px]"
                  >
                    <span className="w-[92px] shrink-0 font-[600]">
                      {dayLabel(day.date)}
                    </span>
                    <span className="flex-1 min-w-0 truncate">{day.name}</span>
                    <Link
                      href={`/launches?new=1&date=${day.date}&text=${encodeURIComponent(
                        day.draft
                      )}`}
                      className="text-[13px] text-textItemFocused font-[600] whitespace-nowrap"
                    >
                      {t('home_special_day_draft', 'Prepare draft')}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {!!products?.length && (
            <Card
              title={t('home_products', 'New products in your store')}
              action={{ label: t('home_open_store', 'See products'), href: '/launches' }}
            >
              <Empty>
                {t(
                  'home_products_text',
                  '{{count}} new products are waiting to become posts.',
                  { count: products.length }
                )}
              </Empty>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
