import type { Metadata } from 'next';

import '@/app/globals.css';

export const metadata: Metadata = {
  title: '股票排盘分析工具',
  description: '输入股票代码，同步生成上市时刻奇门盘与当日开盘价梅花卦。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
