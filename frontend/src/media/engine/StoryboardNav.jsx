/**
 * StoryboardNav — Chapter-navigation component rendered at the top of each dashboard tab.
 *
 * Matches the design from the reference screenshots:
 *
 *  ┌──────────────────────────────────────────────────────────────────────────┐
 *  │  ◄ PREVIOUSLY · THE BRIEF   │  • THIS CHAPTER · BRAND PULSE  │  COMING NEXT · CAT. DYN. ► │
 *  │  Previous chapter title     │  Current title (colored, bold) │  Next chapter title        │
 *  │  Description excerpt…       │  Description text…             │  Description…  Skip ahead →│
 *  └──────────────────────────────────────────────────────────────────────────┘
 *
 *  Then at the bottom of the tab, a dark-banner "Continue to Next Chapter" CTA:
 *  ┌──────────────────────────────────────────────────────────────────────────┐
 *  │  02  THE NEXT CHAPTER                                                    │
 *  │      "Quote from the next chapter description"     Continue to X →      │
 *  └──────────────────────────────────────────────────────────────────────────┘
 *
 * Props:
 *  chartsStoryboard  — array from config.chartsStoryboard (rich chapters from charts API)
 *  currentTabIndex   — 0-based index of the active tab
 *  onNavigate(index) — called when user clicks "Skip ahead" or "Continue"
 *  primaryColor      — brand primary color
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

export function StoryboardNav({ chartsStoryboard = [], currentTabIndex = 0, onNavigate, primaryColor = '#7C3AED' }) {
  if (!chartsStoryboard.length) return null;

  const total   = chartsStoryboard.length;
  const current = chartsStoryboard[currentTabIndex] ?? {};
  const prev    = currentTabIndex > 0 ? chartsStoryboard[currentTabIndex - 1] : null;
  const next    = currentTabIndex < total - 1 ? chartsStoryboard[currentTabIndex + 1] : null;

  return (
    <div className="sbn-root">
      {/* ── 3-panel navigation strip ──────────────────────────── */}
      <div className="sbn-strip">

        {/* Previous chapter */}
        <div className={`sbn-col sbn-col--prev ${!prev ? 'sbn-col--empty' : ''}`}>
          {prev ? (
            <>
              <div className="sbn-col-eyebrow sbn-col-eyebrow--prev">
                <ChevronLeft size={10} />
                <span>PREVIOUSLY</span>
                <span className="sbn-eyebrow-sep">·</span>
                <span className="sbn-eyebrow-chapter">{prev.tab_name?.toUpperCase()}</span>
              </div>
              <h3 className="sbn-col-title sbn-col-title--prev">{prev.title}</h3>
              <p className="sbn-col-desc">{prev.description?.slice(0, 120)}{prev.description?.length > 120 ? '…' : ''}</p>
            </>
          ) : (
            <p className="sbn-col-empty-text">This is the first chapter</p>
          )}
        </div>

        {/* Divider */}
        <div className="sbn-divider" />

        {/* Current chapter */}
        <div className="sbn-col sbn-col--current">
          <div className="sbn-col-eyebrow sbn-col-eyebrow--current" style={{ color: primaryColor }}>
            <span className="sbn-current-dot" style={{ background: primaryColor }} />
            <span>THIS CHAPTER</span>
            {current.section_label && (
              <>
                <span className="sbn-eyebrow-sep">·</span>
                <span className="sbn-eyebrow-chapter">{current.section_label}</span>
              </>
            )}
          </div>
          <h3 className="sbn-col-title sbn-col-title--current" style={{ color: primaryColor }}>
            {current.title}
          </h3>
          <p className="sbn-col-desc sbn-col-desc--current">
            <DescriptionWithBold text={current.description?.slice(0, 160) ?? ''} />
            {current.description?.length > 160 ? '…' : ''}
          </p>
          {current.what_to_watch_for?.length > 0 && (
            <div className="sbn-watch-list">
              {current.what_to_watch_for.slice(0, 3).map((item, i) => (
                <span key={i} className="sbn-watch-item" style={{ color: primaryColor }}>
                  <span className="sbn-watch-bullet" style={{ background: primaryColor }} />
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="sbn-divider" />

        {/* Next chapter */}
        <div className={`sbn-col sbn-col--next ${!next ? 'sbn-col--empty' : ''}`}>
          {next ? (
            <>
              <div className="sbn-col-eyebrow sbn-col-eyebrow--next">
                <span>COMING NEXT</span>
                <span className="sbn-eyebrow-sep">·</span>
                <span className="sbn-eyebrow-chapter">{next.tab_name?.toUpperCase()}</span>
                <ChevronRight size={10} />
              </div>
              <h3 className="sbn-col-title sbn-col-title--next">{next.title}</h3>
              <p className="sbn-col-desc">{next.description?.slice(0, 110)}{next.description?.length > 110 ? '…' : ''}</p>
              <button
                className="sbn-skip-btn"
                style={{ color: primaryColor }}
                onClick={() => onNavigate?.(currentTabIndex + 1)}
              >
                Skip ahead →
              </button>
            </>
          ) : (
            <p className="sbn-col-empty-text">Final chapter — you've reached the end</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * StoryboardContinueBanner — dark "Continue to Next Chapter" CTA rendered at the bottom of each tab.
 */
export function StoryboardContinueBanner({ chartsStoryboard = [], currentTabIndex = 0, onNavigate, primaryColor = '#7C3AED' }) {
  const next = chartsStoryboard[currentTabIndex + 1];
  if (!next) return null;

  const current = chartsStoryboard[currentTabIndex] ?? {};
  const chapterNum = String(next.chapter ?? currentTabIndex + 2).padStart(2, '0');

  // Extract a short teaser quote from the next chapter description
  const teaser = next.description
    ? `"${next.description.split('.')[0]}."`
    : `Continue to ${next.tab_name}`;

  return (
    <motion.div
      className="sbn-banner"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      {/* Left: chapter number + label */}
      <div className="sbn-banner-left">
        <span className="sbn-banner-num">{chapterNum}</span>
        <div className="sbn-banner-meta">
          <span className="sbn-banner-eyebrow">THE NEXT CHAPTER</span>
          <p className="sbn-banner-quote">{teaser}</p>
          <p className="sbn-banner-sub">
            Continue to <strong>{next.tab_name}</strong> — {next.section_label?.toLowerCase() ?? ''}
          </p>
        </div>
      </div>

      {/* Right: CTA button */}
      <button
        className="sbn-banner-btn"
        onClick={() => onNavigate?.(currentTabIndex + 1)}
      >
        Continue to {next.tab_name} &nbsp;→
      </button>
    </motion.div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Renders text with **bold** markers converted to <strong> tags.
 */
function DescriptionWithBold({ text }) {
  if (!text) return null;
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>
      )}
    </>
  );
}
