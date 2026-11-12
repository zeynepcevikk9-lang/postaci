// Postacı: aylık rapor. Müşterinin giriş yapmadan açtığı, bir dönemde yayımlanan
// gönderileri ve kanal rakamlarını gösteren sayfa. Tarayıcının yazdırma penceresiyle
// PDF olarak kaydedilir.
import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
import { BrandHeader } from '@gitroom/frontend/components/preview/brand.header';
import { ReportClient } from '@gitroom/frontend/components/preview/report.client';

export const metadata: Metadata = {
  title: 'Postacı Aylık Rapor',
  description: '',
};

export default async function Report(props: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await props.params;
  const t = await getT();
  const response = await internalFetch(`/public/reports/${id}`);

  if (!response.ok) {
    return (
      <div className="text-newTextColor fixed start-0 top-0 w-full h-full flex justify-center items-center text-[20px] px-[20px] text-center">
        {t('report_not_found', 'This report link is not valid')}
      </div>
    );
  }

  const report = await response.json();

  return (
    <div className="mx-auto w-full max-w-[920px] p-[12px] flex flex-col gap-[8px] text-newTextColor print:p-0 print:max-w-none">
      <div className="flex bg-newBgColorInner rounded-[12px] min-h-[80px] px-[20px] py-[12px] items-center gap-[20px] flex-wrap print:px-0">
        <BrandHeader brand={report.brand} />
      </div>
      <ReportClient report={report} />
    </div>
  );
}
