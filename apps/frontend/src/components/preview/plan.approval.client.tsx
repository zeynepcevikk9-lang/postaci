'use client';

// Postacı: toplu onay planı. Müşteri bir dönemin bütün gönderilerini tek sayfada
// görür; hepsini birden onaylar ya da tek tek onaylayıp değişiklik ister.

import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import i18next from '@gitroom/react/translation/i18next';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// Yorumlardaki ve tek gönderi onayındaki adla aynı anahtar.
const REVIEWER_NAME_KEY = 'preview-reviewer-name';

type Status = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';

interface PlanItem {
  group: string;
  previewId: string;
  publishDate: string;
  text: string;
  images: string[];
  channels: {
    id: string;
    name: string;
    picture: string | null;
    providerIdentifier: string;
    profile: string | null;
  }[];
  status: Status;
  current: {
    status: Status;
    reviewerName: string;
    note: string | null;
    createdAt: string;
  } | null;
}

export interface ApprovalPlanResponse {
  id: string;
  customerName: string | null;
  from: string;
  to: string;
  items: PlanItem[];
}

const usePlan = (planId: string, initial: ApprovalPlanResponse) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch(`/public/plans/${planId}`)).json();
  }, [planId]);
  return useSWR<ApprovalPlanResponse>(`/public/plans/${planId}`, load, {
    fallbackData: initial,
  });
};

const inputClass =
  'w-full bg-newBgColor border border-newTableBorder rounded-[8px] px-[12px] text-[14px] text-newTextColor outline-none focus:border-[#3D4FE0]';

