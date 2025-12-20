
import { AnalysisResult } from '../types';
import { generateDerivedUsageData } from '../utils';

// Helper to generate granular data from monthly totals
const generateMockUsageData = () => {
  // Define split based on the logic: Gas high in winter, Elec consistent (~180-230 kwh)
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
    { month: 'Nov 25', elecKwh: 220, gasKwh: 1180 }, 
  ];

  const ELEC_RATE = 0.28; 
  const GAS_RATE = 0.07;
  const STANDING_CHARGE = 20;

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
  address: "Flat 2, Parkchurch House, 108 Grosvenor Avenue, London, N5 2NE",
  auditDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  currency: "£",
  currentMonthlyAvg: 110.41,
  projectedMonthlyAvg: 90.15,
  summary: `
Based on the analysis of your **OVO Energy** bills and visual audit, your home is estimated to have an **EPC Grade D rating (64 points)**. 

With **2 occupants typically home in the evenings and weekends**, your usage follows a standard domestic pattern. However, your electricity baseload is elevated due to your high appliance count, specifically the **Tumble Dryer, Dishwasher, and Electric Hob**. Space heating via your **Gas Boiler** remains the primary cost driver, peaking at ~1,500 kWh in January. 

While the property is a Victorian conversion, our AI audit has identified significant **efficiency gains** [3] through optimization measures like boiler flow temperature reduction and reflective technology, which can save you up to **£95 annually** while maintaining comfort during occupancy hours.
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
    { name: 'OVO_Bill_12Oct25_11Nov25.pdf', type: 'pdf', date: 'Nov 2025', url: '#' },
    { name: 'walkthrough_part1.mp4', type: 'video', date: 'Dec 2025', url: '#' },
    { name: 'walkthrough_part2.mp4', type: 'video', date: 'Dec 2025', url: '#' },
    { name: 'walkthrough_part3.mp4', type: 'video', date: 'Dec 2025', url: '#' }
  ],
  homeProfile: {
    propertyType: "Flat",
    bedrooms: 1,
    occupants: 2,
    homeHours: "Evenings & Weekends",
    heatingType: "Gas Boiler",
    hasEV: false,
    appliances: [
      "Washing Machine", 
      "Tumble Dryer", 
      "Dishwasher", 
      "Electric Oven", 
      "Electric Hob", 
      "Microwave", 
      "Fridge Freezer"
    ]
  },
  comparison: {
    similarHomeAvgCost: 98,
    areaAverageCost: 115,
    efficientHomeCost: 82,
    efficiencyPercentile: 55,
    description: "Your home's efficiency is shaped by both its Victorian structure and your active living patterns. While the build performs 12% better than uninsulated stock, your electricity load is higher than 70% of local 1-bed flats due to the frequent use of high-intensity appliances like the tumble dryer during peak hours.",
    neighborhoodName: "Highbury, London (N5)",
    factors: [
        { 
          label: "Regional Build Era", 
          userValue: "Victorian (London)", 
          localAvg: "1900-1920 Avg", 
          variance: "Structural performance matches regional averages.",
          explanation: "Inferred from your N5 postcode and visible sash window geometry in the walkthrough video. Victorian building stock in Highbury typically lacks cavity wall insulation, which matches your detected usage profile."
        },
        { 
          label: "Occupancy Density", 
          userValue: "2 Adults (32sqm)", 
          localAvg: "1.2 (Regional)", 
          variance: "60% higher density increases incidental heat and hot water demand.",
          explanation: "Comparison based on ONS Highbury East data for average occupants per 1-bed flat. Two active occupants increase the baseload demand for washing, cooking, and heat retention via internal gains."
        },
        { 
          label: "Living Pattern", 
          userValue: "Evenings & Weekends", 
          localAvg: "Commuter Shift", 
          variance: "Standard usage, but evening peaks align with high tariff periods.",
          explanation: "By analyzing the cost-per-kWh ratio in your OVO bills, we detected significant spikes between 18:00 and 21:00. These correlate with peak demand times where standard tariffs are highest."
        },
        { 
          label: "Appliance Load", 
          userValue: "High (Dryer/Dish)", 
          localAvg: "Essential only", 
          variance: "Appliance baseline is 22% higher than similar 1-bed flats.",
          explanation: "Visual recognition identified a condensing tumble dryer and dishwasher. Billing data shows a non-heating electricity baseline of ~6kWh/day, which is significantly above the regional flat average."
        },
        { 
          label: "Heating Preference", 
          userValue: "Gas Boiler (Active)", 
          localAvg: "Standard Controls", 
          variance: "Usage peaks coincide with maximum heat loss hours.",
          explanation: "Calculated by subtracting base water heating from Jan/Feb total gas volume. Your heating duration suggests active usage during sunset hours when Victorian solid walls dissipate heat most rapidly."
        }
    ]
  },
  dataSources: [
    { title: "EPC Register - GOV.UK", url: "https://www.gov.uk/find-energy-certificate" },
    { title: "EST: Draught Proofing & Windows", url: "https://energysavingtrust.org.uk/advice/draught-proofing/" },
    { title: "EST: Thermostats & Controls", url: "https://energysavingtrust.org.uk/advice/thermostats-and-heating-controls/" },
    { title: "EST: Home Appliances", url: "https://energysavingtrust.org.uk/advice/home-appliances/" },
    { title: "EST: Radiator Insulation Panels", url: "https://energysavingtrust.org.uk/advice/insulating-tanks-pipes-and-radiators/" },
    { title: "EST: Lighting Advice", url: "https://energysavingtrust.org.uk/advice/lighting/" },
    { title: "EST: Saving Water", url: "https://energysavingtrust.org.uk/advice/saving-water-home/" }
  ],
  recommendations: [
    {
      title: "Boiler Flow Temp Optimization",
      description: "Since you use a Gas Boiler, reducing the flow temperature to 55°C will keep it in 'condensing mode' longer, saving up to 8% on gas [3].",
      estimatedCost: "£0 (DIY)",
      estimatedAnnualSavings: "£75 - £95",
      impact: "High",
      category: "Heating"
    },
    {
      title: "Whole-Home LED Transition",
      description: "We identified several incandescent bulbs in your hallway and bedroom. Switching all bulbs to LEDs will reduce your lighting electricity load by 80% [6].",
      estimatedCost: "£30 - £50",
      estimatedAnnualSavings: "£45 - £60",
      impact: "Medium",
      category: "Lighting"
    },
    {
      title: "Eco-Flow Showerhead",
      description: "Reducing water volume while maintaining pressure can significantly lower the gas required for hot water heating, especially with 2 occupants [7].",
      estimatedCost: "£20 - £35",
      estimatedAnnualSavings: "£35 - £50",
      impact: "Medium",
      category: "Water"
    },
    {
      title: "Reflective Radiator Panels",
      description: "Highbury Victorian walls are notoriously cold. Install reflective panels behind radiators on external walls to push heat back into the living space [5].",
      estimatedCost: "£25 - £35",
      estimatedAnnualSavings: "£25 - £40",
      impact: "Medium",
      category: "Heating"
    },
    {
      title: "Smart Power Strips",
      description: "Your office setup has a high standby load. A smart strip will automatically cut power to monitors and peripherals when your PC is off [4].",
      estimatedCost: "£15 - £25",
      estimatedAnnualSavings: "£15 - £25",
      impact: "Low",
      category: "Smart Home"
    }
  ]
};
