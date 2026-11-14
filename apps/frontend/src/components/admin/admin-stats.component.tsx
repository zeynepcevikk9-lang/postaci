'use client';

import React, { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Button } from '@gitroom/react/form/button';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

interface PerSocial {
  provider: string;
  count: number;
}

interface StatsBlock {
  total: number;
  perSocial: PerSocial[];
}

interface StatsResponse {
  from: string;
  to: string;
  errors: StatsBlock;
  posts: StatsBlock;
  connected: StatsBlock;
  publishingAccounts?: StatsBlock;
  scheduledAccounts?: StatsBlock;
  publishingChannels?: StatsBlock;
  scheduledChannels?: StatsBlock;
  activeOrgsBySource?: StatsBlock;
  connectedClients?: StatsBlock;
}

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);

const startOfWeek = () => {
  const d = new Date();
  // ISO week: Monday = 0
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
};

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const PRESETS: { label: string; range: () => { from: string; to: string } }[] = [
  { label: 'Bugün', range: () => ({ from: today(), to: today() }) },
  { label: 'Bu hafta', range: () => ({ from: startOfWeek(), to: today() }) },
  { label: 'Bu ay', range: () => ({ from: startOfMonth(), to: today() }) },
  { label: 'Son 7 gün', range: () => ({ from: isoDaysAgo(7), to: today() }) },
  { label: 'Son 30 gün', range: () => ({ from: isoDaysAgo(30), to: today() }) },
];

const useStats = (params: {
  from: string;
  to: string;
  unknownOnly: boolean;
}) => {
  const fetch = useFetch();
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    ...(params.unknownOnly ? { unknownOnly: 'true' } : {}),
  });
  const key = `/admin/stats?${query.toString()}`;
  return useSWR<StatsResponse>(
    key,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to load stats');
      }
      return res.json();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
};

const SummaryCard: FC<{ label: string; value: number }> = ({
  label,
  value,
}) => (
  <div className="border border-newTableBorder rounded-[8px] p-[16px] bg-newBgColorInner">
    <div className="text-[12px] opacity-70">{label}</div>
    <div className="text-[28px] font-[600]">{value.toLocaleString()}</div>
  </div>
);

const PerSocialTable: FC<{ title: string; block: StatsBlock }> = ({
  title,
  block,
}) => (
  <div className="border border-newTableBorder rounded-[8px] overflow-hidden">
    <div className="grid grid-cols-[1fr_120px] gap-[12px] px-[12px] py-[10px] bg-newBgColorInner text-[12px] uppercase opacity-70 border-b border-newTableBorder">
      <div>{title}</div>
      <div className="text-right">Sayı</div>
    </div>
    {block.perSocial.length === 0 ? (
      <div className="px-[12px] py-[10px] text-[13px] opacity-70">
        Bu dönem için veri yok.
      </div>
    ) : (
      block.perSocial.map((row) => (
        <div
          key={row.provider}
          className="grid grid-cols-[1fr_120px] gap-[12px] px-[12px] py-[10px] text-[13px] border-b border-newTableBorder last:border-b-0"
        >
          <div className="capitalize">{row.provider}</div>
          <div className="text-right">{row.count.toLocaleString()}</div>
        </div>
      ))
    )}
  </div>
);

