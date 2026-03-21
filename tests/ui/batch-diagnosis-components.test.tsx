import { fireEvent, screen } from '@testing-library/react';

import { BatchDiagnosisPanel } from '@/components/BatchDiagnosisPanel';
import { DiagnosisCompareTable } from '@/components/DiagnosisCompareTable';
import { renderInWorkbench } from '@/tests/ui/render-workbench';

const mockPathname = jest.fn(() => '/stock-pool');

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('batch diagnosis components', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPathname.mockReset();
    mockPathname.mockReturnValue('/stock-pool');
  });

  it('renders progress and stale hints in the diagnosis panel', () => {
    const onRunSelected = jest.fn();
    const onRunAll = jest.fn();

    renderInWorkbench(
      <BatchDiagnosisPanel
        error={null}
        isRunning={false}
        onRunAll={onRunAll}
        onRunSelected={onRunSelected}
        progress={{
          total: 10,
          completed: 8,
          failed: 1,
          currentStock: '000001',
          results: [],
        }}
        selectedCount={3}
        staleCount={2}
        totalCount={10}
      />,
    );

    expect(screen.getByTestId('batch-diagnosis-panel')).toHaveTextContent('有 2 条诊断结果超过 24 小时');
    expect(screen.getByText(/尚未开始批量诊断/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '诊断选中 (3)' }));

    expect(onRunSelected).toHaveBeenCalled();
    expect(onRunAll).not.toHaveBeenCalled();
  });

  it('sorts the comparison table by different metrics', () => {
    renderInWorkbench(
      <DiagnosisCompareTable
        data={{
          generatedAt: '2026-03-21T00:00:00.000Z',
          sortBy: 'totalScore',
          items: [
            {
              stockCode: '000001',
              stockName: '平安银行',
              rating: 'A',
              totalScore: 81,
              riskLevel: '中',
              action: 'WATCH',
              actionLabel: '观察',
              successProbability: 72,
              summary: '结构偏强',
              diagnosisTime: new Date().toISOString(),
              stale: false,
            },
            {
              stockCode: '600036',
              stockName: '招商银行',
              rating: 'S',
              totalScore: 92,
              riskLevel: '低',
              action: 'BUY',
              actionLabel: '买入',
              successProbability: 85,
              summary: '趋势共振',
              diagnosisTime: new Date().toISOString(),
              stale: true,
            },
          ],
        }}
      />,
    );

    expect(screen.getByTestId('diagnosis-compare-table')).toHaveTextContent('招商银行');

    fireEvent.click(screen.getByRole('button', { name: '成功率' }));

    expect(screen.getByTestId('diagnosis-compare-table')).toHaveTextContent('待刷新');
  });
});
