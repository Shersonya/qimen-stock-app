import type { Metadata } from 'next';

import '@/app/globals.css';
import { WorkspaceSettingsProvider } from '@/components/providers/WorkspaceSettingsProvider';
import { WorkbenchShell } from '@/components/WorkbenchShell';

export const metadata: Metadata = {
  title: '奇门量化工作台',
  description: '聚焦奇门吉格筛选与个股深度诊断的专业量化分析系统。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <WorkspaceSettingsProvider>
          <WorkbenchShell>{children}</WorkbenchShell>
        </WorkspaceSettingsProvider>
      </body>
    </html>
  );
}
