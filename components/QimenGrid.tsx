'use client';

import { useEffect, useState } from 'react';

import type { QimenPalace } from '@/lib/contracts/qimen';
import { getDefaultPalaceIndex } from '@/lib/ui';
import { QimenBoard } from '@/components/QimenBoard';

type QimenGridProps = {
  palaces: QimenPalace[];
};

export function QimenGrid({ palaces }: QimenGridProps) {
  const [selectedPalaceIndex, setSelectedPalaceIndex] = useState<number | null>(
    getDefaultPalaceIndex(palaces),
  );

  useEffect(() => {
    setSelectedPalaceIndex(getDefaultPalaceIndex(palaces));
  }, [palaces]);

  return (
    <QimenBoard
      activeTab="qimen"
      error={null}
      headerBadge="组件预览"
      market="SH"
      onSelectPalace={setSelectedPalaceIndex}
      onTabChange={() => {}}
      palaces={palaces}
      result={null}
      selectedPalaceIndex={selectedPalaceIndex}
      status="ready"
      subtitle="兼容旧测试的九宫盘包装组件。"
      summary={null}
      title="九宫盘"
      valuePair="主星 / 主门"
    />
  );
}
