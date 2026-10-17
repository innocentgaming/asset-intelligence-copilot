export interface User {
  user_id: string;
  name: string;
  role: string;
  team_id: string;
}

export interface UserMetaResponse {
  users: User[];
  today: string;
  wells: number;
  model: string;
}

export interface CorrectionItem {
  record_id: string;
  field: string;
  original: any;
  corrected: any;
  author: string;
  reason: string;
  created_at: string;
}

export interface RuleItem {
  rule: string;
  scope_type: string;
  scope_value: string;
  value: any;
  equipment_kind: string;
  author: string;
}

export interface ClaimItem {
  well_id: string;
  author: string;
  text: string;
  state: string;
  verification: string; // 'contradicted' | 'consistent' | 'confirmed' | 'future'
  created_at: string;
}

export interface KnowledgeResponse {
  corrections: CorrectionItem[];
  rules: RuleItem[];
  claims: ClaimItem[];
}

export interface SessionSummary {
  session_id: string;
  started: string;
  first_q: string;
  n: number;
}

export interface WellCardData {
  well: string;
  name?: string;
  type: string;
  area: string;
  producing: boolean;
  delta_c: number;
  threshold_c: number;
  wellhead_c: number;
  ambient_c: number;
  inspection: string;
  date: string;
  inspector: string;
  method: string;
  recorded_status: string;
  stale: boolean;
  inspector_note?: string;
  reasons?: string[];
  corrections?: Array<{
    field: string;
    original: any;
    corrected: any;
    by?: string;
    author?: string;
    reason: string;
  }>;
  conflicts?: string[];
  claims?: Array<{
    by?: string;
    author?: string;
    text: string;
    verification: string;
  }>;
  image?: string;
}

export interface TableVisual {
  type: 'table';
  title?: string;
  sources?: string[];
  columns: string[];
  rows: (string | number)[][];
}

export interface CardVisual {
  type: 'card';
  title?: string;
  sources?: string[];
  cards: WellCardData[];
}

export interface LineVisual {
  type: 'line';
  title?: string;
  sources?: string[];
  labels: string[];
  series: Array<{
    name: string;
    values: number[];
  }>;
  markers?: Array<{
    index: number;
    label: string;
  }>;
  note?: string;
}

export interface BarVisual {
  type: 'bar';
  title?: string;
  sources?: string[];
  labels: string[];
  series: Array<{
    name: string;
    values: number[];
  }>;
  sublabels?: string[];
}

export interface MapPoint {
  lat: number;
  lon: number;
  label: string;
  detail: string;
  color: string;
}

export interface MapVisual {
  type: 'map';
  title?: string;
  sources?: string[];
  points: MapPoint[];
}

export interface HeatmapVisual {
  type: 'heatmap';
  title?: string;
  sources?: string[];
  x: string[];
  y: string[];
  values: number[][];
  totals?: number[];
}

export type Visual = TableVisual | CardVisual | LineVisual | BarVisual | MapVisual | HeatmapVisual | Record<string, any>;

export interface TraceStep {
  tool: string;
  args: Record<string, any>;
  result_preview: string;
}

export interface ChatApiResponse {
  answer: string;
  visuals: Visual[];
  sources: string[];
  wells: string[];
  trace: TraceStep[];
  session_id: string;
  usage?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  visuals?: Visual[];
  sources?: string[];
  wells?: string[];
  trace?: TraceStep[];
  timestamp: string;
  isError?: boolean;
}
