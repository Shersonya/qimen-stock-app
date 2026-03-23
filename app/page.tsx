import { DashboardPageClient } from '@/components/DashboardPageClient';
import {
  getDefaultMarketDashboardRequest,
  serializeMarketDashboardRequest,
} from '@/lib/market-dashboard-request';
import { getCachedMarketDashboard } from '@/lib/services/market-dashboard';

export const revalidate = 300;

export default async function HomePage() {
  try {
    const defaultRequest = getDefaultMarketDashboardRequest();
    const initialData = await getCachedMarketDashboard(defaultRequest);

    return (
      <DashboardPageClient
        initialData={initialData}
        initialRequestKey={serializeMarketDashboardRequest(defaultRequest)}
      />
    );
  } catch {
    return <DashboardPageClient />;
  }
}
