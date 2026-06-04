import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Single Zustand store for the Media Intelligence Platform.
 *
 * Stage 1 — File + Brand keywords
 * Stage 2 — Multi-dashboard selection + lensId + workflow config
 * Stage 3 — Launch (workflow submit → workflowId + WebSocket)
 * Stage 4 — Tagged article review (server-driven)
 * Stage 5 — Template gallery → Preview → Dashboard
 */

// Fallback static lens IDs (overridden by /dropdowns API response at runtime).
// Updated to match actual backend IDs from /dropdowns:
//   Media Measurement     → 1
//   Media Monitoring      → 5
//   Narrative Intelligence → 2
//   PR Impact             → 3
//   Reputation Index      → 4
const LENS_ID_MAP_STATIC = {
  intelligence: 1,
  monitoring:   5,
  narrative:    2,
  pr:           3,
  reputation:   4,
};

// Human-readable labels matching the backend /dropdowns lens labels exactly
const LENS_LABEL_MAP = {
  intelligence: 'Media Measurement',
  monitoring:   'Media Monitoring',
  narrative:    'Narrative Intelligence',
  pr:           'PR Impact',
  reputation:   'Reputation Index',
};

// Build a live lens-ID lookup from /dropdowns response
// Falls back to static map if not yet loaded
function resolveLensId(dashId, lenses) {
  const label  = LENS_LABEL_MAP[dashId];
  const fromAPI = lenses?.find((l) => l.label === label);
  return fromAPI?.id ?? LENS_ID_MAP_STATIC[dashId] ?? 1;
}

