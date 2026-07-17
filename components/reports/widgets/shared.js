export const chartCardClass =
  'h-full rounded-[20px] border-2 p-5 bg-card border-border text-card-foreground shadow-sm'

export function Trend({ type = 'up', text }) {
  const isUp = type === 'up'
  return (
    <div
      className={`mt-1 flex items-center gap-1 text-[14px] font-medium ${
        isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      }`}
    >
      <span aria-hidden>{isUp ? '↗' : '↘'}</span>
      <span>{text}</span>
    </div>
  )
}
