import { screen } from '@testing-library/react';

import { renderInWorkbench } from '@/tests/ui/render-workbench';

const mockPathname = jest.fn(() => '/');

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
    writable: true,
  });
  window.dispatchEvent(new Event('resize'));
}

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('WorkbenchShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPathname.mockReturnValue('/');
    setViewportWidth(1024);
  });

  it('renders a single six-item primary nav on desktop', () => {
    renderInWorkbench(<div />);

    expect(screen.getAllByRole('link')).toHaveLength(6);
    expect(screen.getByRole('button', { name: '快捷键帮助' })).toBeInTheDocument();
  });

  it('keeps a single six-item primary nav on mobile without duplicating links', () => {
    setViewportWidth(375);

    renderInWorkbench(<div />);

    expect(screen.getAllByRole('link')).toHaveLength(6);
    expect(screen.getByRole('button', { name: '快捷键帮助' })).toBeInTheDocument();
  });
});
