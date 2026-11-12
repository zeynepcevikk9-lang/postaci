'use client';

// Postacı: müşteri onayı. Önizleme sayfasında müşterinin gönderiyi onayladığı
// ya da değişiklik istediği bölüm. Giriş gerektirmez; önizleme yorumlarıyla aynı
// erişim kuralı geçerlidir.

import { FC, useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// Yorumlardaki adla aynı anahtar: müşteri adını bir kez yazar.
const REVIEWER_NAME_KEY = 'preview-reviewer-name';

type Decision = 'APPROVED' | 'CHANGES_REQUESTED';

interface ApprovalRow {
  id: string;
  status: Decision;
  reviewerName: string;
  note: string | null;
  createdAt: string;
}

interface ApprovalResponse {
  status: Decision | 'PENDING';
  current: ApprovalRow | null;
  history: ApprovalRow[];
}

const useApproval = (previewId: string) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch(`/public/posts/${previewId}/approval`)).json();
  }, [previewId]);
  return useSWR<ApprovalResponse>(
    `/public/posts/${previewId}/approval`,
    load
  );
};

const inputClass =
  'w-full bg-newBgColor border border-newTableBorder rounded-[8px] px-[12px] text-[14px] text-newTextColor outline-none focus:border-[#3D4FE0]';

export const ApprovalClient: FC<{ previewId: string }> = ({ previewId }) => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const { data, mutate, isLoading } = useApproval(previewId);

  const [mode, setMode] = useState<Decision | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem(REVIEWER_NAME_KEY) || '');
  }, []);

  const submit = useCallback(async () => {
    if (!mode) {
      return;
    }
    const reviewerName = name.trim();
    const trimmedNote = note.trim();
    if (!reviewerName) {
      toast.show(
        t('approval_name_required', 'Please enter your name'),
        'warning'
      );
      return;
    }
    if (mode === 'CHANGES_REQUESTED' && !trimmedNote) {
      toast.show(
        t('approval_note_required', 'Please describe the change you want'),
        'warning'
      );
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/public/posts/${previewId}/approval`, {
        method: 'POST',
        body: JSON.stringify({
          status: mode,
          reviewerName,
          ...(trimmedNote ? { note: trimmedNote } : {}),
        }),
      });
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      localStorage.setItem(REVIEWER_NAME_KEY, reviewerName);
      setMode(null);
      setNote('');
      await mutate();
      toast.show(
        mode === 'APPROVED'
          ? t('approval_saved_approved', 'Thank you, your approval is saved')
          : t('approval_saved_changes', 'Thank you, your request is sent'),
        'success'
      );
    } catch (err) {
      toast.show(
        t('approval_failed', 'Your answer could not be saved, please try again'),
        'warning'
      );
    } finally {
      setSaving(false);
    }
  }, [mode, name, note, previewId]);

  if (isLoading || !data) {
    return null;
  }

  const current = data.current;
  const approved = data.status === 'APPROVED';
  const changes = data.status === 'CHANGES_REQUESTED';

  return (
    <div
      className={clsx(
        'bg-newBgColorInner rounded-[12px] px-[20px] py-[16px] flex flex-col gap-[14px] border',
        approved
          ? 'border-[#17915C]'
          : changes
          ? 'border-[#D98A00]'
          : 'border-newTableBorder'
      )}
    >
      <div className="flex items-center gap-[12px] flex-wrap">
        <span
          className={clsx(
            'text-[12px] font-[700] px-[10px] py-[4px] rounded-full whitespace-nowrap',
            approved
              ? 'bg-[#17915C]/15 text-[#17915C]'
              : changes
              ? 'bg-[#D98A00]/15 text-[#D98A00]'
              : 'bg-btnSimple text-newTextColor'
          )}
        >
          {approved
            ? t('approval_status_approved', 'Approved')
            : changes
            ? t('approval_status_changes', 'Changes requested')
            : t('approval_status_pending', 'Waiting for approval')}
        </span>

        <div className="flex-1 min-w-[180px] text-[14px]">
          {current ? (
            <span className="text-textItemBlur">
              <span className="text-newTextColor font-[600]">
                {current.reviewerName}
              </span>
              {' · '}
              {dayjs(current.createdAt).format('DD.MM.YYYY HH:mm')}
            </span>
          ) : (
            <span className="text-textItemBlur">
              {t(
                'approval_pending_hint',
                'Review the post below, then approve it or request a change.'
              )}
            </span>
          )}
        </div>

        {!mode && (
          <div className="flex gap-[8px] flex-wrap">
            {!approved && (
              <Button
                className="!bg-[#17915C] rounded-[8px]"
                onClick={() => setMode('APPROVED')}
              >
                {t('approval_approve', 'Approve')}
              </Button>
            )}
            <Button
              secondary={true}
              className="rounded-[8px] border border-newTableBorder"
              onClick={() => setMode('CHANGES_REQUESTED')}
            >
              {t('approval_request_changes', 'Request a change')}
            </Button>
          </div>
        )}
      </div>

      {changes && current?.note && !mode && (
        <div className="text-[14px] whitespace-pre-wrap bg-newBgColor rounded-[8px] px-[14px] py-[10px]">
          {current.note}
        </div>
      )}

      {!!mode && (
        <div className="flex flex-col gap-[10px] max-w-[560px]">
          <div className="text-[14px] font-[600]">
            {mode === 'APPROVED'
              ? t('approval_confirm_approve', 'Approve this post')
              : t('approval_confirm_changes', 'What should be changed?')}
          </div>
          <input
            className={clsx(inputClass, 'h-[42px]')}
            placeholder={t('preview_comment_your_name', 'Your name')}
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
          {mode === 'CHANGES_REQUESTED' && (
            <textarea
              className={clsx(inputClass, 'py-[10px] min-h-[96px]')}
              placeholder={t(
                'approval_note_placeholder',
                'Write what you would like to change...'
              )}
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
          <div className="flex gap-[8px]">
            <Button
              className={clsx(
                'rounded-[8px]',
                mode === 'APPROVED' && '!bg-[#17915C]'
              )}
              loading={saving}
              onClick={submit}
            >
              {mode === 'APPROVED'
                ? t('approval_approve', 'Approve')
                : t('approval_send_request', 'Send request')}
            </Button>
            <Button
              secondary={true}
              className="rounded-[8px] border border-newTableBorder"
              onClick={() => setMode(null)}
            >
              {t('cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
