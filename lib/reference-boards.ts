export const referenceBoards = [
  {
    key: 'sh',
    tabLabel: '沪市',
    title: '沪市参考盘',
    description: '上证指数镇盘，用于比照沪市主盘气势。',
    image: '/ref-sh.svg',
    datetimeLabel: '上证指数 1990.12.19 09:30',
  },
  {
    key: 'sz',
    tabLabel: '深市',
    title: '深市参考盘',
    description: '深证指数镇盘，用于比照深市主盘节奏。',
    image: '/ref-sz.svg',
    datetimeLabel: '深证指数 1994.07.20 09:30',
  },
  {
    key: 'cyb',
    tabLabel: '创业板',
    title: '创业板参考盘',
    description: '创业板指镇盘，用于比照成长盘面势能。',
    image: '/ref-cyb.svg',
    datetimeLabel: '创业板指 2010.05.31 09:30',
  },
] as const;
