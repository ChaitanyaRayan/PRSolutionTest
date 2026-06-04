/**
 * StoryboardRenderer — Layer 2.
 * Renders the tab navigation structure from the AI-generated storyboard.
 * Tab order, titles, icons are all config-driven.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function StoryboardRenderer({ storyboard, activeTabId, onTabChange, theme }) {
  return (
    <nav className="eng-storyboard" role="tablist" aria-label="Dashboard sections">
      {(storyboard ?? []).map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`eng-tab ${isActive ? 'eng-tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon && <span className="eng-tab-icon">{tab.icon}</span>}
            <span className="eng-tab-title">{tab.title}</span>
            {tab.subtitle && <span className="eng-tab-subtitle">{tab.subtitle}</span>}
            {isActive && (
              <motion.div
                className="eng-tab-indicator"
                layoutId="eng-tab-indicator"
                style={{ background: theme?.primaryColor ?? '#7C3AED' }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
