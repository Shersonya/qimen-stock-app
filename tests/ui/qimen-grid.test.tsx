import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { QimenGrid } from '@/components/QimenGrid';

const palaces = [
  { index: 0, position: 4, name: '巽', star: '天芮星', door: '休门', god: '太阴' },
  { index: 1, position: 9, name: '离', star: '天柱星', door: '生门', god: '腾蛇' },
  { index: 2, position: 2, name: '坤', star: '天心星', door: '伤门', god: '值符' },
  { index: 3, position: 3, name: '震', star: '天英星', door: '开门', god: '六合' },
  { index: 4, position: 5, name: '中', star: '天禽', door: '--', god: '--' },
  { index: 5, position: 7, name: '兑', star: '天蓬星', door: '杜门', god: '九天' },
  { index: 6, position: 8, name: '艮', star: '天辅星', door: '惊门', god: '白虎' },
  { index: 7, position: 1, name: '坎', star: '天冲星', door: '死门', god: '玄武' },
  { index: 8, position: 6, name: '乾', star: '天任星', door: '景门', god: '九地' },
];

describe('QimenGrid', () => {
  it('renders nine palaces and focuses the center palace by default', () => {
    render(<QimenGrid palaces={palaces} />);

    expect(screen.getByTestId('qimen-grid')).toBeInTheDocument();
    expect(screen.getAllByTestId('qimen-palace')).toHaveLength(9);
    expect(screen.getByText('天心星')).toBeInTheDocument();
    expect(screen.getByText('开门')).toBeInTheDocument();
    expect(screen.getByText('值符')).toBeInTheDocument();
    expect(screen.getByText('中宫局眼')).toBeInTheDocument();
  });

  it('updates the selected palace summary after clicking a palace card', async () => {
    const user = userEvent.setup();

    render(<QimenGrid palaces={palaces} />);

    await user.click(screen.getByRole('button', { name: '乾宫 天任星' }));

    expect(screen.getByText('乾宫 · 洛书 6')).toBeInTheDocument();
    expect(screen.getByText('乾宫以 天任星 为主星，门象为 景门，神煞为 九地。')).toBeInTheDocument();
  });
});
