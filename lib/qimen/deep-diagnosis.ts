import type {
  QimenDeepDiagnosisAction,
  QimenDeepDiagnosisOutlook,
  QimenDeepDiagnosisPalaceReading,
  QimenDeepDiagnosisReport,
  QimenDeepDiagnosisUseShen,
  QimenPalace,
  QimenResult,
  StockListingData,
} from '@/lib/contracts/qimen';

const STEM_ELEMENT_MAP: Record<string, string> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
};

const GENERATION_MAP: Record<string, string> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

const CONTROL_MAP: Record<string, string> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
};

const OPPOSITE_PALACE_DIRECTION: Record<number, string> = {
  1: '正北',
  2: '西南',
  3: '正东',
  4: '东南',
  5: '中宫',
  6: '西北',
  7: '正西',
  8: '东北',
  9: '正南',
};

const STAR_RULES: Record<string, { score: number; text: string }> = {
  天蓬: { score: -2, text: '天蓬主波动与情绪放大，容易放大利空与回撤。' },
  天蓬星: { score: -2, text: '天蓬主波动与情绪放大，容易放大利空与回撤。' },
  天任: { score: 2, text: '天任主承载与稳健，利于趋势延续与耐心持有。' },
  天任星: { score: 2, text: '天任主承载与稳健，利于趋势延续与耐心持有。' },
  天冲: { score: 1, text: '天冲主启动与冲力，短线弹性较强但也偏急。' },
  天冲星: { score: 1, text: '天冲主启动与冲力，短线弹性较强但也偏急。' },
  天辅: { score: 2, text: '天辅主助力与修复，利于消息、逻辑和资金形成共振。' },
  天辅星: { score: 2, text: '天辅主助力与修复，利于消息、逻辑和资金形成共振。' },
  天英: { score: 0, text: '天英主曝光与热度，利名气但也容易透支预期。' },
  天英星: { score: 0, text: '天英主曝光与热度，利名气但也容易透支预期。' },
  天芮: { score: -1, text: '天芮主拖累与反复，常见杂音、包袱或修复成本。' },
  天芮星: { score: -1, text: '天芮主拖累与反复，常见杂音、包袱或修复成本。' },
  禽芮: { score: 0, text: '禽芮同临时宜先辨别真实主导力量，容易出现强弱并存。' },
  天柱: { score: -1, text: '天柱主阻力与分歧，盘面容易先冲后折。' },
  天柱星: { score: -1, text: '天柱主阻力与分歧，盘面容易先冲后折。' },
  天心: { score: 2, text: '天心主判断与效率，利于清晰定价和顺势决策。' },
  天心星: { score: 2, text: '天心主判断与效率，利于清晰定价和顺势决策。' },
  天禽: { score: 1, text: '天禽居中守势，利于观察全局与等待更清晰的节奏。' },
};

const DOOR_RULES: Record<string, { score: number; text: string }> = {
  开门: { score: 2, text: '开门主开张与兑现，利于交易执行与趋势展开。' },
  休门: { score: 2, text: '休门主修整与积蓄，利于低波段承接。' },
  生门: { score: 3, text: '生门主利润与增量，是本次求财判断的核心用神。' },
  景门: { score: 1, text: '景门主热度与表现，利题材发酵但也容易追高。' },
  杜门: { score: -1, text: '杜门主闭塞与受阻，利于防守，不利激进追价。' },
  伤门: { score: -2, text: '伤门主波折与试错，入场后容易承压。' },
  惊门: { score: -2, text: '惊门主扰动与突变，易出现情绪冲击。' },
  死门: { score: -3, text: '死门主停滞与衰败，不利当下求财与追涨。' },
  '--': { score: 0, text: '中宫不立门，宜把它当作整体盘势的缓冲区。' },
};

