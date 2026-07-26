import { motion } from 'framer-motion'

/**
 * Vermilion hanko-seal stamp — used when a card graduates to mature and as
 * the mastery marker on the kana chart.
 */
export default function Hanko({
  char = '習',
  size = 34,
  animate = true,
  className = '',
}: {
  char?: string
  size?: number
  animate?: boolean
  className?: string
}) {
  return (
    <motion.span
      initial={animate ? { scale: 2.4, opacity: 0, rotate: -20 } : false}
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className={`inline-flex select-none items-center justify-center rounded-full border-2 border-vermilion font-kana font-bold text-vermilion ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-label="mastered"
      role="img"
    >
      {char}
    </motion.span>
  )
}
