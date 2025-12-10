
import { AnalysisResult } from '../types';
import { generateDerivedUsageData } from '../utils';

// Helper to generate granular data from monthly totals
const generateMockUsageData = () => {
  const monthlyTotals = [
    { month: 'Dec 24', cost: 159.75, kwh: 168 + 1395 }, // Dec 24
    { month: 'Jan 25', cost: 183.96, kwh: 235 + 1510 }, // Jan 25
    { month: 'Feb 25', cost: 133.19, kwh: 211 + 851 },  // Feb 25
    { month: 'Mar 25', cost: 93.18, kwh: 186 + 344 },   // Mar 25
    { month: 'Apr 25', cost: 82.60, kwh: 160 + 266 },   // Apr 25
    { month: 'May 25', cost: 97.41, kwh: 216 + 261 },   // May 25
    { month: 'Jun 25', cost: 84.46, kwh: 189 + 180 },   // Jun 25
    { month: 'Jul 25', cost: 89.43, kwh: 209 + 171 },   // Jul 25
    { month: 'Aug 25', cost: 59.74, kwh: 123 + 69 },    // Aug 25
    { month: 'Sep 25', cost: 97.27, kwh: 203 + 325 },   // Sep 25
    { month: 'Oct 25', cost: 98.95, kwh: 213 + 296 },   // Oct 25
    { month: 'Nov 25', cost: 145.00, kwh: 1400 },       // Nov 25 (Projected based on trend)
  ];

  return generateDerivedUsageData(monthlyTotals.map(m => ({ 
      label: m.month, 
      cost: m.cost, 
      kwh: m.kwh 
  })));
};

const usageData = generateMockUsageData();

