import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import { DashboardPageClient } from '@/components/DashboardPageClient';
import { requestMarketDashboard } from '@/lib/client-api';
import { getDemoMarketDashboardResponse } from '@/lib/demo-fixtures';
import { renderInWorkbench } from '@/tests/ui/render-workbench';

const mockPush = jest.fn();
const mockPathname = jest.fn(() => '/');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

jest.mock('@/lib/client-api', () => ({
  requestMarketDashboard: jest.fn(),
  requestMarketScreen: jest.fn(),
  requestQimenAnalysis: jest.fn(),
}));

const mockedRequestMarketDashboard = jest.mocked(requestMarketDashboard);

describe('DashboardPageClient', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPush.mockReset();
    mockPathname.mockReturnValue('/');
    mockedRequestMarketDashboard.mockReset();
    mockedRequestMarketDashboard.mockResolvedValue(getDemoMarketDashboardResponse());
  });

  it('renders the dashboard with six-item navigation and shortcut help', async () => {
    renderInWorkbench(<DashboardPageClient />);

    expect(await screen.findByText('有吉气')).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: '主导航' });
    const navLinks = within(nav).getAllByRole('link');

    expect(navLinks).toHaveLength(6);
    expect(navLinks.map((link) => link.textContent)).toEqual([
      '📈市场仪表盘',
      '🔍吉格筛选',
      '🎯策略选股',
      '📋股票池',
      '📊个股诊断',
      '⚙️系统设置',
    ]);

    expect(screen.getByTestId('dashboard-heat-chart')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-sector-chart')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-top-stocks')).toHaveTextContent('平安银行');
    expect(
      screen.getByRole('link', { name: '一键全市场扫描' }),
    ).toHaveAttribute('href', '/screen?autostart=1');

    fireEvent.keyDown(window, { key: '?' });

    expect(await screen.findByRole('dialog')).toHaveTextContent('键盘高效操作');
  });

  it('loads market data through the dashboard API wrapper', async () => {
    renderInWorkbench(<DashboardPageClient />);

    await waitFor(() => {
      expect(mockedRequestMarketDashboard).toHaveBeenCalled();
    });
  });
});
