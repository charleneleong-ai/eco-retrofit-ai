
import { UsageMetric, UsageBreakdown, FuelMetric } from './types';

export const getCurrencySymbol = (code: string) => {
  const c = code ? code.toUpperCase().trim() : '';
  if (c === 'GBP' || c === 'POUND' || c === 'POUNDS' || c === 'UKP') return '£';
  if (c === 'USD' || c === 'DOLLAR' || c === 'DOLLARS' || c === 'US') return '$';
  if (c === 'EUR' || c === 'EURO' || c === 'EUROS') return '€';
  // Check if it's already a symbol
  if (['£', '$', '€', '¥'].includes(c)) return c;
  return code || '$';
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      if (result && result.includes(',')) {
          const base64 = result.split(',')[1];
          resolve(base64);
      } else {
          reject(new Error("Failed to read file data"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const extractFrameFromVideo = (videoFile: File): Promise<string> => {
  return new Promise((resolve) => {
    // Safety timeout: if video processing hangs for > 3s, resolve empty
    const timeoutId = setTimeout(() => {
        console.warn("Video frame extraction timed out");
        resolve('');
    }, 3000);

    const video = document.createElement('video');
    video.preload = 'auto'; 
    video.muted = true;
    video.playsInline = true;
    
    const fileURL = URL.createObjectURL(videoFile);
    video.src = fileURL;

    const cleanup = () => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(fileURL);
        video.remove();
    };

    video.onloadeddata = () => {
        // Seek to 10% or 1s to avoid black start frames
        const seekTime = Math.min(1, video.duration * 0.1) || 0;
        video.currentTime = seekTime;
    };

    video.onseeked = () => {
        try {
            const canvas = document.createElement('canvas');
            const maxDim = 1024;
            const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
            canvas.width = video.videoWidth * scale;
            canvas.height = video.videoHeight * scale;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                // 0.7 quality is sufficient for AI analysis
                const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
                cleanup();
                resolve(base64);
            } else {
                cleanup();
                resolve('');
            }
        } catch (e) {
            console.error("Frame capture error", e);
            cleanup();
            resolve('');
        }
    };

    video.onerror = () => {
        const err = video.error;
        const code = err ? err.code : 'unknown';
        const msg = err ? err.message : 'No message';
        console.warn(`Video load error for ${videoFile.name}: Code ${code} - ${msg}`);
        cleanup();
        resolve(''); // Resolve empty to allow analysis to continue without this video frame
    };

    // Explicitly trigger load
    video.load();
  });
};

// --- MINI 3D ENGINE ---

interface Point3D { x: number, y: number, z: number }
interface Point2D { x: number, y: number }
interface Face {
    points: Point2D[];
    fill: string;
    stroke?: string;
    zIndex: number;
    type?: 'light' | 'shutter' | 'label' | 'wall-top' | 'screen'; 
    text?: string;
    center?: Point2D;
}

const project = (p: Point3D, angleY: number, angleX: number, zoom: number, centerX: number, centerY: number): Point2D => {
    // 1. Rotation Y (Horizontal spin)
    const radY = angleY * Math.PI / 180;
    const x1 = p.x * Math.cos(radY) - p.z * Math.sin(radY);
    const z1 = p.x * Math.sin(radY) + p.z * Math.cos(radY);
    const y1 = p.y;

    // 2. Rotation X (Tilt/Pitch) - around X axis
    const radX = angleX * Math.PI / 180;
    const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);
    const z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX);
    const x2 = x1;

    // 3. Projection (Orthographic + Zoom)
    return {
        x: centerX + x2 * zoom,
        y: centerY + y2 * zoom
    };
};

