
import { AnalysisResult } from '../types';
import { generateDerivedUsageData } from '../utils';

// Helper to generate granular data from monthly totals
const generateMockUsageData = () => {
  // Define split based on the logic: Gas high in winter, Elec consistent (~180-230 kwh)
  // Costs approx: Elec 24p/kwh, Gas 7p/kwh + standing charges
  
  const monthlyTotals = [
    { month: 'Dec 24', elecKwh: 168, gasKwh: 1395 }, 
    { month: 'Jan 25', elecKwh: 235, gasKwh: 1510 }, 
    { month: 'Feb 25', elecKwh: 211, gasKwh: 851 },  
    { month: 'Mar 25', elecKwh: 186, gasKwh: 344 },  
    { month: 'Apr 25', elecKwh: 160, gasKwh: 266 },  
    { month: 'May 25', elecKwh: 216, gasKwh: 261 },  
    { month: 'Jun 25', elecKwh: 189, gasKwh: 180 },  
    { month: 'Jul 25', elecKwh: 209, gasKwh: 171 },  
    { month: 'Aug 25', elecKwh: 123, gasKwh: 69 },   
    { month: 'Sep 25', elecKwh: 203, gasKwh: 325 },  
    { month: 'Oct 25', elecKwh: 213, gasKwh: 296 },  
    { month: 'Nov 25', elecKwh: 220, gasKwh: 1180 }, // Projected Winter start
  ];

  // Assumed avg unit rates for simplified cost calc
  const ELEC_RATE = 0.28; 
  const GAS_RATE = 0.07;
  const STANDING_CHARGE = 20; // Approx monthly standing charge total

  return generateDerivedUsageData(monthlyTotals.map(m => {
      const elecCost = m.elecKwh * ELEC_RATE + (STANDING_CHARGE * 0.5);
      const gasCost = m.gasKwh * GAS_RATE + (STANDING_CHARGE * 0.5);
      
      return { 
          label: m.month, 
          cost: elecCost + gasCost, 
          kwh: m.elecKwh + m.gasKwh,
          electricity: { kwh: m.elecKwh, cost: elecCost },
          gas: { kwh: m.gasKwh, cost: gasCost }
      };
  }));
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
    areaAverageCost: 115,
    efficientHomeCost: 78,
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
