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

const LENS_ID_MAP = {
  intelligence: 1,
  monitoring:   2,
  narrative:    3,
  pr:           4,
  reputation:   5,
};

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
        // Primary lensId from first selected
        const primaryLens = ids[0] ? String(LENS_ID_MAP[ids[0]] ?? 1) : '1';
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
      buildWorkflowPayload: () => {
        const s = get();
        const selectedIds   = s.selectedDashboards.length > 0 ? s.selectedDashboards : (s.selectedDashboard ? [s.selectedDashboard.id] : ['intelligence']);
        const primaryId     = selectedIds[0];
        const primaryDash   = s.selectedDashboard;
        const lensLabel     = primaryDash?.name ?? 'Media Monitoring';
        const numericLensId = LENS_ID_MAP[primaryId] ?? 1;

        const analysisNode = {
          node_id: 2,
          node_name: 'Analysis',
          lens_details: { id: numericLensId, label: lensLabel },
          llm_details: { id: 1, label: 'OpenAI Azure OpenAI GPT-4.1' },
          competitors: s.competitors,
          ...(selectedIds.includes('narrative') && { message_keywords: s.messageKeywords }),
          ...(selectedIds.includes('monitoring') && s.skillPrompt && { skill_prompt: s.skillPrompt }),
        };

        const defaultCharts = [
          { label: 'sentiment_score',      title: 'Sentiment score',      custom_title: 'Overall Sentiment Score' },
          { label: 'top_themes',           title: 'Top themes',           custom_title: 'Top Themes' },
          { label: 'media_type_breakdown', title: 'Media type breakdown', custom_title: 'Media Type Breakdown' },
          { label: 'audience_kpi',         title: 'Audience kpi',         custom_title: 'Audience KPI' },
          { label: 'interactions_kpi',     title: 'Interactions kpi',     custom_title: 'Interactions KPI' },
          { label: 'enriched_table',       title: 'Enriched table',       custom_title: 'Enriched Table' },
        ];

        const tplColors = s.selectedTemplate
          ? {
              primary:  s.selectedTemplate.primaryColor,
              positive: '#24A148',
              negative: '#FF475C',
            }
          : {
              primary:  primaryDash?.tint ?? '#7C3AED',
              positive: '#24A148',
              negative: '#FF475C',
            };

        return {
          name:        s.dashboardTitle || `${s.brandName} Media Intelligence`,
          description: `Media intelligence dashboard for ${s.brandName}`,
          // Multi-dashboard + lens identifiers
          selectedDashboards: selectedIds,
          lensId: s.lensId,
          templateId: s.selectedTemplateId,
          workflow: {
            upload: {
              node_id: 1,
              node_name: 'Upload',
              source_file: `uploads/${s.fileName}`,
              brand_keywords: s.brandKeywords,
            },
            branches: [{
              analysis: analysisNode,
              review: {
                node_id: 3,
                node_name: 'Review',
                confidence_thresholds: { flag_below: 50, auto_approve_above: 75 },
                columns_to_inspect: ['Sentiment', 'Themes'],
                show_original_columns: true,
                require_analyst_sign_off: true,
              },
              assembly: {
                node_id: 4,
                node_name: 'Assembly',
                charts: defaultCharts,
                layout_mode: 'Standard',
                chart_order: defaultCharts.map((c) => c.label),
                generate_charts_summary: false,
                branding: {
                  client_name:   s.brandName,
                  logo_file_path: `uploads/${s.fileName}`,
                  color: tplColors,
                  typography: {
                    font_family: s.selectedTemplate?.fontFamily ?? 'Inter',
                    font_url: null,
                  },
                  media_assets: { background_image: null, background_video: null },
                  template_id: s.selectedTemplateId,
                  template_style: s.selectedTemplate?.style ?? null,
                },
              },
              output: {
                node_id: 5,
                node_name: 'Output',
                dashboard_title: s.dashboardTitle,
                description: `Media intelligence report for ${s.brandName}`,
              },
            }],
          },
        };
      },

      // ── Global reset ──────────────────────────────────────────────────────────
      reset: () =>
        set({
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
