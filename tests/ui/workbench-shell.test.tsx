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

  it('renders six desktop navigation items', () => {
    renderInWorkbench(<div />);

    expect(screen.getAllByRole('link')).toHaveLength(6);
    expect(screen.getByRole('button', { name: '快捷键帮助' })).toBeInTheDocument();
  });

  it('renders six mobile navigation items without the desktop sidebar', () => {
    setViewportWidth(375);

    renderInWorkbench(<div />);

    expect(screen.getAllByRole('link')).toHaveLength(6);
    expect(screen.queryByRole('button', { name: '快捷键帮助' })).not.toBeInTheDocument();
  });
});