export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
  customerName: "Miss Charlene Leong",
  address: "Flat 2, Parkchurch House 108, Grosvenor Avenue, London, N5 2NE",
  auditDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  currency: "£",
  currentMonthlyAvg: 110.41,
  projectedMonthlyAvg: 93.85,
  summary: `
Based on the analysis of your **OVO Energy** bills from December 2024 to November 2025, your total energy expenditure is approximately **£1,325 annually**. 

Your energy usage follows a distinct **seasonal pattern**, with gas consumption peaking significantly in January (~1500 kWh) compared to August (~70 kWh). This indicates that **space heating is the primary driver of your costs**, accounting for over 65% of your winter bills. 

Your electricity usage is relatively consistent, averaging around 190 kWh per month, which is slightly higher than average for a single-occupant flat [1]. As a renter in **London (N5)**, structural upgrades are likely off-limits, so this plan focuses on **heat retention** [2], **smart heating controls** [3], and efficient appliances to lower your bills without angering your landlord.
  `,
  epc: {
    current: "D",
    potential: "C",
    score: 64,
    isEstimate: true
  },
  usageBreakdown: {
    daily: usageData.daily,
    weekly: usageData.weekly,
    monthly: usageData.monthly
  },
  sourceDocuments: [
    { name: 'OVO_Bill_12Dec24_11Jan25.pdf', type: 'pdf', date: 'Jan 2025', url: '#' },
    { name: 'OVO_Bill_12Jan25_11Feb25.pdf', type: 'pdf', date: 'Feb 2025', url: '#' },
    { name: 'OVO_Bill_12Feb25_11Mar25.pdf', type: 'pdf', date: 'Mar 2025', url: '#' },
    { name: 'OVO_Bill_12Mar25_11Apr25.pdf', type: 'pdf', date: 'Apr 2025', url: '#' },
    { name: 'OVO_Bill_12Apr25_11May25.pdf', type: 'pdf', date: 'May 2025', url: '#' },
    { name: 'OVO_Bill_12May25_11Jun25.pdf', type: 'pdf', date: 'Jun 2025', url: '#' },
    { name: 'OVO_Bill_12Jun25_11Jul25.pdf', type: 'pdf', date: 'Jul 2025', url: '#' },
    { name: 'OVO_Bill_12Jul25_11Aug25.pdf', type: 'pdf', date: 'Aug 2025', url: '#' },
    { name: 'OVO_Bill_12Aug25_11Sep25.pdf', type: 'pdf', date: 'Sep 2025', url: '#' },
    { name: 'OVO_Bill_12Sep25_11Oct25.pdf', type: 'pdf', date: 'Oct 2025', url: '#' },
    { name: 'OVO_Bill_12Oct25_11Nov25.pdf', type: 'pdf', date: 'Nov 2025', url: '#' }
  ],
  homeProfile: {
    propertyType: "Flat",
    bedrooms: 1,
    occupants: 1,
    homeHours: "Evenings & Weekends",
    heatingType: "Gas Central",
    hasEV: false,
    appliances: ["Washing Machine", "Fridge Freezer", "Electric Oven"]
  },
  comparison: {
    similarHomeAvgCost: 95,
    efficiencyPercentile: 45,
    description: "Your home consumes 15% more energy than similar sized flats in London N5 [5]. The discrepancy is largely due to higher-than-average heating costs in winter months.",
    neighborhoodName: "Highbury, London (N5)",
    factors: [
        { label: "Build Type", userValue: "Victorian Conversion", localAvg: "Victorian/Edwardian", variance: "Match" },
        { label: "Size", userValue: "1 Bed", localAvg: "1-2 Bed", variance: "Slightly Smaller" },
        { label: "Occupancy", userValue: "1 Adult", localAvg: "1.8 Adults", variance: "Lower" },
        { label: "Heating", userValue: "Gas Central", localAvg: "Gas Central", variance: "Match" }
    ]
  },
  dataSources: [
    { title: "OFGEM Average Usage Figures", url: "https://www.ofgem.gov.uk/information-consumers/energy-advice-households/average-gas-and-electricity-use-explained" },
    { title: "EST: Draught Proofing & Windows", url: "https://energysavingtrust.org.uk/advice/draught-proofing/" },
    { title: "EST: Thermostats & Controls", url: "https://energysavingtrust.org.uk/advice/thermostats-and-heating-controls/" },
    { title: "EST: Home Appliances", url: "https://energysavingtrust.org.uk/advice/home-appliances/" },
    { title: "London Building Stock Model", url: "https://data.london.gov.uk/dataset/london-building-stock-model" },
    { title: "EST: Fixing Damp & Condensation", url: "https://energysavingtrust.org.uk/advice/fixing-damp-and-condensation/" }
  ],
  recommendations: [
    {
      title: "Window Insulation Film",
      description: "Apply clear thermal film to your single/double glazed windows. It acts as secondary glazing, reducing heat loss by up to 30% without structural changes [2].",
      estimatedCost: "£20 - £40",
      estimatedAnnualSavings: "£45 - £60",
      impact: "High",
      category: "Insulation"
    },
    {
      title: "Smart Radiator Valves (TRVs)",
      description: "Install smart valves on radiators to heat only the rooms you are using. Compatible with most boilers and easy to remove when you move out [3].",
      estimatedCost: "£150 - £200",
      estimatedAnnualSavings: "£70 - £90",
      impact: "High",
      category: "Heating"
    },
    {
      title: "Draft Proofing Strips",
      description: "Seal gaps around doors and windows with self-adhesive foam strips. This is the cheapest way to stop cold air ingress [2].",
      estimatedCost: "£10 - £15",
      estimatedAnnualSavings: "£25 - £35",
      impact: "Medium",
      category: "Insulation"
    },
    {
      title: "Portable Induction Hob",
      description: "Use a plug-in induction hob for daily cooking instead of the gas stove. It's more efficient and improves indoor air quality [4].",
      estimatedCost: "£40 - £60",
      estimatedAnnualSavings: "£30 - £50",
      impact: "Medium",
      category: "Behavioral"
    }
  ]
};
