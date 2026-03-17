import type { ApiError } from '@/api/qimen';

type ErrorNoticeProps = {
  error: ApiError;
};

export function ErrorNotice({ error }: ErrorNoticeProps) {
  return (
    <div
      className="rounded-3xl border border-red-900/20 bg-red-50/90 p-5 text-red-950 shadow-sm"
      role="alert"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-red-700">
        接口异常
      </p>
      <p className="mt-2 text-lg font-semibold">{error.message}</p>
      <p className="mt-1 text-sm text-red-800/80">错误码：{error.code}</p>
    </div>
  );
}
