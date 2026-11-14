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
  // Postacı: iyzico ya da havale kuruluysa TL abonelik ekranı gösterilir. O
  // durumda Stripe plan listesi hiç istenmez (Stripe anahtarı yer tutucu olduğu
  // için istek 401 döner ve panel bunu oturum kapanması sayar).
  const { isLoading: isLoadingIyzico, data: iyzico } = useIyzicoPlans();
  const { isLoading: isLoadingSubscription, data: subscription } = useSWR(
    '/user/subscription',
    load
  );
  const useTlScreen =
    !!iyzico?.enabled &&
    (!subscription?.subscription ||
      subscription.subscription.provider === 'iyzico');
  const { isLoading: isLoadingTier, data: tiers } = useSWR(
    isLoadingIyzico || isLoadingSubscription || useTlScreen
      ? null
      : '/user/subscription/tiers',
    load
  );
  if (isLoadingSubscription || isLoadingTier || isLoadingIyzico) {
    return <LoadingComponent />;
  }
  if (useTlScreen) {
    return <IyzicoBillingComponent sub={subscription?.subscription} />;
  }
  return <MainBillingComponent sub={subscription?.subscription} />;
};
