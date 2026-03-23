import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StrategyPageClient } from '@/components/StrategyPageClient';
import { requestLimitUp, requestTdxScan } from '@/lib/client-api';
import { getDemoLimitUpResponse, getDemoTdxScanResponse } from '@/lib/demo-fixtures';
import { getActivePool } from '@/lib/services/stock-pool';
import { renderInWorkbench } from '@/tests/ui/render-workbench';

const mockPathname = jest.fn(() => '/strategy');

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

jest.mock('@/lib/client-api', () => ({
  requestLimitUp: jest.fn(),
  requestTdxScan: jest.fn(),
}));

jest.mock('@/lib/utils/date', () => {
  const actual = jest.requireActual('@/lib/utils/date');

  return {
    ...actual,
    getShanghaiDateString: jest.fn(() => '2026-03-21'),
  };
});

const mockedRequestTdxScan = jest.mocked(requestTdxScan);
const mockedRequestLimitUp = jest.mocked(requestLimitUp);

function createDeferredPromise<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function createTdxResponse(page: number) {
  const response = getDemoTdxScanResponse();

  return {
    ...response,
    page,
    items: page === 1 ? response.items : [...response.items].reverse(),
  };
}

function createLimitUpResponse(page: number) {
  const response = getDemoLimitUpResponse();

  return {
    ...response,
    page,
    items: page === 1 ? response.items : [...response.items].reverse(),
  };
}

