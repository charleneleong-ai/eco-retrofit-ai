
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
  let weekStartLabel = '';

  monthlyData.forEach((m) => {
    // Sanitize input values to ensure they are numbers
    const safeCost = typeof m.cost === 'number' && !isNaN(m.cost) ? m.cost : 0;
    const safeKwh = typeof m.kwh === 'number' && !isNaN(m.kwh) ? m.kwh : 0;

    const daysInMonth = 30; // Approx constant for visual consistency
    const dailyBaseCost = safeCost / daysInMonth;
    const dailyBaseKwh = safeKwh / daysInMonth;
    
    // Attempt to extract year from label (e.g. "Jan 25" -> "25")
    const labelParts = m.label.split(' ');
    const monthStr = labelParts[0];
    const yearStr = labelParts.length > 1 ? labelParts[1] : '';
    // Normalize year string to 2 digits if possible (e.g. 2025 -> 25) for cleaner charts
    const shortYear = yearStr.length === 4 ? yearStr.slice(2) : yearStr;

    for (let i = 1; i <= daysInMonth; i++) {
      // Add natural variance (+/- 30%)
      const variance = 0.7 + Math.random() * 0.6;
      const cost = dailyBaseCost * variance;
      const kwh = dailyBaseKwh * variance;

      // Create daily label like "1 Jan 25"
      const dailyLabel = `${i} ${monthStr}${shortYear ? ` '${shortYear}` : ''}`;

      daily.push({
        label: dailyLabel,
        cost: parseFloat(cost.toFixed(2)),
        kwh: Math.round(kwh * 10) / 10
      });

      // Track week start/end
      dayCount++;
      if (dayCount % 7 === 1) {
        weekStartLabel = dailyLabel;
      }

      // Accumulate weekly
      currentWeekCost += cost;
      currentWeekKwh += kwh;

      if (dayCount % 7 === 0) {
        weekly.push({
          label: `W${weekly.length + 1}${shortYear ? `'${shortYear}` : ''}`,
          cost: parseFloat(currentWeekCost.toFixed(2)),
          kwh: Math.round(currentWeekKwh),
          dateRange: `${weekStartLabel} - ${dailyLabel}`
        });
        currentWeekCost = 0;
        currentWeekKwh = 0;
      }
    }
  });
  
  // Push remaining partial week if any substantial data exists
  if (dayCount % 7 !== 0 && currentWeekCost > 1) {
     // Grab year from the last month processed
     const lastMonth = monthlyData[monthlyData.length - 1];
     const parts = lastMonth.label.split(' ');
     const year = parts.length > 1 ? (parts[1].length === 4 ? parts[1].slice(2) : parts[1]) : '';
     
     // Use the very last generated daily label as the end of the partial week
     const lastDailyLabel = daily.length > 0 ? daily[daily.length - 1].label : '';

     weekly.push({
        label: `W${weekly.length + 1}${year ? `'${year}` : ''}`,
        cost: parseFloat(currentWeekCost.toFixed(2)),
        kwh: Math.round(currentWeekKwh),
        dateRange: `${weekStartLabel} - ${lastDailyLabel}`
      });
  }

  return {
    daily,
    weekly,
    monthly: monthlyData
  };
};
