// Postacı: toplu onay planı. Müşterinin giriş yapmadan açtığı, bir dönemin bütün
// gönderilerini görüp onayladığı sayfa.
import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { PlanApprovalClient } from '@gitroom/frontend/components/preview/plan.approval.client';

export const metadata: Metadata = {
  title: 'Postacı Onay Planı',
  description: '',
};

export default async function Plan(props: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await props.params;
  const t = await getT();
  const response = await internalFetch(`/public/plans/${id}`);

  if (!response.ok) {
    return (
      <div className="text-newTextColor fixed start-0 top-0 w-full h-full flex justify-center items-center text-[20px] px-[20px] text-center">
        {t('approval_plan_not_found', 'This approval link is not valid')}
      </div>
    );
  }

  const plan = await response.json();

  return (
    <div className="mx-auto w-full max-w-[920px] p-[12px] flex flex-col gap-[8px] text-newTextColor">
      <div className="flex bg-newBgColorInner rounded-[12px] min-h-[80px] px-[20px] py-[12px] items-center gap-[20px] flex-wrap">
        <LogoTextComponent />
      </div>
      <PlanApprovalClient planId={id} initial={plan} />
    </div>
  );
}
