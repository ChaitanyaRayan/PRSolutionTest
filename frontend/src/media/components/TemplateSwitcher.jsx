/**
 * TemplateSwitcher — Dropdown to change the active HTML template from inside the dashboard.
 *
 * Shows each template as a swatch + name. On selection:
 *  1. Updates the store's selectedTemplate
 *  2. Fires onTemplateChange(template) — parent reloads /api/dashboard with regenerate=1
 *
 * Design: pill chip that expands into a dropdown grid of template swatches.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check, ChevronDown, Loader2 } from 'lucide-react';
import { HTML_TEMPLATES } from '../constants/templates';
import { useMediaStore }  from '../store/mediaStore';

export default function TemplateSwitcher({ onTemplateChange, compact = false }) {
  const store           = useMediaStore();
  const currentTemplate = store.selectedTemplate;
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const dropRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handle(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  async function selectTemplate(tpl) {
    if (tpl.id === currentTemplate?.id) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);
    store.setSelectedTemplate(tpl);
    try {
      await onTemplateChange?.(tpl);
    } finally {
      setLoading(false);
    }
  }

  const currentName  = currentTemplate?.name ?? 'Select template';
  const currentColor = currentTemplate?.primaryColor ?? '#7C3AED';

  return (
    <div className="ts-root" ref={dropRef}>
      {/* Trigger pill */}
      <button
        className={`ts-trigger ${compact ? 'ts-trigger--compact' : ''} ${open ? 'ts-trigger--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Switch template"
      >
        {loading ? (
          <Loader2 size={12} className="mi-spin" style={{ color: currentColor }} />
        ) : (
          <span className="ts-swatch" style={{ background: currentColor }} />
        )}
        {!compact && <span className="ts-current-name">{currentName}</span>}
        <ChevronDown size={12} className={`ts-chevron ${open ? 'ts-chevron--up' : ''}`} />
      </button>

      {/* Dropdown grid */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="ts-dropdown"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="ts-dropdown-header">
              <Palette size={12} />
              <span>Switch template</span>
            </div>
            <p className="ts-dropdown-hint">
              Changing the template re-generates the dashboard with the new design. Content remains the same.
            </p>

            <div className="ts-grid">
              {HTML_TEMPLATES.map((tpl) => {
                const isActive = tpl.id === currentTemplate?.id;
                return (
                  <button
                    key={tpl.id}
                    className={`ts-item ${isActive ? 'ts-item--active' : ''}`}
                    onClick={() => selectTemplate(tpl)}
                    title={tpl.description}
                  >
                    {/* Color preview strip */}
                    <div className="ts-item-preview">
                      <div className="ts-item-bg" style={{ background: tpl.bgColor ?? '#f8f9fa' }}>
                        <div className="ts-item-bar" style={{ background: tpl.primaryColor }} />
                        <div className="ts-item-bar ts-item-bar--accent" style={{ background: tpl.accentColor }} />
                        <div className="ts-item-lines">
                          {[0,1,2].map((i) => (
                            <div key={i} className="ts-item-line"
                              style={{ background: tpl.textColor ? `${tpl.textColor}30` : '#00000020' }} />
                          ))}
                        </div>
                      </div>
                      {/* Palette dots */}
                      <div className="ts-item-palette">
                        {(tpl.palette ?? [tpl.primaryColor, tpl.accentColor]).slice(0,4).map((c, i) => (
                          <span key={i} className="ts-palette-dot" style={{ background: c }} />
                        ))}
                      </div>
                    </div>

                    {/* Name row */}
                    <div className="ts-item-footer">
                      <div>
                        <p className="ts-item-name">{tpl.name}</p>
                        <p className="ts-item-style">{tpl.style}</p>
                      </div>
                      {isActive && (
                        <span className="ts-item-check">
                          <Check size={10} />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
