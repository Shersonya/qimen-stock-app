import type { Market } from '@/lib/contracts/qimen';
import generatedStocks from '@/data/stocks.generated.json';

export type StockSearchItem = {
  code: string;
  name: string;
  market: Market;
  exchange?: string;
  aliases?: string[];
};

const ALIASES_BY_CODE: Record<string, string[]> = {
  '000001': ['平安', '平银'],
  '000002': ['万科'],
  '000333': ['美的'],
  '000858': ['五粮液', '宜宾五粮液'],
  '002415': ['海康', '威视'],
  '002594': ['BYD'],
  '300059': ['东方', '东财'],
  '300124': ['汇川'],
  '300308': ['中际', '旭创'],
  '300750': ['宁德', 'CATL'],
  '600036': ['招行', '招商'],
  '600276': ['恒瑞'],
  '600519': ['茅台', '贵州', 'MOUTAI'],
  '600900': ['长江'],
  '601012': ['隆基'],
  '601318': ['平安', 'PINGAN'],
  '603259': ['药明'],
};

export const MOCK_STOCKS: StockSearchItem[] = (
  generatedStocks as Array<{
    code: string;
    name: string;
    market: Market;
    exchange?: string;
  }>
).map((stock) => ({
  ...stock,
  aliases: ALIASES_BY_CODE[stock.code],
}));
