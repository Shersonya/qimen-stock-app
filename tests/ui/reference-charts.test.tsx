import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HomePage from '@/app/page';

describe('ReferenceBoardPanel', () => {
  it('switches the active reference board when the market tabs change', async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    expect(screen.getByAltText('沪市参考盘')).toBeInTheDocument();

    const marketTabs = screen.getByRole('tablist', { name: '市场切换' });

    await user.click(within(marketTabs).getByRole('tab', { name: /深市/ }));

    expect(screen.getByAltText('深市参考盘')).toBeInTheDocument();

    await user.click(within(marketTabs).getByRole('tab', { name: /创业板/ }));

    expect(screen.getByAltText('创业板参考盘')).toBeInTheDocument();
  });
});
