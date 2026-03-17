import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { generateQimenChart } from '../lib/qimen/engine';

const outputDir = path.resolve(process.cwd(), 'public');

const boards = [
  {
    key: 'sh',
    title: '上证指数',
    subtitle: '沪市大盘奇门参考盘',
    datetime: '1990-12-19 09:30',
    theme: {
      bgStart: '#7b2c22',
      bgEnd: '#ddb673',
      ink: '#6d2a22',
      accent: '#a56a1f',
      line: '#f3dfbd',
      panel: '#fff7ea',
      badge: '#fff5e4',
    },
  },
  {
    key: 'sz',
    title: '深证指数',
    subtitle: '深市大盘奇门参考盘',
    datetime: '1994-07-20 09:30',
    theme: {
      bgStart: '#204c6e',
      bgEnd: '#d2b06f',
      ink: '#18405f',
      accent: '#8c6b2e',
      line: '#e9dcc0',
      panel: '#f7f1e4',
      badge: '#fdf7eb',
    },
  },
  {
    key: 'cyb',
    title: '创业板指',
    subtitle: '创业板大盘奇门参考盘',
    datetime: '2010-05-31 09:30',
    theme: {
      bgStart: '#345d39',
      bgEnd: '#dfb665',
      ink: '#234a29',
      accent: '#9a7a2d',
      line: '#ebdfbf',
      panel: '#fbf4e6',
      badge: '#fff7ea',
    },
  },
] as const;

type BoardVariantName = 'standard' | 'enhanced';

type BoardVariant = {
  svgWidth: number;
  svgHeight: number;
  startX: number;
  startY: number;
  cellWidth: number;
  cellHeight: number;
  centerWidth: number;
  centerHeight: number;
  gapX: number;
  gapY: number;
  cardRadius: number;
  labelInsetX: number;
  labelOffsetY: number;
  starOffsetY: number;
  centerStarOffsetY: number;
  doorOffsetY: number;
  centerDoorOffsetY: number;
  godOffsetY: number;
  centerGodOffsetY: number;
  starSize: number;
  centerStarSize: number;
  doorSize: number;
  centerDoorSize: number;
  godSize: number;
  centerGodSize: number;
  titleX: number;
  titleY: number;
  titleSize: number;
  metaY: number;
  metaSize: number;
  topDividerY: number;
  bottomDividerY: number;
  badgeX: number;
  badgeY: number;
  badgeWidth: number;
  badgeHeight: number;
  badgeRadius: number;
  badgeTitleY: number;
  badgeMetaY: number;
  badgeTitleSize: number;
  badgeMetaSize: number;
  topCircleCx: number;
  topCircleCy: number;
  topCircleR: number;
  topCircleOpacity: number;
  topInnerCircleCx: number;
  topInnerCircleCy: number;
  topInnerCircleR: number;
  topInnerCircleOpacity: number;
  lowerCircleCx: number;
  lowerCircleCy: number;
  lowerCircleR: number;
  lowerCircleOpacity: number;
  panelStrokeOpacity: number;
  panelShadowDy: number;
  panelShadowBlur: number;
  panelShadowOpacity: number;
  centerShadowDy: number;
  centerShadowBlur: number;
  centerShadowOpacity: number;
  badgeFillOpacityStart: number;
  badgeFillOpacityEnd: number;
  panelEndColor: string;
  centerEndColor: string;
};

