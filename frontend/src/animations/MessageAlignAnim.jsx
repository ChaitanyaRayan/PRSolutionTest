import { motion } from 'framer-motion';

const MESSAGES = [
  { label: 'Innovation', intended: 90, actual: 72 },
  { label: 'Trust', intended: 85, actual: 88 },
  { label: 'Value', intended: 78, actual: 45 },
  { label: 'Leadership', intended: 70, actual: 61 },
];

const BAR_H = 8;
const GAP = 18;
const MAX_W = 100;
const START_X = 70;
const START_Y = 22;

export default function MessageAlignAnim() {
  return (
    <svg viewBox="0 0 300 160" width="100%" height="100%">
      {/* Title */}
      <text x={150} y={13} textAnchor="middle" fontSize={7.5} fill="rgba(255,255,255,0.3)"
        fontFamily="Inter,sans-serif" letterSpacing="1">MESSAGE CONGRUENCE</text>

      {MESSAGES.map((m, i) => {
        const y = START_Y + i * (BAR_H * 2 + GAP);
        const intW = (m.intended / 100) * MAX_W;
        const actW = (m.actual / 100) * MAX_W;
        const gap = Math.abs(m.intended - m.actual);
        const color = gap < 15 ? '#24a148' : gap < 30 ? '#d2a106' : '#da1e28';

        return (
          <g key={m.label}>
            <text x={START_X - 6} y={y + BAR_H + 1} textAnchor="end" fontSize={8.5}
              fill="rgba(255,255,255,0.55)" fontFamily="Inter,sans-serif">{m.label}</text>

            {/* Intended bar */}
            <rect x={START_X} y={y} width={MAX_W} height={BAR_H} rx={3} fill="rgba(255,255,255,0.04)" />
            <motion.rect
              x={START_X} y={y} height={BAR_H} rx={3}
              fill="rgba(210,161,6,0.35)" stroke="rgba(210,161,6,0.6)" strokeWidth={0.5}
              initial={{ width: 0 }}
              animate={{ width: intW }}
              transition={{ duration: 1, delay: i * 0.15 + 0.3, repeat: Infinity, repeatDelay: 2.5, ease: 'easeOut' }}
            />

            {/* Actual bar */}
            <rect x={START_X} y={y + BAR_H + 3} width={MAX_W} height={BAR_H} rx={3} fill="rgba(255,255,255,0.04)" />
            <motion.rect
              x={START_X} y={y + BAR_H + 3} height={BAR_H} rx={3}
              fill={`${color}66`} stroke={color} strokeWidth={0.5}
              initial={{ width: 0 }}
              animate={{ width: actW }}
              transition={{ duration: 1, delay: i * 0.15 + 0.55, repeat: Infinity, repeatDelay: 2.5, ease: 'easeOut' }}
            />

            {/* Gap indicator */}
            <motion.text
              x={START_X + Math.max(intW, actW) + 8} y={y + BAR_H + 4}
              fontSize={8} fontWeight={700} fill={color} fontFamily="Inter,sans-serif"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1] }}
              transition={{ duration: 0.4, delay: i * 0.15 + 1.1, repeat: Infinity, repeatDelay: 2.5 + i * 0.15 }}
            >
              {gap > 0 ? `-${gap}` : `+${Math.abs(gap)}`}
            </motion.text>
          </g>
        );
      })}

      {/* Legend */}
      <rect x={180} y={128} width={8} height={4} rx={1} fill="rgba(210,161,6,0.6)" />
      <text x={192} y={133} fontSize={7} fill="rgba(255,255,255,0.35)" fontFamily="Inter,sans-serif">Intended</text>
      <rect x={180} y={138} width={8} height={4} rx={1} fill="rgba(36,161,72,0.6)" />
      <text x={192} y={143} fontSize={7} fill="rgba(255,255,255,0.35)" fontFamily="Inter,sans-serif">Actual coverage</text>

      {/* Congruence score badge */}
      <motion.g
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <rect x={20} y={124} width={56} height={26} rx={6} fill="rgba(210,161,6,0.15)" stroke="rgba(210,161,6,0.4)" strokeWidth={0.8} />
        <text x={48} y={134} textAnchor="middle" fontSize={7} fill="rgba(210,161,6,0.7)" fontFamily="Inter,sans-serif">Score</text>
        <text x={48} y={146} textAnchor="middle" fontSize={12} fontWeight={700} fill="#d2a106" fontFamily="Inter,sans-serif">74%</text>
      </motion.g>
    </svg>
  );
}
