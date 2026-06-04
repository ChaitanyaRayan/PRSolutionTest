/**
 * LayoutRenderer — Layer 3.
 * Renders a page's widgets in the layout pattern specified by the storyboard tab.
 *
 * Layout types:
 *   hero         — Hero banner + KPI row + main content
 *   2col         — Two equal columns
 *   3col         — Three columns (with span support)
 *   analytics    — Left KPI sidebar + right chart area
 *   storytelling — Narrative-first, alternating content
 *   executive    — Large stats, minimal chrome
 */

import React from 'react';
import { WidgetRenderer } from './WidgetRenderer';

export function LayoutRenderer({ page, storyboardTab, theme }) {
  const widgets = page?.widgets ?? [];
  const layout = storyboardTab?.layout ?? '3col';

  return (
    <div className={`eng-layout eng-layout--${layout}`}>
      {widgets.map((widget, i) => (
        <WidgetRenderer key={widget.id ?? i} widget={widget} theme={theme} index={i} />
      ))}
    </div>
  );
}
