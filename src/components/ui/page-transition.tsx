import type { ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Outlet, useLocation } from "react-router"

/** Shared transition config for medical-app-appropriate subtle animations. */
const TRANSITION = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1], // standard material ease-out
} as const

const ENTER_VARIANTS = {
  opacity: 0,
  y: 12,
}

const EXIT_VARIANTS = {
  opacity: 0,
  y: -8,
}

const ACTIVE_VARIANTS = {
  opacity: 1,
  y: 0,
}

interface PageTransitionProps {
  /** Route-level content. Animation key is derived from the current pathname. */
  children: ReactNode
}

/**
 * Wraps a single route's content with a fade + slide-up enter animation.
 *
 * Use this inside a page component when you want to animate that page's
 * entrance without animating the surrounding layout chrome (sidebar, tabs).
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()

  return (
    <motion.div
      key={location.pathname}
      initial={ENTER_VARIANTS}
      animate={ACTIVE_VARIANTS}
      exit={EXIT_VARIANTS}
      transition={TRANSITION}
      style={{ opacity: 0, height: "100%" }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Animated replacement for React Router's `<Outlet />`.
 *
 * Coordinates enter/exit across sibling routes via `AnimatePresence`.
 * The exiting page finishes its exit animation before the entering page mounts
 * (`mode="wait"`), which prevents layout jank when two pages coexist briefly.
 *
 * Usage: drop `<AnimatedOutlet />` wherever you'd normally write `<Outlet />`
 * in a layout route component.
 */
export function AnimatedOutlet() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={ENTER_VARIANTS}
        animate={ACTIVE_VARIANTS}
        exit={EXIT_VARIANTS}
        transition={TRANSITION}
        style={{ opacity: 0, height: "100%" }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}
