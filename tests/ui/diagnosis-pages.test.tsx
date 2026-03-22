import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DiagnosisReportPageClient } from '@/components/DiagnosisReportPageClient';
import { DiagnosisSearchPageClient } from '@/components/DiagnosisSearchPageClient';
import { requestQimenAnalysis } from '@/lib/client-api';
import { getDemoQimenResponse } from '@/lib/demo-fixtures';
import { renderInWorkbench } from '@/tests/ui/render-workbench';

const mockPush = jest.fn();
const mockPathname = jest.fn(() => '/diagnosis');

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
    writable: true,
  });
  window.dispatchEvent(new Event('resize'));
}

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

jest.mock('@/lib/client-api', () => ({
  requestMarketDashboard: jest.fn(),
  requestMarketScreen: jest.fn(),
  requestQimenAnalysis: jest.fn(),
}));

const mockedRequestQimenAnalysis = jest.mocked(requestQimenAnalysis);

describe('Diagnosis pages', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPush.mockReset();
    mockPathname.mockReturnValue('/diagnosis');
    mockedRequestQimenAnalysis.mockReset();
    mockedRequestQimenAnalysis.mockResolvedValue(getDemoQimenResponse('600519'));
    setViewportWidth(1024);
  });

  it('opens the selected stock report from the diagnosis entry page', async () => {
    const user = userEvent.setup();

    renderInWorkbench(<DiagnosisSearchPageClient />);

    await user.click(screen.getByRole('button', { name: '打开诊断报告' }));

    expect(mockPush).toHaveBeenCalledWith('/diagnosis/600519');
  });

  it('renders the five-step report, auxiliary view, and PDF export flow', async () => {
    const user = userEvent.setup();

    mockPathname.mockReturnValue('/diagnosis/600519');

    renderInWorkbench(<DiagnosisReportPageClient stockCode="600519" />);

    expect(await screen.findByText('全局定调')).toBeInTheDocument();
    expect(screen.getByText('用神定位')).toBeInTheDocument();
    expect(screen.getByText('三宫深度解析')).toBeInTheDocument();
    expect(screen.getByText('综合决策')).toBeInTheDocument();
    expect(screen.getByText('最终建议')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '辅助视角' }));

    expect(await screen.findByTestId('diagnosis-aux-view')).toBeInTheDocument();
    expect(screen.getByTestId('reference-board-panel')).toBeInTheDocument();
    expect(screen.getByTestId('diagnosis-palace-grid')).toHaveAttribute(
      'data-grid-layout',
      'expanded-palace-grid',
    );
    expect(screen.getByTestId('reference-desktop-grid')).toHaveAttribute(
      'data-grid-layout',
      'expanded-palace-grid',
    );
    expect(screen.getByTestId('diagnosis-palace-grid').className).toContain(
      '[grid-template-columns:repeat(3,minmax(0,1fr))]',
    );
    expect(screen.getByTestId('diagnosis-palace-grid').className).toContain(
      '[grid-template-rows:repeat(3,minmax(14rem,auto))]',
    );
    expect(screen.getByTestId('reference-desktop-grid').className).toContain(
      '[grid-template-columns:repeat(3,minmax(0,1fr))]',
    );
    expect(screen.getByTestId('reference-desktop-grid').className).toContain(
      '[grid-template-rows:repeat(3,minmax(14rem,auto))]',
    );
    expect(screen.queryByTestId('reference-board-grid')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '诊断报告' }));
    await user.click(screen.getByRole('button', { name: '导出 PDF' }));

    const printFrame = await screen.findByTestId('diagnosis-print-frame');
    expect(printFrame).toHaveAttribute('title', '贵州茅台-奇门诊断报告');
    expect(printFrame).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the mobile palace explorer on compact screens', async () => {
    setViewportWidth(375);

    renderInWorkbench(<DiagnosisReportPageClient stockCode="600519" />);

    expect(await screen.findByTestId('diagnosis-mobile-layout')).toBeInTheDocument();
    expect(screen.getByTestId('diagnosis-mobile-overview')).toBeInTheDocument();
    expect(screen.getByTestId('diagnosis-mobile-detail-card')).toBeInTheDocument();
    expect(screen.queryByTestId('diagnosis-palace-grid')).not.toBeInTheDocument();
  });
});
