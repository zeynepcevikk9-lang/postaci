export const dynamic = 'force-dynamic';
import { AdminCustomersComponent } from '@gitroom/frontend/components/admin/admin-customers.component';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Postacı Yönetim: Müşteriler',
  description: '',
};

export default async function Page() {
  return (
    <div className="bg-newBgColorInner flex-1 min-w-0 flex-col flex p-[20px] gap-[12px]">
      <AdminCustomersComponent />
    </div>
  );
}
