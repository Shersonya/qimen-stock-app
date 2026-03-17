import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HomePage from '@/app/page';
import type { QimenApiSuccessResponse } from '@/lib/contracts/qimen';

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
  plum: {
    status: 'ready',
    priceBasis: 'open',
    priceValue: '1468.00',
    upperNumber: 1468,
    lowerNumber: 0,
    movingLine: 4,
    upperTrigram: '震',
    lowerTrigram: '坤',
    original: {
      code: '震坤',
      name: '雷地豫',
      words: '利建侯行师。',
      whiteWords: '《豫》卦利于封建诸侯和行军作战。',
      picture: '雷出地奋，豫。',
      whitePicture: '雷从地中奋起，是豫卦的卦象。',
      stockSuggestion: '震荡后转强。',
      yaoci: '初六：鸣豫，凶。',
    },
    mutual: {
      code: '坎艮',
      name: '水山蹇',
      words: '利西南，不利东北。',
      whiteWords: '《蹇》卦利于西南，不利于东北。',
      picture: '山上有水，蹇。',
      whitePicture: '山上有水，是蹇卦的卦象。',
      stockSuggestion: '遇阻观望。',
      yaoci: '六二：王臣蹇蹇。',
    },
    changed: {
      code: '兑坤',
      name: '泽地萃',
      words: '亨，王假有庙。',
      whiteWords: '《萃》卦亨通，君王来到宗庙。',
      picture: '泽上于地，萃。',
      whitePicture: '湖泽汇聚于地上，是萃卦的卦象。',
      stockSuggestion: '量能聚集。',
      yaoci: '九四：大吉，无咎。',
    },
  },
};

const altSuccessPayload: QimenApiSuccessResponse = {
  stock: {
    code: '000001',
    name: '平安银行',
    market: 'SZ',
    listingDate: '1991-04-03',
    listingTime: '09:30',
    timeSource: 'default',
  },
  qimen: successPayload.qimen,
  plum: successPayload.plum,
};

const plumUnavailablePayload: QimenApiSuccessResponse = {
  stock: altSuccessPayload.stock,
  qimen: altSuccessPayload.qimen,
  plum: {
    status: 'unavailable',
    code: 'PLUM_PRICE_UNAVAILABLE',
    message: '当日开盘价缺失，暂时无法起梅花卦。',
  },
};

const marketScreenSuccessPayload = {
  total: 1,
  page: 1,
  pageSize: 50,
  items: [
    {
      stock: {
        code: '000001',
        name: '平安银行',
        market: 'SZ',
        listingDate: '1991-04-03',
      },
      hourWindow: {
        stem: '甲',
        palaceName: '坎',
        position: 1,
        door: '开门',
        star: '天冲星',
        god: '玄武',
      },
      dayWindow: {
        stem: '乙',
        palaceName: '离',
        position: 9,
        door: '生门',
        star: '天心星',
        god: '六合',
      },
      monthWindow: {
        stem: '丙',
        palaceName: '兑',
        position: 7,
        door: '景门',
        star: '天任星',
        god: '九天',
      },
    },
  ],
};

