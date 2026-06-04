import React from 'react';
import { motion } from 'framer-motion';
import { AGENTS } from '../data/agents.js';
import InfoVisionLogo from '../components/InfoVisionLogo.jsx';
import MediaPulseAnim from '../animations/MediaPulseAnim.jsx';
import PRGaugeAnim from '../animations/PRGaugeAnim.jsx';
import CompetitorBarAnim from '../animations/CompetitorBarAnim.jsx';
import CampaignLineAnim from '../animations/CampaignLineAnim.jsx';
import BrandRiskAnim from '../animations/BrandRiskAnim.jsx';
import MessageAlignAnim from '../animations/MessageAlignAnim.jsx';
import './HomeScreen.css';

const ANIM_MAP = {
  'media-intelligence': MediaPulseAnim,
  'pr-impact': PRGaugeAnim,
  'competitor-intelligence': CompetitorBarAnim,
  'campaign-monitor': CampaignLineAnim,
  'brand-risk': BrandRiskAnim,
  'message-congruence': MessageAlignAnim,
};

const STATS = [
  { value: '6', label: 'Intelligence Agents' },
  { value: '50+', label: 'Analytical Frameworks' },
  { value: '< 5s', label: 'Time to First Insight' },
  { value: 'SOC 2', label: 'Certified Secure' },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export default function HomeScreen({ onSelectAgent }) {
  return (
    <div className="home-screen">
      {/* Background system */}
      <div className="home-screen-bg" />
      <div className="home-grid-bg" />
      <div className="home-orb home-orb-1" />
      <div className="home-orb home-orb-2" />
      <div className="home-orb home-orb-3" />

      {/* Header */}
      <motion.header
        className="home-header"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="home-logo">
          <div className="home-logo-mark">
            <InfoVisionLogo size={30} />
          </div>
          <span className="home-logo-text">
            <span className="home-logo-brand">InfoVision</span>
            <span className="home-logo-sub"> Intelligence</span>
          </span>
          <span className="home-logo-badge">Agent Builder</span>
        </div>
        <motion.button
          className="btn-custom-agent"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelectAgent(null)}
        >
          <PlusIcon /> Custom Agent
        </motion.button>
      </motion.header>

      {/* Hero */}
      <motion.div
        className="home-hero"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.15 }}
      >
        <div className="home-hero-pill">
          <span className="home-hero-pill-dot" />
          6 Pre-built Intelligence Agents
        </div>
        <h1 className="home-hero-title">
          Choose Your<br />
          <span className="home-hero-gradient">Intelligence Agent</span>
        </h1>
        <p className="home-hero-sub">
          Each agent comes with a master skill prompt, trained analytical frameworks, and tailored
          conversation starters. Upload your data and start in seconds.
        </p>
      </motion.div>

      {/* Stats strip */}
      <motion.div
        className="home-stats"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
      >
        {STATS.map((s) => (
          <div key={s.label} className="home-stat">
            <span className="home-stat-value">{s.value}</span>
            <span className="home-stat-label">{s.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Agent grid */}
      <motion.div
        className="agent-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {AGENTS.map((agent) => {
          const AnimComp = ANIM_MAP[agent.id];
          return (
            <motion.div
              key={agent.id}
              className="agent-card"
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.28 } }}
              style={{
                '--agent-accent': agent.accentColor,
                '--agent-glow': agent.glowColor,
                '--agent-grad-from': agent.gradientFrom,
                '--agent-grad-to': agent.gradientTo,
              }}
            >
              {/* Visual area */}
              <div className="agent-card-visual">
                <div className="agent-card-visual-bg" />
                <div className="agent-card-anim">
                  {AnimComp && <AnimComp />}
                </div>
                <div className="agent-card-visual-glow" />
              </div>

              {/* Content */}
              <div className="agent-card-body">
                <div className="agent-card-meta">
                  <h3 className="agent-card-name">{agent.name}</h3>
                  <div className="agent-card-tags">
                    {agent.tags.slice(0, 2).map((t) => (
                      <span key={t} className="agent-tag">{t}</span>
                    ))}
                  </div>
                </div>
                <p className="agent-card-desc">{agent.tagline}</p>

                <motion.button
                  className="btn-launch"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSelectAgent(agent)}
                >
                  Launch Agent
                  <ArrowRightIcon />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Footer */}
      <motion.footer
        className="home-footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <span>Powered by InfoVision Intelligence Platform</span>
        <span className="home-footer-dot" />
        <span>SOC 2 · ISO 27001 · GDPR</span>
      </motion.footer>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
