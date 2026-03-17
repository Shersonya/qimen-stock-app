import type { QimenApiSuccessResponse, QimenPalace } from '@/lib/contracts/qimen';
import { getMarketLabel } from '@/lib/ui';

type InsightBlock = {
  title: string;
  body: string;
};

export function getTimeSourceLabel(
  timeSource: QimenApiSuccessResponse['stock']['timeSource'],
) {
  switch (timeSource) {
    case 'actual':
      return '起局时间来自真实上市时刻';
    case 'default':
    default:
      return '当前数据仍按默认 09:30 起局';
  }
}

export function getSelectedPalaceHeadline(palace: QimenPalace | null) {
  if (!palace) {
    return '等待局眼落定';
  }

  return palace.position === 5
    ? '中宫局眼'
    : `${palace.name}宫 · 洛书 ${palace.position}`;
}

export function getSelectedPalaceSummary(palace: QimenPalace | null) {
  if (!palace) {
    return '起局后可点选任一宫位，查看主星、门象与八神组合。';
  }

  if (palace.position === 5) {
    return `中宫以 ${palace.star} 守局，适合用来观察整盘的重心与回旋余地。`;
  }

  return `${palace.name}宫以 ${palace.star} 为主星，门象为 ${palace.door}，神煞为 ${palace.god}。`;
}

export function buildInsightBlocks(
  result: QimenApiSuccessResponse,
  selectedPalace: QimenPalace | null,
): InsightBlock[] {
  const marketLabel = getMarketLabel(result.stock.market);
  const selectedPalaceLabel = selectedPalace
    ? `${selectedPalace.name}宫 ${selectedPalace.star}`
    : '中宫局眼';
  const trendTone =
    result.qimen.yinYang === '阳' ? '外放试探、主动铺陈' : '内敛蓄势、先守后发';

  return [
    {
      title: '局势观察',
      body: `${result.stock.name} 当前以 ${result.qimen.valueStar} / ${result.qimen.valueDoor} 为主轴，${marketLabel} 标的更适合先看节奏是否与主门同频。当前焦点落在 ${selectedPalaceLabel}。`,
    },
    {
      title: '核心结论',
      body: `${result.qimen.yinYang}遁 ${result.qimen.ju} 局呈现 ${trendTone} 的盘面气质。若主星与主门形成顺势组合，可把这次起局当作节奏确认，而不是孤立信号。`,
    },
    {
      title: '提示信息',
      body: `${getTimeSourceLabel(result.stock.timeSource)}。上市日期为 ${result.stock.listingDate} ${result.stock.listingTime}，适合与参考镇盘一起看“先天气势”与“后天运行”是否一致。`,
    },
  ];
}
