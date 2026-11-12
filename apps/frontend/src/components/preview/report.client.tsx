'use client';

// Postacı: aylık raporun içeriği. Veriler rapor oluşturulurken sabitlenir; bu
// bileşen yalnızca gösterir ve yazdırma (PDF) düğmesini sunar.

import { FC, useEffect, useMemo, useState } from 'react';
import i18next from '@gitroom/react/translation/i18next';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface ReportChannel {
  id: string;
  name: string;
  picture: string | null;
  providerIdentifier: string;
  profile: string | null;
  published: number;
  metrics: { label: string; total: number }[];
}

interface ReportPost {
  publishDate: string;
  text: string;
  channels: { name: string; providerIdentifier: string; url: string | null }[];
}

export interface ReportResponse {
  id: string;
  customerName: string | null;
  from: string;
  to: string;
  generatedAt: string;
  totals: {
    posts: number;
    publications: number;
    channels: number;
    approved: number;
    changes: number;
  };
  channels: ReportChannel[];
  posts: ReportPost[];
}

const platform = (identifier: string) => identifier.split('-')[0];

const Tile: FC<{ value: number | string; label: string }> = ({
  value,
  label,
}) => (
  <div className="bg-newBgColor rounded-[10px] px-[16px] py-[14px] print:border print:border-[#e4e8f2]">
    <div className="text-[28px] font-[800] leading-[1.1]">{value}</div>
    <div className="text-[13px] text-textItemBlur mt-[2px]">{label}</div>
  </div>
);

export const ReportClient: FC<{ report: ReportResponse }> = ({ report }) => {
  const t = useT();
  // Tarihler ziyaretçinin saat dilimine göre yazılır; yalnızca tarayıcıda çizilir.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const language = i18next.resolvedLanguage || 'tr';
  const number = useMemo(() => new Intl.NumberFormat(language), [language]);

  if (!mounted) {
    return null;
  }

  const date = (value: string, withTime = false) =>
    new Date(value).toLocaleString(language, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
  const shortDate = (value: string) =>
    new Date(value).toLocaleDateString(language, {
      day: 'numeric',
      month: 'short',
    });

  return (
    <>
      <div className="bg-newBgColorInner rounded-[12px] px-[20px] py-[18px] flex flex-col gap-[16px] print:px-0">
        <div className="flex items-start gap-[12px] flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-[22px] font-[700] leading-[1.2]">
              {report.customerName
                ? `${report.customerName} · ${t(
                    'report_title',
                    'Social media report'
                  )}`
                : t('report_title', 'Social media report')}
            </h1>
            <div className="text-[14px] text-textItemBlur mt-[4px]">
              {date(report.from)} – {date(report.to)}
            </div>
          </div>
          <Button
            className="rounded-[8px] print:hidden"
            onClick={() => window.print()}
          >
            {t('report_save_pdf', 'Save as PDF')}
          </Button>
        </div>

        <div className="grid grid-cols-4 mobile:grid-cols-2 gap-[10px]">
          <Tile
            value={number.format(report.totals.posts)}
            label={t('report_total_posts', 'Posts published')}
          />
          <Tile
            value={number.format(report.totals.channels)}
            label={t('report_total_channels', 'Channels')}
          />
          <Tile
            value={number.format(report.totals.publications)}
            label={t('report_total_publications', 'Total publications')}
          />
          <Tile
            value={number.format(report.totals.approved)}
            label={t('report_total_approved', 'Client approvals')}
          />
        </div>
      </div>

      {!report.posts.length && (
        <div className="bg-newBgColorInner rounded-[12px] px-[20px] py-[40px] text-center text-textItemBlur">
          {t('report_empty', 'No posts were published in this period.')}
        </div>
      )}

      {!!report.channels.length && (
        <div className="bg-newBgColorInner rounded-[12px] px-[20px] py-[18px] flex flex-col gap-[12px] print:px-0">
          <h2 className="text-[16px] font-[700]">
            {t('report_channels', 'Channels')}
          </h2>
          {report.channels.map((channel) => (
            <div
              key={channel.id}
              className="flex flex-col gap-[8px] border-t border-newTableBorder pt-[12px] first:border-t-0 first:pt-0"
            >
              <div className="flex items-center gap-[10px] flex-wrap">
                <img
                  className="w-[32px] h-[32px] rounded-full bg-btnSimple"
                  alt=""
                  src={channel.picture || '/no-picture.jpg'}
                />
                <div className="flex-1 min-w-[140px]">
                  <div className="text-[14px] font-[600]">{channel.name}</div>
                  <div className="text-[13px] text-textItemBlur">
                    <span className="capitalize">
                      {platform(channel.providerIdentifier)}
                    </span>
                    {channel.profile ? ` · @${channel.profile}` : ''}
                  </div>
                </div>
                <div className="text-[14px]">
                  <span className="font-[700]">
                    {number.format(channel.published)}
                  </span>{' '}
                  {t('report_channel_published', 'posts')}
                </div>
              </div>
              {!!channel.metrics.length && (
                <div className="flex gap-[8px] flex-wrap">
                  {channel.metrics.map((metric) => (
                    <span
                      key={metric.label}
                      className="text-[13px] bg-newBgColor rounded-full px-[12px] py-[4px] print:border print:border-[#e4e8f2]"
                    >
                      {metric.label}:{' '}
                      <span className="font-[700]">
                        {number.format(metric.total)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {report.channels.some((c) => c.metrics.length) && (
            <div className="text-[12px] text-textItemBlur">
              {t(
                'report_metrics_note',
                'Channel figures cover the 30 days before the report was created.'
              )}
            </div>
          )}
        </div>
      )}

      {!!report.posts.length && (
        <div className="bg-newBgColorInner rounded-[12px] px-[20px] py-[18px] flex flex-col gap-[10px] print:px-0">
          <h2 className="text-[16px] font-[700]">
            {t('report_posts', 'Published posts')}
          </h2>
          {report.posts.map((post, index) => (
            <div
              key={index}
              className="flex gap-[14px] border-t border-newTableBorder pt-[10px] first:border-t-0 break-inside-avoid"
            >
              <div className="w-[64px] shrink-0 text-[13px] font-[700]">
                {shortDate(post.publishDate)}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-[6px]">
                <div className="text-[14px] whitespace-pre-wrap break-words">
                  {post.text}
                </div>
                <div className="flex gap-[6px] flex-wrap">
                  {post.channels.map((channel, i) =>
                    channel.url ? (
                      <a
                        key={i}
                        className="text-[12px] capitalize underline text-[#3D4FE0]"
                        href={channel.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {platform(channel.providerIdentifier)}
                      </a>
                    ) : (
                      <span
                        key={i}
                        className="text-[12px] capitalize text-textItemBlur"
                      >
                        {platform(channel.providerIdentifier)}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-[12px] text-textItemBlur px-[6px] pb-[20px]">
        {t('report_generated_at', 'Report created on')}{' '}
        {date(report.generatedAt, true)}
      </div>
    </>
  );
};