const boardVariants = {
  standard: {
    svgWidth: 1200,
    svgHeight: 1040,
    startX: 164,
    startY: 176,
    cellWidth: 272,
    cellHeight: 258,
    centerWidth: 294,
    centerHeight: 286,
    gapX: 28,
    gapY: 30,
    cardRadius: 30,
    labelInsetX: 24,
    labelOffsetY: 38,
    starOffsetY: 122,
    centerStarOffsetY: 138,
    doorOffsetY: 186,
    centerDoorOffsetY: 204,
    godOffsetY: 224,
    centerGodOffsetY: 240,
    starSize: 58,
    centerStarSize: 72,
    doorSize: 28,
    centerDoorSize: 26,
    godSize: 20,
    centerGodSize: 19,
    titleX: 68,
    titleY: 86,
    titleSize: 34,
    metaY: 124,
    metaSize: 20,
    topDividerY: 150,
    bottomDividerY: 994,
    badgeX: 846,
    badgeY: 54,
    badgeWidth: 292,
    badgeHeight: 78,
    badgeRadius: 39,
    badgeTitleY: 82,
    badgeMetaY: 108,
    badgeTitleSize: 19,
    badgeMetaSize: 17,
    topCircleCx: 1098,
    topCircleCy: 62,
    topCircleR: 188,
    topCircleOpacity: 0.16,
    topInnerCircleCx: 1122,
    topInnerCircleCy: 76,
    topInnerCircleR: 124,
    topInnerCircleOpacity: 0.08,
    lowerCircleCx: -18,
    lowerCircleCy: 926,
    lowerCircleR: 248,
    lowerCircleOpacity: 0.14,
    panelStrokeOpacity: 0.14,
    panelShadowDy: 14,
    panelShadowBlur: 16,
    panelShadowOpacity: 0.16,
    centerShadowDy: 18,
    centerShadowBlur: 20,
    centerShadowOpacity: 0.2,
    badgeFillOpacityStart: 0.16,
    badgeFillOpacityEnd: 0.05,
    panelEndColor: '#fffdf7',
    centerEndColor: '#fffdf1',
  },
  enhanced: {
    svgWidth: 1200,
    svgHeight: 1040,
    startX: 164,
    startY: 176,
    cellWidth: 272,
    cellHeight: 258,
    centerWidth: 304,
    centerHeight: 296,
    gapX: 30,
    gapY: 34,
    cardRadius: 32,
    labelInsetX: 24,
    labelOffsetY: 38,
    starOffsetY: 126,
    centerStarOffsetY: 142,
    doorOffsetY: 192,
    centerDoorOffsetY: 212,
    godOffsetY: 230,
    centerGodOffsetY: 248,
    starSize: 60,
    centerStarSize: 76,
    doorSize: 28,
    centerDoorSize: 27,
    godSize: 20,
    centerGodSize: 19,
    titleX: 68,
    titleY: 86,
    titleSize: 35,
    metaY: 124,
    metaSize: 20,
    topDividerY: 150,
    bottomDividerY: 994,
    badgeX: 842,
    badgeY: 52,
    badgeWidth: 300,
    badgeHeight: 82,
    badgeRadius: 41,
    badgeTitleY: 82,
    badgeMetaY: 110,
    badgeTitleSize: 20,
    badgeMetaSize: 17,
    topCircleCx: 1094,
    topCircleCy: 54,
    topCircleR: 196,
    topCircleOpacity: 0.2,
    topInnerCircleCx: 1122,
    topInnerCircleCy: 72,
    topInnerCircleR: 136,
    topInnerCircleOpacity: 0.12,
    lowerCircleCx: -24,
    lowerCircleCy: 926,
    lowerCircleR: 260,
    lowerCircleOpacity: 0.18,
    panelStrokeOpacity: 0.18,
    panelShadowDy: 18,
    panelShadowBlur: 18,
    panelShadowOpacity: 0.22,
    centerShadowDy: 22,
    centerShadowBlur: 24,
    centerShadowOpacity: 0.28,
    badgeFillOpacityStart: 0.22,
    badgeFillOpacityEnd: 0.08,
    panelEndColor: '#fffefb',
    centerEndColor: '#fffdf4',
  },
} as const satisfies Record<BoardVariantName, BoardVariant>;

const ACTIVE_REFERENCE_BOARD_VARIANT: BoardVariantName = 'standard';

function computeBoard(datetime: string) {
  return generateQimenChart(new Date(datetime.replace(' ', 'T') + ':00+08:00'));
}

