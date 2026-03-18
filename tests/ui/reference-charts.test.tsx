import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HomePage from '@/app/page';

describe('ReferenceBoardPanel', () => {
  it('renders the reference board as a direct nine-palace grid without the legacy summary area', () => {
    render(<HomePage />);

    const referenceBoardPanel = screen.getByTestId('reference-board-panel');
    const referenceBoardScroll = within(referenceBoardPanel).getByTestId('reference-board-scroll');
    const referencePalaces = within(referenceBoardPanel).getAllByTestId('reference-palace');

    expect(referenceBoardScroll.className).toContain('overflow-x-auto');
    expect(within(referenceBoardPanel).getByTestId('reference-board-grid')).toBeInTheDocument();
    expect(within(referenceBoardPanel).getByTestId('reference-board-grid').className).toContain(
      'min-w-[50rem]',
    );
    expect(referencePalaces).toHaveLength(9);
    expect(referencePalaces[0]).toHaveAttribute('data-detail-mode', 'expanded');
    expect(referencePalaces[0]?.className).toContain('min-h-[18rem]');
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
