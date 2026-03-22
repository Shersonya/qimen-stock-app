'use client';

import { useMemo, useState } from 'react';

import { useWorkspaceSettings } from '@/components/providers/WorkspaceSettingsProvider';
import { useIsMobileViewport } from '@/components/useIsMobileViewport';
import { QIMEN_PATTERN_LIBRARY } from '@/lib/contracts/qimen';

export function SettingsPageClient() {
  const { exportSettings, importSettings, resetSettings, setSettings, settings } =
    useWorkspaceSettings();
  const [transferMode, setTransferMode] = useState<'import' | 'export' | null>(null);
  const [transferValue, setTransferValue] = useState('');
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const isMobileViewport = useIsMobileViewport();

  const groupedPatterns = useMemo(() => {
    return {
      COMPOSITE: QIMEN_PATTERN_LIBRARY.filter((item) => item.defaultLevel === 'COMPOSITE'),
      A: QIMEN_PATTERN_LIBRARY.filter((item) => item.defaultLevel === 'A'),
      B: QIMEN_PATTERN_LIBRARY.filter((item) => item.defaultLevel === 'B'),
      C: QIMEN_PATTERN_LIBRARY.filter((item) => item.defaultLevel === 'C'),
    };
  }, []);

  function updatePattern(
    name: (typeof QIMEN_PATTERN_LIBRARY)[number]['name'],
    patch: Partial<(typeof settings.patternMap)[typeof name]>,
  ) {
    setSettings({
      ...settings,
      patternMap: {
        ...settings.patternMap,
        [name]: {
          ...settings.patternMap[name],
          ...patch,
        },
      },
    });
  }

  return (
    <section className="workbench-page">
      <header className="workbench-page-header">
        <div>
          <p className="mystic-section-label">系统设置</p>
          <h2>统一管理筛选、风控与可视化配置</h2>
          <p>所有设置即时生效并自动保存到本地浏览器，请求发起时会作为可选覆盖参数一并传给后端接口。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="mystic-chip" onClick={() => {
            setTransferMode('export');
            setTransferValue(exportSettings());
            setTransferMessage(null);
          }} type="button">
            导出配置
          </button>
          <button className="mystic-chip" onClick={() => {
            setTransferMode('import');
            setTransferValue('');
            setTransferMessage(null);
          }} type="button">
            导入配置
          </button>
          <button className="mystic-button-secondary" onClick={resetSettings} type="button">
            重置默认
          </button>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        <section className="workbench-card" data-testid="settings-pattern-table">
          <p className="mystic-section-label">吉格权重配置</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            启用、权重与所属等级
          </h3>
          {isMobileViewport ? (
            <div className="space-y-6" data-testid="settings-pattern-mobile-list">
              {(['COMPOSITE', 'A', 'B', 'C'] as const).map((level, levelIndex) => (
                <div className="mt-6" key={`${level}-${levelIndex}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-lg font-semibold text-[var(--text-primary)]">{level} 组</h4>
                    <button
                      className="mystic-chip"
                      onClick={() => {
                        groupedPatterns[level].forEach((item) => {
                          updatePattern(item.name, {
                            enabled: !groupedPatterns[level].every(
                              (entry) => settings.patternMap[entry.name].enabled,
                            ),
                          });
                        });
                      }}
                      type="button"
                    >
                      组内全选 / 反选
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {groupedPatterns[level].map((item, index) => (
                      <article
                        className="workbench-card workbench-subcard"
                        key={`${level}-${item.name}-${index}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="mystic-section-label">{item.name}</p>
                            <h5 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                              {item.meaning}
                            </h5>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              当前等级 {settings.patternMap[item.name].level}
                            </p>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <input
                              checked={settings.patternMap[item.name].enabled}
                              onChange={(event) =>
                                updatePattern(item.name, { enabled: event.target.checked })
                              }
                              type="checkbox"
                            />
                            启用
                          </label>
                        </div>
                        <div className="mt-4 grid gap-3">
                          <label className="block">
                            <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                              权重
                            </span>
                            <input
                              className="mystic-input workbench-mini-input"
                              inputMode="numeric"
                              onChange={(event) =>
                                updatePattern(item.name, {
                                  weight: Number(event.target.value) || 0,
                                })
                              }
                              type="number"
                              value={settings.patternMap[item.name].weight}
                            />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                              等级
                            </span>
                            <select
                              className="mystic-select w-full"
                              onChange={(event) =>
                                updatePattern(item.name, {
                                  level: event.target.value as
                                    | 'COMPOSITE'
                                    | 'A'
                                    | 'B'
                                    | 'C',
                                })
                              }
                              value={settings.patternMap[item.name].level}
                            >
                              <option value="COMPOSITE">COMPOSITE</option>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                            </select>
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {(['COMPOSITE', 'A', 'B', 'C'] as const).map((level, levelIndex) => (
                <div className="mt-6" key={`${level}-${levelIndex}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-lg font-semibold text-[var(--text-primary)]">{level} 组</h4>
                    <button
                      className="mystic-chip"
                      onClick={() => {
                        groupedPatterns[level].forEach((item) => {
                          updatePattern(item.name, {
                            enabled: !groupedPatterns[level].every(
                              (entry) => settings.patternMap[entry.name].enabled,
                            ),
                          });
                        });
                      }}
                      type="button"
                    >
                      组内全选 / 反选
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="workbench-settings-table">
                      <thead>
                        <tr>
                          <th>启用</th>
                          <th>吉格</th>
                          <th>权重</th>
                          <th>等级</th>
                          <th>象意</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedPatterns[level].map((item, itemIndex) => (
                          <tr key={`${level}-${item.name}-${itemIndex}`}>
                            <td>
                              <input
                                checked={settings.patternMap[item.name].enabled}
                                onChange={(event) =>
                                  updatePattern(item.name, { enabled: event.target.checked })
                                }
                                type="checkbox"
                              />
                            </td>
                            <td>{item.name}</td>
                            <td>
                              <input
                                className="mystic-input workbench-mini-input"
                                inputMode="numeric"
                                onChange={(event) =>
                                  updatePattern(item.name, {
                                    weight: Number(event.target.value) || 0,
                                  })
                                }
                                type="number"
                                value={settings.patternMap[item.name].weight}
                              />
                            </td>
                            <td>
                              <select
                                className="mystic-select"
                                onChange={(event) =>
                                  updatePattern(item.name, {
                                    level: event.target.value as
                                      | 'COMPOSITE'
                                      | 'A'
                                      | 'B'
                                      | 'C',
                                  })
                                }
                                value={settings.patternMap[item.name].level}
                              >
                                <option value="COMPOSITE">COMPOSITE</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                              </select>
                            </td>
                            <td>{item.meaning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>

        <section className="workbench-card" data-testid="settings-risk-panel">
          <p className="mystic-section-label">风控规则配置</p>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <article className="workbench-card workbench-subcard">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">筛选默认值</h3>
              <div className="mt-4 space-y-4">
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    checked={settings.risk.marketEnvironmentRequired}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        risk: {
                          ...settings.risk,
                          marketEnvironmentRequired: event.target.checked,
                        },
                      })
                    }
                    type="checkbox"
                  />
                  要求市场环境有 B 级以上吉气
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    checked={settings.risk.onlyEligibleDefault}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        risk: {
                          ...settings.risk,
                          onlyEligibleDefault: event.target.checked,
                        },
                      })
                    }
                    type="checkbox"
                  />
                  默认仅保留可执行标的
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    checked={settings.risk.excludeInvalidCorePalaces}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        risk: {
                          ...settings.risk,
                          excludeInvalidCorePalaces: event.target.checked,
                        },
                      })
                    }
                    type="checkbox"
                  />
                  默认剔除失效核心宫
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    checked={settings.risk.excludeTopEvilPatterns}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        risk: {
                          ...settings.risk,
                          excludeTopEvilPatterns: event.target.checked,
                        },
                      })
                    }
                    type="checkbox"
                  />
                  默认剔除顶级凶格
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                    默认最低评级
                  </span>
                  <select
                    className="mystic-select w-full"
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        risk: {
                          ...settings.risk,
                          minRatingDefault: event.target.value as
                            | 'ALL'
                            | 'S'
                            | 'A'
                            | 'B'
                            | 'C',
                        },
                      })
                    }
                    value={settings.risk.minRatingDefault}
                  >
                    <option value="ALL">不限</option>
                    <option value="S">S</option>
                    <option value="A">A 及以上</option>
                    <option value="B">B 及以上</option>
                    <option value="C">C 及以上</option>
                  </select>
                </label>
              </div>
            </article>

            <article className="workbench-card workbench-subcard">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">强制剔除规则</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                    失效状态
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {['空亡', '击刑', '入墓', '门迫'].map((item, index) => {
                      const active = settings.risk.invalidatingStates.includes(
                        item as (typeof settings.risk.invalidatingStates)[number],
                      );

                      return (
                        <button
                          className={`workbench-pill-toggle ${active ? 'is-active' : ''}`}
                          key={`${item}-${index}`}
                          onClick={() =>
                            setSettings({
                              ...settings,
                              risk: {
                                ...settings.risk,
                                invalidatingStates: active
                                  ? settings.risk.invalidatingStates.filter(
                                      (entry) => entry !== item,
                                    )
                                  : [
                                      ...settings.risk.invalidatingStates,
                                      item as (typeof settings.risk.invalidatingStates)[number],
                                    ],
                              },
                            })
                          }
                          type="button"
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                    顶级凶格
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {['白虎猖狂'].map((item, index) => {
                      const active = settings.risk.topEvilPatterns.includes(
                        item as (typeof settings.risk.topEvilPatterns)[number],
                      );

                      return (
                        <button
                          className={`workbench-pill-toggle ${active ? 'is-active' : ''}`}
                          key={`${item}-${index}`}
                          onClick={() =>
                            setSettings({
                              ...settings,
                              risk: {
                                ...settings.risk,
                                topEvilPatterns: active
                                  ? settings.risk.topEvilPatterns.filter(
                                      (entry) => entry !== item,
                                    )
                                  : [
                                      ...settings.risk.topEvilPatterns,
                                      item as (typeof settings.risk.topEvilPatterns)[number],
                                    ],
                              },
                            })
                          }
                          type="button"
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="workbench-card" data-testid="settings-visual-panel">
          <p className="mystic-section-label">可视化设置</p>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <article className="workbench-card workbench-subcard">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">评级高亮颜色</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(['S', 'A', 'B', 'C'] as const).map((rating) => (
                  <label className="block" key={rating}>
                    <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                      {rating} 级背景
                    </span>
                    <input
                      className="mystic-input"
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          visual: {
                            ...settings.visual,
                            ratingColors: {
                              ...settings.visual.ratingColors,
                              [rating]: event.target.value,
                            },
                          },
                        })
                      }
                      type="text"
                      value={settings.visual.ratingColors[rating]}
                    />
                  </label>
                ))}
              </div>
            </article>

            <article className="workbench-card workbench-subcard">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">盘图样式</h3>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                    盘图强调色
                  </span>
                  <input
                    className="mystic-input"
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        visual: {
                          ...settings.visual,
                          boardAccentColor: event.target.value,
                        },
                      })
                    }
                    type="text"
                    value={settings.visual.boardAccentColor}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                    排盘图样式密度
                  </span>
                  <select
                    className="mystic-select w-full"
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        visual: {
                          ...settings.visual,
                          boardStyle: event.target.value as
                            | 'focused'
                            | 'dense'
                            | 'minimal',
                        },
                      })
                    }
                    value={settings.visual.boardStyle}
                  >
                    <option value="focused">Focused</option>
                    <option value="dense">Dense</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </label>
              </div>
            </article>
          </div>
        </section>
      </div>

      {transferMode ? (
        <div className="workbench-overlay">
          <section className="workbench-dialog workbench-dialog-wide" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mystic-section-label">{transferMode === 'export' ? '导出配置' : '导入配置'}</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  {transferMode === 'export' ? '复制当前 JSON' : '粘贴 JSON 后导入'}
                </h3>
              </div>
              <button
                className="mystic-chip"
                data-hotkey-dismiss="true"
                onClick={() => setTransferMode(null)}
                type="button"
              >
                关闭
              </button>
            </div>
            <textarea
              className="mystic-input mt-5 min-h-[320px]"
              onChange={(event) => setTransferValue(event.target.value)}
              readOnly={transferMode === 'export'}
              value={transferValue}
            />
            {transferMessage ? (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">{transferMessage}</p>
            ) : null}
            {transferMode === 'import' ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="mystic-button-primary"
                  data-hotkey-primary="true"
                  onClick={() => {
                    const result = importSettings(transferValue);

                    setTransferMessage(
                      result.ok ? '配置已导入并立即生效。' : result.message,
                    );
                  }}
                  type="button"
                >
                  导入并应用
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