describe('StrategyPageClient', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPathname.mockReturnValue('/strategy');
    mockedRequestTdxScan.mockReset();
    mockedRequestLimitUp.mockReset();
    mockedRequestTdxScan.mockImplementation(async (payload) => createTdxResponse(payload.page ?? 1));
    mockedRequestLimitUp.mockImplementation(async (payload) => createLimitUpResponse(payload.page ?? 1));
  });

  it('switches between tabs and renders both panels', async () => {
    const user = userEvent.setup();

    renderInWorkbench(<StrategyPageClient demoMode />);

    expect(screen.getByRole('tab', { name: /通达信美柱美阳阳/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('tdx-scan-panel')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /涨停板筛选/ }));

    expect(screen.getByRole('tab', { name: /涨停板筛选/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('limit-up-panel')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /通达信美柱美阳阳/ }));

    expect(screen.getByTestId('tdx-scan-panel')).toBeInTheDocument();
  });

  it('runs TDX scan, sorts results, and pages through results', async () => {
    const user = userEvent.setup();

    renderInWorkbench(<StrategyPageClient demoMode />);

    await user.click(screen.getByRole('button', { name: '开始扫描' }));

    expect(await screen.findByTestId('tdx-result-table')).toBeInTheDocument();
    expect(mockedRequestTdxScan).toHaveBeenCalledWith(
      expect.objectContaining({
        signalType: 'both',
        page: 1,
        pageSize: 5,
      }),
    );

    const sortedRowsBefore = screen.getAllByRole('row');
    expect(sortedRowsBefore[1]).toHaveTextContent('300750');

    await user.click(screen.getByRole('button', { name: /强度/ }));

    const sortedRowsAfter = screen.getAllByRole('row');
    expect(sortedRowsAfter[1]).toHaveTextContent('002594');

    const tdxPanel = screen.getByTestId('tdx-scan-panel');

    await user.selectOptions(within(tdxPanel).getByLabelText('页大小'), '2');
    await user.clear(within(tdxPanel).getByLabelText('页码'));
    await user.type(within(tdxPanel).getByLabelText('页码'), '2');
    await user.click(screen.getByRole('button', { name: '开始扫描' }));

    expect(mockedRequestTdxScan).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 2,
        pageSize: 2,
      }),
    );

    await user.click(within(screen.getByTestId('tdx-result-table')).getAllByRole('button', { name: '加入股票池' })[0]!);

    expect(await screen.findByRole('status')).toHaveTextContent('已将 1 只股票加入');
    expect(getActivePool()?.stocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stockCode: '002594',
          addReason: 'tdx_signal',
          addDate: '2026-03-21',
          addSource: expect.stringContaining('信号日'),
        }),
      ]),
    );
  });

  it('shows scan source and cache notice when the service degrades gracefully', async () => {
    const user = userEvent.setup();

    mockedRequestTdxScan.mockResolvedValueOnce({
      ...createTdxResponse(1),
      meta: {
        cached: true,
        universeSource: 'limit_up_fallback',
        universeSize: 87,
        notice: '主市场池暂不可用，当前展示的是最近涨停活跃股降级结果，并命中了 10 分钟内缓存。',
      },
    });

    renderInWorkbench(<StrategyPageClient demoMode />);

    await user.click(screen.getByRole('button', { name: '开始扫描' }));

    expect(await screen.findByTestId('tdx-scan-notice')).toHaveTextContent('主市场池暂不可用');
    expect(screen.getByText('扫描宇宙 涨停活跃降级')).toBeInTheDocument();
    expect(screen.getByText('宇宙样本 87')).toBeInTheDocument();
    expect(screen.getByText('短期缓存命中')).toBeInTheDocument();
  });

  it('shows limit-up results and error state', async () => {
    const user = userEvent.setup();

    renderInWorkbench(<StrategyPageClient demoMode />);

    await user.click(screen.getByRole('tab', { name: /涨停板筛选/ }));
    await user.click(screen.getByRole('button', { name: '执行筛选' }));

    expect(await screen.findByTestId('limit-up-result-table')).toBeInTheDocument();
    expect(mockedRequestLimitUp).toHaveBeenCalledWith(
      expect.objectContaining({
        lookbackDays: 30,
        minLimitUpCount: 1,
        page: 1,
        pageSize: 5,
        sortBy: 'limitUpCount',
        sortOrder: 'desc',
      }),
    );

    mockedRequestLimitUp.mockRejectedValueOnce({
      code: 'API_ERROR',
      message: '涨停筛选失败，请稍后重试。',
    });

    await user.click(screen.getByRole('button', { name: '执行筛选' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('涨停筛选失败');

    await user.click(screen.getByRole('button', { name: /涨停次数/ }));
    await user.click(screen.getByRole('button', { name: '执行筛选' }));

    expect(mockedRequestLimitUp).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sortBy: 'limitUpCount',
        sortOrder: 'asc',
      }),
    );

    const rowButtons = within(screen.getByTestId('limit-up-result-table')).getAllByRole('button', {
      name: '加入股票池',
    });

    await user.click(rowButtons[0]!);

    expect(await screen.findByRole('status')).toHaveTextContent('已将 1 只股票加入');
    expect(getActivePool()?.stocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          addReason: 'limit_up',
          addDate: '2026-03-21',
          addSource: expect.stringContaining('最近涨停'),
        }),
      ]),
    );
  });

  it('shows estimated progress while tdx and limit-up requests are in flight', async () => {
    const user = userEvent.setup();
    const tdxDeferred = createDeferredPromise<ReturnType<typeof createTdxResponse>>();
    const limitUpDeferred = createDeferredPromise<ReturnType<typeof createLimitUpResponse>>();

    mockedRequestTdxScan.mockReturnValueOnce(
      tdxDeferred.promise as ReturnType<typeof mockedRequestTdxScan>,
    );
    mockedRequestLimitUp.mockReturnValueOnce(
      limitUpDeferred.promise as ReturnType<typeof mockedRequestLimitUp>,
    );

    renderInWorkbench(<StrategyPageClient demoMode />);

    await user.click(screen.getByRole('button', { name: '开始扫描' }));

    expect(await screen.findByTestId('tdx-progress')).toHaveTextContent('预计 25-40 秒');

    tdxDeferred.resolve(createTdxResponse(1));

    expect(await screen.findByTestId('tdx-result-table')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /涨停板筛选/ }));
    await user.click(screen.getByRole('button', { name: '执行筛选' }));

    expect(await screen.findByTestId('limit-up-progress')).toHaveTextContent('预计 4-10 秒');

    limitUpDeferred.resolve(createLimitUpResponse(1));

    expect(await screen.findByTestId('limit-up-result-table')).toBeInTheDocument();
  });
});
