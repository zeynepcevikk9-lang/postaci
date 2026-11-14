'use client';

// Postacı: kanal listelerinde (Analitik, Asistan, Eklentiler) kanalları müşteriye
// göre ayırır. Liste müşteri adına göre sıralı gelir; müşteri değiştiği satırın
// üstüne müşterinin adı yazılır. İşletme kipinde ya da hiç müşteri yoksa başlık
// çıkmaz.

import { FC, ReactNode } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useAccountType } from '@gitroom/frontend/components/layout/account.type';

interface WithCustomer {
  customer?: { id?: string; name?: string } | null;
}

export const CustomerGroup: FC<{
  integrations: WithCustomer[];
  index: number;
  children: ReactNode;
}> = ({ integrations, index, children }) => {
  const t = useT();
  const business = useAccountType() === 'business';
  const customer = integrations[index]?.customer;
  const id = customer?.id || '';
  const first = !index || (integrations[index - 1]?.customer?.id || '') !== id;
  const show =
    first && !business && integrations.some((p) => !!p?.customer?.id);

  return (
    <>
      {show && (
        <div
          className={clsx(
            'flex items-center gap-[8px] w-full mobile:hidden',
            !!index && 'mt-[4px] pt-[14px] border-t border-newTableBorder'
          )}
        >
          <span className="w-[7px] h-[7px] rounded-full bg-[#FF6B4A] shrink-0 group-[.sidebar]:mx-auto" />
          <span className="group-[.sidebar]:hidden text-[12px] font-[700] uppercase tracking-[0.08em] text-textItemBlur truncate">
            {customer?.name || t('customer_group_none', 'No customer')}
          </span>
        </div>
      )}
      {children}
    </>
  );
};