const createBlock = (x: number, z: number, w: number, d: number, h: number, color: string, topColor?: string): { faces: any[], centerZ: number } => {
    // Vertices
    // World Coords: x (left/right), y (up/down height), z (depth)
    const vs: Point3D[] = [
        { x: x, y: 0, z: z },         // 0 Front-Left Bottom
        { x: x + w, y: 0, z: z },     // 1 Front-Right Bottom
        { x: x + w, y: 0, z: z + d }, // 2 Back-Right Bottom
        { x: x, y: 0, z: z + d },     // 3 Back-Left Bottom
        { x: x, y: h, z: z },         // 4 Front-Left Top
        { x: x + w, y: h, z: z },     // 5 Front-Right Top
        { x: x + w, y: h, z: z + d }, // 6 Back-Right Top
        { x: x, y: h, z: z + d },     // 7 Back-Left Top
    ];

    const baseColor = color; 
    
    // Improved Shading Logic for "Clay" Look
    // Light coming from Top-Left-Front
    const shade = (col: string, normal: 'top' | 'front' | 'side' | 'back' | 'bottom') => {
        // Simple manual shading
        if (col === '#334155') return normal === 'top' ? '#475569' : normal === 'front' ? '#334155' : '#1e293b'; // Slate
        if (col === '#1e293b') return normal === 'top' ? '#334155' : '#0f172a'; // Dark Slate
        if (col === '#ffffff') return normal === 'top' ? '#ffffff' : normal === 'front' ? '#f1f5f9' : '#e2e8f0'; // White
        if (col === '#f8fafc') return normal === 'top' ? '#ffffff' : normal === 'front' ? '#f8fafc' : '#f1f5f9'; // Off-white walls
        if (col === '#e2e8f0') return normal === 'top' ? '#f1f5f9' : normal === 'front' ? '#e2e8f0' : '#cbd5e1'; // Floor
        if (col === '#64748b') return normal === 'top' ? '#94a3b8' : normal === 'front' ? '#64748b' : '#475569'; // Sofa
        if (col === '#9f1239') return normal === 'top' ? '#be123c' : normal === 'front' ? '#9f1239' : '#881337'; // Rose/Red
        if (col === '#eab308') return normal === 'top' ? '#facc15' : normal === 'front' ? '#eab308' : '#ca8a04'; // Yellow
        if (col === '#27272a') return normal === 'top' ? '#3f3f46' : '#18181b'; // Zinc/Black
        
        return col;
    }

    const faces = [
        { pts: [vs[4], vs[5], vs[6], vs[7]], color: topColor || shade(baseColor, 'top'), type: 'wall-top' }, // Top
        { pts: [vs[0], vs[1], vs[5], vs[4]], color: shade(baseColor, 'front') }, // Front
        { pts: [vs[1], vs[2], vs[6], vs[5]], color: shade(baseColor, 'side') }, // Right
        { pts: [vs[2], vs[3], vs[7], vs[6]], color: shade(baseColor, 'back') }, // Back
        { pts: [vs[3], vs[0], vs[4], vs[7]], color: shade(baseColor, 'side') }, // Left
    ];

    return { faces, centerZ: z + d/2 };
};

const createScreen = (x: number, z: number, w: number, h: number, y: number, color: string): { faces: any[], centerZ: number } => {
    // Thin glowing screen
    return createBlock(x, z, w, 2, h, '#18181b', color); // Black body, colored top (screen face)
}

// New Helper for Lights/Fairy lights
const createFairyLights = (x: number, z: number, length: number, height: number): { faces: any[], centerZ: number } => {
    const faces = [];
    const numLights = 12;
    const spacing = length / numLights;
    
    for(let i=0; i<numLights; i++) {
        const lx = x + (i * spacing);
        const ly = height + Math.cos(i * 0.5) * 8; // Draping effect
        const lz = z;
        
        // Simple diamond shape for light
        const size = 1.5;
        const pts = [
            { x: lx, y: ly + size, z: lz },
            { x: lx + size, y: ly, z: lz },
            { x: lx, y: ly - size, z: lz },
            { x: lx - size, y: ly, z: lz }
        ];
        
        faces.push({ pts, color: '#fef08a', type: 'light' }); // Yellow-200 glow
    }
    return { faces, centerZ: z };
}

