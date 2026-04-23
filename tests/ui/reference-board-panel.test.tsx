import { useState } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReferenceBoardPanel } from '@/components/ReferenceBoardPanel';
import type { Market } from '@/lib/contracts/qimen';
import { renderInWorkbench } from '@/tests/ui/render-workbench';

const mockPush = jest.fn();
const mockPathname = jest.fn(() => '/diagnosis/600519');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

function ReferenceBoardHarness() {
  const [market, setMarket] = useState<Market>('SH');

  return <ReferenceBoardPanel onMarketChange={setMarket} selectedMarket={market} />;
}

describe('ReferenceBoardPanel mobile experience', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockPathname.mockReturnValue('/diagnosis/600519');
  });

  it('keeps the mobile view collapsed by default and expands into the shared palace explorer', async () => {
    const user = userEvent.setup();

    renderInWorkbench(<ReferenceBoardHarness />);

    expect(screen.getByTestId('reference-content-panel').className).toContain(
      'hidden md:block',
    );

    await user.click(screen.getByRole('button', { name: /沪市参考盘/i }));

    expect(screen.getByText('收起')).toBeInTheDocument();
    expect(screen.getByTestId('reference-content-panel').className).toContain('block');
    expect(screen.getByTestId('reference-mobile-layout')).toHaveAttribute(
      'data-mobile-layout',
      'palace-explorer',
    );
    expect(screen.getByTestId('reference-mobile-overview').className).toContain(
      'board-shell',
    );
    expect(screen.getByText('当前宫位补充说明')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '中宫局眼' })).toBeInTheDocument();
    expect(
      screen.getByText('中宫以 天禽 守局，适合用来观察整盘的重心与回旋余地。'),
    ).toBeInTheDocument();
  });

  it('updates the mobile detail panel when selecting a palace and resets to center on market switch', async () => {
    const user = userEvent.setup();

    renderInWorkbench(<ReferenceBoardHarness />);

    await user.click(screen.getByRole('button', { name: /沪市参考盘/i }));
    await user.click(screen.getAllByTestId('reference-mobile-palace')[0]);

    expect(screen.getByRole('heading', { name: '巽宫 · 洛书 4' })).toBeInTheDocument();
    expect(
      screen.getByText('巽宫以 天蓬 为主星，门象为 开门，神煞为 玄武。'),
    ).toBeInTheDocument();

    const shDetailCard = screen.getByTestId('reference-mobile-detail-card');
    expect(shDetailCard).toHaveTextContent('八门 开门');
    expect(shDetailCard).toHaveTextContent('八神 玄武');

    await user.click(screen.getByRole('tab', { name: '深市' }));

    expect(screen.getByRole('tab', { name: '深市', selected: true })).toBeInTheDocument();
    expect(screen.getAllByText('深证指数 1994.07.20 09:30').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: '中宫局眼' })).toBeInTheDocument();
    expect(
      screen.getByText('中宫以 天禽 守局，适合用来观察整盘的重心与回旋余地。'),
    ).toBeInTheDocument();

    await user.click(screen.getAllByTestId('reference-mobile-palace')[0]);

    expect(screen.getByRole('heading', { name: '巽宫 · 洛书 4' })).toBeInTheDocument();
    expect(
      screen.getByText('巽宫以 天英 为主星，门象为 开门，神煞为 白虎。'),
    ).toBeInTheDocument();

    const szDetailCard = screen.getByTestId('reference-mobile-detail-card');
    expect(szDetailCard).toHaveTextContent('八神 白虎');
  });
});
