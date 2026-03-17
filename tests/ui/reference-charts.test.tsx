import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReferenceCharts } from '@/components/ReferenceCharts';

describe('ReferenceCharts', () => {
  it('renders tab buttons and switches the active reference board', async () => {
    const user = userEvent.setup();

    render(<ReferenceCharts />);

    expect(screen.getByRole('tab', { name: '沪市' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByAltText('沪市参考盘')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '深市' }));

    expect(screen.getByRole('tab', { name: '深市' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByAltText('深市参考盘')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '创业板' }));

    expect(screen.getByRole('tab', { name: '创业板' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByAltText('创业板参考盘')).toBeInTheDocument();
  });
});
