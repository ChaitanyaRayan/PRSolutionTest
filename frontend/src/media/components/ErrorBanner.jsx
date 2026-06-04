import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ErrorBanner — inline error with retry. Never a modal.
 * Usage: <ErrorBanner message="..." onRetry={fn} />
 */
export function ErrorBanner({ message, onRetry, className = '' }) {
  if (!message) return null;
  return (
    <AnimatePresence>
      <motion.div
        className={`mi-error-banner ${className}`}
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.22 }}
      >
        <span className="mi-error-icon">⚠</span>
        <span className="mi-error-message">{message}</span>
        {onRetry && (
          <button className="mi-error-retry" onClick={onRetry}>
            Retry
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
