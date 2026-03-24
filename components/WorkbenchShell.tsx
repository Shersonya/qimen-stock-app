'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useWorkspaceSettings } from '@/components/providers/WorkspaceSettingsProvider';

const NAV_ITEMS = [
  {
    href: '/',
    label: '市场仪表盘',
    shortLabel: '仪表盘',
    icon: '📈',
    matches: ['/', '/dashboard'],
  },
  {
    href: '/screen',
    label: '吉格筛选',
    shortLabel: '筛选',
    icon: '🔍',
    matches: ['/screen'],
  },
  {
    href: '/strategy',
    label: '策略选股',
    shortLabel: '策略',
    icon: '🎯',
    matches: ['/strategy'],
  },
  {
    href: '/stock-pool',
    label: '股票池',
    shortLabel: '股票池',
    icon: '📋',
    matches: ['/stock-pool'],
  },
  {
    href: '/diagnosis',
    label: '个股诊断',
    shortLabel: '诊断',
    icon: '📊',
    matches: ['/diagnosis'],
  },
  {
    href: '/settings',
    label: '系统设置',
    shortLabel: '设置',
    icon: '⚙️',
    matches: ['/settings'],
  },
] as const;

const SHORTCUT_ITEMS = [
  ['F5', '执行当前页主操作'],
  ['Esc', '关闭抽屉 / 弹窗'],
  ['?', '打开快捷键帮助'],
] as const;

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  );
}

export function WorkbenchShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { settings } = useWorkspaceSettings();
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'F5') {
        event.preventDefault();
        (
          document.querySelector('[data-hotkey-primary="true"]') as
            | HTMLButtonElement
            | HTMLAnchorElement
            | null
        )?.click();
        return;
      }

      if (event.key === 'Escape') {
        (
          document.querySelector('[data-hotkey-dismiss="true"]') as
            | HTMLButtonElement
            | HTMLAnchorElement
            | null
        )?.click();
        return;
      }

      if (event.key === '?' && !isTypingTarget(event.target)) {
        event.preventDefault();
        setIsShortcutHelpOpen(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const shellStyle = useMemo<React.CSSProperties>(() => {
    return {
      ['--rating-s-bg' as string]: settings.visual.ratingColors.S,
      ['--rating-a-bg' as string]: settings.visual.ratingColors.A,
      ['--rating-b-bg' as string]: settings.visual.ratingColors.B,
      ['--rating-c-bg' as string]: settings.visual.ratingColors.C,
      ['--board-accent' as string]: settings.visual.boardAccentColor,
    };
  }, [settings.visual]);

  return (
    <div className="workbench-shell" style={shellStyle}>
      <aside className="workbench-sidebar" data-testid="workbench-sidebar">
        <div className="workbench-brand">
          <p className="mystic-section-label">奇门量化分析系统</p>
          <h1>奇门量化工作台</h1>
          <p>聚焦吉格筛选与个股深度诊断的垂直分析界面。</p>
        </div>

        <nav aria-label="主导航" className="workbench-nav" data-testid="workbench-primary-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = item.matches.some((match) =>
              match === '/'
                ? pathname === '/' || pathname === '/dashboard'
                : pathname.startsWith(match),
            );

            return (
              <Link
                aria-label={item.label}
                className={`workbench-nav-link ${isActive ? 'is-active' : ''}`}
                href={item.href}
                key={item.href}
              >
                <span aria-hidden="true" className="workbench-nav-icon">
                  {item.icon}
                </span>
                <span className="workbench-nav-label-full">{item.label}</span>
                <span aria-hidden="true" className="workbench-nav-label-short">
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </nav>

        <button
          className="workbench-shortcut-button"
          onClick={() => setIsShortcutHelpOpen(true)}
          type="button"
        >
          快捷键帮助
        </button>
      </aside>

      <main className="workbench-content">{children}</main>

      {isShortcutHelpOpen ? (
        <div className="workbench-overlay">
          <section className="workbench-dialog" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mystic-section-label">快捷键</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  键盘高效操作
                </h2>
              </div>
              <button
                className="mystic-chip"
                data-hotkey-dismiss="true"
                onClick={() => setIsShortcutHelpOpen(false)}
                type="button"
              >
                关闭
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {SHORTCUT_ITEMS.map(([hotkey, description], index) => (
                <div className="workbench-shortcut-row" key={`${hotkey}-${index}`}>
                  <span className="workbench-shortcut-key">{hotkey}</span>
                  <span>{description}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
