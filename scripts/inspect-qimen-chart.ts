import { inspectQimenChart } from '@/lib/qimen/engine';

function printUsage() {
  console.error(
    '用法: npm run inspect:qimen -- 2001-08-27T09:30:00+08:00',
  );
}

const input = process.argv[2];

if (!input) {
  printUsage();
  process.exit(1);
}

const datetime = new Date(input);

if (Number.isNaN(datetime.getTime())) {
  console.error(`无法解析时间: ${input}`);
  printUsage();
  process.exit(1);
}

const result = inspectQimenChart(datetime);

console.log(JSON.stringify(result, null, 2));
