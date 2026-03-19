import { DiagnosisReportPageClient } from '@/components/DiagnosisReportPageClient';

export default async function DiagnosisReportPage({
  params,
}: {
  params: Promise<{ stockCode: string }>;
}) {
  const { stockCode } = await params;

  return <DiagnosisReportPageClient stockCode={stockCode} />;
}
