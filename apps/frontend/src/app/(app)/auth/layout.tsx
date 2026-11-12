import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { AttributionComponent } from '@gitroom/frontend/components/auth/attribution.component';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Toaster } from '@gitroom/react/toaster/toaster';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getT();

  return (
    <MantineWrapper>
      <Toaster />
      {/* Postacı: giriş sayfaları açık tema; renkler tema değişkenlerinden gelir. */}
      <div className="bg-newBgColor flex flex-1 p-[12px] gap-[12px] min-h-screen w-screen text-newTextColor">
        {/*<style>{`html, body {overflow-x: hidden;}`}</style>*/}
        <ReturnUrlComponent />
        <AttributionComponent />
        <div className="flex flex-col py-[40px] px-[20px] flex-1 lg:w-[600px] lg:flex-none rounded-[12px] text-newTextColor p-[12px] bg-newBgColorInner border border-newBorder">
          <div className="w-full max-w-[440px] mx-auto justify-center gap-[20px] h-full flex flex-col text-newTextColor">
            <LogoTextComponent />
            <div className="flex">{children}</div>
          </div>
        </div>
        <div
          className="text-[36px] font-[700] tracking-[-0.02em] leading-[1.2] flex-1 hidden lg:flex flex-col items-center justify-center rounded-[12px] text-[#12224A]"
          style={{
            background:
              'radial-gradient(60% 55% at 10% 12%, rgba(61,79,224,.22), transparent 68%), radial-gradient(50% 50% at 92% 28%, rgba(143,108,245,.26), transparent 70%), linear-gradient(180deg, #f1f3ff 0%, #f4f1ff 55%, #eef6ff 100%)',
          }}
        >
          {/* Postacı: Postiz'e ait kullanıcı sayısı ve müşteri yorumları kaldırıldı. */}
          <div className="text-center px-[32px]">
            {t('auth_side_line_1', 'Run your agency’s social media')}
            <br />
            <span className="text-[42px] text-[#3D4FE0]">
              {t('auth_side_line_2', 'from a single panel')}
            </span>
          </div>
        </div>
      </div>
    </MantineWrapper>
  );
}
