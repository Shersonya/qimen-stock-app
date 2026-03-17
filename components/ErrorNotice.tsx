import type { ApiError } from '@/lib/contracts/qimen';

type ErrorNoticeProps = {
  error: ApiError;
  title?: string;
};

export function ErrorNotice({
  error,
  title = '起局异常',
}: ErrorNoticeProps) {
  return (
    <div
      className="rounded-[1.55rem] border border-vermilion/30 bg-[linear-gradient(180deg,rgba(63,23,17,0.96),rgba(115,36,28,0.92))] p-4 text-[#fff1dc] shadow-[inset_0_1px_0_rgba(255,228,209,0.12)]"
      role="alert"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-vermilion">
        {title}
      </p>
      <p className="mt-2 text-lg font-semibold text-[#fff1dc]">{error.message}</p>
      <p className="mt-1 text-sm text-[#f4c7a7]/72">错误码：{error.code}</p>
    </div>
  );
}
