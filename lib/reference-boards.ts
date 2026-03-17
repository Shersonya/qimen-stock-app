export const referenceBoards = [
  {
    key: 'sh',
    title: '沪市参考盘',
    description: '上证指数固定参考盘，起盘时间为 1990.12.19 09:30。',
    image: '/ref-sh.png',
    datetimeLabel: '上证指数 1990.12.19 09:30',
  },
  {
    key: 'sz',
    title: '深市参考盘',
    description: '深证指数固定参考盘，起盘时间为 1994.07.20 09:30。',
    image: '/ref-sz.png',
    datetimeLabel: '深证指数 1994.07.20 09:30',
  },
  {
    key: 'cyb',
    title: '创业板参考盘',
    description: '创业板指固定参考盘，起盘时间为 2010.05.31 09:30。',
    image: '/ref-cyb.png',
    datetimeLabel: '创业板指 2010.05.31 09:30',
  },
] as const;
