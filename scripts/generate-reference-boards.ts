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
    subtitle: '创业板奇门参考盘',
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

function computeBoard(datetime: string) {
  return generateQimenChart(new Date(datetime.replace(' ', 'T') + ':00+08:00'));
}

function renderBoardSvg(reference: (typeof boards)[number]) {
  const chart = computeBoard(reference.datetime);
  const { theme } = reference;
  const cellWidth = 300;
  const cellHeight = 180;
  const gap = 24;
  const startX = 126;
  const startY = 220;

  const cells = chart.palaces
    .map((palace, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const x = startX + col * (cellWidth + gap);
      const y = startY + row * (cellHeight + gap);
      const isCenter = palace.position === 5;
      const fill = isCenter ? '#fff8e8' : theme.panel;
      const stroke = isCenter ? theme.accent : 'transparent';
      const starSize = isCenter ? 42 : 34;

      return `
      <g>
        <rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" rx="24" fill="${fill}" fill-opacity="0.92" stroke="${stroke}" stroke-width="${isCenter ? 3 : 0}" />
        <text x="${x + 24}" y="${y + 36}" fill="${theme.ink}" font-size="20" font-family="Songti SC, STSong, serif">${palace.name}${palace.position}宫</text>
        <text x="${isCenter ? x + cellWidth / 2 : x + 24}" y="${y + 92}" fill="${theme.ink}" font-size="${starSize}" font-family="Songti SC, STSong, serif" ${isCenter ? 'text-anchor="middle"' : ''}>${palace.star}</text>
        <text x="${isCenter ? x + cellWidth / 2 : x + 24}" y="${y + 130}" fill="${theme.accent}" font-size="24" font-family="PingFang SC, Microsoft YaHei, sans-serif" ${isCenter ? 'text-anchor="middle"' : ''}>${palace.door}</text>
        <text x="${isCenter ? x + cellWidth / 2 : x + 24}" y="${y + 158}" fill="${theme.ink}" fill-opacity="0.76" font-size="20" font-family="PingFang SC, Microsoft YaHei, sans-serif" ${isCenter ? 'text-anchor="middle"' : ''}>${palace.god}</text>
      </g>`;
    })
    .join('\n');

  return `<svg width="1200" height="860" viewBox="0 0 1200 860" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-${reference.key}" x1="72" y1="52" x2="1116" y2="808" gradientUnits="userSpaceOnUse">
      <stop stop-color="${theme.bgStart}" />
      <stop offset="1" stop-color="${theme.bgEnd}" />
    </linearGradient>
  </defs>
  <rect width="1200" height="860" rx="38" fill="#f7e9cf" />
  <rect x="22" y="22" width="1156" height="816" rx="32" fill="url(#bg-${reference.key})" />
  <g opacity="0.18" stroke="${theme.line}">
    <circle cx="1010" cy="150" r="168" />
    <circle cx="172" cy="734" r="208" />
    <path d="M86 156H1110" />
    <path d="M86 784H1110" />
  </g>
  <text x="92" y="92" fill="#fff7ea" font-size="42" font-family="Songti SC, STSong, serif" letter-spacing="6">${reference.subtitle}</text>
  <text x="92" y="128" fill="${theme.line}" font-size="22" font-family="PingFang SC, Microsoft YaHei, sans-serif">${reference.title} · ${reference.datetime}</text>
  <rect x="858" y="62" width="258" height="66" rx="33" fill="${theme.badge}" fill-opacity="0.18" stroke="${theme.line}" />
  <text x="987" y="92" fill="#fff7ea" font-size="20" font-family="PingFang SC, Microsoft YaHei, sans-serif" text-anchor="middle">${chart.yinYang}遁 ${chart.ju}局</text>
  <text x="987" y="115" fill="#fff7ea" font-size="18" font-family="PingFang SC, Microsoft YaHei, sans-serif" text-anchor="middle">值符 ${chart.valueStar} / 值使 ${chart.valueDoor}</text>
  ${cells}
  <text x="92" y="818" fill="#fff7ea" font-size="22" font-family="PingFang SC, Microsoft YaHei, sans-serif">固定参考起盘时间：${reference.datetime}</text>
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

  console.log('Reference SVGs and PNGs generated.');
}

void main();
