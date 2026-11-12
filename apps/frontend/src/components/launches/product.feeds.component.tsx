'use client';

// Postacı: e-ticaret bağlantısı. Takvim araç çubuğundaki "Mağaza" düğmesi ve
// penceresi. Mağazanın ürün XML adresi eklenir; mağazaya sonradan giren ürünler
// burada listelenir ve tek tıkla hazır metinli taslak gönderiye dönüşür.

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';

interface Feed {
  id: string;
  name: string;
  url: string;
  customerId: string | null;
  lastCheckedAt: string | null;
}

interface NewItem {
  id: string;
  feedId: string;
  feedName: string;
  title: string;
  price: string | null;
  image: string | null;
  link: string | null;
}

const fieldClass =
  'w-full h-[42px] bg-newBgColor border border-newTableBorder rounded-[8px] px-[12px] text-[14px] text-newTextColor outline-none';

const useFeeds = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/product-feeds')).json();
  }, []);
  return useSWR<Feed[]>('/product-feeds', load);
};

const useNewItems = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/product-feeds/new-items')).json();
  }, []);
  return useSWR<NewItem[]>('/product-feeds/new-items', load);
};

// Taslak gönderinin başlangıç metni; ajans düzenler.
const draftText = (item: NewItem) =>
  [
    `Yeni ürün: ${item.title}`,
    item.price ? `Fiyat: ${item.price}` : '',
    item.link || '',
  ]
    .filter(Boolean)
    .join('\n');

