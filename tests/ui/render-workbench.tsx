import type { ReactElement } from 'react';
import { render } from '@testing-library/react';

import { WorkbenchShell } from '@/components/WorkbenchShell';
import { WorkspaceSettingsProvider } from '@/components/providers/WorkspaceSettingsProvider';

export function renderInWorkbench(ui: ReactElement) {
  return render(
    <WorkspaceSettingsProvider>
      <WorkbenchShell>{ui}</WorkbenchShell>
    </WorkspaceSettingsProvider>,
  );
}