export const generateDemoFloorPlan = (rotationDeg: number = 45, tiltDeg: number = 55, zoom: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) { resolve(''); return; }

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1024, 768);
        
        // Grid
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1;
        for(let i=0; i<1024; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,768); ctx.stroke(); }
        for(let i=0; i<768; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(1024,i); ctx.stroke(); }

        const cx = 512;
        const cy = 350; 
        
        // RECONSTRUCTED GEOMETRY BASED ON VIDEO FRAMES
        const ox = -300; 
        const oz = -200;

        const blocks = [];
        const labels = [];

        // === 1. LIVING ROOM / KITCHEN (Main Area) ===
        // Floor (Light Wood laminate)
        blocks.push(createBlock(ox, oz, 400, 300, 2, '#e2e8f0')); 
        labels.push({ text: "LIVING / KITCHEN", x: ox + 200, z: oz + 150, y: 10 });

        // -- Walls (Outer Shell) --
        // Back wall (with Window)
        blocks.push(createBlock(ox, oz, 400, 10, 90, '#f8fafc', '#cbd5e1'));
        // Left wall (Solid)
        blocks.push(createBlock(ox, oz, 10, 300, 90, '#f8fafc', '#cbd5e1'));
        // Right wall (Partial - opening to Hall)
        blocks.push(createBlock(ox + 390, oz, 10, 300, 90, '#f8fafc', '#cbd5e1'));

        // -- Kitchen Area (Dark Grey/Black Cabinets) --
        // Corner Unit (Back Left)
        blocks.push(createBlock(ox + 10, oz + 10, 140, 40, 70, '#27272a', '#3f3f46')); // Back counter
        blocks.push(createBlock(ox + 10, oz + 50, 40, 100, 70, '#27272a', '#3f3f46')); // Side counter (L-shape)
        // Upper Cabinets
        blocks.push(createBlock(ox + 10, oz + 10, 140, 20, 40, '#3f3f46', '#52525b')); // Upper - floating higher (y handled in creation logic usually, simplistic stacking here)
        // Fridge (Silver/Grey)
        blocks.push(createBlock(ox + 150, oz + 10, 40, 40, 130, '#94a3b8', '#cbd5e1'));

        // -- Workspace (The Desk with Monitors) --
        // Desk (Wood top, white legs) - Positioned near back wall/window
        blocks.push(createBlock(ox + 220, oz + 30, 100, 40, 50, '#d6d3d1')); 
        // Dual Monitors (Black, Glowing Blue)
        blocks.push(createScreen(ox + 230, oz + 40, 30, 25, 60, '#3b82f6')); // Screen 1
        blocks.push(createScreen(ox + 270, oz + 35, 30, 25, 60, '#60a5fa')); // Screen 2 (angled slightly)
        // Chair (White)
        blocks.push(createBlock(ox + 250, oz + 80, 30, 30, 40, '#f1f5f9'));

        // -- Lounge Area --
        // Grey Sofa (L-Shape or large 3-seater) - Front Left
        blocks.push(createBlock(ox + 30, oz + 180, 120, 60, 25, '#64748b')); // Main seat
        blocks.push(createBlock(ox + 20, oz + 180, 10, 60, 40, '#64748b')); // Armrest
        blocks.push(createBlock(ox + 150, oz + 180, 10, 60, 40, '#64748b')); // Armrest
        blocks.push(createBlock(ox + 30, oz + 240, 120, 10, 50, '#64748b')); // Back
        // Red Throw Blanket
        blocks.push(createBlock(ox + 50, oz + 190, 40, 40, 26, '#9f1239')); 

        // White Coffee Table (Oval-ish)
        blocks.push(createBlock(ox + 60, oz + 120, 60, 40, 20, '#ffffff'));

        // Fairy Lights (Along the left wall top)
        blocks.push(createFairyLights(ox + 20, oz + 20, 250, 80));

        // === 2. HALLWAY ===
        const hx = ox + 400; // Right of Living Room
        const hz = oz + 100;
        
        // Floor
        blocks.push(createBlock(hx, hz, 120, 300, 2, '#f1f5f9')); // Tiled/Laminate
        labels.push({ text: "HALL", x: hx + 60, z: hz + 150, y: 10 });

        // White Doors
        // Bedroom Door (Right side of hall)
        blocks.push(createBlock(hx + 110, hz + 50, 5, 60, 140, '#ffffff', '#e2e8f0'));
        // Bathroom Door (Right side further down)
        blocks.push(createBlock(hx + 110, hz + 200, 5, 60, 140, '#ffffff', '#e2e8f0'));
        
        // Shoe Rack / Coat Area (Left side)
        blocks.push(createBlock(hx + 10, hz + 150, 30, 80, 60, '#ffffff')); // Cabinet
        blocks.push(createBlock(hx + 15, hz + 160, 20, 20, 61, '#3b82f6')); // Bag/Item

        // === 3. BEDROOM (Off Hallway Right) ===
        const bx = hx + 120;
        const bz = hz;
        
        // Floor
        blocks.push(createBlock(bx, bz, 200, 180, 2, '#e2e8f0')); // Carpet
        labels.push({ text: "BEDROOM", x: bx + 100, z: bz + 90, y: 10 });

        // Walls
        blocks.push(createBlock(bx, bz, 200, 10, 90, '#f8fafc', '#cbd5e1')); // Back
        blocks.push(createBlock(bx, bz, 10, 180, 90, '#f8fafc', '#cbd5e1')); // Left shared
        blocks.push(createBlock(bx + 190, bz, 10, 180, 90, '#f8fafc', '#cbd5e1')); // Right

        // Bed (Distinct Red/Yellow bedding from video)
        blocks.push(createBlock(bx + 40, bz + 40, 120, 100, 25, '#ffffff')); // Base
        blocks.push(createBlock(bx + 40, bz + 40, 120, 80, 26, '#9f1239')); // Red Duvet
        blocks.push(createBlock(bx + 50, bz + 120, 40, 20, 30, '#eab308')); // Yellow Pillow 1
        blocks.push(createBlock(bx + 110, bz + 120, 40, 20, 30, '#eab308')); // Yellow Pillow 2

        // Wardrobe (White/Glass)
        blocks.push(createBlock(bx + 150, bz + 10, 40, 100, 130, '#f1f5f9', '#ffffff'));

        // === 4. BATHROOM (Off Hallway Right, Below Bedroom) ===
        const bathX = hx + 120;
        const bathZ = bz + 190;
        
        // Floor (Grey Tile)
        blocks.push(createBlock(bathX, bathZ, 160, 110, 2, '#94a3b8'));
        labels.push({ text: "BATH", x: bathX + 80, z: bathZ + 55, y: 10 });

        // Walls
        blocks.push(createBlock(bathX + 150, bathZ, 10, 110, 90, '#f8fafc', '#cbd5e1')); // Right

        // Bathtub (White)
        blocks.push(createBlock(bathX + 10, bathZ + 10, 140, 50, 35, '#ffffff'));
        
        // Sink
        blocks.push(createBlock(bathX + 100, bathZ + 80, 40, 30, 50, '#ffffff'));

        // --- RENDER ---
        
        let allFaces: Face[] = [];
        
        blocks.forEach(block => {
            block.faces.forEach(face => {
                const projPts = face.pts.map((p: Point3D) => project({x: p.x, y: -p.y, z: p.z}, rotationDeg, tiltDeg, zoom, cx, cy));
                
                const radY = rotationDeg * Math.PI / 180;
                let zSum = 0;
                face.pts.forEach((p: Point3D) => {
                    // Simple depth sorting approximation
                    const zRotated = p.x * Math.sin(radY) + p.z * Math.cos(radY);
                    zSum += zRotated;
                });
                
                allFaces.push({
                    points: projPts,
                    fill: face.color,
                    zIndex: zSum / face.pts.length,
                    stroke: 'rgba(0,0,0,0.05)',
                    type: face.type,
                    text: face.text, // Pass text through
                    center: face.center
                });
            });
        });

        // Add labels
        labels.forEach(l => {
            const center = project({x: l.x, y: -(l.y || 2), z: l.z}, rotationDeg, tiltDeg, zoom, cx, cy);
            const radY = rotationDeg * Math.PI / 180;
            const zIndex = l.x * Math.sin(radY) + l.z * Math.cos(radY);
            
            allFaces.push({
                points: [],
                fill: '#000',
                zIndex: zIndex,
                type: 'label',
                text: l.text,
                center: center
            });
        });

        allFaces.sort((a, b) => a.zIndex - b.zIndex);

        allFaces.forEach(f => {
            if (f.type === 'label' && f.text && f.center) {
                ctx.fillStyle = 'rgba(30, 41, 59, 0.7)'; // Dark slate
                ctx.font = 'bold 11px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(f.text, f.center.x, f.center.y);
            } else {
                ctx.beginPath();
                if (f.points.length > 0) {
                    ctx.moveTo(f.points[0].x, f.points[0].y);
                    for(let i=1; i<f.points.length; i++) ctx.lineTo(f.points[i].x, f.points[i].y);
                    ctx.closePath();
                    
                    if (f.type === 'light') {
                        ctx.shadowColor = '#fcd34d';
                        ctx.shadowBlur = 15;
                        ctx.fillStyle = f.fill;
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    } else if (f.type === 'screen') {
                        ctx.shadowColor = f.fill;
                        ctx.shadowBlur = 10;
                        ctx.fillStyle = f.fill;
                        ctx.fill();
                        ctx.shadowBlur = 0;
                        // Add detail line for screen bezel
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    } else {
                        ctx.fillStyle = f.fill;
                        ctx.fill();
                        ctx.strokeStyle = f.stroke || 'rgba(0,0,0,0.05)';
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
        });

        resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
    });
};

