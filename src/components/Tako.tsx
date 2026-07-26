import { motion, type TargetAndTransition, type Transition } from 'framer-motion'

export type TakoMood = 'idle' | 'happy' | 'laugh' | 'laptop' | 'sleepy'

const BODY_ANIM: Record<TakoMood, { animate: TargetAndTransition; transition: Transition }> = {
  idle: {
    animate: { y: [0, -5, 0], rotate: [0, -2.5, 0, 2.5, 0] },
    transition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
  },
  happy: {
    animate: { y: [0, -9, 0, -6, 0], rotate: 0 },
    transition: { duration: 1.1, repeat: Infinity, ease: 'easeOut' },
  },
  laugh: {
    animate: { rotate: [-4, 4, -4], y: [0, -2, 0] },
    transition: { duration: 0.28, repeat: Infinity, ease: 'easeInOut' },
  },
  laptop: {
    animate: { y: [0, -2, 0], rotate: 0 },
    transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
  },
  sleepy: {
    animate: { y: [0, -3, 0], rotate: 4 },
    transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
  },
}

/** Tako the octopus mascot — moods change his face, posture and props. */
export default function Tako({ size = 92, mood = 'idle' }: { size?: number; mood?: TakoMood }) {
  const body = BODY_ANIM[mood]
  const openEyes = mood === 'idle' || mood === 'laptop'
  const pupilDy = mood === 'laptop' ? 3 : 0
  return (
    <motion.svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      animate={body.animate}
      transition={body.transition}
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
      {openEyes ? (
        <>
          <circle cx="45" cy="60" r="9.5" fill="#FFFDF6" />
          <circle cx="75" cy="60" r="9.5" fill="#FFFDF6" />
          <motion.g
            animate={{ scaleY: [1, 1, 0.08, 1, 1] }}
            style={{ transformOrigin: '60px 60px' }}
            transition={{ duration: 3.8, times: [0, 0.46, 0.52, 0.58, 1], repeat: Infinity }}
          >
            <circle cx="47" cy={60 + pupilDy} r="4.4" fill="#26231D" />
            <circle cx="77" cy={60 + pupilDy} r="4.4" fill="#26231D" />
            <circle cx="48.6" cy={58.4 + pupilDy} r="1.5" fill="#FFFDF6" />
            <circle cx="78.6" cy={58.4 + pupilDy} r="1.5" fill="#FFFDF6" />
          </motion.g>
        </>
      ) : mood === 'sleepy' ? (
        <g stroke="#FFFDF6" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M38 61 q7 3 14 0" />
          <path d="M68 61 q7 3 14 0" />
        </g>
      ) : (
        // happy / laugh: ^ ^ eyes
        <g stroke="#FFFDF6" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M38 60 q7 -7 14 0" />
          <path d="M68 60 q7 -7 14 0" />
        </g>
      )}

      {/* mouth */}
      {mood === 'laugh' ? (
        <ellipse cx="60" cy="73" rx="7.5" ry="5.5" fill="#7A2A0F" />
      ) : mood === 'happy' ? (
        <path d="M49 70 Q60 80 71 70" stroke="#FFFDF6" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      ) : mood === 'sleepy' ? (
        <circle cx="60" cy="73" r="3" fill="#7A2A0F" />
      ) : (
        <path d="M52 72 Q60 79 68 72" stroke="#FFFDF6" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}

      {/* cheeks */}
      <circle cx="34" cy="68" r="5" fill="#FFFDF6" opacity="0.28" />
      <circle cx="86" cy="68" r="5" fill="#FFFDF6" opacity="0.28" />

      {/* laptop prop */}
      {mood === 'laptop' && (
        <g>
          <rect x="37" y="76" width="46" height="28" rx="3.5" fill="#4A443B" />
          <rect x="41" y="80" width="38" height="20" rx="2" fill="#FFFDF6" />
          <text
            x="55"
            y="95"
            fontSize="13"
            fontWeight="700"
            fill="#D0491F"
            fontFamily="'Zen Maru Gothic', sans-serif"
          >
            あ
          </text>
          <motion.rect
            x="68"
            y="85"
            width="2.5"
            height="10"
            fill="#26231D"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 0.9, times: [0, 0.5, 0.5, 1], repeat: Infinity }}
          />
          <rect x="32" y="104" width="56" height="6" rx="3" fill="#5A5348" />
          {/* typing tentacle tips */}
          <motion.circle
            cx="46"
            cy="103"
            r="4"
            fill="#D0491F"
            animate={{ cy: [103, 100, 103] }}
            transition={{ duration: 0.34, repeat: Infinity }}
          />
          <motion.circle
            cx="74"
            cy="103"
            r="4"
            fill="#D0491F"
            animate={{ cy: [103, 100, 103] }}
            transition={{ duration: 0.34, repeat: Infinity, delay: 0.17 }}
          />
        </g>
      )}
    </motion.svg>
  )
}
