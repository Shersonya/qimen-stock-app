import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HomePage from '@/app/page';
import type {
  BacktestApiSuccessResponse,
  MarketScreenSuccessResponse,
  QimenApiSuccessResponse,
} from '@/lib/contracts/qimen';

const patternAnalysis = {
  totalScore: 25,
  rating: 'A' as const,
  energyLabel: '高强度(趋势共振)',
  summary: '主力资金在利好驱动下入场，短期动能强劲。',
  corePatternsLabel: '[A]青龙返首(坎1宫)',
  bullishSignal: true,
  predictedDirection: '涨' as const,
  matchedPatternNames: ['青龙返首', '真诈格'],
  hourPatternNames: ['青龙返首'],
  counts: {
    COMPOSITE: 1,
    A: 1,
    B: 0,
    C: 0,
  },
  invalidPalaces: [
    {
      palaceId: 8,
      palaceLabel: '艮8宫',
      reasons: ['击刑'],
      topEvilPatterns: [],
    },
  ],
  palaceAnnotations: [
    {
      palaceIndex: 0,
      palacePosition: 4,
      palaceName: '巽',
      tone: 'gold' as const,
      isHourPalace: false,
      isValueDoorPalace: false,
      isShengDoorPalace: false,
      patternNames: ['真诈格'],
      patterns: [
        {
          name: '真诈格',
          level: 'COMPOSITE' as const,
          weight: 15,
          meaning: '良好门势、三奇与太阴同宫，长线利好或价值重估信号更强。',
          palaceId: 4,
          palaceLabel: '巽4宫',
        },
      ],
      invalidReasons: [],
      topEvilPatterns: [],
    },
    {
      palaceIndex: 7,
      palacePosition: 1,
      palaceName: '坎',
      tone: 'gold' as const,
      isHourPalace: true,
      isValueDoorPalace: false,
      isShengDoorPalace: false,
      patternNames: ['青龙返首'],
      patterns: [
        {
          name: '青龙返首',
          level: 'A' as const,
          weight: 10,
          meaning: '主力资金在利好驱动下入场，短期动能强劲。',
          palaceId: 1,
          palaceLabel: '坎1宫',
        },
      ],
      invalidReasons: [],
      topEvilPatterns: [],
    },
    {
      palaceIndex: 6,
      palacePosition: 8,
      palaceName: '艮',
      tone: 'muted' as const,
      isHourPalace: false,
      isValueDoorPalace: false,
      isShengDoorPalace: false,
      patternNames: [],
      patterns: [],
      invalidReasons: ['击刑'],
      topEvilPatterns: [],
    },
  ],
};

