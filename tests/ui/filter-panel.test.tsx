import { screen, waitFor } from '@testing-library/react';

import { FilterPanel } from '@/components/FilterPanel';
import { getDemoMarketScreenResponse } from '@/lib/demo-fixtures';
import { renderInWorkbench } from '@/tests/ui/render-workbench';

const mockPush = jest.fn();
const mockPathname = jest.fn(() => '/screen');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

describe('FilterPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
    mockPathname.mockReturnValue('/screen');
  });

  it('applies board filter preset once without re-triggering a loop', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => getDemoMarketScreenResponse(),
    } as Response);

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: fetchMock,
    });

    renderInWorkbench(
      <FilterPanel
        boardFilterPreset={{
          key: 11,
          patternNames: ['青龙返首'],
          palacePositions: [1, 5],
          sourceLabel: '盘面联动',
        }}
        isLaunchingStock={false}
        launchingStockCode={null}
        onLaunchStock={async () => {}}
      />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText('联动来源 · 盘面联动')).toBeInTheDocument();
    expect(screen.getByText('吉格 · 青龙返首')).toBeInTheDocument();
    expect(screen.getByText('宫位 · 1、5宫')).toBeInTheDocument();
  });
});
