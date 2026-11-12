'use client';

// Postacı: aboneliği olmayan kullanıcının gördüğü plan seçme ekranı. iyzico
// kuruluysa TL planlar, değilse Postiz'in kendi (Stripe) ekranı gösterilir.

import { FC } from 'react';
import { FirstBillingComponent } from '@gitroom/frontend/components/billing/first.billing.component';
import {
  IyzicoBillingComponent,
  useIyzicoPlans,
} from '@gitroom/frontend/components/billing/iyzico.billing.component';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const FirstBillingSwitch: FC = () => {
  const t = useT();
  const { data, isLoading } = useIyzicoPlans();

  if (isLoading) {
    return <LoadingComponent />;
  }
  if (!data?.enabled) {
    return <FirstBillingComponent />;
  }

  return (
    <div className="flex-1 flex flex-col gap-[20px] w-full max-w-[1100px] mx-auto py-[24px] px-[12px]">
      <div>
        <OrganizationSelector asOpenSelect={true} />
      </div>
      <div className="flex justify-center">
        <Logo />
      </div>
      <div className="text-center">
        <h1 className="text-[26px] font-[600]">
          {t('iyzico_choose_plan', 'Choose your plan')}
        </h1>
        <p className="text-[14px] text-textItemBlur mt-[6px]">
          {t(
            'iyzico_choose_plan_note',
            'Prices are in Turkish lira and include VAT. You can cancel at any time.'
          )}
        </p>
      </div>
      <IyzicoBillingComponent />
      <div className="flex justify-center items-center">
        <LogoutComponent />
      </div>
    </div>
  );
};
