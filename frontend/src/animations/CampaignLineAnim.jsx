import { motion } from 'framer-motion';

const W = 260, H = 100, PAD = 20;
const DATA = [4, 9, 6, 18, 28, 24, 38, 42, 36, 51, 62, 58, 72, 80, 76, 88];
const MAX_VAL = Math.max(...DATA);

function pts(data) {
  return data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((v / MAX_VAL) * (H - PAD * 2));
    return [x, y];
  });
}

function polyline(points) {
  return points.map((p) => p.join(',')).join(' ');
}

function area(points) {
  const first = points[0];
  const last = points[points.length - 1];
  return `M ${first[0]},${H - PAD + 4} L ${polyline(points).replaceAll(',', ' ').split(' ').reduce((a, b, i) => (i % 2 === 0 ? a + ' ' + b : a + ',' + b))} L ${last[0]},${H - PAD + 4} Z`;
}

const POINTS = pts(DATA);

export default function CampaignLineAnim() {
  return (
    <svg viewBox={`0 0 300 ${H + 40}`} width="100%" height="100%">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = H - PAD - t * (H - PAD * 2);
        return <line key={t} x1={PAD} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />;
      })}

      {/* Area fill */}
      <motion.path
        d={`M ${POINTS[0][0]},${H - PAD + 4} ${POINTS.map(([x, y]) => `L ${x},${y}`).join(' ')} L ${POINTS[POINTS.length - 1][0]},${H - PAD + 4} Z`}
        fill="url(#campaignGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0.5, 0] }}
        transition={{ duration: 4, repeat: Infinity, repeatDelay: 1 }}
      />

      <defs>
        <linearGradient id="campaignGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eb6200" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#eb6200" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Line */}
      <motion.polyline
        points={polyline(POINTS)}
        fill="none"
        stroke="#eb6200"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
      />

      {/* Data point highlight — last point */}
      <motion.circle
        cx={POINTS[POINTS.length - 1][0]} cy={POINTS[POINTS.length - 1][1]} r={5}
        fill="#eb6200"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.5, delay: 2.0, repeat: Infinity, repeatDelay: 2.9 }}
      />
      <motion.circle
        cx={POINTS[POINTS.length - 1][0]} cy={POINTS[POINTS.length - 1][1]} r={10}
        fill="none" stroke="rgba(235,98,0,0.4)" strokeWidth={1.5}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.5, 1.5], opacity: [0.6, 0] }}
        transition={{ duration: 1.2, delay: 2.2, repeat: Infinity, repeatDelay: 2.2 }}
      />

      {/* Milestone dots */}
      {[4, 8, 12].map((idx) => (
        <motion.circle
          key={idx}
          cx={POINTS[idx][0]} cy={POINTS[idx][1]} r={3.5}
          fill="white" stroke="#eb6200" strokeWidth={1.5}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.4, delay: 0.6 + idx * 0.12, repeat: Infinity, repeatDelay: 2.8 }}
        />
      ))}

      {/* Labels */}
      <text x={PAD} y={H + 16} fontSize={7.5} fill="rgba(255,255,255,0.25)" fontFamily="Inter,sans-serif">Day 1</text>
      <text x={W - 26} y={H + 16} fontSize={7.5} fill="rgba(255,255,255,0.25)" fontFamily="Inter,sans-serif">Day 16</text>
      <text x={PAD} y={H + 28} fontSize={7} fill="rgba(235,98,0,0.5)" fontFamily="Inter,sans-serif" letterSpacing="1">COVERAGE VELOCITY</text>

      {/* EMV badge */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2, delay: 2.1, repeat: Infinity, repeatDelay: 1.3 }}
      >
        <rect x={226} y={8} width={60} height={24} rx={5} fill="rgba(235,98,0,0.18)" stroke="rgba(235,98,0,0.5)" strokeWidth={0.8} />
        <text x={256} y={17.5} textAnchor="middle" fontSize={7} fill="rgba(235,98,0,0.7)" fontFamily="Inter,sans-serif">EMV</text>
        <text x={256} y={27} textAnchor="middle" fontSize={9} fill="#eb6200" fontFamily="Inter,sans-serif" fontWeight={700}>$2.4M</text>
      </motion.g>
    </svg>
  );
}
