import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ScreenPageClient } from '@/components/ScreenPageClient';
import {
  requestMarketDashboard,
  requestMarketScreen,
  requestQimenAnalysis,
} from '@/lib/client-api';
import {
  getDemoMarketDashboardResponse,
  getDemoMarketScreenResponse,
  getDemoQimenResponse,
} from '@/lib/demo-fixtures';
import { renderInWorkbench } from '@/tests/ui/render-workbench';

const mockPush = jest.fn();
const mockPathname = jest.fn(() => '/screen');

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
const mockedRequestMarketScreen = jest.mocked(requestMarketScreen);
const mockedRequestQimenAnalysis = jest.mocked(requestQimenAnalysis);

function createDeferredPromise<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe('ScreenPageClient', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPush.mockReset();
    mockPathname.mockReturnValue('/screen');
    mockMatchMedia(false);
    mockedRequestMarketDashboard.mockReset();
    mockedRequestMarketScreen.mockReset();
    mockedRequestQimenAnalysis.mockReset();
    mockedRequestMarketDashboard.mockResolvedValue(getDemoMarketDashboardResponse());
    mockedRequestMarketScreen.mockResolvedValue(getDemoMarketScreenResponse());
    mockedRequestQimenAnalysis.mockResolvedValue(getDemoQimenResponse('000001'));
  });

  it('supports primary hotkey search, result highlighting, preview drawer, and deep diagnosis links', async () => {
    const user = userEvent.setup();

    renderInWorkbench(<ScreenPageClient />);

    fireEvent.keyDown(window, { key: 'F5' });

    expect(await screen.findByTestId('screen-result-table')).toBeInTheDocument();
    expect(mockedRequestMarketScreen).toHaveBeenCalledTimes(1);

    const resultRow = screen
      .getByText('000001 / 平安银行')
      .closest('[role="row"]');

    expect(resultRow).toHaveStyle({
      background:
        'linear-gradient(135deg, rgba(211, 176, 92, 0.36), rgba(113, 85, 26, 0.16))',
    });

    const corePatternButton = screen.getByRole('button', {
      name: '[COMPOSITE]真诈格(离9宫)、[A]青龙返首(坎1宫)',
    });

    expect(corePatternButton).toHaveAttribute(
      'title',
      '主力资金在利好驱动下入场，短期动能强劲。',
    );

    await user.click(corePatternButton);

    expect(await screen.findByRole('dialog')).toHaveTextContent('看图筛选');
    expect(mockedRequestQimenAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ stockCode: '000001' }),
    );
    expect(
      await screen.findByText(/当前高亮宫位会与点击的核心吉格保持同步/),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('当前高亮宫位会与点击的核心吉格保持同步')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: '深度诊断' })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(screen.getByText('策略验证')).toBeInTheDocument();
    expect(mockedRequestMarketScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        riskConfigOverride: expect.objectContaining({
          excludeInvalidCorePalaces: expect.any(Boolean),
          excludeTopEvilPatterns: expect.any(Boolean),
        }),
      }),
    );
  });

  it('renders mobile result cards and the mobile palace explorer preview', async () => {
    const user = userEvent.setup();

    mockMatchMedia(true);
    renderInWorkbench(<ScreenPageClient />);

    fireEvent.keyDown(window, { key: 'F5' });

    expect(await screen.findByTestId('screen-result-mobile-list')).toBeInTheDocument();
    expect(screen.queryByTestId('screen-result-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('screen-filter-panel')).not.toHaveClass(
      'workbench-sticky-panel',
    );

    const corePatternButton = screen.getByRole('button', {
      name: '[COMPOSITE]真诈格(离9宫)、[A]青龙返首(坎1宫)',
    });

    await user.click(corePatternButton);

    expect(await screen.findByTestId('screen-preview-mobile-layout')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(
      '当前高亮宫位会与点击的核心吉格保持同步',
    );
  });

  it('shows estimated progress on the first screen request before results return', async () => {
    const deferred = createDeferredPromise<ReturnType<typeof getDemoMarketScreenResponse>>();

    mockedRequestMarketScreen.mockReturnValueOnce(
      deferred.promise as ReturnType<typeof mockedRequestMarketScreen>,
    );

    renderInWorkbench(<ScreenPageClient />);

    fireEvent.keyDown(window, { key: 'F5' });

    expect(await screen.findByTestId('screen-progress')).toHaveTextContent('预计 6-12 秒');
    expect(screen.queryByTestId('screen-result-table')).not.toBeInTheDocument();

    deferred.resolve(getDemoMarketScreenResponse());

    expect(await screen.findByTestId('screen-result-table')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId('screen-progress')).not.toBeInTheDocument();
    });
  });
});
