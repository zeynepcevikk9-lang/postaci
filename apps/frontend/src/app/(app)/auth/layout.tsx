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
          className="flex-1 hidden lg:flex flex-col items-center justify-center gap-[40px] rounded-[12px] text-[#14172B] px-[32px] py-[40px]"
          style={{
            background:
              'radial-gradient(55% 50% at 8% 10%, rgba(255,107,74,.16), transparent 70%), radial-gradient(50% 50% at 95% 90%, rgba(20,23,43,.08), transparent 70%), linear-gradient(180deg, #f7f2e8 0%, #f1ece1 100%)',
          }}
        >
          {/* Postacı: Postiz'e ait kullanıcı sayısı ve müşteri yorumları kaldırıldı. */}
          <div className="text-center text-[36px] font-[700] tracking-[-0.02em] leading-[1.2]">
            {t('auth_side_line_1', 'Manage your social media')}
            <br />
            <span className="text-[42px]">
              {t('auth_side_line_2', 'from a single panel')}
            </span>
          </div>
          {/* Özelliklerin kısa özeti (örnek gösterim, gerçek veri değil) */}
          <div className="w-full max-w-[460px] flex flex-col gap-[12px]">
            {[
              ['Planlayın', 'Tüm hesaplarınızın gönderileri tek takvimde.'],
              [
                'Onaya gönderin',
                'Yönetici, müşteri ya da ekip arkadaşınız bağlantıdan görüp onaylar.',
              ],
              ['Raporlayın', 'Yayınları ve sonuçları paylaşabileceğiniz bir özetle gösterin.'],
            ].map(([baslik, metin], i) => (
              <div
                key={baslik}
                className="flex items-center gap-[14px] rounded-[12px] bg-white/70 border border-[#14172B]/10 px-[18px] py-[14px] backdrop-blur-sm"
              >
                <div className="flex-none w-[36px] h-[36px] rounded-full bg-[#FF6B4A] text-white flex items-center justify-center text-[16px] font-[700]">
                  {i + 1}
                </div>
                <div className="flex flex-col">
                  <div className="text-[16px] font-[700]">{baslik}</div>
                  <div className="text-[14px] font-[400] text-[#14172B]/70">
                    {metin}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MantineWrapper>
  );
}
