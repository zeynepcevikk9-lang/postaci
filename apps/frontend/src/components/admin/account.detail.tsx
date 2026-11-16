'use client';

// Postacı: yönetimde hesap ayrıntı penceresi. Hesabın havale geçmişi ve yalnızca
// yöneticinin gördüğü notlar. Yalnızca süper yönetici açabilir (arka uç da denetler).

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import i18next from '@gitroom/react/translation/i18next';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

interface Transfer {
  id: string;
  billing: string;
  period: string;
  amount: number;
  code: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  createdAt: string;
  decidedAt: string | null;
}

interface Note {
  id: string;
  authorEmail: string;
  text: string;
  createdAt: string;
}

interface Detail {
  transfers: Transfer[];
  notes: Note[];
}

const useAccountDetail = (organizationId: string) => {
  const fetch = useFetch();
  const load = useCallback(async (): Promise<Detail> => {
    const response = await fetch(`/admin/customers/${organizationId}/detail`);
    if (!response.ok) {
      throw new Error('Failed to load account details');
    }
    return response.json();
  }, [organizationId]);
  return useSWR<Detail>(`admin-account-detail-${organizationId}`, load, {
    revalidateOnFocus: false,
  });
};

const dateTime = (value: string) =>
  new Date(value).toLocaleString(i18next.resolvedLanguage || 'tr', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const AccountDetailModal: FC<{
  organizationId: string;
  name: string;
  planName: (tier: string) => string;
}> = ({ organizationId, name, planName }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, error, isLoading, mutate } = useAccountDetail(organizationId);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const addNote = useCallback(async () => {
    if (!text.trim() || saving) {
      return;
    }
    setSaving(true);
    const response = await fetch(`/admin/customers/${organizationId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    setSaving(false);
    if (!response.ok) {
      toaster.show(t('admin_note_failed', 'The note could not be saved'), 'warning');
      return;
    }
    setText('');
    mutate();
  }, [text, saving, organizationId]);

  const removeNote = useCallback(
    (id: string) => async () => {
      if (
        !(await deleteDialog(
          t('admin_note_delete_question', 'Delete this note?'),
          t('admin_note_delete', 'Delete')
        ))
      ) {
        return;
      }
      const response = await fetch(
        `/admin/customers/${organizationId}/notes/${id}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        toaster.show(t('admin_note_failed', 'The note could not be saved'), 'warning');
        return;
      }
      mutate();
    },
    [organizationId]
  );

  const statusText = (status: string) =>
    status === 'APPROVED'
      ? t('admin_transfer_approved', 'Approved')
      : status === 'REJECTED'
      ? t('admin_transfer_rejected', 'Rejected')
      : status === 'SUPERSEDED'
      ? t('admin_transfer_superseded', 'Replaced by a newer notice')
      : t('admin_transfer_pending', 'Waiting');

  return (
    <div className="flex flex-col gap-[20px] text-textColor w-[min(640px,90vw)]">
      <div className="text-[18px] font-[600]">{name}</div>

      {isLoading ? (
        <LoadingComponent />
      ) : error || !data ? (
        <div className="text-red-400">
          {t('admin_detail_failed', 'The account details could not be loaded.')}
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-[8px]">
            <div className="text-[14px] font-[600]">
              {t('admin_transfer_history', 'Bank transfer history')}
            </div>
            {!data.transfers.length ? (
              <div className="text-[13px] opacity-70">
                {t('admin_transfer_empty', 'No bank transfer notices yet.')}
              </div>
            ) : (
              <ul className="flex flex-col border border-newTableBorder rounded-[8px] divide-y divide-newTableBorder">
                {data.transfers.map((transfer) => (
                  <li
                    key={transfer.id}
                    className="flex items-center justify-between gap-[12px] px-[12px] py-[10px] text-[13px]"
                  >
                    <div className="flex flex-col">
                      <span className="font-[600]">
                        {planName(transfer.billing)}{' '}
                        <span className="font-[400] opacity-70">
                          {transfer.period === 'YEARLY'
                            ? t('iyzico_yearly', 'Yearly')
                            : t('iyzico_monthly', 'Monthly')}
                        </span>
                      </span>
                      <span className="opacity-70">
                        {dateTime(transfer.createdAt)} · {transfer.code}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-[600]">
                        {new Intl.NumberFormat('tr-TR', {
                          style: 'currency',
                          currency: 'TRY',
                          maximumFractionDigits: 0,
                        }).format(transfer.amount)}
                      </span>
                      <span
                        className={clsx(
                          transfer.status === 'APPROVED' && 'text-[#12B76A]',
                          transfer.status === 'REJECTED' && 'text-[#F97066]',
                          transfer.status === 'PENDING' && 'text-[#B26A00]'
                        )}
                      >
                        {statusText(transfer.status)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-[8px]">
            <div className="text-[14px] font-[600]">
              {t('admin_notes', 'Admin notes')}
            </div>
            <div className="text-[12px] opacity-70">
              {t('admin_notes_hint', 'Only admins can see these notes.')}
            </div>
            <div className="flex flex-col gap-[8px]">
              <textarea
                value={text}
                maxLength={1000}
                onChange={(e) => setText(e.target.value)}
                placeholder={t(
                  'admin_note_placeholder',
                  'Add a note (for example: called, invoice sent)'
                )}
                className="min-h-[72px] bg-newBgColor border border-newTableBorder rounded-[8px] p-[10px] text-[14px] text-newTextColor outline-none"
              />
              <div className="flex justify-end">
                <Button onClick={addNote} disabled={!text.trim() || saving}>
                  {t('admin_note_add', 'Add note')}
                </Button>
              </div>
            </div>
            {!!data.notes.length && (
              <ul className="flex flex-col gap-[8px]">
                {data.notes.map((note) => (
                  <li
                    key={note.id}
                    className="bg-newBgColor border border-newTableBorder rounded-[8px] px-[12px] py-[10px] text-[13px]"
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {note.text}
                    </div>
                    <div className="flex items-center justify-between mt-[6px] text-[12px] opacity-70">
                      <span>
                        {note.authorEmail} · {dateTime(note.createdAt)}
                      </span>
                      <button
                        type="button"
                        onClick={removeNote(note.id)}
                        className="underline cursor-pointer"
                      >
                        {t('admin_note_delete', 'Delete')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};
