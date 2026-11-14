'use client';

// Postacı: ana sayfa. İçerik oluşturma öndedir; altında özet sayılar, bu haftanın
// gönderileri, son paylaşılanlar ve etkileşimleri, müşterilerden gelen onay ve
// notlar, yanıt bekleyen planlar ve yaklaşan özel günler tek bakışta görünür.

import { FC, ReactNode, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  expandPosts,
  expandPostsList,
} from '@gitroom/helpers/utils/posts.list.minify';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import i18next from '@gitroom/react/translation/i18next';
import {
  getTimezone,
  newDayjs,
} from '@gitroom/frontend/components/layout/set.timezone';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { useSentPlans } from '@gitroom/frontend/components/launches/sent.plans';
import { StatisticsModal } from '@gitroom/frontend/components/launches/statistics';
import { specialDaysBetween } from '@gitroom/frontend/components/launches/special-days/tr.special.days';
import { useAccountType } from '@gitroom/frontend/components/layout/account.type';

interface HomePost {
  id: string;
  content: string;
  publishDate: string;
  state?: string;
  releaseURL?: string;
  integration?: { name?: string; providerIdentifier?: string };
}

interface Activity {
  id: string;
  postId: string;
  status: 'APPROVED' | 'CHANGES_REQUESTED';
  reviewerName: string;
  note: string | null;
  createdAt: string;
  text: string;
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

const usePublishedPosts = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const params = new URLSearchParams({
      page: '0',
      limit: '8',
      customer: '',
      state: 'published',
    }).toString();
    const response = await fetch(`/posts/list?${params}`);
    if (!response.ok) {
      return { total: 0, posts: [] };
    }
    const data = expandPostsList(await response.json());
    return {
      total: (data?.total || 0) as number,
      posts: ((data?.posts || []) as HomePost[]).filter(
        (post, index, all) =>
          all.findIndex(
            (other) =>
              other.publishDate === post.publishDate &&
              other.content === post.content
          ) === index
      ),
    };
  }, []);
  return useSWR<{ total: number; posts: HomePost[] }>('/home/published-posts', load, {
    revalidateOnFocus: false,
  });
};

