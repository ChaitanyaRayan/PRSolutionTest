// ── Dashboard definitions ──────────────────────────────────────────────────────
// Each dashboard carries its identity: tint colour, stat preview, sparkline data,
// and optional gauge config. The `id` is the routing key throughout the platform.

export const MM_SPARK_TOTAL = [4, 7, 5, 9, 12, 8, 14, 11, 16, 13, 18, 22];

export const DASHBOARDS = [
  {
    id: 'intelligence',
    num: '01',
    name: 'Media Measurement',
    tint: '#7C3AED',
    statV: '35',
    statL: 'Total Articles',
    delta: '+12.3%',
    deltaPos: true,
    spark: MM_SPARK_TOTAL,
    sparkColor: '#7C3AED',
    description: 'Volume, reach and share-of-voice across all media channels.',
    tabs: [
      { id: 'overview', label: 'Overview', chartTypes: ['line', 'bar'] },
      { id: 'sources', label: 'Sources', chartTypes: ['bar', 'pie'] },
      { id: 'reach', label: 'Reach', chartTypes: ['area', 'line'] },
    ],
  },
  {
    id: 'monitoring',
    num: '02',
    name: 'Media Monitoring',
    tint: '#EC4899',
    statV: '92.7',
    statL: 'Impact index',
    delta: '+4.1 pts',
    deltaPos: true,
    description: 'Real-time tracking of brand mentions and media coverage.',
    tabs: [
      { id: 'mentions', label: 'Mentions', chartTypes: ['line', 'bar'] },
      { id: 'sentiment', label: 'Sentiment', chartTypes: ['pie', 'area'] },
      { id: 'topics', label: 'Topics', chartTypes: ['bar'] },
    ],
  },
  {
    id: 'narrative',
    num: '03',
    name: 'Narrative Intelligence',
    tint: '#3DD9D6',
    statV: '17',
    statL: 'Active narratives',
    delta: '+3 new',
    deltaPos: true,
    dateViz: [
      { label: '27', month: 'APR', count: 10 },
      { label: '28', month: 'APR', count: 5 },
      { label: '29', month: 'APR', count: 4 },
      { label: '30', month: 'APR', count: 3 },
      { label: '1', month: 'MAY', count: 13 },
    ],
    description: 'Identify, track and analyse evolving media narratives.',
    tabs: [
      { id: 'narratives', label: 'Narratives', chartTypes: ['area', 'line'] },
      { id: 'velocity', label: 'Velocity', chartTypes: ['bar', 'line'] },
      { id: 'themes', label: 'Themes', chartTypes: ['pie', 'bar'] },
    ],
  },
  {
    id: 'pr',
    num: '04',
    name: 'PR Impact',
    tint: '#F59E0B',
    statV: '$4.2M',
    statL: 'EMV this month',
    delta: '−2.1%',
    deltaPos: false,
    previewChart: { type: 'prGauge', value: 42 },
    description: 'Earned media value and PR campaign performance metrics.',
    tabs: [
      { id: 'emv', label: 'EMV', chartTypes: ['line', 'area'] },
      { id: 'campaigns', label: 'Campaigns', chartTypes: ['bar'] },
      { id: 'outlets', label: 'Outlets', chartTypes: ['pie', 'bar'] },
    ],
  },
  {
    id: 'reputation',
    num: '05',
    name: 'Reputation Index',
    tint: '#A78BFA',
    statV: '78.4',
    statL: 'Reputation score',
    delta: '+1.2',
    deltaPos: true,
    previewChart: { type: 'dummyGauge', value: 78, label: 'Reputation pulse' },
    description: 'Composite brand reputation score across earned and owned media.',
    tabs: [
      { id: 'score', label: 'Score', chartTypes: ['line', 'radialBar'] },
      { id: 'drivers', label: 'Drivers', chartTypes: ['bar', 'pie'] },
      { id: 'benchmark', label: 'Benchmark', chartTypes: ['line', 'area'] },
    ],
  },
];

export const DASHBOARD_MAP = Object.fromEntries(DASHBOARDS.map((d) => [d.id, d]));
