'use client';

// Postacı: Ayarlar > Ajans Markası. Buradaki ad, logo ve renk müşterinin gördüğü
// sayfalarda (gönderi önizlemesi, onay planı, aylık rapor) Postacı'nın yerine
// gösterilir.

import { FC, useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { showMediaBox } from '@gitroom/frontend/components/media/media.component';
import {
  Brand,
  BrandHeader,
} from '@gitroom/frontend/components/preview/brand.header';

const DEFAULT_COLOR = '#3D4FE0';

const fieldClass =
  'w-full h-[42px] bg-newBgColor border border-newTableBorder rounded-[8px] px-[12px] text-[14px] text-newTextColor outline-none';

const useBrand = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/brand')).json();
  }, []);
  return useSWR<Brand>('/brand', load);
};

export const BrandSettings: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const { data, mutate } = useBrand();

  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setName(data.name || '');
      setLogo(data.logo || '');
      setColor(data.color || '');
    }
  }, [data]);

  const pickLogo = useCallback(() => {
    showMediaBox((media) => {
      setLogo(media.path);
    });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch('/brand', {
        method: 'PUT',
        body: JSON.stringify({ name, logo, color }),
      });
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      await mutate();
      toast.show(t('brand_saved', 'Brand saved'), 'success');
    } catch (err) {
      toast.show(t('brand_save_failed', 'Brand could not be saved'), 'warning');
    } finally {
      setSaving(false);
    }
  }, [name, logo, color]);

  return (
    <div className="flex flex-col gap-[20px] max-w-[640px]">
      <div>
        <h3 className="text-[20px] font-[600]">
          {t('brand_title', 'Agency brand')}
        </h3>
        <p className="text-[14px] text-textItemBlur mt-[4px]">
          {t(
            'brand_description',
            'Your clients see this name and logo on the pages you share with them: post previews, approval plans and monthly reports.'
          )}
        </p>
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="brand-name" className="text-[14px]">
          {t('brand_name', 'Agency name')}
        </label>
        <input
          id="brand-name"
          className={fieldClass}
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <span className="text-[14px]">{t('brand_logo', 'Logo')}</span>
        <div className="flex items-center gap-[10px] flex-wrap">
          <Button
            secondary={true}
            className="rounded-[8px] border border-newTableBorder"
            onClick={pickLogo}
          >
            {logo
              ? t('brand_logo_change', 'Change logo')
              : t('brand_logo_pick', 'Choose logo')}
          </Button>
          {!!logo && (
            <Button
              secondary={true}
              className="rounded-[8px] border border-newTableBorder"
              onClick={() => setLogo('')}
            >
              {t('remove', 'Remove')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="brand-color" className="text-[14px]">
          {t('brand_color', 'Name color')}
        </label>
        <div className="flex items-center gap-[10px]">
          <input
            id="brand-color"
            type="color"
            className="w-[42px] h-[42px] rounded-[8px] border border-newTableBorder bg-transparent cursor-pointer"
            value={color || DEFAULT_COLOR}
            onChange={(e) => setColor(e.target.value)}
          />
          {!!color && (
            <button
              type="button"
              className="text-[13px] underline text-textItemBlur cursor-pointer"
              onClick={() => setColor('')}
            >
              {t('brand_color_reset', 'Use default')}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-[8px]">
        <span className="text-[14px] text-textItemBlur">
          {t('brand_preview', 'Preview')}
        </span>
        <div className="bg-newBgColorInner border border-newTableBorder rounded-[12px] min-h-[80px] px-[20px] py-[12px] flex items-center">
          <BrandHeader brand={{ name: name || null, logo: logo || null, color: color || null }} />
        </div>
      </div>

      <div>
        <Button className="rounded-[8px]" loading={saving} onClick={save}>
          {t('save', 'Save')}
        </Button>
      </div>
    </div>
  );
};
