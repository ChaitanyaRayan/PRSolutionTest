import { motion } from 'framer-motion';

const ALERTS = [
  { x: 62, y: 38, label: 'Negative spike', level: 'HIGH' },
  { x: 200, y: 52, label: 'Viral risk', level: 'MED' },
  { x: 140, y: 110, label: 'Story emerging', level: 'LOW' },
];

const SHIELD_PATH =
  'M 150 18 L 210 42 L 210 90 Q 210 128 150 148 Q 90 128 90 90 L 90 42 Z';

export default function BrandRiskAnim() {
  return (
    <svg viewBox="0 0 300 165" width="100%" height="100%">
      {/* Shield glow */}
      <motion.path
        d={SHIELD_PATH}
        fill="none"
        stroke="rgba(208,38,112,0.3)"
        strokeWidth={12}
        animate={{ opacity: [0.2, 0.7, 0.2] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      />

      {/* Shield body */}
      <path d={SHIELD_PATH} fill="rgba(208,38,112,0.08)" stroke="rgba(208,38,112,0.5)" strokeWidth={1.5} />

      {/* Scan line */}
      <motion.line
        x1={90} y1={85} x2={210} y2={85}
        stroke="rgba(208,38,112,0.7)"
        strokeWidth={1.5}
        strokeLinecap="round"
        animate={{ y1: [50, 120, 50], y2: [50, 120, 50], opacity: [0.3, 0.9, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Risk score */}
      <text x={150} y={88} textAnchor="middle" fontSize={26} fontWeight={800}
        fill="#d02670" fontFamily="Inter,sans-serif">
        42
      </text>
      <text x={150} y={102} textAnchor="middle" fontSize={7.5}
        fill="rgba(255,255,255,0.4)" fontFamily="Inter,sans-serif" letterSpacing="1">
        RISK SCORE
      </text>

      {/* Risk level pill */}
      <rect x={124} y={108} width={52} height={14} rx={7} fill="rgba(210,161,6,0.25)" stroke="rgba(210,161,6,0.5)" strokeWidth={0.8} />
      <text x={150} y={118.5} textAnchor="middle" fontSize={7} fill="#d2a106"
        fontFamily="Inter,sans-serif" fontWeight={700}>ELEVATED</text>

      {/* Alert badges */}
      {ALERTS.map((a, i) => {
        const color = a.level === 'HIGH' ? '#da1e28' : a.level === 'MED' ? '#d2a106' : '#1192e8';
        return (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1, 1, 0.7] }}
            transition={{ duration: 2.2, delay: i * 0.9 + 0.5, repeat: Infinity, repeatDelay: 1.2 }}
          >
            <rect x={a.x - 28} y={a.y - 10} width={56} height={18} rx={4}
              fill={`${color}22`} stroke={`${color}99`} strokeWidth={0.8} />
            <circle cx={a.x - 18} cy={a.y} r={3} fill={color} />
            <text x={a.x - 10} y={a.y + 4} fontSize={7} fill={color} fontFamily="Inter,sans-serif" fontWeight={600}>
              {a.level}
            </text>
          </motion.g>
        );
      })}

      {/* Pulse rings on shield center */}
      {[20, 36].map((r, i) => (
        <motion.circle
          key={r}
          cx={150} cy={85} r={r}
          fill="none" stroke="rgba(208,38,112,0.3)" strokeWidth={1}
          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
          transition={{ duration: 1.8, delay: i * 0.6, repeat: Infinity }}
          style={{ transformOrigin: '150px 85px' }}
        />
      ))}
    </svg>
  );
}
