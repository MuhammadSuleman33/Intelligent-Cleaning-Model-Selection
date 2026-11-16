import { motion } from 'framer-motion'
import { ThreeBackground } from './ThreeBackground'
import { AppHeader } from './AppHeader'

const MotionMain = motion.div

// Avoid opacity:0 initial state — it can leave content invisible if animation never completes (lazy routes + Plotly).
const pageTransition = {
  initial: { opacity: 1, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0.98, y: -6 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
}

/**
 * @param {{ children: import('react').ReactNode, className?: string, maxWidthClass?: string, showNav?: boolean }} props
 */
export function PageShell({ children, className = '', maxWidthClass = 'max-w-5xl', showNav = true }) {
  return (
    <>
      <ThreeBackground />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>
      <div className={`relative z-0 mx-auto min-h-screen px-4 pb-16 pt-10 sm:px-6 lg:px-8 ${maxWidthClass}`}>
        {showNav ? <AppHeader /> : null}
        <MotionMain
          id="main-content"
          tabIndex={-1}
          className={className}
          {...pageTransition}
        >
          {children}
        </MotionMain>
      </div>
    </>
  )
}
