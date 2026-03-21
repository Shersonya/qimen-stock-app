import { screen } from '@testing-library/react';

import { StockPoolPageClient } from '@/components/StockPoolPageClient';
import { StrategyPageClient } from '@/components/StrategyPageClient';
import { renderInWorkbench } from '@/tests/ui/render-workbench';

const mockPathname = jest.fn(() => '/strategy');

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('strategy foundation pages', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPathname.mockReset();
  });

  it('shows the new navigation items when strategy page is active', () => {
    mockPathname.mockReturnValue('/strategy');

    renderInWorkbench(<StrategyPageClient demoMode />);

    expect(screen.getAllByRole('link', { name: '策略选股' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: '股票池' }).length).toBeGreaterThan(0);
    expect(screen.getByTestId('strategy-foundation-page')).toHaveTextContent('Demo 验收已启用');
    expect(screen.getByTestId('strategy-foundation-tdx-card')).toHaveTextContent('信号总数');
  });

  it('renders stock-pool placeholder data for demo acceptance', () => {
    mockPathname.mockReturnValue('/stock-pool');

    renderInWorkbench(<StockPoolPageClient demoMode />);

    expect(screen.getByTestId('stock-pool-foundation-page')).toHaveTextContent('Demo 股票池已加载');
    expect(screen.getByTestId('stock-pool-foundation-main')).toHaveTextContent('核心观察池');
    expect(screen.getByTestId('stock-pool-foundation-side')).toHaveTextContent('已准备排序表结构');
  });
});
