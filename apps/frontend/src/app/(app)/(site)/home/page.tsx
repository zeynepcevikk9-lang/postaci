export const dynamic = 'force-dynamic';
import { HomeComponent } from '@gitroom/frontend/components/home/home.component';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Postacı Ana Sayfa',
  description: '',
};

export default async function Page() {
  return (
    <div className="bg-newBgColorInner flex-1 min-w-0 flex-col flex p-[24px] mobile:p-[14px]">
      <HomeComponent />
    </div>
  );
}
