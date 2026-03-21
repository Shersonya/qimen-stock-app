import { StockPoolPageClient } from '@/components/StockPoolPageClient';

export default async function StockPoolPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const demoMode = params.demo === '1';

  return <StockPoolPageClient demoMode={demoMode} />;
}
