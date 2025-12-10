
export type UserType = 'homeowner' | 'renter';

export interface Recommendation {
  title: string;
  description: string;
  estimatedCost: string;
  estimatedAnnualSavings: string;
  impact: 'High' | 'Medium' | 'Low';
  category: 'Insulation' | 'Heating' | 'Solar' | 'Behavioral' | 'Windows';
}

export interface ComparisonFactor {
  label: string;      // e.g. "Build Era", "Occupancy"
  userValue: string;  // e.g. "1930s Semi", "2 Adults"
  localAvg: string;   // e.g. "1930-1950", "2.4 People"
  variance: string;   // e.g. "Match", "Higher", "Lower"
}

export interface HomeProfile {
  propertyType: string;
  bedrooms: number;
  occupants: number;
  homeHours: string; // e.g. "Evenings & Weekends", "All Day (WFH)"
  heatingType: string;
  hasEV: boolean;
  appliances: string[];
}

export interface ComparisonData {
  similarHomeAvgCost: number;
  efficiencyPercentile: number; // 0-100, higher is better
  description: string;
  neighborhoodName?: string;
  factors?: ComparisonFactor[];
}

export interface DataSource {
  title: string;
  url: string;
}

export interface UsageMetric {
  label: string;
  kwh: number;
  cost: number;
  dateRange?: string;
}

export interface UsageBreakdown {
  daily: UsageMetric[];
  weekly: UsageMetric[];
  monthly: UsageMetric[];
}

export interface EPCFeature {
  name: string; // e.g. "Wall", "Window"
  description: string; // e.g. "Cavity wall, as built..."
  rating: string; // e.g. "Good", "Average"
}

export interface EPCRating {
  current: string; // A-G
  potential: string; // A-G
  score: number; // 1-100
  isEstimate?: boolean;
  validUntil?: string;
  totalFloorArea?: string;
  certificateNumber?: string;
  propertyType?: string;
  breakdown?: EPCFeature[];
  upgradePotentialExplanation?: string;
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
  homeProfile?: HomeProfile; // Added for editable comparison logic
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
  selectedRecommendationIndices?: number[];
}

export interface FileWithPreview {
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'pdf';
}

export type AppState = 'upload' | 'analyzing' | 'dashboard' | 'history';
