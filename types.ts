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

export interface AnalysisResult {
  summary: string;
  currentMonthlyAvg: number;
  projectedMonthlyAvg: number;
  currency: string;
  recommendations: Recommendation[];
  comparison: ComparisonData;
  dataSources: string[];
}

export interface FileWithPreview {
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'pdf';
}

export type AppState = 'upload' | 'analyzing' | 'dashboard';