export const formatCurrency = (value: number, currency: string = '$') => {
  const symbol = getCurrencySymbol(currency);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: symbol === '£' ? 'GBP' : symbol === '€' ? 'EUR' : 'USD', // Fallback for Intl if symbol passed
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value).replace(/[A-Z]{3}/, symbol); // Ensure symbol is used if Intl defaults to code
};

export const parseSavingsValue = (savingsStr: string): number => {
  try {
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

const estimateSplit = (totalMetric: UsageMetric): { elec: FuelMetric, gas: FuelMetric } => {
    if (totalMetric.electricity && totalMetric.gas) {
        return { elec: totalMetric.electricity, gas: totalMetric.gas };
    }

    const monthStr = totalMetric.label.split(' ')[0];
    const winterMonths = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const isWinter = winterMonths.includes(monthStr);

    const gasRatio = isWinter ? 0.65 : 0.20; 
    
    const elecKwh = totalMetric.kwh * (1 - gasRatio);
    const gasKwh = totalMetric.kwh * gasRatio;
    
    const priceUnit = totalMetric.cost / ((3 * elecKwh) + gasKwh);
    const elecCost = 3 * elecKwh * priceUnit;
    const gasCost = gasKwh * priceUnit;

    return {
        elec: { kwh: elecKwh, cost: elecCost },
        gas: { kwh: gasKwh, cost: gasCost }
    };
};

// Deterministic pseudo-random number generator
const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
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

  monthlyData.forEach((m, mIndex) => {
    const safeCost = typeof m.cost === 'number' && !isNaN(m.cost) ? m.cost : 0;
    const safeKwh = typeof m.kwh === 'number' && !isNaN(m.kwh) ? m.kwh : 0;

    const split = estimateSplit({ ...m, cost: safeCost, kwh: safeKwh });
    
    if (!m.electricity) m.electricity = split.elec;
    if (!m.gas) m.gas = split.gas;

    const daysInMonth = 30;
    const dailyBaseCost = safeCost / daysInMonth;
    const dailyBaseKwh = safeKwh / daysInMonth;
    
    const labelParts = m.label.split(' ');
    const monthStr = labelParts[0];
    const yearStr = labelParts.length > 1 ? labelParts[1] : '';
    const shortYear = yearStr.length === 4 ? yearStr.slice(2) : yearStr;

    for (let i = 1; i <= daysInMonth; i++) {
      // Use seeded random for consistent daily variance
      const seed = (mIndex + 1) * 100 + i;
      const variance = 0.7 + seededRandom(seed) * 0.6;
      
      const cost = dailyBaseCost * variance;
      const kwh = dailyBaseKwh * variance;
      
      const dailyElec = distributeMetric(split.elec, daysInMonth, variance);
      const dailyGas = distributeMetric(split.gas, daysInMonth, variance);

      const dailyLabel = `${i} ${monthStr}${shortYear ? ` '${shortYear}` : ''}`;

      daily.push({
        label: dailyLabel,
        cost: parseFloat(cost.toFixed(2)),
        kwh: Math.round(kwh * 10) / 10,
        electricity: dailyElec,
        gas: dailyGas
      });

      dayCount++;
      if (dayCount % 7 === 1) {
        weekStartLabel = dailyLabel;
      }

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

  return { daily, weekly, monthly: monthlyData };
};
