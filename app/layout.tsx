import type { Metadata } from 'next';

import '@/app/globals.css';

export const metadata: Metadata = {
  title: '奇门股票分析系统',
  description: '输入股票代码，查看上市时刻九宫盘、标的摘要、梅花卦与市场镇盘参考。',
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