describe('HomePage', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  const originalMatchMedia = window.matchMedia;

  beforeAll(() => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: fetchMock,
      writable: true,
    });
  });

  afterEach(() => {
    fetchMock.mockReset();
    window.localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
      writable: true,
    });
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
    await user.click(screen.getByRole('button', { name: '开始排盘分析' }));

    expect(await screen.findByText('股票排盘摘要')).toBeInTheDocument();
    expect(screen.getByText('贵州茅台 (600519)')).toBeInTheDocument();
    expect(screen.getAllByTestId('qimen-palace')).toHaveLength(9);
    expect(screen.getByRole('tab', { name: '奇门盘' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '梅花易数' })).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: '开始排盘分析' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '请输入 6 位 A 股股票代码。',
    );
    expect(screen.queryByText('股票排盘摘要')).not.toBeInTheDocument();
  });

  it('stores successful queries in recent history and can replay them', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => altSuccessPayload,
    } as Response);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => altSuccessPayload,
    } as Response);

    render(<HomePage />);

    await user.clear(screen.getByLabelText('股票代码'));
    await user.type(screen.getByLabelText('股票代码'), '000001');
    await user.click(screen.getByRole('button', { name: '开始排盘分析' }));

    const recentButton = await screen.findByRole('button', { name: '000001' });

    expect(window.localStorage.getItem('qimen-stock-recent-codes')).toBe(
      JSON.stringify(['000001']),
    );

    await user.click(recentButton);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body ?? '{}')).stockCode,
    ).toBe('000001');
  });

  it('renders the market screening panel after the qimen result section', () => {
    render(<HomePage />);

    const resultSection = screen.getByTestId('qimen-result-section');
    const marketScreenPanel = screen.getByTestId('market-screen-panel');

    expect(
      resultSection.compareDocumentPosition(marketScreenPanel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('enables market screening after selecting filters and renders the desktop results table', async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input) => {
      if (String(input) === '/api/market-screen') {
        return {
          ok: true,
          json: async () => marketScreenSuccessPayload,
        } as Response;
      }

      throw new Error(`Unexpected fetch call: ${String(input)}`);
    });

    render(<HomePage />);

    const submitButton = screen.getByRole('button', { name: '开始筛盘' });

    expect(submitButton).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('时干用神 门'), '开门');

    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    expect(await screen.findByText('共筛得 1 只标的')).toBeInTheDocument();
    expect(screen.getByText('平安银行')).toBeInTheDocument();
    expect(screen.getByText('甲干落坎宫')).toBeInTheDocument();
    expect(screen.getByTestId('market-screen-table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '起局' })).toBeInTheDocument();
  });

  it('can launch a stock directly from screened results and keeps the screening result visible', async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input) => {
      if (String(input) === '/api/market-screen') {
        return {
          ok: true,
          json: async () => marketScreenSuccessPayload,
        } as Response;
      }

      if (String(input) === '/api/qimen') {
        return {
          ok: true,
          json: async () => altSuccessPayload,
        } as Response;
      }

      throw new Error(`Unexpected fetch call: ${String(input)}`);
    });

    render(<HomePage />);

    await user.selectOptions(screen.getByLabelText('时干用神 门'), '开门');
    await user.click(screen.getByRole('button', { name: '开始筛盘' }));

    expect(await screen.findByText('共筛得 1 只标的')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '直接起局' }));

    expect(await screen.findByText('股票排盘摘要')).toBeInTheDocument();
    expect(screen.getByText('平安银行 (000001)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('000001')).toBeInTheDocument();
    expect(screen.getByText('共筛得 1 只标的')).toBeInTheDocument();
    expect(window.localStorage.getItem('qimen-stock-recent-codes')).toBe(
      JSON.stringify(['000001']),
    );
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body ?? '{}')).stockCode,
    ).toBe('000001');
  });

  it('switches to the plum tab and renders the plum analysis details', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => successPayload,
    } as Response);

    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: '开始排盘分析' }));
    await screen.findByText('股票排盘摘要');

    await user.click(screen.getByRole('tab', { name: '梅花易数' }));

    expect(screen.getByRole('tab', { name: '梅花易数' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('开盘价起卦结果')).toBeInTheDocument();
    expect(screen.getByText('1468.00')).toBeInTheDocument();
    expect(screen.getByText('雷地豫')).toBeInTheDocument();
    expect(screen.getByText('水山蹇')).toBeInTheDocument();
    expect(screen.getByText('泽地萃')).toBeInTheDocument();
  });

  it('shows a plum unavailable state without hiding the qimen result', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => plumUnavailablePayload,
    } as Response);

    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: '开始排盘分析' }));
    await screen.findByText('股票排盘摘要');

    expect(screen.getByText('平安银行 (000001)')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '梅花易数' }));

    expect(await screen.findByText('梅花暂不可用')).toBeInTheDocument();
    expect(screen.getByText('当日开盘价缺失，暂时无法起梅花卦。')).toBeInTheDocument();
  });

  it('renders screened results as cards on mobile viewports', async () => {
    const user = userEvent.setup();

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === '(max-width: 767px)',
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
      writable: true,
    });

    fetchMock.mockImplementation(async (input) => {
      if (String(input) === '/api/market-screen') {
        return {
          ok: true,
          json: async () => marketScreenSuccessPayload,
        } as Response;
      }

      throw new Error(`Unexpected fetch call: ${String(input)}`);
    });

    render(<HomePage />);

    await user.selectOptions(screen.getByLabelText('时干用神 门'), '开门');
    await user.click(screen.getByRole('button', { name: '开始筛盘' }));

    expect(await screen.findByTestId('market-screen-mobile-list')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '直接起局' })).toHaveLength(1);
  });
});
