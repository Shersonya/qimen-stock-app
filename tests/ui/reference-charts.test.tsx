import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HomePage from '@/app/page';

describe('ReferenceBoardPanel', () => {
  it('renders the reference board as a direct nine-palace grid without the legacy summary area', () => {
    render(<HomePage />);

    const referenceBoardPanel = screen.getByTestId('reference-board-panel');
    const referenceMobileLayout = within(referenceBoardPanel).getByTestId(
      'reference-mobile-layout',
    );
    const referenceMobileDetailCard = within(referenceBoardPanel).getByTestId(
      'reference-mobile-detail-card',
    );
    const referenceMobilePalaces = within(referenceBoardPanel).getAllByTestId(
      'reference-mobile-palace',
    );
    const referencePalaces = within(referenceBoardPanel).getAllByTestId('reference-palace');

    expect(referenceMobileLayout.className).toContain('sm:hidden');
    expect(referenceMobilePalaces).toHaveLength(9);
    expect(referenceMobilePalaces[0]).toHaveAttribute('data-detail-mode', 'compact');
    expect(referenceMobileDetailCard).toHaveAttribute('data-detail-mode', 'expanded');
    expect(within(referenceBoardPanel).getByTestId('reference-board-grid')).toBeInTheDocument();
    expect(
      within(referenceBoardPanel).getByTestId('reference-desktop-layout').className,
    ).toContain('hidden sm:block');
    expect(referencePalaces).toHaveLength(9);
    expect(referencePalaces[0]).toHaveAttribute('data-detail-mode', 'expanded');
    expect(referencePalaces[0]?.className).toContain('min-h-[22rem]');
    expect(
      within(referenceBoardPanel).getAllByText(
        (_, element) => element?.textContent === '天盘己',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      within(referenceBoardPanel).getAllByText(
        (_, element) => element?.textContent === '地盘壬',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      within(referenceBoardPanel).getAllByText(
        (_, element) => element?.textContent === '外盘庚',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      within(referenceBoardPanel).getAllByText(
        (_, element) => element?.textContent === '地支辰 / 巳',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      within(referenceBoardPanel).queryByText('阴遁 7局'),
    ).not.toBeInTheDocument();
    expect(
      within(referenceBoardPanel).queryByText('值符落宫'),
    ).not.toBeInTheDocument();
    expect(
      within(referenceBoardPanel).queryByText('旬首六仪'),
    ).not.toBeInTheDocument();
    expect(
      within(referenceBoardPanel).queryByAltText('沪市参考盘'),
    ).not.toBeInTheDocument();
  });

  it('switches the active reference board and keeps rendering nine structured palaces', async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    const referenceBoardPanel = screen.getByTestId('reference-board-panel');
    const marketTabs = within(referenceBoardPanel).getByRole('tablist', { name: '市场切换' });

    expect(within(referenceBoardPanel).getAllByTestId('reference-mobile-palace')).toHaveLength(9);
    expect(within(referenceBoardPanel).getAllByTestId('reference-palace')).toHaveLength(9);
    expect(
      within(referenceBoardPanel).getAllByText(
        (_, element) => element?.textContent === '天盘己',
      ).length,
    ).toBeGreaterThan(0);

    await user.click(within(marketTabs).getByRole('tab', { name: /深市/ }));

    expect(within(referenceBoardPanel).getAllByTestId('reference-palace')).toHaveLength(9);
    expect(
      within(referenceBoardPanel).getAllByText(
        (_, element) => element?.textContent === '天盘乙/癸',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      within(referenceBoardPanel).getAllByText(
        (_, element) => element?.textContent === '空亡日空 / 时空',
      ).length,
    ).toBeGreaterThan(0);

    await user.click(within(marketTabs).getByRole('tab', { name: /创业板/ }));

    expect(within(referenceBoardPanel).getAllByTestId('reference-palace')).toHaveLength(9);
    expect(
      within(referenceBoardPanel).getAllByText(
        (_, element) => element?.textContent === '外盘丁/戊',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      within(referenceBoardPanel).getAllByText(
        (_, element) => element?.textContent === '空亡日空 / 时空',
      ).length,
    ).toBeGreaterThan(0);
  });
});
