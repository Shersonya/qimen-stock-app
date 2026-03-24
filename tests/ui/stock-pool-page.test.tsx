import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StockPoolPageClient } from '@/components/StockPoolPageClient';
import { requestBatchDiagnosis } from '@/lib/client-api';
import type { PoolStockDiagnosis } from '@/lib/contracts/strategy';
import { createPool, getActivePool } from '@/lib/services/stock-pool';
import { renderInWorkbench } from '@/tests/ui/render-workbench';

const mockPathname = jest.fn(() => '/stock-pool');

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

jest.mock('@/lib/client-api', () => ({
  requestBatchDiagnosis: jest.fn(),
}));

const mockedRequestBatchDiagnosis = jest.mocked(requestBatchDiagnosis);

function createDiagnosis(stockCode: string, overrides: Partial<PoolStockDiagnosis> = {}): PoolStockDiagnosis {
  return {
    stockCode,
    stockName: stockCode === '600519' ? '贵州茅台' : stockCode === '300750' ? '宁德时代' : stockCode,
    diagnosisTime: '2026-03-21T10:00:00.000Z',
    rating: 'A',
    totalScore: 82,
    riskLevel: '中',
    action: 'WATCH',
    actionLabel: '观察',
    successProbability: 74,
    summary: '结构偏强',
    ...overrides,
  };
}

describe('StockPoolPageClient', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPathname.mockReset();
    mockPathname.mockReturnValue('/stock-pool');
    mockedRequestBatchDiagnosis.mockReset();
    setViewportWidth(1024);
    mockedRequestBatchDiagnosis.mockImplementation(async ({ stockCodes }) =>
      stockCodes.map((stockCode, index) =>
        createDiagnosis(stockCode, {
          rating: index === 0 ? 'S' : 'A',
          totalScore: index === 0 ? 92 : 82,
          action: index === 0 ? 'BUY' : 'WATCH',
          actionLabel: index === 0 ? '买入' : '观察',
          successProbability: index === 0 ? 86 : 74,
        }),
      ),
    );
  });

  it('renders a demo pool with seeded data', async () => {
    renderInWorkbench(<StockPoolPageClient demoMode />);

    expect(await screen.findByTestId('stock-pool-page')).toHaveTextContent('Demo 股票池已就绪');

    await waitFor(() => {
      expect(screen.getByTestId('pool-manager-panel')).toHaveTextContent('核心观察池');
      expect(screen.getByTestId('snapshot-panel')).toHaveTextContent('份快照可对比');
    });
  });

  it('removes selected stocks and runs diagnosis for the remaining pool', async () => {
    const user = userEvent.setup();

    createPool('验收池', [
      {
        stockCode: '600519',
        stockName: '贵州茅台',
        market: 'SH',
        addReason: 'manual',
        addDate: '2026-03-21',
      },
      {
        stockCode: '300750',
        stockName: '宁德时代',
        market: 'CYB',
        addReason: 'tdx_signal',
        addDate: '2026-03-21',
        addSource: '美阳阳扫描',
        tdxSignalType: 'meiYangYang',
      },
    ]);

    renderInWorkbench(<StockPoolPageClient />);

    const poolTable = await screen.findByTestId('stock-pool-table');

    expect(poolTable).toHaveTextContent('600519');
    expect(poolTable).toHaveTextContent('300750');

    await user.click(screen.getByLabelText('选择 300750'));
    await user.click(screen.getByRole('button', { name: '剔除选中' }));

    await waitFor(() => {
      expect(screen.getByTestId('removed-stocks-panel')).toHaveTextContent('300750');
    });

    expect(screen.getByTestId('pool-manager-panel')).not.toHaveTextContent('300750 宁德时代');

    await user.click(screen.getByLabelText('选择 600519'));
    await user.click(screen.getByRole('button', { name: '诊断选中 (1)' }));

    expect(await screen.findByTestId('diagnosis-compare-table')).toHaveTextContent('贵州茅台');

    const activePool = getActivePool();

    expect(activePool?.stocks[0]?.diagnosisResult?.rating).toBe('S');
    expect(activePool?.stocks[0]?.diagnosisResult?.stockName).toBe('贵州茅台');
    expect(mockedRequestBatchDiagnosis).toHaveBeenCalledWith({
      stockCodes: ['600519'],
      poolId: activePool?.id,
    });
  });

  it('supports saving snapshots after pool changes', async () => {
    const user = userEvent.setup();

    createPool('快照池', [
      {
        stockCode: '000001',
        stockName: '平安银行',
        market: 'SZ',
        addReason: 'manual',
        addDate: '2026-03-21',
      },
    ]);

    renderInWorkbench(<StockPoolPageClient />);

    await user.click(screen.getByRole('button', { name: '保存快照' }));

    await waitFor(() => {
      expect(screen.getByTestId('snapshot-panel')).toHaveTextContent('1 份快照可对比');
    });

    const snapshotPanel = screen.getByTestId('snapshot-panel');

    expect(within(snapshotPanel).getByText(/当前新增/)).toBeInTheDocument();
  });

  it('switches between mobile stock-pool sections without long scrolling', async () => {
    const user = userEvent.setup();

    setViewportWidth(375);
    renderInWorkbench(<StockPoolPageClient demoMode />);

    expect(await screen.findByTestId('stock-pool-mobile-layout')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /股票池/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await waitFor(() => {
      expect(screen.getByTestId('pool-manager-panel')).toHaveTextContent('核心观察池');
    });
    expect(screen.getByTestId('stock-pool-mobile-section-caption')).toHaveTextContent(
      '股票池 · 增删、导入、快照',
    );
    expect(screen.getByTestId('stock-pool-mobile-stock-list')).toBeInTheDocument();
    expect(screen.queryByTestId('stock-pool-table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /批量诊断/ }));

    expect(screen.getByTestId('stock-pool-mobile-section-caption')).toHaveTextContent(
      '批量诊断 · 执行与对比',
    );
    expect(screen.getByTestId('batch-diagnosis-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('stock-pool-table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /历史留痕/ }));

    expect(screen.getByTestId('stock-pool-mobile-section-caption')).toHaveTextContent(
      '历史留痕 · 剔除与快照',
    );
    expect(screen.getByTestId('removed-stocks-panel')).toBeInTheDocument();
    expect(screen.getByTestId('snapshot-panel')).toBeInTheDocument();
  });
});
