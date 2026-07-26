import { motion } from 'framer-motion'

/** Tako the octopus mascot — hachimaki headband, bobbing idle, blinking eyes. */
export default function Tako({ size = 92 }: { size?: number }) {
  return (
    <motion.svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      animate={{ y: [0, -5, 0], rotate: [0, -2.5, 0, 2.5, 0] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    >
      {/* tentacles */}
      <g fill="#D0491F">
        <circle cx="26" cy="88" r="10" />
        <circle cx="43" cy="95" r="10" />
        <circle cx="60" cy="97" r="10" />
        <circle cx="77" cy="95" r="10" />
        <circle cx="94" cy="88" r="10" />
      </g>
      <g fill="#B23D18">
        <circle cx="26" cy="92" r="4" />
        <circle cx="43" cy="99" r="4" />
        <circle cx="60" cy="101" r="4" />
        <circle cx="77" cy="99" r="4" />
        <circle cx="94" cy="92" r="4" />
      </g>
      {/* head */}
      <ellipse cx="60" cy="52" rx="41" ry="39" fill="#D0491F" />
      {/* hachimaki headband */}
      <path d="M20 42 Q60 28 100 42 L100 52 Q60 38 20 52 Z" fill="#FFFDF6" />
      <circle cx="60" cy="41" r="5.5" fill="#D0491F" />
      <path d="M99 44 q10 -6 14 -1 q-6 1 -8 6 z" fill="#FFFDF6" />
      <path d="M100 48 q11 0 13 6 q-7 0 -11 3 z" fill="#FFFDF6" />
      {/* eyes */}
      <circle cx="45" cy="60" r="9.5" fill="#FFFDF6" />
      <circle cx="75" cy="60" r="9.5" fill="#FFFDF6" />
      <motion.g
        animate={{ scaleY: [1, 1, 0.08, 1, 1] }}
        style={{ transformOrigin: '60px 60px' }}
        transition={{ duration: 3.8, times: [0, 0.46, 0.52, 0.58, 1], repeat: Infinity }}
      >
        <circle cx="47" cy="60" r="4.4" fill="#26231D" />
        <circle cx="77" cy="60" r="4.4" fill="#26231D" />
        <circle cx="48.6" cy="58.4" r="1.5" fill="#FFFDF6" />
        <circle cx="78.6" cy="58.4" r="1.5" fill="#FFFDF6" />
      </motion.g>
      {/* smile + cheeks */}
      <path d="M52 72 Q60 79 68 72" stroke="#FFFDF6" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="34" cy="68" r="5" fill="#FFFDF6" opacity="0.28" />
      <circle cx="86" cy="68" r="5" fill="#FFFDF6" opacity="0.28" />
    </motion.svg>
  )
}
