
export type UserType = 'homeowner' | 'renter';

export interface Recommendation {
  title: string;
  description: string;
  estimatedCost: string;
  estimatedAnnualSavings: string;
  impact: 'High' | 'Medium' | 'Low';
  category: 'Insulation' | 'Heating' | 'Solar' | 'Behavioral' | 'Windows' | 'Lighting' | 'Water' | 'Smart Home';
}

export interface ComparisonFactor {
  label: string;      // e.g. "Build Era", "Occupancy"
  userValue: string;  // e.g. "1930s Semi", "2 Adults"
  localAvg: string;   // e.g. "1930-1950", "2.4 People"
  variance: string;   // e.g. "Match", "Higher", "Lower"
  explanation?: string; // AI Reasoning for this specific inference
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
  similarHomeAvgCost: number; // The specific benchmark for THIS profile
  areaAverageCost?: number;   // General average for the area (e.g. all 1-bed flats)
  efficientHomeCost?: number; // Target: Top 20% efficient homes with this profile
  efficiencyPercentile: number; // 0-100, higher is better
  description: string;
  neighborhoodName?: string;
  factors?: ComparisonFactor[];
}

export interface DataSource {
  title: string;
  url: string;
}

export interface FuelMetric {
  cost: number;
  kwh: number;
}

export interface UsageMetric {
  label: string;
  kwh: number;
  cost: number;
  dateRange?: string;
  electricity?: FuelMetric;
  gas?: FuelMetric;
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

// 3D Spatial Types
export interface RoomFeature {
  type: 'furniture' | 'window' | 'door' | 'appliance';
  name: string; // "Sofa", "Bed", "Desk"
  position: 'center' | 'wall-left' | 'wall-right' | 'wall-back' | 'corner';
}

export interface RoomData {
  id: string;
  name: string; // "Living Room"
  type: 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'office' | 'hallway';
  dimensions: { width: number; depth: number }; // Relative units (1-10)
  features: RoomFeature[];
}

export interface SpatialLayout {
  rooms: RoomData[];
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
  homeProfile?: HomeProfile; 
  spatialLayout?: SpatialLayout; 
}

export interface FileData {
  name: string;
  type: string;
  data: string; // Base64
}

// A snapshot of a specific analysis state
export interface AnalysisVersion {
  versionId: string;
  timestamp: number;
  result: AnalysisResult;
  inputFiles: FileData[]; 
  selectedRecommendationIndices?: number[];
  note?: string; 
}

// Container for history
export interface SavedAnalysis {
  id: string; // Persistent ID across versions
  createdAt: number;
  updatedAt: number;
  userType: UserType;
  versions: AnalysisVersion[]; // Array of versions, newest first
}

export interface FileWithPreview {
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'pdf';
}

export type AppState = 'upload' | 'analyzing' | 'dashboard' | 'history';
