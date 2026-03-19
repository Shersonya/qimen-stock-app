import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DiagnosisReportPageClient } from '@/components/DiagnosisReportPageClient';
import { DiagnosisSearchPageClient } from '@/components/DiagnosisSearchPageClient';
import { requestQimenAnalysis } from '@/lib/client-api';
import { getDemoQimenResponse } from '@/lib/demo-fixtures';
import { renderInWorkbench } from '@/tests/ui/render-workbench';

const mockPush = jest.fn();
const mockPathname = jest.fn(() => '/diagnosis');

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
  });

  it('opens the selected stock report from the diagnosis entry page', async () => {
    const user = userEvent.setup();

    renderInWorkbench(<DiagnosisSearchPageClient />);

    await user.click(screen.getByRole('button', { name: '打开诊断报告' }));

    expect(mockPush).toHaveBeenCalledWith('/diagnosis/600519');
  });

  it('renders the five-step report, auxiliary view, and PDF export flow', async () => {
    const user = userEvent.setup();
    const popup = {
      document: {
        open: jest.fn(),
        write: jest.fn(),
        close: jest.fn(),
        title: '',
      },
      focus: jest.fn(),
      print: jest.fn(),
    };

    mockPathname.mockReturnValue('/diagnosis/600519');
    jest.spyOn(window, 'open').mockReturnValue(popup as never);

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

    await waitFor(() => {
      expect(window.open).toHaveBeenCalled();
    });
  });
});
