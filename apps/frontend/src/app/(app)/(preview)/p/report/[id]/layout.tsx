import { ReactNode } from 'react';
import { PreviewWrapper } from '@gitroom/frontend/components/preview/preview.wrapper';

export default async function ReportLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-newBgColor min-h-screen text-newTextColor print:bg-white">
      <PreviewWrapper>{children}</PreviewWrapper>
    </div>
  );
}