const useActivity = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const response = await fetch('/approvals/activity');
    return response.ok ? response.json() : [];
  }, []);
  return useSWR<Activity[]>('/approvals/activity', load, {
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

// Simge kutularının dört tonu: mercan, yeşil, kehribar, mürekkep
const tones = {
  coral: 'bg-[#FFEDE7] text-[#D6472A]',
  green: 'bg-[#E2F5EF] text-[#0B7A63]',
  amber: 'bg-[#FFF3D9] text-[#9A5B00]',
  ink: 'postaci-ink bg-[#EEEAE1] text-[#14172B]',
} as const;

const svg = (path: ReactNode, size = 20) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
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

const icons = {
  plus: svg(
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  spark: svg(
    <>
      <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" />
      <path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8L19 15Z" />
    </>
  ),
  media: svg(
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m10 9 5 3-5 3V9Z" />
    </>
  ),
  calendar: svg(
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  channel: svg(
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m8.2 10.9 7.6-3.8M8.2 13.1l7.6 3.8" />
    </>
  ),
  check: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </>
  ),
  bag: svg(
    <>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  chart: svg(
    <>
      <path d="M4 20V11" />
      <path d="M10 20V4" />
      <path d="M16 20v-6" />
      <path d="M22 20H2" />
    </>,
    16
  ),
};

const Card: FC<{
  title: string;
  action?: { label: string; href: string };
  children: ReactNode;
  className?: string;
}> = ({ title, action, children, className }) => (
  <section
    className={clsx(
      'bg-newBgColorInner border border-newTableBorder rounded-[18px] p-[20px] flex flex-col gap-[14px] shadow-[0_18px_40px_-34px_rgba(20,23,43,0.55)]',
      className
    )}
  >
    <div className="flex items-center justify-between gap-[12px]">
      <h2 className="text-[16px] font-[700]">{title}</h2>
      {action && (
        <Link
          href={action.href}
          className="text-[13px] font-[600] text-[#D6472A] whitespace-nowrap hover:underline"
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

const Stat: FC<{
  value: number;
  label: string;
  tone: keyof typeof tones;
  icon: ReactNode;
  href: string;
}> = ({ value, label, tone, icon, href }) => (
  <Link
    href={href}
    className="bg-newBgColorInner border border-newTableBorder rounded-[16px] p-[16px] flex items-center gap-[14px] hover:-translate-y-[1px] transition-transform"
  >
    <span
      className={clsx(
        'w-[44px] h-[44px] rounded-[12px] flex items-center justify-center shrink-0',
        tones[tone]
      )}
    >
      {icon}
    </span>
    <span className="flex flex-col min-w-0">
      <span className="text-[26px] font-[700] leading-none">{value}</span>
      <span className="text-[13px] text-textItemBlur mt-[4px] truncate mobile:whitespace-normal mobile:leading-[1.25]">
        {label}
      </span>
    </span>
  </Link>
);

const QuickAction: FC<{
  href: string;
  title: string;
  text: string;
  tone: keyof typeof tones;
  icon: ReactNode;
}> = ({ href, title, text, tone, icon }) => (
  <Link
    href={href}
    className="group bg-newBgColorInner border border-newTableBorder rounded-[16px] p-[18px] flex flex-col gap-[12px] hover:border-[#FF6B4A] hover:-translate-y-[1px] transition-all"
  >
    <span
      className={clsx(
        'w-[46px] h-[46px] rounded-[14px] flex items-center justify-center',
        tones[tone]
      )}
    >
      {icon}
    </span>
    <span className="flex flex-col gap-[4px]">
      <span className="text-[16px] font-[700] flex items-center gap-[6px]">
        {title}
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          →
        </span>
      </span>
      <span className="text-[13px] text-textItemBlur">{text}</span>
    </span>
  </Link>
);

// Gün ve ay, takvim yaprağı gibi küçük bir kutuda
const DateTile: FC<{ date: string; language: string }> = ({ date, language }) => {
  const value = newDayjs(date);
  return (
    <span className="postaci-ink w-[46px] h-[50px] rounded-[12px] bg-[#EEEAE1] text-[#14172B] flex flex-col items-center justify-center shrink-0 leading-none">
      <span className="text-[17px] font-[700]">{value.date()}</span>
      <span className="text-[10px] font-[600] uppercase text-[#77726A] mt-[3px]">
        {value.toDate().toLocaleDateString(language, {
          month: 'short',
          timeZone: getTimezone(),
        })}
      </span>
    </span>
  );
};

export const HomeComponent: FC = () => {
  const t = useT();
  const modal = useModals();
  const language = i18next.resolvedLanguage || 'tr';
  const business = useAccountType() === 'business';
  const { data: integrations } = useIntegrationList();
  const { data: posts } = useUpcomingPosts();
  const { data: publishedData } = usePublishedPosts();
  const published = publishedData?.posts;
  const { data: plans } = useSentPlans();
  const { data: activity } = useActivity();
  const { data: products } = useNewProducts();

  const days = useMemo(() => {
    const from = newDayjs().format('YYYY-MM-DD');
    const to = newDayjs().add(45, 'day').format('YYYY-MM-DD');
    return specialDaysBetween(from, to).slice(0, 4);
  }, []);

  const waitingPlans = (plans || []).filter(
    (plan) => plan.pending > 0 || plan.changes > 0
  );
  const channelCount = (integrations || []).length;

  const time = (value: string) =>
    newDayjs(value).toDate().toLocaleString(language, {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: getTimezone(),
    });
  const shortDate = (value: string) =>
    newDayjs(value).toDate().toLocaleDateString(language, {
      day: 'numeric',
      month: 'short',
      timeZone: getTimezone(),
    });

  const openStatistics = useCallback(
    (id: string) => () => {
      modal.openModal({
        title: t('statistics', 'Statistics'),
        closeOnClickOutside: true,
        closeOnEscape: true,
        withCloseButton: true,
        classNames: {
          modal: 'w-[100%] max-w-[1400px]',
        },
        children: <StatisticsModal postId={id} />,
        size: '80%',
      });
    },
    [modal, t]
  );

  return (
    <div className="flex flex-col gap-[18px] text-newTextColor w-full max-w-[1240px] mx-auto">
      {/* Karşılama ve içerik oluşturma */}
      <section className="postaci-ink relative overflow-hidden rounded-[22px] bg-[#14172B] border border-white/10 text-white p-[28px] mobile:p-[20px] flex items-center justify-between gap-[24px] mobile:flex-col mobile:items-start">
        <div className="absolute -end-[60px] -top-[80px] w-[260px] h-[260px] rounded-full border border-dashed border-white/15 pointer-events-none" />
        <div className="absolute end-[120px] -bottom-[120px] w-[220px] h-[220px] rounded-full border border-dashed border-white/10 pointer-events-none" />
        <div className="relative">
          <p className="text-[12px] font-[700] tracking-[0.14em] uppercase text-[#FF6B4A]">
            {new Date().toLocaleDateString(language, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: getTimezone(),
            })}
          </p>
          <h1 className="text-[30px] mobile:text-[24px] font-[700] mt-[8px] leading-tight">
            {t('home_title', 'What are we sharing today?')}
          </h1>
          <p className="text-[14px] text-white/70 mt-[6px] max-w-[520px]">
            {t(
              'home_subtitle',
              'Create a post, let the assistant prepare it, or pick up where you left off.'
            )}
          </p>
        </div>
        <div className="relative flex gap-[10px] flex-wrap shrink-0">
          <Link
            href="/launches?new=1"
            className="h-[48px] px-[20px] rounded-[12px] bg-[#FF6B4A] hover:bg-[#F25A39] text-white font-[700] text-[15px] flex items-center gap-[8px] transition-colors"
          >
            {icons.plus}
            {t('home_create_post', 'Create a post')}
          </Link>
          <Link
            href="/agents"
            className="h-[48px] px-[20px] rounded-[12px] border border-white/30 hover:border-white text-white font-[600] text-[15px] flex items-center gap-[8px] transition-colors"
          >
            {icons.spark}
            {t('home_create_ai_short', 'Ask the assistant')}
          </Link>
        </div>
      </section>

      {/* Özet sayılar */}
      <div className="grid grid-cols-4 mobile:grid-cols-2 gap-[12px]">
        <Stat
          value={channelCount}
          label={t('home_stat_channels', 'Connected channels')}
          tone="ink"
          icon={icons.channel}
          href="/launches"
        />
        <Stat
          value={(posts || []).length}
          label={t('home_stat_upcoming', 'Posts in the next 7 days')}
          tone="coral"
          icon={icons.calendar}
          href="/launches"
        />
        {business ? (
          <Stat
            value={publishedData?.total || 0}
            label={t('home_stat_published', 'Published posts')}
            tone="green"
            icon={icons.check}
            href="/launches"
          />
        ) : (
          <Stat
            value={waitingPlans.length}
            label={t('home_stat_waiting', 'Plans waiting for clients')}
            tone="green"
            icon={icons.check}
            href="/launches"
          />
        )}
        <Stat
          value={(products || []).length}
          label={t('home_stat_products', 'New store products')}
          tone="amber"
          icon={icons.bag}
          href="/launches"
        />
      </div>

      {/* Hızlı işlemler */}
      <div className="grid grid-cols-3 mobile:grid-cols-1 gap-[12px]">
        <QuickAction
          href="/agents"
          tone="coral"
          icon={icons.spark}
          title={t('home_create_ai', 'Create with the assistant')}
          text={t(
            'home_create_ai_text',
            'Tell it what you need; it prepares the text, the image and the video and puts them on the calendar.'
          )}
        />
        <QuickAction
          href="/media"
          tone="green"
          icon={icons.media}
          title={t('home_media', 'Upload images and video')}
          text={t(
            'home_media_text',
            'Keep your photos and videos in the media library and use them in any post.'
          )}
        />
        <QuickAction
          href="/launches"
          tone="amber"
          icon={icons.calendar}
          title={t('home_plan_month', 'Plan the month')}
          text={t(
            'home_plan_month_text',
            'Open the calendar, place the posts and see special days already marked.'
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
        <div className="flex flex-col gap-[14px]">
          <Card
            title={t('home_upcoming', 'Coming up in the next 7 days')}
            action={{ label: t('home_open_calendar', 'Open calendar'), href: '/launches' }}
          >
            {!posts?.length ? (
              <Empty>
                {t('home_upcoming_empty', 'Nothing is scheduled for the next 7 days.')}
              </Empty>
            ) : (
              <ul className="flex flex-col gap-[10px]">
                {posts.slice(0, 5).map((post, index) => (
                  <li key={post.id + index} className="flex items-center gap-[12px]">
                    <DateTile date={post.publishDate} language={language} />
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span className="text-[14px] font-[600] truncate">
                        {plainText(post.content) ||
                          t('home_post_no_text', 'Post without text')}
                      </span>
                      <span className="text-[12px] text-textItemBlur truncate">
                        {time(post.publishDate)}
                        {post.integration?.name ? ` · ${post.integration.name}` : ''}
                      </span>
                    </span>
                    <span
                      className={clsx(
                        'text-[11px] font-[700] px-[8px] py-[4px] rounded-full whitespace-nowrap',
                        post.state === 'DRAFT' ? tones.amber : tones.green
                      )}
                    >
                      {post.state === 'DRAFT'
                        ? t('draft', 'Draft')
                        : t('home_scheduled', 'Scheduled')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title={t('home_published', 'Recently published and engagement')}
            action={{ label: t('home_open_analytics', 'Analytics'), href: '/analytics' }}
          >
            {!published?.length ? (
              <Empty>
                {t(
                  'home_published_empty',
                  'Published posts appear here; you can open the likes, comments and reach of each one.'
                )}
              </Empty>
            ) : (
              <ul className="flex flex-col gap-[10px]">
                {published.slice(0, 5).map((post, index) => (
                  <li key={post.id + index} className="flex items-center gap-[12px]">
                    <DateTile date={post.publishDate} language={language} />
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span className="text-[14px] font-[600] truncate">
                        {plainText(post.content) ||
                          t('home_post_no_text', 'Post without text')}
                      </span>
                      <span className="text-[12px] text-textItemBlur truncate">
                        {post.integration?.name || ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={openStatistics(post.id)}
                      className="h-[32px] px-[10px] rounded-[9px] border border-newTableBorder text-[12px] font-[600] flex items-center gap-[6px] whitespace-nowrap cursor-pointer hover:bg-boxHover"
                    >
                      {icons.chart}
                      {t('home_engagement', 'Engagement')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-[14px]">
          {!business && (
            <Card title={t('home_feedback', 'From your clients')}>
              {!activity?.length ? (
                <Empty>
                  {t(
                    'home_feedback_empty',
                    'Approvals and notes from your clients appear here.'
                  )}
                </Empty>
              ) : (
                <ul className="flex flex-col gap-[12px]">
                  {activity.slice(0, 5).map((item) => (
                    <li key={item.id} className="flex items-start gap-[12px]">
                      <span
                        className={clsx(
                          'w-[36px] h-[36px] rounded-full flex items-center justify-center text-[13px] font-[700] shrink-0',
                          item.status === 'APPROVED' ? tones.green : tones.amber
                        )}
                      >
                        {(item.reviewerName || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <span className="flex-1 min-w-0 flex flex-col gap-[2px]">
                        <span className="text-[14px]">
                          <span className="font-[700]">{item.reviewerName}</span>{' '}
                          {item.status === 'APPROVED'
                            ? t('home_feedback_approved', 'approved a post')
                            : t('home_feedback_changes', 'requested a change')}
                          <span className="text-textItemBlur">
                            {' '}
                            · {shortDate(item.createdAt)}
                          </span>
                        </span>
                        {!!item.note && (
                          <span className="text-[13px] bg-[#FFF3D9] text-[#6B4300] rounded-[10px] px-[10px] py-[6px]">
                            “{item.note}”
                          </span>
                        )}
                        <span className="text-[12px] text-textItemBlur truncate">
                          {item.text}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {!business && !!waitingPlans.length && (
            <Card
              title={t('home_approvals', 'Waiting for client approval')}
              action={{ label: t('home_open_plans', 'Open plans'), href: '/launches' }}
            >
              <ul className="flex flex-col gap-[12px]">
                {waitingPlans.slice(0, 4).map((plan) => (
                  <li key={plan.id} className="flex flex-col gap-[6px]">
                    <span className="flex items-center justify-between gap-[12px] text-[14px]">
                      <span className="font-[600] truncate">
                        {plan.customerName ||
                          t('approval_plan_all_channels', 'All channels')}
                      </span>
                      <span className="text-[12px] text-textItemBlur whitespace-nowrap">
                        {t(
                          'sent_plans_progress',
                          '{{approved}} of {{total}} approved',
                          { approved: plan.approved, total: plan.total }
                        )}
                      </span>
                    </span>
                    <span className="flex h-[7px] rounded-full overflow-hidden bg-[#EEEAE1]">
                      <span
                        className="bg-[#12B76A]"
                        style={{
                          width: plan.total
                            ? `${(plan.approved / plan.total) * 100}%`
                            : '0%',
                        }}
                      />
                      <span
                        className="bg-[#F5A524]"
                        style={{
                          width: plan.total
                            ? `${(plan.changes / plan.total) * 100}%`
                            : '0%',
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title={t('home_special_days', 'Upcoming special days')}>
            {!days.length ? (
              <Empty>
                {t('home_special_days_empty', 'No special day in the coming weeks.')}
              </Empty>
            ) : (
              <ul className="flex flex-col gap-[10px]">
                {days.map((day) => (
                  <li key={day.date + day.name} className="flex items-center gap-[12px]">
                    <DateTile date={`${day.date}T12:00:00`} language={language} />
                    <span className="flex-1 min-w-0 text-[14px] font-[600] truncate">
                      {day.name}
                    </span>
                    <Link
                      href={`/launches?new=1&date=${day.date}&text=${encodeURIComponent(
                        day.draft
                      )}`}
                      className="h-[32px] px-[10px] rounded-[9px] bg-[#14172B] text-white text-[12px] font-[600] flex items-center whitespace-nowrap hover:opacity-90"
                    >
                      {t('home_special_day_draft', 'Prepare draft')}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
