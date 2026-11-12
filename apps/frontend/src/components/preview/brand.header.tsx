// Postacı: müşterinin gördüğü sayfaların başlığındaki marka. Ajans kendi adını ya da
// logosunu ayarlamışsa o gösterilir, ayarlamamışsa Postacı logosu.
import { FC } from 'react';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';

export interface Brand {
  name: string | null;
  logo: string | null;
  color: string | null;
}

export const BrandHeader: FC<{ brand?: Brand | null }> = ({ brand }) => {
  if (!brand?.logo && !brand?.name) {
    return <LogoTextComponent />;
  }
  return (
    <div className="flex items-center gap-[10px]">
      {!!brand.logo && (
        <img
          className="h-[40px] max-w-[180px] object-contain"
          src={brand.logo}
          alt={brand.name || ''}
        />
      )}
      {!!brand.name && (
        <span
          className="text-[24px] font-[800] tracking-[-0.03em] leading-none"
          style={brand.color ? { color: brand.color } : undefined}
        >
          {brand.name}
        </span>
      )}
    </div>
  );
};
