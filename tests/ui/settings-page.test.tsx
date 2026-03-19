import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SettingsPageClient } from '@/components/SettingsPageClient';
import { renderInWorkbench } from '@/tests/ui/render-workbench';

const mockPush = jest.fn();
const mockPathname = jest.fn(() => '/settings');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

describe('SettingsPageClient', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPush.mockReset();
    mockPathname.mockReturnValue('/settings');
  });

  it('manages pattern, risk, and visual settings with import/export support', async () => {
    const user = userEvent.setup();

    renderInWorkbench(<SettingsPageClient />);

    expect(screen.getByTestId('settings-pattern-table')).toBeInTheDocument();
    expect(screen.getByTestId('settings-risk-panel')).toBeInTheDocument();
    expect(screen.getByTestId('settings-visual-panel')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '导出配置' }));

    const exportDialog = await screen.findByRole('dialog');
    const exportTextbox = within(exportDialog).getByRole('textbox') as HTMLTextAreaElement;

    expect(exportDialog).toHaveTextContent('复制当前 JSON');
    expect(exportTextbox.value).toContain('"patternMap"');

    fireEvent.keyDown(window, { key: 'Escape' });

    await user.click(screen.getByRole('button', { name: '导入配置' }));
    const importDialog = await screen.findByRole('dialog');
    const importTextbox = within(importDialog).getByRole('textbox');

    await user.clear(importTextbox);
    fireEvent.change(importTextbox, {
      target: {
        value: '{"risk":{"minRatingDefault":"S"},"visual":{"boardAccentColor":"#ffffff"}}',
      },
    });
    await user.click(screen.getByRole('button', { name: '导入并应用' }));

    expect(await screen.findByText('配置已导入并立即生效。')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '默认最低评级' })).toHaveValue('S');
  });
});
