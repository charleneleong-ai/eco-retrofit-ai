
import { UsageMetric, UsageBreakdown } from './types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const formatCurrency = (value: number, currency: string = '$') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === '$' ? 'USD' : currency, // Simple mapping, could be expanded
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const generateDerivedUsageData = (monthlyData: UsageMetric[]): UsageBreakdown => {
  const daily: UsageMetric[] = [];
  const weekly: UsageMetric[] = [];
  
  let currentWeekCost = 0;
  let currentWeekKwh = 0;
  let dayCount = 0;

  monthlyData.forEach((m) => {
    // Sanitize input values to ensure they are numbers
    const safeCost = typeof m.cost === 'number' && !isNaN(m.cost) ? m.cost : 0;
    const safeKwh = typeof m.kwh === 'number' && !isNaN(m.kwh) ? m.kwh : 0;

    const daysInMonth = 30; // Approx constant for visual consistency
    const dailyBaseCost = safeCost / daysInMonth;
    const dailyBaseKwh = safeKwh / daysInMonth;

    for (let i = 1; i <= daysInMonth; i++) {
      // Add natural variance (+/- 30%)
      const variance = 0.7 + Math.random() * 0.6;
      const cost = dailyBaseCost * variance;
      const kwh = dailyBaseKwh * variance;

      daily.push({
        label: `${m.label} ${i}`,
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
  
  // Push remaining partial week if any substantial data exists
  if (dayCount % 7 !== 0 && currentWeekCost > 1) {
     weekly.push({
        label: `Week ${weekly.length + 1}`,
        cost: parseFloat(currentWeekCost.toFixed(2)),
        kwh: Math.round(currentWeekKwh)
      });
  }

  return {
    daily,
    weekly,
    monthly: monthlyData
  };
};