const isVideo = (path: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(path);

const StatusPill: FC<{ status: Status }> = ({ status }) => {
  const t = useT();
  return (
    <span
      className={clsx(
        'text-[12px] font-[700] px-[10px] py-[4px] rounded-full whitespace-nowrap',
        status === 'APPROVED'
          ? 'bg-[#17915C]/15 text-[#17915C]'
          : status === 'CHANGES_REQUESTED'
          ? 'bg-[#D98A00]/15 text-[#D98A00]'
          : 'bg-btnSimple text-newTextColor'
      )}
    >
      {status === 'APPROVED'
        ? t('approval_status_approved', 'Approved')
        : status === 'CHANGES_REQUESTED'
        ? t('approval_status_changes', 'Changes requested')
        : t('approval_status_pending', 'Waiting for approval')}
    </span>
  );
};

export const PlanApprovalClient: FC<{
  planId: string;
  initial: ApprovalPlanResponse;
}> = ({ planId, initial }) => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const { data, mutate } = usePlan(planId, initial);
  const plan = data || initial;

  const [name, setName] = useState('');
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  // Tarihler ziyaretçinin saat dilimine göre yazılır; sunucudaki saat dilimi farklı
  // olabileceği için liste yalnızca tarayıcıda çizilir.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem(REVIEWER_NAME_KEY) || '');
    setMounted(true);
  }, []);

  const language = i18next.resolvedLanguage || 'tr';
  const dayLabel = useCallback(
    (date: string) =>
      new Date(date).toLocaleDateString(language, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [language]
  );
  const timeLabel = useCallback(
    (date: string) =>
      new Date(date).toLocaleTimeString(language, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [language]
  );
  const rangeLabel = useMemo(() => {
    const format = (date: string) =>
      new Date(date).toLocaleDateString(language, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    return `${format(plan.from)} – ${format(plan.to)}`;
  }, [plan.from, plan.to, language]);

  const counts = useMemo(
    () => ({
      total: plan.items.length,
      approved: plan.items.filter((i) => i.status === 'APPROVED').length,
      changes: plan.items.filter((i) => i.status === 'CHANGES_REQUESTED')
        .length,
      pending: plan.items.filter((i) => i.status === 'PENDING').length,
    }),
    [plan.items]
  );

  // Günlere göre grupla; sunucu tarihe göre sıralı gönderir.
  const days = useMemo(() => {
    const map = new Map<string, PlanItem[]>();
    for (const item of plan.items) {
      const key = dayLabel(item.publishDate);
      map.set(key, [...(map.get(key) || []), item]);
    }
    return [...map.entries()];
  }, [plan.items, dayLabel]);

  const requireName = useCallback(() => {
    const reviewerName = name.trim();
    if (!reviewerName) {
      toast.show(
        t('approval_name_required', 'Please enter your name'),
        'warning'
      );
      document.getElementById('plan-reviewer-name')?.focus();
      return null;
    }
    localStorage.setItem(REVIEWER_NAME_KEY, reviewerName);
    return reviewerName;
  }, [name]);

  const send = useCallback(
    async (key: string, path: string, body: object, done: string) => {
      setSaving(key);
      try {
        const response = await fetch(`/public/plans/${planId}/${path}`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new Error(String(response.status));
        }
        await mutate();
        toast.show(done, 'success');
        return true;
      } catch (err) {
        toast.show(
          t(
            'approval_failed',
            'Your answer could not be saved, please try again'
          ),
          'warning'
        );
        return false;
      } finally {
        setSaving(null);
      }
    },
    [planId]
  );

  const approveAll = useCallback(async () => {
    const reviewerName = requireName();
    if (!reviewerName) {
      return;
    }
    await send(
      'all',
      'approve-all',
      { reviewerName },
      t('approval_saved_approved', 'Thank you, your approval is saved')
    );
  }, [requireName, send]);

  const approveOne = useCallback(
    async (group: string) => {
      const reviewerName = requireName();
      if (!reviewerName) {
        return;
      }
      await send(
        group,
        'decision',
        { group, status: 'APPROVED', reviewerName },
        t('approval_saved_approved', 'Thank you, your approval is saved')
      );
    },
    [requireName, send]
  );

  const requestChange = useCallback(
    async (group: string) => {
      const reviewerName = requireName();
      if (!reviewerName) {
        return;
      }
      const trimmed = note.trim();
      if (!trimmed) {
        toast.show(
          t('approval_note_required', 'Please describe the change you want'),
          'warning'
        );
        return;
      }
      const ok = await send(
        group,
        'decision',
        { group, status: 'CHANGES_REQUESTED', reviewerName, note: trimmed },
        t('approval_saved_changes', 'Thank you, your request is sent')
      );
      if (ok) {
        setNoteFor(null);
        setNote('');
      }
    },
    [requireName, send, note]
  );

  if (!mounted) {
    return null;
  }

  return (
    <>
      <div className="bg-newBgColorInner rounded-[12px] px-[20px] py-[18px] flex flex-col gap-[14px]">
        <div>
          <h1 className="text-[22px] font-[700] leading-[1.2]">
            {plan.customerName
              ? `${plan.customerName} · ${t(
                  'approval_plan_title',
                  'Content plan'
                )}`
              : t('approval_plan_title', 'Content plan')}
          </h1>
          <div className="text-[14px] text-textItemBlur mt-[4px]">
            {rangeLabel}
          </div>
        </div>

        <div className="flex gap-[8px] flex-wrap text-[13px]">
          <span className="px-[10px] py-[4px] rounded-full bg-btnSimple">
            {counts.total} {t('approval_plan_posts', 'posts')}
          </span>
          <span className="px-[10px] py-[4px] rounded-full bg-[#17915C]/15 text-[#17915C] font-[600]">
            {counts.approved} {t('approval_plan_approved', 'approved')}
          </span>
          {!!counts.changes && (
            <span className="px-[10px] py-[4px] rounded-full bg-[#D98A00]/15 text-[#D98A00] font-[600]">
              {counts.changes} {t('approval_plan_changes', 'to be changed')}
            </span>
          )}
          {!!counts.pending && (
            <span className="px-[10px] py-[4px] rounded-full bg-btnSimple">
              {counts.pending} {t('approval_plan_pending', 'waiting')}
            </span>
          )}
        </div>

        {!!plan.items.length && (
          <div className="flex gap-[8px] flex-wrap items-center">
            <input
              id="plan-reviewer-name"
              className={clsx(inputClass, 'h-[42px] max-w-[260px]')}
              placeholder={t('preview_comment_your_name', 'Your name')}
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
            {!!counts.pending && (
              <Button
                className="!bg-[#17915C] rounded-[8px]"
                loading={saving === 'all'}
                onClick={approveAll}
              >
                {t('approval_plan_approve_all', 'Approve all')} (
                {counts.pending})
              </Button>
            )}
          </div>
        )}
      </div>

      {!plan.items.length && (
        <div className="bg-newBgColorInner rounded-[12px] px-[20px] py-[40px] text-center text-textItemBlur">
          {t(
            'approval_plan_empty',
            'There are no posts waiting in this period yet.'
          )}
        </div>
      )}

      {days.map(([day, items]) => (
        <div key={day} className="flex flex-col gap-[8px]">
          <div className="text-[13px] font-[700] uppercase tracking-[0.06em] text-textItemBlur px-[6px] pt-[10px]">
            {day}
          </div>
          {items.map((item) => (
            <div
              key={item.group}
              className={clsx(
                'bg-newBgColorInner rounded-[12px] p-[18px] flex flex-col gap-[12px] border',
                item.status === 'APPROVED'
                  ? 'border-[#17915C]'
                  : item.status === 'CHANGES_REQUESTED'
                  ? 'border-[#D98A00]'
                  : 'border-newTableBorder'
              )}
            >
              <div className="flex items-center gap-[10px] flex-wrap">
                <span className="text-[14px] font-[700]">
                  {timeLabel(item.publishDate)}
                </span>
                <div className="flex items-center gap-[8px] flex-wrap flex-1 min-w-[140px]">
                  {item.channels.map((channel) => (
                    <span
                      key={channel.id}
                      className="flex items-center gap-[6px] text-[13px] bg-newBgColor rounded-full ps-[3px] pe-[10px] py-[3px]"
                    >
                      <img
                        className="w-[22px] h-[22px] rounded-full bg-btnSimple"
                        alt=""
                        src={channel.picture || '/no-picture.jpg'}
                      />
                      {channel.name}
                      <span className="text-textItemBlur capitalize">
                        {channel.providerIdentifier.split('-')[0]}
                      </span>
                    </span>
                  ))}
                </div>
                <StatusPill status={item.status} />
              </div>

              {!!item.text && (
                <div className="text-[15px] whitespace-pre-wrap break-words">
                  {item.text}
                </div>
              )}

              {!!item.images.length && (
                <div className="flex gap-[8px] flex-wrap">
                  {item.images.map((path) =>
                    isVideo(path) ? (
                      <div
                        key={path}
                        className="w-[120px] h-[120px] rounded-[10px] bg-newBgColor flex items-center justify-center text-[13px] text-textItemBlur"
                      >
                        {t('approval_plan_video', 'Video')}
                      </div>
                    ) : (
                      <img
                        key={path}
                        className="w-[120px] h-[120px] rounded-[10px] object-cover bg-newBgColor"
                        alt=""
                        src={path}
                      />
                    )
                  )}
                </div>
              )}

              {item.status === 'CHANGES_REQUESTED' && item.current?.note && (
                <div className="text-[14px] whitespace-pre-wrap bg-newBgColor rounded-[8px] px-[14px] py-[10px]">
                  <span className="font-[600]">
                    {item.current.reviewerName}:
                  </span>{' '}
                  {item.current.note}
                </div>
              )}

              {noteFor === item.group ? (
                <div className="flex flex-col gap-[8px] max-w-[560px]">
                  <textarea
                    className={clsx(inputClass, 'py-[10px] min-h-[88px]')}
                    placeholder={t(
                      'approval_note_placeholder',
                      'Write what you would like to change...'
                    )}
                    value={note}
                    maxLength={2000}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="flex gap-[8px]">
                    <Button
                      className="rounded-[8px]"
                      loading={saving === item.group}
                      onClick={() => requestChange(item.group)}
                    >
                      {t('approval_send_request', 'Send request')}
                    </Button>
                    <Button
                      secondary={true}
                      className="rounded-[8px] border border-newTableBorder"
                      onClick={() => {
                        setNoteFor(null);
                        setNote('');
                      }}
                    >
                      {t('cancel', 'Cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-[8px] flex-wrap items-center">
                  {item.status !== 'APPROVED' && (
                    <Button
                      className="!bg-[#17915C] rounded-[8px]"
                      loading={saving === item.group}
                      onClick={() => approveOne(item.group)}
                    >
                      {t('approval_approve', 'Approve')}
                    </Button>
                  )}
                  <Button
                    secondary={true}
                    className="rounded-[8px] border border-newTableBorder"
                    onClick={() => {
                      setNoteFor(item.group);
                      setNote('');
                    }}
                  >
                    {t('approval_request_changes', 'Request a change')}
                  </Button>
                  <a
                    className="text-[13px] underline text-textItemBlur ms-[4px]"
                    href={`/p/${item.previewId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('approval_plan_details', 'Open full preview')}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
};
