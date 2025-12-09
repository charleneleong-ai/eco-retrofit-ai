
import { AnalysisResult, UsageMetric } from '../types';

// Helper to generate granular data from monthly totals
const generateMockUsageData = () => {
  const monthlyTotals = [
    { month: 'Jan', cost: 183.96, kwh: 1746 }, // Peak Winter
    { month: 'Feb', cost: 159.75, kwh: 1510 },
    { month: 'Mar', cost: 133.19, kwh: 1062 },
    { month: 'Apr', cost: 93.18, kwh: 452 },
    { month: 'May', cost: 82.60, kwh: 376 },
    { month: 'Jun', cost: 97.41, kwh: 478 },
    { month: 'Jul', cost: 84.46, kwh: 351 },
    { month: 'Aug', cost: 89.43, kwh: 332 },
    { month: 'Sep', cost: 59.74, kwh: 193 }, // Lowest
    { month: 'Oct', cost: 97.27, kwh: 529 },
    { month: 'Nov', cost: 115.00, kwh: 850 },
    { month: 'Dec', cost: 145.00, kwh: 1400 },
  ];

  const daily: UsageMetric[] = [];
  const weekly: UsageMetric[] = [];
  
  let currentWeekCost = 0;
  let currentWeekKwh = 0;
  let dayCount = 0;

  // Generate 365 days of data
  monthlyTotals.forEach((m) => {
    // Determine days in month (approximate)
    const daysInMonth = 30; 
    const dailyBaseCost = m.cost / daysInMonth;
    const dailyBaseKwh = m.kwh / daysInMonth;

    for (let i = 1; i <= daysInMonth; i++) {
      // Add natural variance (+/- 25%)
      const variance = 0.75 + Math.random() * 0.5;
      const cost = dailyBaseCost * variance;
      const kwh = dailyBaseKwh * variance;

      daily.push({
        label: `${m.month} ${i}`,
        cost: parseFloat(cost.toFixed(2)),
        kwh: Math.round(kwh * 10) / 10
      });

      // Accumulate weekly
      currentWeekCost += cost;
      currentWeekKwh += kwh;
      dayCount++;

      if (dayCount % 7 === 0) {
        weekly.push({
          label: `Week ${weekly.length + 1}`,
          cost: parseFloat(currentWeekCost.toFixed(2)),
          kwh: Math.round(currentWeekKwh)
        });
        currentWeekCost = 0;
        currentWeekKwh = 0;
      }
    }
  });

  return {
    daily,
    weekly,
    monthly: monthlyTotals.map(m => ({ label: m.month, cost: m.cost, kwh: m.kwh }))
  };
};

const usageData = generateMockUsageData();

export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
  customerName: "Miss Charlene Leong",
  address: "Flat 2, Parkchurch House 108, Grosvenor Avenue, London, N5 2NE",
  auditDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  currency: "£",
  currentMonthlyAvg: 108,
  projectedMonthlyAvg: 89,
  summary: `
Based on the analysis of your OVO Energy bills from December 2024 to October 2025, your total energy expenditure is approximately **£1,280 annually**. 

Your energy usage follows a distinct **seasonal pattern**, with gas consumption peaking significantly in January (£100 gas vs £74 electricity) compared to August (£12 gas vs £48 electricity). This indicates that **space heating is the primary driver of your costs**, accounting for over 60% of your winter bills. 

Your electricity usage is relatively consistent, averaging around 190 kWh per month, which is slightly higher than average for a single-occupant flat. As a renter in **London (N5)**, structural upgrades are likely off-limits, so this plan focuses on **heat retention**, **draft proofing**, and **smart heating controls** to lower your bills without angering your landlord.
  `,
  epc: {
    current: "D",
    potential: "C",
    score: 62
  },
  usageBreakdown: {
    daily: usageData.daily,
    weekly: usageData.weekly,
    monthly: usageData.monthly
  },
  comparison: {
    similarHomeAvgCost: 95,
    efficiencyPercentile: 45,
    description: "Your home consumes 15% more energy than similar sized flats in London N5. The discrepancy is largely due to higher-than-average heating costs in winter months."
  },
  dataSources: [
    { title: "OFGEM Average Usage Figures", url: "https://www.ofgem.gov.uk/information-consumers" },
    { title: "Energy Saving Trust (Renters)", url: "https://energysavingtrust.org.uk/energy-at-home" },
    { title: "London Energy Map", url: "https://www.gov.uk/find-energy-certificate" }
  ],
  recommendations: [
    {
      title: "Window Insulation Film",
      description: "Apply clear thermal film to your single/double glazed windows. It acts as secondary glazing, reducing heat loss by up to 30% without structural changes.",
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
      description: "Seal gaps around doors and windows with self-adhesive foam strips. This is the cheapest way to stop cold air ingress.",
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
