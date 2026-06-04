import { motion } from 'framer-motion';

const RINGS = [28, 52, 76, 100];
const DOTS = [
  { cx: 170, cy: 55, color: '#24a148', delay: 0.2 },
  { cx: 220, cy: 85, color: '#24a148', delay: 0.6 },
  { cx: 190, cy: 115, color: '#da1e28', delay: 1.0 },
  { cx: 130, cy: 70, color: '#24a148', delay: 1.4 },
  { cx: 100, cy: 105, color: '#d2a106', delay: 1.8 },
  { cx: 250, cy: 60, color: '#da1e28', delay: 0.9 },
];
const CARDS = [
  { x: 168, y: 28, label: 'Forbes' },
  { x: 196, y: 88, label: 'Reuters' },
  { x: 62, y: 96, label: 'TechCrunch' },
];

export default function MediaPulseAnim() {
  return (
    <svg viewBox="0 0 300 160" width="100%" height="100%" style={{ overflow: 'visible' }}>
      {/* Pulsing radar rings */}
      {RINGS.map((r, i) => (
        <motion.circle
          key={r}
          cx={148} cy={80} r={r}
          fill="none"
          stroke="rgba(137,63,252,0.25)"
          strokeWidth={1}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.15, 0.6], opacity: [0, 0.7, 0] }}
          transition={{ duration: 3.2, delay: i * 0.55, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '148px 80px' }}
        />
      ))}

      {/* Center dot */}
      <motion.circle
        cx={148} cy={80} r={5}
        fill="#893ffc"
        animate={{ scale: [1, 1.4, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />

      {/* Sentiment dots */}
      {DOTS.map((d, i) => (
        <motion.circle
          key={i}
          cx={d.cx} cy={d.cy} r={4.5}
          fill={d.color}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.4, delay: d.delay, repeat: Infinity, repeatDelay: 1.8 }}
        />
      ))}

      {/* Mini article cards */}
      {CARDS.map((c, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, -4] }}
          transition={{ duration: 2.8, delay: i * 1.1 + 0.4, repeat: Infinity, repeatDelay: 1.4 }}
        >
          <rect x={c.x} y={c.y} width={52} height={18} rx={4} fill="rgba(137,63,252,0.18)" stroke="rgba(137,63,252,0.4)" strokeWidth={0.8} />
          <text x={c.x + 6} y={c.y + 12} fontSize={7} fill="rgba(255,255,255,0.8)" fontFamily="Inter,sans-serif">{c.label}</text>
        </motion.g>
      ))}

      {/* Signal bars top-right */}
      {[0, 1, 2, 3].map((i) => (
        <motion.rect
          key={i}
          x={262 + i * 6} y={90 - i * 7} width={4} height={6 + i * 7}
          rx={1.5}
          fill="rgba(137,63,252,0.6)"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity }}
        />
      ))}
    </svg>
  );
}