const deepDiagnosis = {
  basis: {
    stockCode: '600519',
    stockName: '贵州茅台',
    analysisTime: '2001-08-27T01:30:00.000Z',
    yearGanzhi: '辛巳',
    monthGanzhi: '丙申',
    dayGanzhi: '壬戌',
    hourGanzhi: '乙巳',
  },
  coreConclusion: '此局生门对时干有承接，当前更偏向等待确认后试多。',
  action: 'BUY' as const,
  actionLabel: '强烈看涨 / 可考虑买入',
  successProbability: 68,
  riskLevel: '中' as const,
  firstImpression: '全局不伏吟，日空子丑，时空寅卯，整体仍有转圜空间。',
  globalPattern: {
    isFuyin: false,
    isFanyin: false,
    isWubuyushi: false,
    rikong: '子丑',
    shikong: '寅卯',
    summary: '测试摘要',
  },
  useShen: [
    {
      kind: 'dayStem' as const,
      label: '日干',
      value: '壬',
      palacePosition: 9,
      palaceName: '离',
      direction: '正南',
      summary: '日干壬落离9宫。',
    },
    {
      kind: 'hourStem' as const,
      label: '时干',
      value: '乙',
      palacePosition: 1,
      palaceName: '坎',
      direction: '正北',
      summary: '时干乙落坎1宫。',
    },
    {
      kind: 'shengDoor' as const,
      label: '核心用神',
      value: '生门',
      palacePosition: 9,
      palaceName: '离',
      direction: '正南',
      summary: '生门落离9宫。',
    },
    {
      kind: 'valueDoor' as const,
      label: '值使门',
      value: '开门',
      palacePosition: 3,
      palaceName: '震',
      direction: '正东',
      summary: '值使门落震3宫。',
    },
  ],
  palaceReadings: [
    {
      title: '生门宫',
      role: '利润与结果',
      palacePosition: 9,
      palaceName: '离',
      skyGan: '壬',
      groundGan: '丁',
      star: '天柱星',
      door: '生门',
      god: '腾蛇',
      emptyMarkers: [],
      relationToDayStemPalace: '比和',
      tianShi: '天柱主阻力与分歧。',
      diLi: '离9宫属火，相对日干宫为比和。',
      renHe: '生门主利润与增量。',
      shenZhu: '腾蛇多虚实难辨。',
      stemPattern: '壬丁相见，宜结合门星神综合判断。',
      summary: '生门宫综合偏积极。',
    },
  ],
  decisionRationale: ['生门宫与时干宫能形成承接。'],
  outlooks: [
    { horizon: '明日' as const, trend: '偏多' as const, detail: '先看时干宫表现。' },
    { horizon: '一周' as const, trend: '震荡' as const, detail: '值使门附近更容易变盘。' },
    { horizon: '一月' as const, trend: '偏多' as const, detail: '若生门持续承托，月内偏强。' },
    { horizon: '一季' as const, trend: '震荡' as const, detail: '节气转换后再验证。' },
  ],
  keyTimingHints: ['重点关注子丑、寅卯填实时段。'],
  actionGuide: ['等待时干宫确认后分批试仓。'],
  note: '仅供功能演示。',
};

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
  patternAnalysis,
  deepDiagnosis,
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
  patternAnalysis: {
    ...patternAnalysis,
    bullishSignal: false,
    predictedDirection: '观望',
  },
  deepDiagnosis: {
    ...deepDiagnosis,
    action: 'WATCH',
    actionLabel: '观望',
  },
};

const plumUnavailablePayload: QimenApiSuccessResponse = {
  stock: altSuccessPayload.stock,
  qimen: altSuccessPayload.qimen,
  plum: {
    status: 'unavailable',
    code: 'PLUM_PRICE_UNAVAILABLE',
    message: '当日开盘价缺失，暂时无法起梅花卦。',
  },
  patternAnalysis: altSuccessPayload.patternAnalysis,
  deepDiagnosis: altSuccessPayload.deepDiagnosis,
};

const marketScreenSuccessPayload: MarketScreenSuccessResponse = {
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
        sector: '银行',
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
      patternSummary: {
        totalScore: 36,
        rating: 'S',
        energyLabel: '顶级机会(资金驱动)',
        summary: '主力资金在利好驱动下入场，短期动能强劲。',
        corePatternsLabel: '[COMPOSITE]真诈格(离9宫)、[A]青龙返首(坎1宫)',
        matchedPatternNames: ['真诈格', '青龙返首'],
        hourPatternNames: ['青龙返首'],
        counts: {
          COMPOSITE: 1,
          A: 1,
          B: 0,
          C: 0,
        },
        bullishSignal: true,
        predictedDirection: '涨',
        isEligible: true,
        exclusionReason: null,
        palacePositions: [1, 9],
        matches: [
          {
            name: '青龙返首',
            level: 'A',
            weight: 10,
            meaning: '主力资金在利好驱动下入场，短期动能强劲。',
            palaceId: 1,
            palaceLabel: '坎1宫',
          },
        ],
        invalidPalaces: [],
      },
    },
  ],
};

