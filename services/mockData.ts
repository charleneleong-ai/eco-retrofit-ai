
import { AnalysisResult } from '../types';
import { generateDerivedUsageData } from '../utils';

// Helper to generate granular data from monthly totals
const generateMockUsageData = () => {
  const monthlyTotals = [
    { month: 'Dec', cost: 159.75, kwh: 168 + 1395 }, // Dec 24
    { month: 'Jan', cost: 183.96, kwh: 235 + 1510 }, // Jan 25
    { month: 'Feb', cost: 133.19, kwh: 211 + 851 },  // Feb 25
    { month: 'Mar', cost: 93.18, kwh: 186 + 344 },   // Mar 25
    { month: 'Apr', cost: 82.60, kwh: 160 + 266 },   // Apr 25
    { month: 'May', cost: 97.41, kwh: 216 + 261 },   // May 25
    { month: 'Jun', cost: 84.46, kwh: 189 + 180 },   // Jun 25
    { month: 'Jul', cost: 89.43, kwh: 209 + 171 },   // Jul 25
    { month: 'Aug', cost: 59.74, kwh: 123 + 69 },    // Aug 25
    { month: 'Sep', cost: 97.27, kwh: 203 + 325 },   // Sep 25
    { month: 'Oct', cost: 98.95, kwh: 213 + 296 },   // Oct 25
    { month: 'Nov', cost: 145.00, kwh: 1400 },       // Nov 25 (Projected based on trend)
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

Your electricity usage is relatively consistent, averaging around 190 kWh per month, which is slightly higher than average for a single-occupant flat [1]. As a renter in **London (N5)**, structural upgrades are likely off-limits [2], so this plan focuses on **heat retention**, **draft proofing**, and **smart heating controls** to lower your bills without angering your landlord.
  `,
  epc: {
    current: "D",
    potential: "C",
    score: 64
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
  comparison: {
    similarHomeAvgCost: 95,
    efficiencyPercentile: 45,
    description: "Your home consumes 15% more energy than similar sized flats in London N5 [3]. The discrepancy is largely due to higher-than-average heating costs in winter months."
  },
  dataSources: [
    { title: "OFGEM Average Usage Figures", url: "https://www.ofgem.gov.uk/information-consumers/energy-advice-households/average-gas-and-electricity-usage" },
    { title: "Energy Saving Trust (Renters Advice)", url: "https://energysavingtrust.org.uk/energy-saving-tips-renters/" },
    { title: "London Energy Map & Stock Model", url: "https://www.london.gov.uk/programmes-strategies/environment-and-climate-change/energy-and-buildings/london-building-stock-model" }
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
      description: "Install smart valves on radiators to heat only the rooms you are using. Compatible with most boilers and easy to remove when you move out.",
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
      description: "Use a plug-in induction hob for daily cooking instead of the gas stove. It's more efficient and improves indoor air quality.",
      estimatedCost: "£40 - £60",
      estimatedAnnualSavings: "£30 - £50",
      impact: "Medium",
      category: "Behavioral"
    }
  ]
};
