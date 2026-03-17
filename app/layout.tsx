import type { Metadata } from 'next';

import '@/app/globals.css';

export const metadata: Metadata = {
  title: '股票奇门排盘分析工具',
  description: '输入股票代码，查询上市时间并生成时家奇门九宫排盘。',
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