function renderBoardSvg(reference: (typeof boards)[number]) {
  const chart = computeBoard(reference.datetime);
  const { theme } = reference;
  const variant = boardVariants[ACTIVE_REFERENCE_BOARD_VARIANT];

  const cells = chart.palaces
    .map((palace, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const baseX = variant.startX + col * (variant.cellWidth + variant.gapX);
      const baseY = variant.startY + row * (variant.cellHeight + variant.gapY);
      const isCenter = palace.position === 5;
      const cardWidth = isCenter ? variant.centerWidth : variant.cellWidth;
      const cardHeight = isCenter ? variant.centerHeight : variant.cellHeight;
      const x = baseX + (variant.cellWidth - cardWidth) / 2;
      const y = baseY + (variant.cellHeight - cardHeight) / 2;
      const labelX = x + variant.labelInsetX;
      const contentCenterX = x + cardWidth / 2;
      const starY = y + (isCenter ? variant.centerStarOffsetY : variant.starOffsetY);
      const doorY = y + (isCenter ? variant.centerDoorOffsetY : variant.doorOffsetY);
      const godY = y + (isCenter ? variant.centerGodOffsetY : variant.godOffsetY);
      const starSize = isCenter ? variant.centerStarSize : variant.starSize;
      const doorSize = isCenter ? variant.centerDoorSize : variant.doorSize;
      const godSize = isCenter ? variant.centerGodSize : variant.godSize;
      const fillId = isCenter
        ? `panel-center-${reference.key}`
        : `panel-${reference.key}`;
      const shadowId = isCenter
        ? `panel-center-shadow-${reference.key}`
        : `panel-shadow-${reference.key}`;
      const stroke = isCenter ? theme.accent : theme.line;
      const strokeOpacity = isCenter ? 0.72 : variant.panelStrokeOpacity;
      const strokeWidth = isCenter ? 2 : 1;

      return `
      <g>
        <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="${variant.cardRadius}" fill="url(#${fillId})" stroke="${stroke}" stroke-opacity="${strokeOpacity}" stroke-width="${strokeWidth}" filter="url(#${shadowId})" />
        <text x="${labelX}" y="${y + variant.labelOffsetY}" fill="${theme.ink}" fill-opacity="0.76" font-size="18" font-family="PingFang SC, Microsoft YaHei, sans-serif">${palace.name}${palace.position}宫</text>
        <text x="${contentCenterX}" y="${starY}" fill="${theme.ink}" font-size="${starSize}" font-family="Songti SC, STSong, serif" text-anchor="middle">${palace.star}</text>
        <text x="${contentCenterX}" y="${doorY}" fill="${theme.accent}" font-size="${doorSize}" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-weight="600" text-anchor="middle">${palace.door}</text>
        <text x="${contentCenterX}" y="${godY}" fill="${theme.ink}" fill-opacity="0.68" font-size="${godSize}" font-family="PingFang SC, Microsoft YaHei, sans-serif" text-anchor="middle">${palace.god}</text>
      </g>`;
    })
    .join('\n');

  return `<svg width="${variant.svgWidth}" height="${variant.svgHeight}" viewBox="0 0 ${variant.svgWidth} ${variant.svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-${reference.key}" x1="36" y1="36" x2="1164" y2="${variant.svgHeight - 36}" gradientUnits="userSpaceOnUse">
      <stop stop-color="${theme.bgStart}" />
      <stop offset="1" stop-color="${theme.bgEnd}" />
    </linearGradient>
    <linearGradient id="badge-${reference.key}" x1="${variant.badgeX}" y1="${variant.badgeY}" x2="${variant.badgeX + variant.badgeWidth}" y2="${variant.badgeY + variant.badgeHeight}" gradientUnits="userSpaceOnUse">
      <stop stop-color="${theme.badge}" stop-opacity="${variant.badgeFillOpacityStart}" />
      <stop offset="1" stop-color="${theme.badge}" stop-opacity="${variant.badgeFillOpacityEnd}" />
    </linearGradient>
    <linearGradient id="panel-${reference.key}" x1="${variant.startX}" y1="${variant.startY}" x2="${variant.startX + variant.cellWidth}" y2="${variant.startY + variant.cellHeight}" gradientUnits="userSpaceOnUse">
      <stop stop-color="${theme.panel}" stop-opacity="0.98" />
      <stop offset="1" stop-color="${variant.panelEndColor}" stop-opacity="0.94" />
    </linearGradient>
    <linearGradient id="panel-center-${reference.key}" x1="${variant.startX}" y1="${variant.startY}" x2="${variant.startX + variant.centerWidth}" y2="${variant.startY + variant.centerHeight}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fff8e8" stop-opacity="0.99" />
      <stop offset="1" stop-color="${variant.centerEndColor}" stop-opacity="0.96" />
    </linearGradient>
    <filter id="panel-shadow-${reference.key}" x="-20%" y="-20%" width="160%" height="180%">
      <feDropShadow dx="0" dy="${variant.panelShadowDy}" stdDeviation="${variant.panelShadowBlur}" flood-color="#120a08" flood-opacity="${variant.panelShadowOpacity}" />
    </filter>
    <filter id="panel-center-shadow-${reference.key}" x="-20%" y="-20%" width="160%" height="190%">
      <feDropShadow dx="0" dy="${variant.centerShadowDy}" stdDeviation="${variant.centerShadowBlur}" flood-color="#120a08" flood-opacity="${variant.centerShadowOpacity}" />
    </filter>
  </defs>
  <rect width="${variant.svgWidth}" height="${variant.svgHeight}" rx="36" fill="url(#bg-${reference.key})" />
  <circle cx="${variant.topCircleCx}" cy="${variant.topCircleCy}" r="${variant.topCircleR}" stroke="${theme.line}" stroke-opacity="${variant.topCircleOpacity}" stroke-width="1.2" />
  <circle cx="${variant.topInnerCircleCx}" cy="${variant.topInnerCircleCy}" r="${variant.topInnerCircleR}" stroke="${theme.line}" stroke-opacity="${variant.topInnerCircleOpacity}" stroke-width="1" />
  <circle cx="${variant.lowerCircleCx}" cy="${variant.lowerCircleCy}" r="${variant.lowerCircleR}" stroke="${theme.line}" stroke-opacity="${variant.lowerCircleOpacity}" stroke-width="1.2" />
  <line x1="62" y1="${variant.topDividerY}" x2="${variant.svgWidth - 62}" y2="${variant.topDividerY}" stroke="${theme.line}" stroke-opacity="0.2" stroke-width="1.5" />
  <line x1="62" y1="${variant.bottomDividerY}" x2="${variant.svgWidth - 62}" y2="${variant.bottomDividerY}" stroke="${theme.line}" stroke-opacity="0.12" stroke-width="1.2" />
  <text x="${variant.titleX}" y="${variant.titleY}" fill="#fff6ea" fill-opacity="0.98" font-size="${variant.titleSize}" font-family="Songti SC, STSong, serif" letter-spacing="2">${reference.subtitle}</text>
  <text x="${variant.titleX}" y="${variant.metaY}" fill="${theme.line}" fill-opacity="0.92" font-size="${variant.metaSize}" font-family="PingFang SC, Microsoft YaHei, sans-serif">${reference.title} · ${reference.datetime}</text>
  <rect x="${variant.badgeX}" y="${variant.badgeY}" width="${variant.badgeWidth}" height="${variant.badgeHeight}" rx="${variant.badgeRadius}" fill="url(#badge-${reference.key})" stroke="${theme.line}" stroke-opacity="0.72" stroke-width="1.5" />
  <text x="${variant.badgeX + variant.badgeWidth / 2}" y="${variant.badgeTitleY}" fill="#fff8ef" font-size="${variant.badgeTitleSize}" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-weight="600" text-anchor="middle">${chart.yinYang}遁 ${chart.ju}局</text>
  <text x="${variant.badgeX + variant.badgeWidth / 2}" y="${variant.badgeMetaY}" fill="#fff6ea" fill-opacity="0.96" font-size="${variant.badgeMetaSize}" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-weight="600" text-anchor="middle">值符 ${chart.valueStar} / 值使 ${chart.valueDoor}</text>
  ${cells}
</svg>`;
}

async function main() {
  for (const board of boards) {
    const svg = renderBoardSvg(board);
    const svgPath = path.join(outputDir, `ref-${board.key}.svg`);
    const pngPath = path.join(outputDir, `ref-${board.key}.png`);

    await fs.writeFile(svgPath, svg, 'utf8');

    try {
      execFileSync('sips', ['-s', 'format', 'png', svgPath, '--out', pngPath], {
        stdio: 'ignore',
      });
    } catch (error) {
      console.warn(`PNG conversion skipped for ref-${board.key}:`, error);
    }
  }

  console.log(
    `Reference SVGs and PNGs generated with ${ACTIVE_REFERENCE_BOARD_VARIANT} layout.`,
  );
}

void main();