export const useMediaStore = create(
  devtools(
    (set, get) => ({

      // ── Stage 1: File Upload ─────────────────────────────────────────────────
      file:         null,
      fileName:     '',
      headers:      [],
      preview:      [],
      parsedData:   [],
      brandKeywords: [],

      setFileData: (file, headers, preview, parsedData) =>
        set({ file, headers, preview, parsedData, fileName: file.name }, false, 'setFileData'),

      setBrandKeywords: (kw) => set({ brandKeywords: kw }, false, 'setBrandKeywords'),

      clearFile: () =>
        set({ file: null, fileName: '', headers: [], preview: [], parsedData: [], brandKeywords: [] }, false, 'clearFile'),

      // ── Reference data from /dropdowns ──────────────────────────────────────
      lenses:       [],   // [{id, label, description}] from API
      llms:         [],   // [{id, label, description}] from API
      dropdownsLoaded: false,

      setDropdowns: ({ lens, llm }) =>
        set({ lenses: lens ?? [], llms: llm ?? [], dropdownsLoaded: true }, false, 'setDropdowns'),

      // ── Stage 2: Multi-Dashboard + Workflow Config ───────────────────────────
      // selectedDashboards: array of dashboard IDs e.g. ["intelligence","monitoring"]
      selectedDashboards: [],
      // Legacy single selection kept for compatibility
      selectedDashboard:  null,
      brandName:          '',
      dashboardTitle:     '',
      competitors:        [],
      messageKeywords:    [],
      skillPrompt:        '',

      setSelectedDashboards: (ids) => {
        const { DASHBOARDS_MAP } = get();
        // Derive primary dashboard (first selected) for single-dashboard compat
        const primary = ids[0] ? (DASHBOARDS_MAP?.[ids[0]] ?? null) : null;
        // Primary lensId from first selected (use static map for immediate response)
        const primaryLens = ids[0] ? String(LENS_ID_MAP_STATIC[ids[0]] ?? 1) : '1';
        set(
          { selectedDashboards: ids, selectedDashboard: primary, lensId: primaryLens },
          false,
          'setSelectedDashboards'
        );
      },

      setSelectedDashboard: (dashboard) =>
        set({ selectedDashboard: dashboard }, false, 'setSelectedDashboard'),

      setBrandName: (name) => set({ brandName: name }, false, 'setBrandName'),

      setDashboardTitle: (title) => set({ dashboardTitle: title }, false, 'setDashboardTitle'),

      setCompetitors: (list) => set({ competitors: list }, false, 'setCompetitors'),

      setMessageKeywords: (list) => set({ messageKeywords: list }, false, 'setMessageKeywords'),

      setSkillPrompt: (text) => set({ skillPrompt: text }, false, 'setSkillPrompt'),

      // Helper: register DASHBOARDS map for use in setter above
      DASHBOARDS_MAP: null,
      registerDashboardsMap: (map) => set({ DASHBOARDS_MAP: map }, false, 'registerDashboardsMap'),

      // ── Stage 3: Workflow Launch ──────────────────────────────────────────────
      workflowId:       null,
      pipelineComplete: false,
      lensId:           '1',

      setWorkflowId: (id) => set({ workflowId: String(id) }, false, 'setWorkflowId'),
      setLensId:     (id) => set({ lensId: String(id) },     false, 'setLensId'),
      setPipelineComplete: (v) => set({ pipelineComplete: v }, false, 'setPipelineComplete'),

      // ── Stage 5: Template Selection ───────────────────────────────────────────
      selectedTemplateId:   null,   // e.g. "template_02"
      selectedTemplate:     null,   // full template object from HTML_TEMPLATES

      setSelectedTemplate: (template) =>
        set({ selectedTemplateId: template?.id ?? null, selectedTemplate: template }, false, 'setSelectedTemplate'),

      // ── Stage 5: Chart data cache ─────────────────────────────────────────────
      rawChartsData:        null,
      interpretedCharts:    null,
      articlesUpdatedFlag:  false,
      confirmedData:        null,

      setRawChartsData:     (d) => set({ rawChartsData: d },     false, 'setRawChartsData'),
      setInterpretedCharts: (d) => set({ interpretedCharts: d }, false, 'setInterpretedCharts'),
      setArticlesUpdatedFlag: (v) => set({ articlesUpdatedFlag: v }, false, 'setArticlesUpdatedFlag'),
      setConfirmedData:     (d) => set({ confirmedData: d },     false, 'setConfirmedData'),

      // Template generation (legacy AI branding)
      brandTemplate:    null,
      templateLoading:  false,
      templateError:    null,
      setBrandTemplate:    (t) => set({ brandTemplate: t, templateLoading: false, templateError: null }, false, 'setBrandTemplate'),
      setTemplateLoading:  (v) => set({ templateLoading: v }, false, 'setTemplateLoading'),
      setTemplateError:    (e) => set({ templateError: e, templateLoading: false }, false, 'setTemplateError'),

      // ── Workflow payload builder ──────────────────────────────────────────────
      // Produces one branch per selected dashboard, matching the API contract:
      //
      // {
      //   name, description,
      //   workflow: {
      //     upload: { ... },
      //     branches: [
      //       { analysis, review, assembly, output },   // branch per dashboard
      //       { analysis, review, assembly, output },
      //     ]
      //   }
      // }
      buildWorkflowPayload: () => {
        const s = get();

        // Resolved list of selected dashboard IDs
        const selectedIds = s.selectedDashboards.length > 0
          ? s.selectedDashboards
          : s.selectedDashboard
            ? [s.selectedDashboard.id]
            : ['intelligence'];

        // Template branding colours (null when no template chosen — matches API expectation)
        const tplColor = s.selectedTemplate
          ? {
              primary:  s.selectedTemplate.primaryColor,
              positive: null,
              negative: null,
            }
          : { primary: null, positive: null, negative: null };

        const tplTypography = {
          font_family: s.selectedTemplate?.fontFamily ?? null,
          font_url:    null,
        };

        // Default chart set — same for every lens
        const DEFAULT_CHARTS = [
          { label: 'sentiment_score',      title: 'Sentiment score',      custom_title: 'Sentiment score' },
          { label: 'top_themes',           title: 'Top themes',           custom_title: 'Top themes' },
          { label: 'media_type_breakdown', title: 'Media type breakdown', custom_title: 'Media type breakdown' },
          { label: 'enriched_table',       title: 'Enriched table',       custom_title: 'Enriched table' },
        ];
        const DEFAULT_CHART_ORDER = DEFAULT_CHARTS.map((c) => c.label);

        // ── Build one branch per selected dashboard ───────────────────────────
        const branches = selectedIds.map((dashId) => {
          // Use live lens IDs from /dropdowns API; fall back to static map
          const lensId    = resolveLensId(dashId, s.lenses);
          const lensLabel = LENS_LABEL_MAP[dashId] ?? dashId;

          return {
            analysis: {
              node_id:      2,
              node_name:    'Analysis',
              lens_details: { id: lensId, label: lensLabel },
              llm_details:  { label: 'OpenAI', id: 1 },
              competitors:  s.competitors,
              // Conditional fields — only included when that lens is being configured
              ...(dashId === 'narrative' && {
                message_keywords: s.messageKeywords,
              }),
              ...(dashId === 'monitoring' && s.skillPrompt && {
                skill_prompt: s.skillPrompt,
              }),
            },

            review: {
              node_id:   3,
              node_name: 'Review',
              confidence_thresholds: {
                flag_below:         50,
                auto_approve_above: 75,
              },
              columns_to_inspect:      ['Sentiment', 'Themes'],
              show_original_columns:   true,
              require_analyst_sign_off: true,
            },

            assembly: {
              node_id:               4,
              node_name:             'Assembly',
              charts:                DEFAULT_CHARTS,
              layout_mode:           'Standard',
              chart_order:           DEFAULT_CHART_ORDER,
              generate_charts_summary: false,
              branding: {
                client_name:    s.brandName,
                logo_file_path: '',
                color:          tplColor,
                typography:     tplTypography,
                media_assets: {
                  background_image: null,
                  background_video: null,
                },
              },
            },

            output: {
              node_id:         5,
              node_name:       'Output',
              dashboard_title: lensLabel,
              description:     null,
            },
          };
        });

        // ── Top-level payload ─────────────────────────────────────────────────
        return {
          name:        s.dashboardTitle || `${s.brandName} Media Intelligence`,
          description: '',
          workflow: {
            upload: {
              node_id:        1,
              node_name:      'Upload',
              source_file:    `uploads/${s.fileName}`,
              brand_keywords: s.brandKeywords,
            },
            branches,
          },
        };
      },

      // ── Global reset ──────────────────────────────────────────────────────────
      reset: () =>
        set({
          // NOTE: lenses/llms/dropdownsLoaded intentionally NOT reset — they're reference data
          file: null, fileName: '', headers: [], preview: [], parsedData: [], brandKeywords: [],
          selectedDashboards: [], selectedDashboard: null,
          brandName: '', dashboardTitle: '',
          competitors: [], messageKeywords: [], skillPrompt: '',
          workflowId: null, pipelineComplete: false, lensId: '1',
          selectedTemplateId: null, selectedTemplate: null,
          rawChartsData: null, interpretedCharts: null, articlesUpdatedFlag: false,
          confirmedData: null,
          brandTemplate: null, templateLoading: false, templateError: null,
        }, false, 'reset'),
    }),
    { name: 'MediaIntelligenceStore' }
  )
);
