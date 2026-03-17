import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HomePage from '@/app/page';
import type { QimenApiSuccessResponse } from '@/api/qimen';

const successPayload: QimenApiSuccessResponse = {
  stock: {
    code: '600519',
    name: '贵州茅台',
    market: 'SH',
    listingDate: '2001-08-27',
    listingTime: '09:30',
    timeSource: 'default',
  },
  qimen: {
    yinYang: '阴',
    ju: 2,
    valueStar: '天心星',
    valueDoor: '开门',
    palaces: [
      { index: 0, position: 4, name: '巽', star: '天芮星', door: '休门', god: '太阴' },
      { index: 1, position: 9, name: '离', star: '天柱星', door: '生门', god: '腾蛇' },
      { index: 2, position: 2, name: '坤', star: '天心星', door: '伤门', god: '值符' },
      { index: 3, position: 3, name: '震', star: '天英星', door: '开门', god: '六合' },
      { index: 4, position: 5, name: '中', star: '--', door: '--', god: '--' },
      { index: 5, position: 7, name: '兑', star: '天蓬星', door: '杜门', god: '九天' },
      { index: 6, position: 8, name: '艮', star: '天辅星', door: '惊门', god: '白虎' },
      { index: 7, position: 1, name: '坎', star: '天冲星', door: '死门', god: '玄武' },
      { index: 8, position: 6, name: '乾', star: '天任星', door: '景门', god: '九地' },
    ],
  },
};

describe('HomePage', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeAll(() => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: fetchMock,
      writable: true,
    });
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: originalFetch,
      writable: true,
    });
  });

  it('renders the success state after a valid submission', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => successPayload,
    } as Response);

    render(<HomePage />);
    await user.click(screen.getByRole('button', { name: '开始奇门排盘' }));

    expect(await screen.findByText('上市时家奇门摘要')).toBeInTheDocument();
    expect(screen.getByText('贵州茅台 (600519)')).toBeInTheDocument();
    expect(screen.getAllByTestId('qimen-palace')).toHaveLength(9);
  });

  it('renders the error state when the API returns an error', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: {
          code: 'INVALID_STOCK_CODE',
          message: '请输入 6 位 A 股股票代码。',
        },
      }),
    } as Response);

    render(<HomePage />);

    await user.clear(screen.getByLabelText('股票代码'));
    await user.type(screen.getByLabelText('股票代码'), '12');
    await user.click(screen.getByRole('button', { name: '开始奇门排盘' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '请输入 6 位 A 股股票代码。',
    );
    expect(screen.queryByText('上市时家奇门摘要')).not.toBeInTheDocument();
  });
});
