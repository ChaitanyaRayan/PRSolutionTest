import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';

const R = 60;
const CX = 150;
const CY = 100;
const CIRC = 2 * Math.PI * R;
const ARC_RATIO = 0.72; // 260° arc

function arcPath(cx, cy, r, startDeg, endDeg) {
  const toRad = (d) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

const SCORE = 87;
const TICKS = [0, 20, 40, 60, 80, 100];

export default function PRGaugeAnim() {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      let start = null;
      const duration = 1800;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(eased * SCORE));
        if (p < 1) requestAnimationFrame(step);
        else setTimeout(() => setDisplay(0), 1200);
      };
      requestAnimationFrame(step);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (display === 0 && display !== undefined) {
      const retry = setTimeout(() => {
        let start = null;
        const duration = 1800;
        const step = (ts) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.round(eased * SCORE));
          if (p < 1) requestAnimationFrame(step);
          else setTimeout(() => setDisplay(0), 1200);
        };
        requestAnimationFrame(step);
      }, 600);
      return () => clearTimeout(retry);
    }
  }, [display]);

  const startAngle = 135;
  const totalArc = 270;
  const progress = display / 100;
  const fillAngle = startAngle + totalArc * progress;
  const scoreColor = display > 75 ? '#24a148' : display > 50 ? '#d2a106' : '#da1e28';

  return (
    <svg viewBox="0 0 300 160" width="100%" height="100%">
      {/* Background arc */}
      <path
        d={arcPath(CX, CY, R, 135, 405)}
        fill="none"
        stroke="rgba(17,146,232,0.15)"
        strokeWidth={10}
        strokeLinecap="round"
      />
      {/* Fill arc */}
      <motion.path
        d={arcPath(CX, CY, R, 135, fillAngle < 136 ? 136 : fillAngle)}
        fill="none"
        stroke={scoreColor}
        strokeWidth={10}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
      />

      {/* Tick marks */}
      {TICKS.map((t) => {
        const deg = 135 + (t / 100) * 270;
        const rad = (deg * Math.PI) / 180;
        const x1 = CX + (R - 14) * Math.cos(rad);
        const y1 = CY + (R - 14) * Math.sin(rad);
        const x2 = CX + (R - 7) * Math.cos(rad);
        const y2 = CY + (R - 7) * Math.sin(rad);
        return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />;
      })}

      {/* Needle */}
      <motion.line
        x1={CX} y1={CY}
        x2={CX + (R - 18) * Math.cos(((135 + 270 * progress) * Math.PI) / 180)}
        y2={CY + (R - 18) * Math.sin(((135 + 270 * progress) * Math.PI) / 180)}
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.9}
      />
      <circle cx={CX} cy={CY} r={5} fill="white" opacity={0.8} />

      {/* Score display */}
      <text x={CX} y={CY + 28} textAnchor="middle" fontSize={28} fontWeight={700} fill={scoreColor} fontFamily="Inter,sans-serif">
        {display}
      </text>
      <text x={CX} y={CY + 42} textAnchor="middle" fontSize={8.5} fill="rgba(255,255,255,0.45)" fontFamily="Inter,sans-serif" letterSpacing="1">
        PR IMPACT SCORE
      </text>

      {/* Tier badges */}
      {[
        { label: 'ELITE', x: 52, active: display >= 85, color: '#24a148' },
        { label: 'STRONG', x: 97, active: display >= 70 && display < 85, color: '#1192e8' },
        { label: 'MODERATE', x: 152, active: display >= 50 && display < 70, color: '#d2a106' },
        { label: 'WEAK', x: 225, active: display < 50, color: '#da1e28' },
      ].map((b) => (
        <text key={b.label} x={b.x} y={150} fontSize={6.5} fill={b.active ? b.color : 'rgba(255,255,255,0.18)'}
          fontFamily="Inter,sans-serif" fontWeight={b.active ? 700 : 400}>
          {b.label}
        </text>
      ))}
    </svg>
  );
}
