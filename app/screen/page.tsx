import { ScreenPageClient } from '@/components/ScreenPageClient';

export default async function ScreenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const autostart = params.autostart === '1' || params.demo === '1';

  return <ScreenPageClient autostart={autostart} />;
}
