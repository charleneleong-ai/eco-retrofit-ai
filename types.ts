
export type UserType = 'homeowner' | 'renter';

export interface Recommendation {
  title: string;
  description: string;
  estimatedCost: string;
  estimatedAnnualSavings: string;
  impact: 'High' | 'Medium' | 'Low';
  category: 'Insulation' | 'Heating' | 'Solar' | 'Behavioral' | 'Windows';
}

export interface ComparisonData {
  similarHomeAvgCost: number;
  efficiencyPercentile: number; // 0-100, higher is better
  description: string;
}

export interface DataSource {
  title: string;
  url: string;
}

export interface UsageMetric {
  label: string;
  kwh: number;
  cost: number;
}

export interface UsageBreakdown {
  daily: UsageMetric[];
  weekly: UsageMetric[];
  monthly: UsageMetric[];
}

export interface EPCRating {
  current: string; // A-G
  potential: string; // A-G
  score: number; // 1-100
}

export interface SourceDoc {
  name: string;
  type: 'pdf' | 'image' | 'video';
  date?: string;
  url?: string;
}

export interface AnalysisResult {
  customerName?: string;
  address?: string;
  auditDate?: string;
  summary: string;
  currentMonthlyAvg: number;
  projectedMonthlyAvg: number;
  currency: string;
  recommendations: Recommendation[];
  comparison: ComparisonData;
  dataSources: DataSource[];
  usageBreakdown?: UsageBreakdown;
  epc?: EPCRating;
  sourceDocuments?: SourceDoc[];
}

export interface FileData {
  name: string;
  type: string;
  data: string; // Base64
}

export interface SavedAnalysis {
  id: string;
  date: number;
  userType: UserType;
  result: AnalysisResult;
  billFiles: FileData[];
}

export interface FileWithPreview {
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'pdf';
}

export type AppState = 'upload' | 'analyzing' | 'dashboard' | 'history';