const backtestSuccessPayload: BacktestApiSuccessResponse = {
  generatedAt: '2026-03-18T10:00:00.000Z',
  lookbackDays: 60,
  range: {
    from: '2026-01-01',
    to: '2026-03-18',
  },
  strategyLabel: '当前筛选策略',
  predictionRule: '时干用神落生门或值符定义为涨，其余默认记为观望。',
  includedStocks: 1,
  skippedStocks: [],
  summary: {
    label: 'overall',
    totalSamples: 10,
    evaluatedSamples: 10,
    hitSamples: 6,
    missSamples: 4,
    hitRate: 0.6,
    predictedDirectionCounts: {
      涨: 10,
      跌: 0,
      观望: 0,
    },
    actualDirectionCounts: {
      涨: 6,
      跌: 4,
      观望: 0,
    },
  },
  byStock: {
    '000001': {
      label: '000001 平安银行',
      totalSamples: 10,
      hitSamples: 6,
      missSamples: 4,
      hitRate: 0.6,
      predictedDirectionCounts: {
        涨: 10,
        跌: 0,
        观望: 0,
      },
      actualDirectionCounts: {
        涨: 6,
        跌: 4,
        观望: 0,
      },
    },
  },
  byStrategy: {
    '当前筛选策略': {
      label: '当前筛选策略',
      totalSamples: 10,
      hitSamples: 6,
      missSamples: 4,
      hitRate: 0.6,
      predictedDirectionCounts: {
        涨: 10,
        跌: 0,
        观望: 0,
      },
      actualDirectionCounts: {
        涨: 6,
        跌: 4,
        观望: 0,
      },
    },
  },
  results: [],
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

    expect(
      await screen.findByRole('heading', { name: '贵州茅台 上市时刻九宫盘' }),
    ).toBeInTheDocument();
    expect(screen.getByText('贵州茅台 (600519)')).toBeInTheDocument();
    expect(screen.getByTestId('qimen-result-section')).toBeInTheDocument();
    expect(screen.getAllByTestId('qimen-palace')).toHaveLength(9);
    expect(screen.getByTestId('pattern-analysis-panel')).toBeInTheDocument();
    expect(screen.getByTestId('deep-diagnosis-panel')).toBeInTheDocument();
    expect(screen.getByText('吉格专项分析')).toBeInTheDocument();
    expect(screen.getByText('深度诊断')).toBeInTheDocument();
    expect(screen.getByText('高强度(趋势共振)')).toBeInTheDocument();
    expect(
      screen.queryByText(
        '首页现在只保留单一的稳重玄学版，首屏优先呈现起局入口、核心九宫盘和市场镇盘参考，不再出现额外风格或场景控制器。',
      ),
    ).not.toBeInTheDocument();
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
      '匹配结果较多，请先从候选列表中选择股票。',
    );
    expect(fetchMock).not.toHaveBeenCalled();
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

  it('renders the query panel before the reference board and keeps the qimen result after both', () => {
    render(<HomePage />);

    const queryPanel = screen.getByTestId('query-panel');
    const referenceBoardPanel = screen.getByTestId('reference-board-panel');
    const resultSection = screen.getByTestId('qimen-result-section');

    expect(
      queryPanel.compareDocumentPosition(referenceBoardPanel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      referenceBoardPanel.compareDocumentPosition(resultSection) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders the left reference board as a structured nine-palace board instead of the legacy summary area', () => {
    render(<HomePage />);

    const referenceBoardPanel = screen.getByTestId('reference-board-panel');
    const referenceMobileLayout = within(referenceBoardPanel).getByTestId(
      'reference-mobile-layout',
    );
    const referenceMobileDetailCard = within(referenceBoardPanel).getByTestId(
      'reference-mobile-detail-card',
    );
    const referenceMobilePalaces = within(referenceBoardPanel).getAllByTestId(
      'reference-mobile-palace',
    );
    const referencePalaces = within(referenceBoardPanel).getAllByTestId('reference-palace');

    expect(referenceMobileLayout.className).toContain('sm:hidden');
    expect(referenceMobilePalaces).toHaveLength(9);
    expect(referenceMobilePalaces[0]).toHaveAttribute('data-detail-mode', 'compact');
    expect(referenceMobileDetailCard).toHaveAttribute('data-detail-mode', 'expanded');
    expect(within(referenceBoardPanel).getByTestId('reference-board-grid')).toBeInTheDocument();
    expect(referencePalaces).toHaveLength(9);
    expect(referencePalaces[0]).toHaveAttribute('data-detail-mode', 'expanded');
    expect(within(referenceBoardPanel).queryByText('值符落宫')).not.toBeInTheDocument();
    expect(within(referenceBoardPanel).queryByText('旬首六仪')).not.toBeInTheDocument();
    expect(within(referenceBoardPanel).queryByText('阴遁 7局')).not.toBeInTheDocument();
  });

  it('renders stock summary and qimen metrics inside the board container after a successful query', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => successPayload,
    } as Response);

    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: '开始排盘分析' }));
    await screen.findByRole('heading', { name: '贵州茅台 上市时刻九宫盘' });

    const resultSection = screen.getByTestId('qimen-result-section');

    expect(resultSection).toHaveTextContent('贵州茅台 (600519)');
    expect(within(resultSection).getByText('阴阳遁')).toBeInTheDocument();
    expect(within(resultSection).getByText('局数')).toBeInTheDocument();
    expect(within(resultSection).getByText('值符星')).toBeInTheDocument();
    expect(within(resultSection).getAllByText('值使门').length).toBeGreaterThan(0);
    expect(screen.getByText('上市时间 2001-08-27 09:30')).toBeInTheDocument();
    expect(resultSection).toHaveTextContent('局势观察');
    expect(resultSection).toHaveTextContent('核心结论');
    expect(resultSection).toHaveTextContent('提示信息');
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
    expect(screen.getByTestId('market-report-panel')).toBeInTheDocument();
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

    expect(
      await screen.findByRole('heading', { name: '平安银行 上市时刻九宫盘' }),
    ).toBeInTheDocument();
    expect(screen.getByText('平安银行 (000001)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('000001 平安银行')).toBeInTheDocument();
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
    await screen.findByRole('heading', { name: '贵州茅台 上市时刻九宫盘' });

    await user.click(screen.getByRole('tab', { name: '梅花易数' }));

    expect(screen.getByRole('tab', { name: '梅花易数' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('qimen-grid')).toBeInTheDocument();
    expect(screen.getByText('贵州茅台 (600519)')).toBeInTheDocument();
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
    await screen.findByRole('heading', { name: '平安银行 上市时刻九宫盘' });

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

  it('can click a board pattern to auto-screen the market', async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input) => {
      if (String(input) === '/api/qimen') {
        return {
          ok: true,
          json: async () => successPayload,
        } as Response;
      }

      if (String(input) === '/api/market-screen') {
        return {
          ok: true,
          json: async () => marketScreenSuccessPayload,
        } as Response;
      }

      throw new Error(`Unexpected fetch call: ${String(input)}`);
    });

    render(<HomePage />);
    await user.click(screen.getByRole('button', { name: '开始排盘分析' }));
    await screen.findByRole('heading', { name: '贵州茅台 上市时刻九宫盘' });

    await user.click(screen.getAllByRole('button', { name: '青龙返首' })[0]!);

    expect(await screen.findByText('共筛得 1 只标的')).toBeInTheDocument();
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body ?? '{}')).filters.pattern.names,
    ).toEqual(['青龙返首']);
  });

  it('can run historical backtest from the report panel', async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input) => {
      if (String(input) === '/api/market-screen') {
        return {
          ok: true,
          json: async () => marketScreenSuccessPayload,
        } as Response;
      }

      if (String(input) === '/api/backtest') {
        return {
          ok: true,
          json: async () => backtestSuccessPayload,
        } as Response;
      }

      throw new Error(`Unexpected fetch call: ${String(input)}`);
    });

    render(<HomePage />);

    await user.selectOptions(screen.getByLabelText('时干用神 门'), '开门');
    await user.click(screen.getByRole('button', { name: '开始筛盘' }));
    await screen.findByText('共筛得 1 只标的');

    await user.click(screen.getByRole('button', { name: '运行历史回测' }));

    expect(await screen.findByTestId('backtest-summary')).toBeInTheDocument();
    expect(screen.getByText('60.0%')).toBeInTheDocument();
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body ?? '{}')).items[0].stock.code,
    ).toBe('000001');
  });

  it('shows autocomplete candidates for fuzzy Chinese names and fills the formatted value after selection', async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    const input = screen.getByRole('combobox', { name: '股票代码' });

    await user.clear(input);
    await user.type(input, '茅台');

    const option = await screen.findByRole('option', { name: /600519 贵州茅台/ });

    await user.click(option);

    expect(screen.getByDisplayValue('600519 贵州茅台')).toBeInTheDocument();
  });

  it('supports keyboard navigation for code-prefix searches', async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    const input = screen.getByRole('combobox', { name: '股票代码' });

    await user.clear(input);
    await user.type(input, '300');
    const options = await screen.findAllByRole('option');

    expect(options.length).toBeGreaterThan(3);

    const activeBefore = input.getAttribute('aria-activedescendant');
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '股票代码' })).toHaveAttribute(
        'aria-activedescendant',
        expect.any(String),
      );
      expect(screen.getByRole('combobox', { name: '股票代码' }).getAttribute('aria-activedescendant')).not.toBe(
        activeBefore,
      );
    });

    const activeAfterFirstMove = screen
      .getByRole('combobox', { name: '股票代码' })
      .getAttribute('aria-activedescendant');

    fireEvent.keyDown(input, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '股票代码' }).getAttribute('aria-activedescendant')).not.toBe(
        activeAfterFirstMove,
      );
    });

    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      const resolvedValue = (
        screen.getByRole('combobox', { name: '股票代码' }) as HTMLInputElement
      ).value;

      expect(resolvedValue).not.toBe('300');
      expect(resolvedValue).toMatch(/^300\d{3}\s.+$/);
    });
  });

  it('shows many real candidates for broad one-character fuzzy queries such as 川', async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    const input = screen.getByRole('combobox', { name: '股票代码' });

    await user.clear(input);
    await user.type(input, '川');

    const options = await screen.findAllByRole('option', { name: /川/ });

    expect(options.length).toBeGreaterThanOrEqual(8);
  });

  it('shows the empty state when no stocks match the current query', async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    const input = screen.getByRole('combobox', { name: '股票代码' });

    await user.clear(input);
    await user.type(input, '不存在');

    expect(
      await screen.findByText('未找到匹配股票，请尝试输入完整代码或更准确的名称'),
    ).toBeInTheDocument();
  });

  it('auto-submits the best unique match when the user clicks without explicitly selecting a suggestion', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => successPayload,
    } as Response);

    render(<HomePage />);

    const input = screen.getByRole('combobox', { name: '股票代码' });

    await user.clear(input);
    await user.type(input, '茅台');
    await user.click(screen.getByRole('button', { name: '开始排盘分析' }));

    expect(
      JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')).stockCode,
    ).toBe('600519');
    expect(await screen.findByDisplayValue('600519 贵州茅台')).toBeInTheDocument();
  });

  it('requires explicit choice when the fuzzy query remains ambiguous', async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    const input = screen.getByRole('combobox', { name: '股票代码' });

    await user.clear(input);
    await user.type(input, '平安');
    await user.click(screen.getByRole('button', { name: '开始排盘分析' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '匹配结果较多，请先从候选列表中选择股票。',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
