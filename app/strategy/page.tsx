import { StrategyPageClient } from '@/components/StrategyPageClient';

export default async function StrategyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const demoMode = params.demo === '1';
  const mockMode =
    params.mock === 'mock_degraded' || params.mock === 'mock_breaker'
      ? params.mock
      : undefined;

  return <StrategyPageClient demoMode={demoMode} mockMode={mockMode} />;
}