const ProductFeedsModal: FC<{
  integrations: any[];
  reloadCalendarView: () => void;
}> = ({ integrations, reloadCalendarView }) => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const modal = useModals();
  const { data: feeds, mutate: mutateFeeds } = useFeeds();
  const { data: items, mutate: mutateItems } = useNewItems();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const addFeed = useCallback(async () => {
    if (!name.trim() || !url.trim()) {
      toast.show(
        t('feeds_fill_fields', 'Enter a store name and the product XML address'),
        'warning'
      );
      return;
    }
    setBusy('add');
    try {
      const response = await fetch('/product-feeds', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), url: url.trim() }),
      });
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      const created = await response.json();
      setName('');
      setUrl('');
      await mutateFeeds();
      toast.show(
        `${t('feeds_added', 'Store added, products found:')} ${
          created.products
        }`,
        'success'
      );
    } catch (err) {
      toast.show(
        t(
          'feeds_add_failed',
          'The address could not be read. It must be a public https address of a product XML.'
        ),
        'warning'
      );
    } finally {
      setBusy(null);
    }
  }, [name, url]);

  const syncFeed = useCallback(
    (id: string) => async () => {
      setBusy(id);
      try {
        const response = await fetch(`/product-feeds/${id}/sync`, {
          method: 'POST',
        });
        if (!response.ok) {
          throw new Error(String(response.status));
        }
        const { added } = await response.json();
        await Promise.all([mutateFeeds(), mutateItems()]);
        toast.show(
          `${t('feeds_synced', 'Store checked, new products:')} ${added}`,
          'success'
        );
      } catch (err) {
        toast.show(
          t('feeds_sync_failed', 'The store could not be read'),
          'warning'
        );
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const removeFeed = useCallback(
    (id: string) => async () => {
      setBusy(id);
      try {
        await fetch(`/product-feeds/${id}`, { method: 'DELETE' });
        await Promise.all([mutateFeeds(), mutateItems()]);
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const dismiss = useCallback(async (id: string) => {
    await fetch(`/product-feeds/items/${id}/dismiss`, { method: 'POST' });
    await mutateItems();
  }, []);

  const createDraft = useCallback(
    (item: NewItem) => async () => {
      // Ürün görseli medya kütüphanesine alınır ve taslağa eklenir; alınamazsa
      // taslak görselsiz açılır.
      let image: { id: string; path: string }[] = [];
      if (item.image) {
        setBusy('draft-' + item.id);
        try {
          const response = await fetch(
            `/product-feeds/items/${item.id}/image`,
            { method: 'POST' }
          );
          if (response.ok) {
            image = [await response.json()];
          } else {
            toast.show(
              t(
                'feeds_image_failed',
                'The product image could not be added; you can add it yourself.'
              ),
              'warning'
            );
          }
        } catch (err) {
          // görselsiz devam edilir
        } finally {
          setBusy(null);
        }
      }
      await dismiss(item.id);
      modal.closeAll();
      modal.openModal({
        id: 'add-edit-modal',
        closeOnClickOutside: false,
        removeLayout: true,
        closeOnEscape: false,
        withCloseButton: false,
        askClose: true,
        fullScreen: true,
        classNames: {
          modal: 'w-[100%] max-w-[1400px] text-textColor',
        },
        children: (
          <AddEditModal
            allIntegrations={integrations.map((p) => ({ ...p }))}
            integrations={integrations.slice(0).map((p) => ({ ...p }))}
            mutate={reloadCalendarView}
            onlyValues={[{ content: draftText(item), image }]}
            date={newDayjs().add(1, 'day').hour(10).minute(0)}
            reopenModal={() => ({})}
          />
        ),
        size: '80%',
      });
    },
    [integrations, reloadCalendarView]
  );

  return (
    <div className="flex flex-col gap-[18px] w-full text-newTextColor">
      <div className="flex flex-col gap-[8px]">
        <div className="text-[15px] font-[600]">
          {t('feeds_new_products', 'New products in your stores')}
        </div>
        {!items?.length && (
          <div className="text-[14px] text-textItemBlur">
            {feeds?.length
              ? t(
                  'feeds_no_new_products',
                  'No new products yet. Products added to the store after it is connected appear here.'
                )
              : t(
                  'feeds_no_store',
                  'Connect a store below to get draft posts for its new products.'
                )}
          </div>
        )}
        {(items || []).map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-[12px] border border-newTableBorder rounded-[10px] p-[10px]"
          >
            {item.image ? (
              <img
                className="w-[52px] h-[52px] rounded-[8px] object-cover bg-newBgColor shrink-0"
                alt=""
                src={item.image}
              />
            ) : (
              <div className="w-[52px] h-[52px] rounded-[8px] bg-newBgColor shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-[600] truncate">
                {item.title}
              </div>
              <div className="text-[13px] text-textItemBlur truncate">
                {[item.price, item.feedName].filter(Boolean).join(' · ')}
              </div>
            </div>
            <Button
              className="rounded-[8px]"
              loading={busy === 'draft-' + item.id}
              onClick={createDraft(item)}
            >
              {t('feeds_create_draft', 'Create draft')}
            </Button>
            <button
              type="button"
              className="text-[13px] underline text-textItemBlur cursor-pointer"
              onClick={() => dismiss(item.id)}
            >
              {t('feeds_dismiss', 'Skip')}
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-[8px] border-t border-newTableBorder pt-[16px]">
        <div className="text-[15px] font-[600]">
          {t('feeds_stores', 'Connected stores')}
        </div>
        {(feeds || []).map((feed) => (
          <div
            key={feed.id}
            className="flex items-center gap-[10px] flex-wrap text-[14px]"
          >
            <div className="flex-1 min-w-[160px]">
              <div className="font-[600]">{feed.name}</div>
              <div className="text-[12px] text-textItemBlur break-all">
                {feed.url}
              </div>
            </div>
            <Button
              secondary={true}
              className="rounded-[8px] border border-newTableBorder"
              loading={busy === feed.id}
              onClick={syncFeed(feed.id)}
            >
              {t('feeds_check_now', 'Check now')}
            </Button>
            <button
              type="button"
              className="text-[13px] underline text-textItemBlur cursor-pointer"
              onClick={removeFeed(feed.id)}
            >
              {t('remove', 'Remove')}
            </button>
          </div>
        ))}

        <p className="text-[13px] text-textItemBlur mt-[4px]">
          {t(
            'feeds_help',
            'Paste the product XML address of the store (ikas, Ticimax, T-Soft, IdeaSoft and similar platforms provide one, as does a Google Merchant feed).'
          )}
        </p>
        <div className="flex gap-[8px] flex-wrap">
          <input
            className={fieldClass + ' max-w-[200px]'}
            placeholder={t('feeds_store_name', 'Store name')}
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={fieldClass + ' flex-1 min-w-[220px]'}
            placeholder="https://magaza.com/urunler.xml"
            value={url}
            maxLength={1000}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button
            className="rounded-[8px]"
            loading={busy === 'add'}
            onClick={addFeed}
          >
            {t('feeds_add', 'Connect store')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ProductFeedsButton: FC = () => {
  const t = useT();
  const modal = useModals();
  const { integrations, reloadCalendarView } = useCalendar();
  const { data: items } = useNewItems();

  const open = useCallback(() => {
    modal.openModal({
      classNames: {
        modal: 'md',
      },
      title: t('feeds_title', 'Store products'),
      withCloseButton: true,
      closeOnEscape: true,
      closeOnClickOutside: true,
      children: (
        <ProductFeedsModal
          integrations={integrations}
          reloadCalendarView={reloadCalendarView}
        />
      ),
    });
  }, [integrations, reloadCalendarView]);

  return (
    <button
      type="button"
      onClick={open}
      className="relative h-[42px] px-[14px] rounded-[8px] border border-newTableBorder text-[14px] font-[500] whitespace-nowrap cursor-pointer hover:bg-boxHover"
    >
      {t('feeds_button', 'Store')}
      {!!items?.length && (
        <span className="absolute -top-[6px] -end-[6px] min-w-[18px] h-[18px] px-[4px] rounded-full bg-[#FF6B4A] text-white text-[11px] font-bold flex items-center justify-center">
          {items.length}
        </span>
      )}
    </button>
  );
};
