import { motion } from 'framer-motion';

const BRANDS = [
  { label: 'Your Brand', value: 38, color: '#007d79' },
  { label: 'Rival A', value: 27, color: 'rgba(255,255,255,0.25)' },
  { label: 'Rival B', value: 21, color: 'rgba(255,255,255,0.2)' },
  { label: 'Rival C', value: 14, color: 'rgba(255,255,255,0.15)' },
];

const BAR_H = 22;
const GAP = 12;
const MAX_W = 160;
const START_X = 80;
const START_Y = 18;

export default function CompetitorBarAnim() {
  return (
    <svg viewBox="0 0 300 160" width="100%" height="100%">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((p) => {
        const x = START_X + (p / 100) * MAX_W;
        return (
          <line key={p} x1={x} y1={START_Y - 6} x2={x} y2={START_Y + BRANDS.length * (BAR_H + GAP) - GAP + 4}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        );
      })}

      {BRANDS.map((b, i) => {
        const y = START_Y + i * (BAR_H + GAP);
        const targetW = (b.value / 100) * MAX_W;
        return (
          <g key={b.label}>
            {/* Label */}
            <text x={START_X - 6} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize={9}
              fill={i === 0 ? '#007d79' : 'rgba(255,255,255,0.45)'} fontFamily="Inter,sans-serif" fontWeight={i === 0 ? 700 : 400}>
              {b.label}
            </text>
            {/* Bar background */}
            <rect x={START_X} y={y} width={MAX_W} height={BAR_H} rx={4} fill="rgba(255,255,255,0.04)" />
            {/* Bar fill */}
            <motion.rect
              x={START_X} y={y} height={BAR_H} rx={4}
              fill={b.color}
              initial={{ width: 0 }}
              animate={{ width: [0, targetW * 1.06, targetW] }}
              transition={{ duration: 1.2, delay: i * 0.18 + 0.3, repeat: Infinity, repeatDelay: 2.2, ease: 'easeOut' }}
            />
            {/* Value */}
            <motion.text
              x={START_X + targetW + 6} y={y + BAR_H / 2 + 4}
              fontSize={9} fill={i === 0 ? '#007d79' : 'rgba(255,255,255,0.5)'}
              fontFamily="Inter,sans-serif" fontWeight={700}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1] }}
              transition={{ duration: 0.4, delay: i * 0.18 + 1.0, repeat: Infinity, repeatDelay: 2.2 + i * 0.18 }}
            >
              {b.value}%
            </motion.text>
          </g>
        );
      })}

      {/* SOV label */}
      <text x={START_X + MAX_W / 2} y={152} textAnchor="middle" fontSize={7.5}
        fill="rgba(255,255,255,0.25)" fontFamily="Inter,sans-serif" letterSpacing="1">
        SHARE OF VOICE
      </text>

      {/* Delta badge for winner */}
      <motion.g
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: [0, 1, 1, 0], y: [-4, 0, 0, -4] }}
        transition={{ duration: 2.4, delay: 1.6, repeat: Infinity, repeatDelay: 1.2 }}
      >
        <rect x={244} y={14} width={46} height={16} rx={4} fill="rgba(0,125,121,0.25)" stroke="rgba(0,125,121,0.6)" strokeWidth={0.8} />
        <text x={267} y={25.5} textAnchor="middle" fontSize={8} fill="#007d79" fontFamily="Inter,sans-serif" fontWeight={700}>
          +4.2% ↑
        </text>
      </motion.g>
    </svg>
  );
}
