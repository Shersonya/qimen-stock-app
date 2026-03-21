import { StrategyPageClient } from '@/components/StrategyPageClient';

export default async function StrategyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const demoMode = params.demo === '1';

  return <StrategyPageClient demoMode={demoMode} />;
}