export const AdminStatsComponent: FC = () => {
  const user = useUser();

  const [fromInput, setFromInput] = useState(today());
  const [toInput, setToInput] = useState(today());
  const [range, setRange] = useState({ from: today(), to: today() });
  const [unknownOnly, setUnknownOnly] = useState(false);

  const { data, isLoading, error } = useStats({ ...range, unknownOnly });

  const applyRange = useCallback((next: { from: string; to: string }) => {
    setFromInput(next.from);
    setToInput(next.to);
    setRange(next);
  }, []);

  if (!user?.isSuperAdmin) {
    return (
      <div className="text-textColor p-[20px]">
        Bu sayfaya erişiminiz yok.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[16px] text-textColor">
      <div className="flex items-center justify-between">
        <div className="text-[20px] font-[600]">Yönetim: İstatistikler</div>
        {data && (
          <div className="text-[13px] opacity-70">
            {new Date(data.from).toLocaleDateString()} —{' '}
            {new Date(data.to).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-[8px]">
        {PRESETS.map((preset) => {
          const next = preset.range();
          const active = range.from === next.from && range.to === next.to;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyRange(next)}
              className={`h-[32px] px-[12px] rounded-[8px] text-[13px] border cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-forth text-white border-forth'
                  : 'bg-newBgColorInner text-textColor border-newTableBorder hover:bg-tableBorder'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-[12px] items-end bg-newBgColorInner border border-newTableBorder rounded-[8px] p-[12px]">
        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] opacity-70">Başlangıç</div>
          <input
            type="date"
            value={fromInput}
            max={toInput}
            onChange={(e) => setFromInput(e.target.value)}
            className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor"
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] opacity-70">Bitiş</div>
          <input
            type="date"
            value={toInput}
            min={fromInput}
            max={today()}
            onChange={(e) => setToInput(e.target.value)}
            className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor"
          />
        </div>
        <Button
          onClick={() => setRange({ from: fromInput, to: toInput })}
          disabled={!fromInput || !toInput || fromInput > toInput}
        >
          Uygula
        </Button>

        <label
          className="flex items-center gap-[6px] text-[13px] cursor-pointer h-[38px]"
          title='Only count errors whose message matches "message":"Unknown Error" (affects the error stats only)'
        >
          <input
            type="checkbox"
            checked={unknownOnly}
            onChange={(e) => setUnknownOnly(e.target.checked)}
          />
          Yalnızca bilinmeyen hatalar
        </label>
      </div>

      {isLoading ? (
        <LoadingComponent />
      ) : error || !data ? (
        <div className="text-red-400">İstatistikler yüklenemedi.</div>
      ) : (
        <div className="overflow-x-auto pb-[8px] scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor flex flex-col gap-[16px]">
          <div className="flex gap-[12px]">
            <div className="flex-1 min-w-[220px] shrink-0">
              <SummaryCard
                label="Yayımlanan toplam gönderi"
                value={data.posts.total}
              />
            </div>
            <div className="flex-1 min-w-[220px] shrink-0">
              <SummaryCard
                label="Bağlı toplam hesap"
                value={data.connected.total}
              />
            </div>
            <div className="flex-1 min-w-[220px] shrink-0">
              <SummaryCard
                label={unknownOnly ? 'Toplam bilinmeyen hata' : 'Toplam hata'}
                value={data.errors.total}
              />
            </div>
            {data.publishingChannels && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <SummaryCard
                  label="Yayın yapan tekil kanal (bütün platformlar)"
                  value={data.publishingChannels.total}
                />
              </div>
            )}
            {data.scheduledChannels && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <SummaryCard
                  label="Zamanlaması olan tekil kanal (bütün platformlar)"
                  value={data.scheduledChannels.total}
                />
              </div>
            )}
            {data.publishingAccounts && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <SummaryCard
                  label="Yayın yapan tekil kullanıcı (bütün platformlar)"
                  value={data.publishingAccounts.total}
                />
              </div>
            )}
            {data.scheduledAccounts && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <SummaryCard
                  label="Zamanlaması olan tekil kullanıcı (bütün platformlar)"
                  value={data.scheduledAccounts.total}
                />
              </div>
            )}
            {data.activeOrgsBySource && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <SummaryCard
                  label="Etkin tekil kullanıcı (bütün kaynaklar)"
                  value={data.activeOrgsBySource.total}
                />
              </div>
            )}
            {data.connectedClients && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <SummaryCard
                  label="Bağlı istemci (bütün istemciler)"
                  value={data.connectedClients.total}
                />
              </div>
            )}
          </div>

          <div className="flex gap-[12px] items-start">
            <div className="flex-1 min-w-[220px] shrink-0">
              <PerSocialTable
                title="Platforma göre yayımlanan gönderi"
                block={data.posts}
              />
            </div>
            <div className="flex-1 min-w-[220px] shrink-0">
              <PerSocialTable
                title="Platforma göre bağlı hesap"
                block={data.connected}
              />
            </div>
            <div className="flex-1 min-w-[220px] shrink-0">
              <PerSocialTable
                title={
                  unknownOnly
                    ? 'Platforma göre bilinmeyen hata'
                    : 'Platforma göre hata'
                }
                block={data.errors}
              />
            </div>
            {data.publishingChannels && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <PerSocialTable
                  title="Yayın yapan tekil kanallar"
                  block={data.publishingChannels}
                />
              </div>
            )}
            {data.scheduledChannels && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <PerSocialTable
                  title="Zamanlaması olan tekil kanallar"
                  block={data.scheduledChannels}
                />
              </div>
            )}
            {data.publishingAccounts && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <PerSocialTable
                  title="Yayın yapan tekil kullanıcılar"
                  block={data.publishingAccounts}
                />
              </div>
            )}
            {data.scheduledAccounts && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <PerSocialTable
                  title="Zamanlaması olan tekil kullanıcılar"
                  block={data.scheduledAccounts}
                />
              </div>
            )}
            {data.activeOrgsBySource && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <PerSocialTable
                  title="Kaynağa göre etkin kullanıcı"
                  block={data.activeOrgsBySource}
                />
              </div>
            )}
            {data.connectedClients && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <PerSocialTable
                  title="Ada göre bağlı istemci"
                  block={data.connectedClients}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
