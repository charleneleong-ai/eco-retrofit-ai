
import { UsageMetric, UsageBreakdown, FuelMetric } from './types';

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

export const extractFrameFromVideo = (videoFile: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        
        // Create a URL for the video file
        const fileURL = URL.createObjectURL(videoFile);
        video.src = fileURL;

        video.onloadedmetadata = () => {
            // Seek to 1 second or 10% if short to avoid black starter frames
            video.currentTime = Math.min(1, video.duration * 0.1);
        };

        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                // Limit resolution for API efficiency
                const scale = Math.min(1, 1024 / Math.max(video.videoWidth, video.videoHeight));
                canvas.width = video.videoWidth * scale;
                canvas.height = video.videoHeight * scale;
                
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                    URL.revokeObjectURL(fileURL);
                    resolve(base64);
                } else {
                    resolve(''); // Fallback
                }
            } catch (e) {
                console.error("Frame capture error", e);
                resolve('');
            }
        };

        video.onerror = (e) => {
            console.error("Video load error", e);
            resolve('');
        };
    } catch (e) {
        resolve('');
    }
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

export const parseSavingsValue = (savingsStr: string): number => {
  try {
    // Remove currency symbols and split
    const numbers = savingsStr.replace(/[^0-9\.\-]/g, ' ').split('-').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (numbers.length === 2) return (numbers[0] + numbers[1]) / 2;
    if (numbers.length === 1) return numbers[0];
    return 0;
  } catch (e) {
    return 0;
  }
};

const distributeMetric = (base: FuelMetric, daysInMonth: number, variance: number): FuelMetric => {
    return {
        cost: parseFloat(((base.cost / daysInMonth) * variance).toFixed(2)),
        kwh: Math.round(((base.kwh / daysInMonth) * variance) * 10) / 10
    };
};

// Heuristic to estimate split if missing
// Assumes winter months have high gas, summer months low gas
const estimateSplit = (totalMetric: UsageMetric): { elec: FuelMetric, gas: FuelMetric } => {
    // If already exists, return it
    if (totalMetric.electricity && totalMetric.gas) {
        return { elec: totalMetric.electricity, gas: totalMetric.gas };
    }

    const monthStr = totalMetric.label.split(' ')[0];
    const winterMonths = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const isWinter = winterMonths.includes(monthStr);

    // Heuristic Ratios
    // Winter: 70% Gas (Heating), 30% Elec
    // Summer: 20% Gas (Hot Water), 80% Elec
    const gasRatio = isWinter ? 0.65 : 0.20; 
    
    // Elec is usually more expensive per kwh, so cost ratio might be different from kwh ratio
    // But for simplicity of visualization derived from total, we stick to a simple split
    
    const elecKwh = totalMetric.kwh * (1 - gasRatio);
    const gasKwh = totalMetric.kwh * gasRatio;
    
    // Assume Elec is 3x price of gas (approx UK: 24p vs 7p)
    // TotalCost = (ElecKwh * 3X) + (GasKwh * 1X)
    // We solve for X (Base gas price unit) to distribute cost proportionally to realistic pricing
    // TotalCost = X * (3*ElecKwh + GasKwh)
    // X = TotalCost / (3*ElecKwh + GasKwh)
    
    const priceUnit = totalMetric.cost / ((3 * elecKwh) + gasKwh);
    const elecCost = 3 * elecKwh * priceUnit;
    const gasCost = gasKwh * priceUnit;

    return {
        elec: { kwh: elecKwh, cost: elecCost },
        gas: { kwh: gasKwh, cost: gasCost }
    };
};

export const generateDerivedUsageData = (monthlyData: UsageMetric[]): UsageBreakdown => {
  const daily: UsageMetric[] = [];
  const weekly: UsageMetric[] = [];
  
  let currentWeekCost = 0;
  let currentWeekKwh = 0;
  let currentWeekElec = { cost: 0, kwh: 0 };
  let currentWeekGas = { cost: 0, kwh: 0 };
  let dayCount = 0;
  let weekStartLabel = '';

  monthlyData.forEach((m) => {
    // Sanitize input values to ensure they are numbers
    const safeCost = typeof m.cost === 'number' && !isNaN(m.cost) ? m.cost : 0;
    const safeKwh = typeof m.kwh === 'number' && !isNaN(m.kwh) ? m.kwh : 0;

    // Ensure we have split data (either from API or heuristic)
    const split = estimateSplit({ ...m, cost: safeCost, kwh: safeKwh });
    
    // Update the monthly item with the split if it was missing
    if (!m.electricity) m.electricity = split.elec;
    if (!m.gas) m.gas = split.gas;

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
      
      const dailyElec = distributeMetric(split.elec, daysInMonth, variance);
      const dailyGas = distributeMetric(split.gas, daysInMonth, variance);

      // Create daily label like "1 Jan 25"
      const dailyLabel = `${i} ${monthStr}${shortYear ? ` '${shortYear}` : ''}`;

      daily.push({
        label: dailyLabel,
        cost: parseFloat(cost.toFixed(2)),
        kwh: Math.round(kwh * 10) / 10,
        electricity: dailyElec,
        gas: dailyGas
      });

      // Track week start/end
      dayCount++;
      if (dayCount % 7 === 1) {
        weekStartLabel = dailyLabel;
      }

      // Accumulate weekly
      currentWeekCost += cost;
      currentWeekKwh += kwh;
      currentWeekElec.cost += dailyElec.cost;
      currentWeekElec.kwh += dailyElec.kwh;
      currentWeekGas.cost += dailyGas.cost;
      currentWeekGas.kwh += dailyGas.kwh;

      if (dayCount % 7 === 0) {
        weekly.push({
          label: `W${weekly.length + 1}${shortYear ? `'${shortYear}` : ''}`,
          cost: parseFloat(currentWeekCost.toFixed(2)),
          kwh: Math.round(currentWeekKwh),
          electricity: { ...currentWeekElec },
          gas: { ...currentWeekGas },
          dateRange: `${weekStartLabel} - ${dailyLabel}`
        });
        currentWeekCost = 0;
        currentWeekKwh = 0;
        currentWeekElec = { cost: 0, kwh: 0 };
        currentWeekGas = { cost: 0, kwh: 0 };
      }
    }
  });
  
  // Push remaining partial week if any substantial data exists
  if (dayCount % 7 !== 0 && currentWeekCost > 1) {
     const lastMonth = monthlyData[monthlyData.length - 1];
     const parts = lastMonth.label.split(' ');
     const year = parts.length > 1 ? (parts[1].length === 4 ? parts[1].slice(2) : parts[1]) : '';
     const lastDailyLabel = daily.length > 0 ? daily[daily.length - 1].label : '';

     weekly.push({
        label: `W${weekly.length + 1}${year ? `'${year}` : ''}`,
        cost: parseFloat(currentWeekCost.toFixed(2)),
        kwh: Math.round(currentWeekKwh),
        electricity: { ...currentWeekElec },
        gas: { ...currentWeekGas },
        dateRange: `${weekStartLabel} - ${lastDailyLabel}`
      });
  }

  return {
    daily,
    weekly,
    monthly: monthlyData
  };
};
