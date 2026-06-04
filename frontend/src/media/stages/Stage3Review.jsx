import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useMediaStore } from '../store/mediaStore';
import { ErrorBanner } from '../components/ErrorBanner';
import { SkeletonLoader } from '../components/SkeletonLoader';

const SENTIMENT_COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#94a3b8',
  mixed: '#f59e0b',
};

export default function Stage3Review() {
  const navigate = useNavigate();
  const parsedData = useMediaStore((s) => s.parsedData);
  const selectedDashboard = useMediaStore((s) => s.selectedDashboard);
  const brandName = useMediaStore((s) => s.brandName);
  const setEnrichedData = useMediaStore((s) => s.setEnrichedData);
  const onCellEdit = useMediaStore((s) => s.onCellEdit);
  const onRowToggle = useMediaStore((s) => s.onRowToggle);
  const approvedRows = useMediaStore((s) => s.approvedRows);
  const enrichedData = useMediaStore((s) => s.enrichedData);
  const confirmDataset = useMediaStore((s) => s.confirmDataset);
  const editedData = useMediaStore((s) => s.editedData);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingCell, setEditingCell] = useState(null); // { rowId, field }

  // Load enriched data from API on mount
  useEffect(() => {
    if (enrichedData.length === 0) {
      fetchEnrichment();
    }
  }, []);

  async function fetchEnrichment() {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/media/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: parsedData.slice(0, 100),
          dashboardId: selectedDashboard?.id,
          brandName,
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();
      setEnrichedData(json.articles);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Merge edits with enriched data for table display
  const tableData = useMemo(() => {
    return enrichedData.map((row, i) => ({
      ...row,
      ...(editedData[i] || {}),
      _id: i,
    }));
  }, [enrichedData, editedData]);

  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="mi-checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="mi-checkbox"
          checked={approvedRows.has(row.original._id)}
          onChange={() => onRowToggle(row.original._id)}
          aria-label={`Toggle row ${row.original._id}`}
        />
      ),
      size: 44,
    },
    editableColumn('title', 'Headline', 240),
    editableColumn('source', 'Source', 120),
    editableColumn('date', 'Date', 100),
    {
      accessorKey: 'sentiment',
      header: 'Sentiment',
      size: 100,
      cell: ({ row }) => {
        const val = row.original.sentiment?.toLowerCase() ?? 'neutral';
        return (
          <span className="mi-sentiment-badge" style={{ color: SENTIMENT_COLORS[val] ?? SENTIMENT_COLORS.neutral }}>
            <span className="mi-sentiment-dot" style={{ background: SENTIMENT_COLORS[val] ?? SENTIMENT_COLORS.neutral }} />
            {row.original.sentiment ?? 'Neutral'}
          </span>
        );
      },
    },
    editableColumn('reach', 'Reach', 90),
    editableColumn('emv', 'EMV', 90),
    editableColumn('narrative', 'Narrative', 160),
  ], [approvedRows, editingCell, editedData]);

  function editableColumn(key, label, size) {
    return {
      accessorKey: key,
      header: label,
      size,
      cell: ({ row }) => {
        const id = row.original._id;
        const isEditing = editingCell?.rowId === id && editingCell?.field === key;
        const value = row.original[key] ?? '';

        if (isEditing) {
          return (
            <input
              className="mi-cell-input"
              defaultValue={value}
              autoFocus
              onBlur={(e) => {
                onCellEdit(id, key, e.target.value);
                setEditingCell(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onCellEdit(id, key, e.target.value);
                  setEditingCell(null);
                }
                if (e.key === 'Escape') setEditingCell(null);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return (
          <span
            className="mi-cell-value"
            onDoubleClick={() => setEditingCell({ rowId: id, field: key })}
            title={`Double-click to edit: ${value}`}
          >
            {value}
          </span>
        );
      },
    };
  }

  const table = useReactTable({
    data: tableData,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function handleConfirm() {
    const confirmed = confirmDataset();
    navigate('/media/template');
  }

  const approvedCount = approvedRows.size;

  return (
    <div className="mi-stage mi-stage--review">
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div
        className="mi-stage-header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="mi-stage-eyebrow">
          <span className="mi-step-badge">03</span>
          <span>Human-in-the-Loop</span>
        </div>
        <h1 className="mi-stage-title">Review enriched articles</h1>
        <p className="mi-stage-subtitle">
          AI has enhanced your dataset. Verify fields, toggle rows, and confirm before generating the dashboard.
          Double-click any cell to edit inline.
        </p>
      </motion.div>

      <ErrorBanner message={apiError} onRetry={fetchEnrichment} />

      {loading ? (
        <div style={{ marginTop: 24 }}>
          <SkeletonLoader variant="row" count={8} />
        </div>
      ) : (
        <motion.div
          className="mi-table-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* ── Toolbar ──────────────────────────────────────────── */}
          <div className="mi-table-toolbar">
            <div className="mi-table-search">
              <SearchIcon />
              <input
                className="mi-search-input"
                placeholder="Search articles…"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
            <div className="mi-table-toolbar-right">
              <span className="mi-table-count">
                <strong>{approvedCount}</strong> of {enrichedData.length} selected
              </span>
              <button
                className="mi-btn mi-btn--sm mi-btn--ghost"
                onClick={() => {
                  enrichedData.forEach((_, i) => {
                    if (!approvedRows.has(i)) onRowToggle(i);
                  });
                }}
              >
                Select all
              </button>
            </div>
          </div>

          {/* ── Table ────────────────────────────────────────────── */}
          <div className="mi-table-scroll">
            <table className="mi-data-table">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        onClick={header.column.getToggleSortingHandler()}
                        className={header.column.getCanSort() ? 'mi-th-sortable' : ''}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                <AnimatePresence>
                  {table.getRowModel().rows.map((row, idx) => (
                    <motion.tr
                      key={row.id}
                      className={`mi-data-row ${approvedRows.has(row.original._id) ? 'mi-data-row--approved' : 'mi-data-row--excluded'}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.025, duration: 0.25 }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} style={{ width: cell.column.getSize() }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ── Actions ──────────────────────────────────────────────── */}
      <motion.div
        className="mi-stage-actions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button className="mi-btn mi-btn--ghost" onClick={() => navigate('/media/select')}>
          ← Back
        </button>
        <motion.button
          className="mi-btn mi-btn--primary"
          onClick={handleConfirm}
          disabled={loading || approvedCount === 0}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Confirm {approvedCount} article{approvedCount !== 1 ? 's' : ''} & Generate Template
          <ArrowRightIcon />
        </motion.button>
      </motion.div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