const GOD_RULES: Record<string, { score: number; text: string }> = {
  值符: { score: 2, text: '值符得令，主正面主导权和盘面主轴在此。' },
  太阴: { score: 2, text: '太阴利潜伏、耐心与暗线资金。' },
  六合: { score: 2, text: '六合主协同与撮合，容易形成共识。' },
  九天: { score: 2, text: '九天主拔高与扩张，利强势突破。' },
  九地: { score: 1, text: '九地主沉稳与承托，利低位筑底和消化。' },
  腾蛇: { score: -1, text: '腾蛇多虚实难辨，容易放大预期差与犹疑。' },
  白虎: { score: -2, text: '白虎主急跌急杀或强冲回落，风险偏高。' },
  玄武: { score: -1, text: '玄武多暗盘与反复，容易出现拖延和假动作。' },
  '--': { score: 0, text: '中宫无八神，更多承担全局承压与转圜功能。' },
};

const STEM_COMBINATIONS = new Set([
  '乙庚',
  '庚乙',
  '丙辛',
  '辛丙',
  '丁壬',
  '壬丁',
  '戊癸',
  '癸戊',
  '甲己',
  '己甲',
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getStem(value: string | undefined) {
  return Array.from(value ?? '')[0] ?? '';
}

function normaliseStarLabel(value: string) {
  return value.endsWith('星') ? value : `${value}星`;
}

function resolvesWithSelf(source: string, target: string) {
  return source === target || GENERATION_MAP[source] === target;
}

function controls(source: string, target: string) {
  return CONTROL_MAP[source] === target;
}

function getRelationToDayStemPalace(dayElement: string, otherElement: string) {
  if (!dayElement || !otherElement) {
    return '未知';
  }

  if (GENERATION_MAP[otherElement] === dayElement) {
    return '生我';
  }

  if (dayElement === otherElement) {
    return '比和';
  }

  if (CONTROL_MAP[dayElement] === otherElement) {
    return '我克';
  }

  if (CONTROL_MAP[otherElement] === dayElement) {
    return '克我';
  }

  if (GENERATION_MAP[dayElement] === otherElement) {
    return '我生';
  }

  return '未知';
}

function getRelationScore(relation: string) {
  switch (relation) {
    case '生我':
      return 2;
    case '比和':
      return 1;
    case '我克':
      return 0;
    case '我生':
      return -1;
    case '克我':
      return -2;
    default:
      return 0;
  }
}

function buildStemPatternSummary(palace: QimenPalace) {
  const skyGan = palace.skyGan ?? '';
  const groundGan = palace.groundGan ?? '';

  if (!skyGan || !groundGan) {
    return '盘干信息不足，当前仅能把此宫当作辅助参考。';
  }

  if (STEM_COMBINATIONS.has(`${skyGan}${groundGan}`)) {
    return `${skyGan}${groundGan} 干合，微观动能偏向撮合与转圜，利于分歧后再定方向。`;
  }

  const skyElement = STEM_ELEMENT_MAP[skyGan] ?? '';
  const groundElement = STEM_ELEMENT_MAP[groundGan] ?? '';

  if (!skyElement || !groundElement) {
    return `${skyGan}${groundGan} 同宫，宜结合门星神综合判断。`;
  }

  if (skyElement === groundElement) {
    return `${skyGan}${groundGan} 比和，宫内内耗较少，执行更直接。`;
  }

  if (GENERATION_MAP[skyElement] === groundElement) {
    return `${skyGan}${groundGan} 为天盘生地盘，动机能落到现实层面，更利兑现。`;
  }

  if (GENERATION_MAP[groundElement] === skyElement) {
    return `${skyGan}${groundGan} 为地盘生天盘，基础面在托举事件演化。`;
  }

  if (CONTROL_MAP[skyElement] === groundElement) {
    return `${skyGan}${groundGan} 为天盘克地盘，主动作强，但也容易过急。`;
  }

  if (CONTROL_MAP[groundElement] === skyElement) {
    return `${skyGan}${groundGan} 为地盘克天盘，外部阻力偏大，执行阻尼明显。`;
  }

  return `${skyGan}${groundGan} 组合未形成明显合克，宜以门象与八神定性。`;
}

function getRuleScore<T extends Record<string, { score: number }>>(rules: T, value: string) {
  return rules[value]?.score ?? 0;
}

function findPalaceBySkyStem(qimen: QimenResult, stem: string) {
  const lookupStem =
    stem === '甲' ? qimen.meta?.xunHeadGan ?? stem : stem;

  return (
    qimen.palaces.find(
      (item) => item.skyGan === lookupStem || item.skyExtraGan === lookupStem,
    ) ?? null
  );
}

function findPalaceByDoor(qimen: QimenResult, door: string) {
  return qimen.palaces.find((item) => item.door === door) ?? null;
}

function buildUseShenSummary(label: string, value: string, palace: QimenPalace) {
  const emptyLabel =
    palace.emptyMarkers && palace.emptyMarkers.length > 0
      ? `，并带 ${palace.emptyMarkers.join(' / ')}`
      : '';

  return `${label}${value} 落 ${palace.name}${palace.position}宫，宫内为 ${normaliseStarLabel(
    palace.star,
  )} / ${palace.door} / ${palace.god}${emptyLabel}。`;
}

function buildUseShenItem(
  kind: QimenDeepDiagnosisUseShen['kind'],
  label: string,
  value: string,
  palace: QimenPalace,
): QimenDeepDiagnosisUseShen {
  return {
    kind,
    label,
    value,
    palacePosition: palace.position,
    palaceName: palace.name,
    direction: OPPOSITE_PALACE_DIRECTION[palace.position] ?? '未知方位',
    summary: buildUseShenSummary(label, value, palace),
  };
}

function buildPalaceReading(
  title: string,
  role: string,
  palace: QimenPalace,
  dayStemPalace: QimenPalace,
): QimenDeepDiagnosisPalaceReading {
  const relation = getRelationToDayStemPalace(
    dayStemPalace.wuxing ?? '',
    palace.wuxing ?? '',
  );
  const tianShi = STAR_RULES[palace.star]?.text ?? '当前九星信息偏中性，主要看门神配合。';
  const diLi = `${palace.name}${palace.position}宫属 ${palace.wuxing ?? '未知'}，相对日干宫为 ${relation}。`;
  const renHe = `${
    DOOR_RULES[palace.door]?.text ?? '门象偏中性，宜结合盘干与空亡再判断。'
  }${
    palace.emptyMarkers && palace.emptyMarkers.length > 0
      ? ` 此宫同时见 ${palace.emptyMarkers.join(' / ')}，会削弱门象兑现度。`
      : ''
  }`;
  const shenZhu =
    GOD_RULES[palace.god]?.text ?? '当前八神信息偏中性，更多承担辅助定性作用。';
  const stemPattern = buildStemPatternSummary(palace);

  return {
    title,
    role,
    palacePosition: palace.position,
    palaceName: palace.name,
    skyGan: palace.skyGan ?? '',
    groundGan: palace.groundGan ?? '',
    star: normaliseStarLabel(palace.star),
    door: palace.door,
    god: palace.god,
    emptyMarkers: palace.emptyMarkers ?? [],
    relationToDayStemPalace: relation,
    tianShi,
    diLi,
    renHe,
    shenZhu,
    stemPattern,
    summary: `${title}落 ${palace.name}${palace.position}宫，九星、八门、八神分别为 ${normaliseStarLabel(
      palace.star,
    )} / ${palace.door} / ${palace.god}，综合观感为 ${
      relation === '生我' || relation === '比和' ? '有承托' : relation === '克我' ? '受压制' : '中性偏谨慎'
    }。`,
  };
}

function buildFirstImpression(qimen: QimenResult) {
  const meta = qimen.meta;

  if (!meta) {
    return '当前盘面缺少完整元数据，只能先按星门神的显层信号解读。';
  }

  const segments = [
    meta.isFuyin ? '全局伏吟，主节奏偏慢、兑现延后' : '全局不伏吟，局面仍有转圜空间',
    meta.isFanyin ? '反吟并见，波动会放大' : '未见反吟，剧烈翻转概率相对有限',
    meta.isWubuyushi ? '又逢五不遇时，入场容错率偏低' : '不属五不遇时，执行层阻力略轻',
    `日空 ${meta.rikong}、时空 ${meta.shikong}`,
  ];

  return segments.join('；');
}

function buildDecision(
  qimen: QimenResult,
  shengDoorPalace: QimenPalace,
  hourStemPalace: QimenPalace,
  dayStemPalace: QimenPalace,
) {
  const shengRelation = getRelationToDayStemPalace(
    hourStemPalace.wuxing ?? '',
    shengDoorPalace.wuxing ?? '',
  );
  const shengScore =
    getRuleScore(STAR_RULES, shengDoorPalace.star) +
    getRuleScore(DOOR_RULES, shengDoorPalace.door) +
    getRuleScore(GOD_RULES, shengDoorPalace.god) +
    getRelationScore(
      getRelationToDayStemPalace(dayStemPalace.wuxing ?? '', shengDoorPalace.wuxing ?? ''),
    ) -
    (shengDoorPalace.emptyMarkers?.length ?? 0) * 2;
  const hourScore =
    getRuleScore(STAR_RULES, hourStemPalace.star) +
    getRuleScore(DOOR_RULES, hourStemPalace.door) +
    getRuleScore(GOD_RULES, hourStemPalace.god) +
    getRelationScore(
      getRelationToDayStemPalace(dayStemPalace.wuxing ?? '', hourStemPalace.wuxing ?? ''),
    ) -
    (hourStemPalace.emptyMarkers?.length ?? 0) * 2;
  const dayScore =
    getRuleScore(STAR_RULES, dayStemPalace.star) +
    getRuleScore(DOOR_RULES, dayStemPalace.door) +
    getRuleScore(GOD_RULES, dayStemPalace.god) -
    (dayStemPalace.emptyMarkers?.length ?? 0) * 2;
  const shengSupportsHour = resolvesWithSelf(
    shengDoorPalace.wuxing ?? '',
    hourStemPalace.wuxing ?? '',
  );
  const shengSupportsDay = resolvesWithSelf(
    shengDoorPalace.wuxing ?? '',
    dayStemPalace.wuxing ?? '',
  );
  const shengControlsHour = controls(
    shengDoorPalace.wuxing ?? '',
    hourStemPalace.wuxing ?? '',
  );
  const shengControlsDay = controls(
    shengDoorPalace.wuxing ?? '',
    dayStemPalace.wuxing ?? '',
  );
  const globalPenalty =
    (qimen.meta?.isWubuyushi ? 2 : 0) +
    (qimen.meta?.isFuyin ? 1 : 0) +
    ((shengDoorPalace.emptyMarkers?.length ?? 0) > 0 ? 1 : 0) +
    ((hourStemPalace.emptyMarkers?.length ?? 0) > 0 ? 1 : 0);
  const bullishScore =
    shengScore * 3 +
    hourScore * 2 +
    dayScore +
    (shengSupportsHour ? 3 : 0) +
    (shengSupportsDay ? 2 : 0) -
    (shengControlsHour ? 3 : 0) -
    (shengControlsDay ? 2 : 0) -
    globalPenalty;
  const bullishProbability = clamp(50 + bullishScore * 3, 15, 85);

  let action: QimenDeepDiagnosisAction = 'WATCH';
  let actionLabel = '观望';
  let riskLevel: QimenDeepDiagnosisReport['riskLevel'] = '中';

  if (
    bullishProbability >= 65 &&
    shengScore >= 2 &&
    hourScore >= 1 &&
    !shengControlsHour &&
    !shengDoorPalace.emptyMarkers?.length
  ) {
    action = 'BUY';
    actionLabel = '强烈看涨 / 可考虑买入';
    riskLevel = bullishProbability >= 75 ? '低' : '中';
  } else if (
    bullishProbability <= 40 ||
    shengScore <= 0 ||
    shengControlsHour ||
    Boolean(shengDoorPalace.emptyMarkers?.length)
  ) {
    action = 'SELL';
    actionLabel = '不宜操作 / 可考虑卖出';
    riskLevel = '高';
  }

  const successProbability =
    action === 'BUY'
      ? bullishProbability
      : action === 'SELL'
        ? 100 - bullishProbability
        : clamp(55 + Math.abs(bullishProbability - 50) / 2, 55, 72);

  const decisionRationale = [
    `生门宫评分 ${shengScore}，时干宫评分 ${hourScore}，日干宫评分 ${dayScore}。`,
    shengSupportsHour
      ? '生门宫对时干宫构成生扶或比和，利润端能够承接交易动作。'
      : `生门宫与时干宫关系为 ${shengRelation}，利润端对执行承接一般。`,
    shengControlsHour
      ? '生门宫反克时干宫，说明求财结果难以顺畅落到交易动作。'
      : '生门宫未直接反克时干宫，仍有转化为收益的空间。',
    qimen.meta?.isWubuyushi
      ? '当前又逢五不遇时，执行层面容错率偏低。'
      : '当前不属五不遇时，执行层阻滞略轻。',
  ];

  let coreConclusion = `此局生门落 ${shengDoorPalace.name}${shengDoorPalace.position}宫，`;
  if (action === 'BUY') {
    coreConclusion += `对时干宫与日干宫形成承接，当前更偏向顺势试多。`;
  } else if (action === 'SELL') {
    coreConclusion += `对时干宫或日干宫承接不足，且风险标记偏多，当下不宜追入。`;
  } else {
    coreConclusion += `虽有局部机会，但利润端与执行端配合不够稳定，宜先观望。`;
  }

  return {
    action,
    actionLabel,
    riskLevel,
    successProbability,
    coreConclusion,
    decisionRationale,
    bullishProbability,
  };
}

function buildOutlooks(
  qimen: QimenResult,
  shengDoorPalace: QimenPalace,
  hourStemPalace: QimenPalace,
  dayStemPalace: QimenPalace,
): QimenDeepDiagnosisOutlook[] {
  const valueDoorPalace =
    qimen.palaces.find((item) => item.position === qimen.meta?.valueDoorPalace) ?? shengDoorPalace;
  const weeklyWindow = `${valueDoorPalace.position}日或${valueDoorPalace.position}周附近`;
  const voidLabel = [qimen.meta?.rikong, qimen.meta?.shikong]
    .filter(Boolean)
    .join(' / ');

  return [
    {
      horizon: '明日',
      trend:
        getRuleScore(DOOR_RULES, hourStemPalace.door) + getRuleScore(GOD_RULES, hourStemPalace.god) >= 2
          ? '偏多'
          : getRuleScore(DOOR_RULES, hourStemPalace.door) <= -2
            ? '偏空'
            : '震荡',
      detail: `明日先看时干宫 ${hourStemPalace.name}${hourStemPalace.position}宫的门神组合。当前为 ${hourStemPalace.door} / ${hourStemPalace.god}，更适合把它当作最直接的日内情绪风向。`,
    },
    {
      horizon: '一周',
      trend:
        valueDoorPalace.emptyMarkers && valueDoorPalace.emptyMarkers.length > 0
          ? '观望'
          : getRuleScore(DOOR_RULES, valueDoorPalace.door) >= 2
            ? '偏多'
            : '震荡',
      detail: `一周维度重点看值使门所在的 ${valueDoorPalace.name}${valueDoorPalace.position}宫，按当前盘势更容易在 ${weeklyWindow} 出现节奏变化；若 ${voidLabel} 填实，变化会更明显。`,
    },
    {
      horizon: '一月',
      trend:
        resolvesWithSelf(shengDoorPalace.wuxing ?? '', dayStemPalace.wuxing ?? '') &&
        !shengDoorPalace.emptyMarkers?.length
          ? '偏多'
          : '震荡',
      detail: `一月尺度主要看生门宫与日干宫的生克。如果 ${shengDoorPalace.name}${shengDoorPalace.position}宫继续承托 ${dayStemPalace.name}${dayStemPalace.position}宫，月内更偏向震荡上修；否则仍以反复为主。`,
    },
    {
      horizon: '一季',
      trend:
        qimen.meta?.isFuyin || qimen.meta?.isWubuyushi
          ? '震荡'
          : qimen.meta?.isFanyin
            ? '偏空'
            : '偏多',
      detail: `一季尺度主要受大格局影响。${qimen.meta?.isFuyin ? '伏吟使节奏拉长，' : ''}${
        qimen.meta?.isFanyin ? '反吟会放大拐点与波动，' : ''
      }更适合结合节气切换和板块环境做二次验证。`,
    },
  ];
}

function buildActionGuide(
  action: QimenDeepDiagnosisAction,
  hourStemPalace: QimenPalace,
  shengDoorPalace: QimenPalace,
  qimen: QimenResult,
) {
  if (action === 'BUY') {
    return [
      `优先等待 ${hourStemPalace.name}${hourStemPalace.position}宫对应的短线信号先确认，再考虑分批介入，不建议一次性满仓。`,
      `可重点观察 ${shengDoorPalace.name}${shengDoorPalace.position}宫对应的 ${OPPOSITE_PALACE_DIRECTION[shengDoorPalace.position]} 向消息、板块联动和成交量是否同步放大。`,
      `若后续再出现 ${qimen.meta?.rikong || '空亡'} 填实且值使门转强，可把它当作加仓确认信号。`,
      '本结果仅供玄学研究与产品功能演示，不构成投资建议。',
    ];
  }

  if (action === 'SELL') {
    return [
      '当前更适合观望或降速处理，不建议在现位追价扩仓。',
      `若后续等待 ${qimen.meta?.rikong || '日空'}、${qimen.meta?.shikong || '时空'} 填实后，时干宫门神重新转强，再做二次评估。`,
      `若必须交易，优先选择更轻仓位并设置清晰止损，避免把 ${shengDoorPalace.door} 的压力放大成实亏。`,
      '本结果仅供玄学研究与产品功能演示，不构成投资建议。',
    ];
  }

  return [
    '以观望为主，先等利润端和执行端重新形成同向承接，再决定是否入场。',
    `重点观察 ${hourStemPalace.name}${hourStemPalace.position}宫和 ${shengDoorPalace.name}${shengDoorPalace.position}宫后续是否从相克转为比和或生扶。`,
    `若值使门在未来 ${qimen.meta?.valueDoorPalace || shengDoorPalace.position} 日/周附近转强，可再做一次深度复盘。`,
    '本结果仅供玄学研究与产品功能演示，不构成投资建议。',
  ];
}

function buildKeyTimingHints(qimen: QimenResult) {
  const hints = [];

  if (qimen.meta?.rikong) {
    hints.push(`重点关注 ${qimen.meta.rikong} 填实时段，原先虚位更容易出现兑现或补跌。`);
  }

  if (qimen.meta?.shikong) {
    hints.push(`重点关注 ${qimen.meta.shikong} 填实时段，短线节奏可能明显切换。`);
  }

  if (qimen.meta?.valueDoorPalace) {
    hints.push(`值使门落 ${qimen.meta.valueDoorPalace} 宫，可把第 ${qimen.meta.valueDoorPalace} 个交易日 / 周附近当作节奏观察点。`);
  }

  if (qimen.meta?.isFanyin) {
    hints.push('反吟在盘时，拐点来得更急，宜留意突然放量或跳空。');
  }

  if (qimen.meta?.isFuyin) {
    hints.push('伏吟在盘时，确认往往慢半拍，耐心比抢跑更重要。');
  }

  return hints;
}

export function buildDeepDiagnosisReport(
  stock: Pick<StockListingData, 'code' | 'name'>,
  qimen: QimenResult,
): QimenDeepDiagnosisReport {
  const dayStem = getStem(qimen.meta?.dayGanzhi);
  const hourStem = getStem(qimen.meta?.hourGanzhi);
  const dayStemPalace = findPalaceBySkyStem(qimen, dayStem) ?? qimen.palaces[4]!;
  const hourStemPalace = findPalaceBySkyStem(qimen, hourStem) ?? qimen.palaces[4]!;
  const shengDoorPalace = findPalaceByDoor(qimen, '生门') ?? qimen.palaces[4]!;
  const valueDoorPalace =
    findPalaceByDoor(qimen, qimen.valueDoor) ??
    qimen.palaces.find((item) => item.position === qimen.meta?.valueDoorPalace) ??
    shengDoorPalace;
  const firstImpression = buildFirstImpression(qimen);
  const palaceReadings = [
    buildPalaceReading('生门宫', '利润与结果', shengDoorPalace, dayStemPalace),
    buildPalaceReading('日干宫', '投资人与本金', dayStemPalace, dayStemPalace),
    buildPalaceReading('时干宫', '当前交易事态', hourStemPalace, dayStemPalace),
  ];
  const decision = buildDecision(qimen, shengDoorPalace, hourStemPalace, dayStemPalace);

  return {
    basis: {
      stockCode: stock.code,
      stockName: stock.name,
      analysisTime: qimen.meta?.analysisTime ?? new Date().toISOString(),
      yearGanzhi: qimen.meta?.yearGanzhi ?? '',
      monthGanzhi: qimen.meta?.monthGanzhi ?? '',
      dayGanzhi: qimen.meta?.dayGanzhi ?? '',
      hourGanzhi: qimen.meta?.hourGanzhi ?? '',
    },
    coreConclusion: decision.coreConclusion,
    action: decision.action,
    actionLabel: decision.actionLabel,
    successProbability: decision.successProbability,
    riskLevel: decision.riskLevel,
    firstImpression,
    globalPattern: {
      isFuyin: qimen.meta?.isFuyin ?? false,
      isFanyin: qimen.meta?.isFanyin ?? false,
      isWubuyushi: qimen.meta?.isWubuyushi ?? false,
      rikong: qimen.meta?.rikong ?? '',
      shikong: qimen.meta?.shikong ?? '',
      summary: `${firstImpression}。`,
    },
    useShen: [
      buildUseShenItem('dayStem', '日干', dayStem, dayStemPalace),
      buildUseShenItem('hourStem', '时干', hourStem, hourStemPalace),
      buildUseShenItem('shengDoor', '核心用神', '生门', shengDoorPalace),
      buildUseShenItem('valueDoor', '值使门', valueDoorPalace.door, valueDoorPalace),
    ],
    palaceReadings,
    decisionRationale: decision.decisionRationale,
    outlooks: buildOutlooks(qimen, shengDoorPalace, hourStemPalace, dayStemPalace),
    keyTimingHints: buildKeyTimingHints(qimen),
    actionGuide: buildActionGuide(
      decision.action,
      hourStemPalace,
      shengDoorPalace,
      qimen,
    ),
    note: '当前版本中的部分奇门格局判断采用显式启发式规则，适合作为风险补充层，而不是替代行情与基本面判断。',
  };
}
