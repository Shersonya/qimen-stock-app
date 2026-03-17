import { render, screen } from '@testing-library/react';

import { QimenGrid } from '@/components/QimenGrid';

const palaces = [
  { index: 0, position: 4, name: '巽', star: '天芮星', door: '休门', god: '太阴' },
  { index: 1, position: 9, name: '离', star: '天柱星', door: '生门', god: '腾蛇' },
  { index: 2, position: 2, name: '坤', star: '天心星', door: '伤门', god: '值符' },
  { index: 3, position: 3, name: '震', star: '天英星', door: '开门', god: '六合' },
  { index: 4, position: 5, name: '中', star: '--', door: '--', god: '--' },
  { index: 5, position: 7, name: '兑', star: '天蓬星', door: '杜门', god: '九天' },
  { index: 6, position: 8, name: '艮', star: '天辅星', door: '惊门', god: '白虎' },
  { index: 7, position: 1, name: '坎', star: '天冲星', door: '死门', god: '玄武' },
  { index: 8, position: 6, name: '乾', star: '天任星', door: '景门', god: '九地' },
];

describe('QimenGrid', () => {
  it('renders nine palaces with star, door, and god labels', () => {
    render(<QimenGrid palaces={palaces} />);

    expect(screen.getByTestId('qimen-grid')).toBeInTheDocument();
    expect(screen.getAllByTestId('qimen-palace')).toHaveLength(9);
    expect(screen.getByText('天心星')).toBeInTheDocument();
    expect(screen.getByText('开门')).toBeInTheDocument();
    expect(screen.getByText('值符')).toBeInTheDocument();
  });
});
