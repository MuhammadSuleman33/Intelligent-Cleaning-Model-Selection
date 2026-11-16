/**
 * @param {{ children: import('react').ReactNode, className?: string, as?: keyof JSX.IntrinsicElements }} props
 */
export function GlassCard({ children, className = '', as = 'div' }) {
  const Tag = as
  return (
    <Tag
      className={`rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl ${className}`}
    >
      {children}
    </Tag>
  )
}
