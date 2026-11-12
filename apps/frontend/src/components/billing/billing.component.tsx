'use client';

import { useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { MainBillingComponent } from './main.billing.component';
import {
  IyzicoBillingComponent,
  useIyzicoPlans,
} from '@gitroom/frontend/components/billing/iyzico.billing.component';
export const BillingComponent = () => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { isLoading: isLoadingTier, data: tiers } = useSWR(
    '/user/subscription/tiers',
    load
  );
  const { isLoading: isLoadingSubscription, data: subscription } = useSWR(
    '/user/subscription',
    load
  );
  // Postacı: iyzico kuruluysa TL abonelik ekranı gösterilir.
  const { isLoading: isLoadingIyzico, data: iyzico } = useIyzicoPlans();
  if (isLoadingSubscription || isLoadingTier || isLoadingIyzico) {
    return <LoadingComponent />;
  }
  if (
    iyzico?.enabled &&
    (!subscription?.subscription ||
      subscription.subscription.provider === 'iyzico')
  ) {
    return <IyzicoBillingComponent sub={subscription?.subscription} />;
  }
  return <MainBillingComponent sub={subscription?.subscription} />;
};
