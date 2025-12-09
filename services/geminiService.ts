
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, UserType, SourceDoc } from '../types';
import { generateDerivedUsageData } from '../utils';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Switching to Gemini 2.5 Flash for faster inference speeds while maintaining high multimodal capability
const MODEL_NAME = 'gemini-2.5-flash';

// Verified Source Library - Single Source of Truth for the AI
// UPDATED: Consolidated appliance links to active 'home-appliances' page to prevent 404s
const VERIFIED_SOURCES_LIBRARY = `
CATEGORY: WINDOWS & DOORS
- Draught Proofing: "https://energysavingtrust.org.uk/advice/draught-proofing/"
- Windows & Doors Advice: "https://energysavingtrust.org.uk/advice/windows-and-doors/"

CATEGORY: INSULATION
- Roof & Loft Insulation: "https://energysavingtrust.org.uk/advice/roof-and-loft-insulation/"
- Cavity Wall Insulation: "https://energysavingtrust.org.uk/advice/cavity-wall-insulation/"
- Solid Wall Insulation: "https://energysavingtrust.org.uk/advice/solid-wall-insulation/"
- Floor Insulation: "https://energysavingtrust.org.uk/advice/floor-insulation/"
- Tank & Pipe Insulation: "https://energysavingtrust.org.uk/advice/insulating-tanks-pipes-and-radiators/"

CATEGORY: HEATING & HOT WATER
- Thermostats & Controls: "https://energysavingtrust.org.uk/advice/thermostats-and-heating-controls/"
- Air Source Heat Pumps: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/"
- Ground Source Heat Pumps: "https://energysavingtrust.org.uk/advice/ground-source-heat-pumps/"
- Boilers: "https://energysavingtrust.org.uk/advice/boilers/"
- Radiators: "https://energysavingtrust.org.uk/advice/radiators/"
- Electric Heating: "https://energysavingtrust.org.uk/advice/electric-heating/"

CATEGORY: APPLIANCES & LIFESTYLE
- Home Appliances (Kitchen/Laundry): "https://energysavingtrust.org.uk/advice/home-appliances/"
- Lighting: "https://energysavingtrust.org.uk/advice/lighting/"
- Smart Meters: "https://energysavingtrust.org.uk/advice/guide-to-smart-meters/"
- Fixing Damp & Condensation: "https://energysavingtrust.org.uk/advice/fixing-damp-and-condensation/"

CATEGORY: RENEWABLES
- Solar Panels (PV): "https://energysavingtrust.org.uk/advice/solar-panels/"
- Solar Water Heating: "https://energysavingtrust.org.uk/advice/solar-water-heating/"

CATEGORY: GENERAL & BENCHMARKS
- OFGEM Average Usage: "https://www.ofgem.gov.uk/information-consumers/energy-advice-households/average-gas-and-electricity-use-explained"
- EPC Certificate Search: "https://www.gov.uk/find-energy-certificate"
- London Building Stock Model: "https://data.london.gov.uk/dataset/london-building-stock-model"
`;

export const analyzeHomeData = async (
  billFiles: { mimeType: string; data: string; name?: string }[],
  homeImages: string[],
  videoData: string | null,
  videoMimeType: string | null,
  userType: UserType,
  previousAnalysis?: AnalysisResult | null
): Promise<AnalysisResult> => {
  
  const parts: any[] = [];

  const updateContext = previousAnalysis 
    ? `IMPORTANT: This is an UPDATE to an existing analysis. 
       Previous Summary: ${previousAnalysis.summary}
       Previous Address: ${previousAnalysis.address || 'Unknown'}
       Merge the new files/info with the previous findings. If the new files are just more bills, refine the cost estimates. If they are new photos, refine the retrofit plan.`
    : '';

  const prompt = `
    You are an expert Home Energy Auditor and Retrofit Planner. 
    Analyze the provided energy bills (images/PDFs), home photos, and walkthrough video.
    
    ${updateContext}

    User Profile: ${userType === 'renter' 
      ? 'RENTER. Constraints: You CANNOT recommend structural changes (no wall insulation, no new windows, no solar panels on roof). Focus on: Window films, heavy curtains, draft excluders, portable induction hobs, smart plugs, behavioral changes, and specific things to ask the landlord for.' 
      : 'HOMEOWNER. Focus on: Property value increase, ROI of deep retrofits, heat pumps, solar PV, wall/loft insulation, and window replacement.'}

    1. Extract Customer Details: Look for the customer Name and Property Address on the bills.
    2. Analyze Usage & Costs: 
       - Identify patterns (e.g., winter peaks). 
       - GENERATE A FULL 12-MONTH TIMELINE of monthly totals ('monthlyUsage' array) representing the last year (or a typical year) based on the data provided. 
       - IMPORTANT: The 'monthlyUsage' array MUST contain exactly 12 items. If you have fewer bills, infer missing months based on seasonality. If you have more bills, use the most recent 12 months.
       - IMPORTANT: The 'label' for each month MUST be in the format "MMM YY" (e.g., "Jan 24", "Feb 24").
    3. EPC (Energy Performance Certificate):
       - PRIMARY GOAL: Look for an "Energy Rating" or "EPC" on the bill documents or try to infer the REAL rating from the specific address if known/visible.
       - FALLBACK: If no official rating is found, ESTIMATE the EPC rating (A-G) based on visual evidence (insulation thickness, glazing type, boiler age).
       - Provide a numeric score (1-100) if possible.
    4. Identify Inefficiencies: Analyze photos/video for windows, insulation gaps, appliances.
    5. Generate Plan: Create a retrofit/improvement plan tailored STRICTLY to the User Profile.
    6. Benchmarking: Compare against typical homes in the region (infer location from currency/text).
    7. Sources & Citations (STRICT RULE): 
       - You MUST cite sources for every recommendation using bracketed numbers like [1], [2].
       - The 'dataSources' array in your JSON output MUST be populated by selecting the MOST RELEVANT URL from the "VERIFIED SOURCE LIBRARY" below.
       - DO NOT hallucinate URLs. Use EXACTLY the URLs provided in the library.
       
    === VERIFIED SOURCE LIBRARY ===
    ${VERIFIED_SOURCES_LIBRARY}
    ===============================
       
    Output PURE JSON matching the following structure:
    {
      "customerName": "Extracted Name or 'Valued Customer'",
      "address": "Extracted Address or 'Property Address'",
      "auditDate": "Current Date (e.g. Oct 24, 2023)",
      "summary": "Markdown executive summary.",
      "currentMonthlyAvg": number,
      "projectedMonthlyAvg": number,
      "currency": "USD" or "GBP" or "EUR",
      "monthlyUsage": [
        { "label": "Jan 24", "kwh": 300, "cost": 80 }, ...
      ],
      "epc": {
        "current": "D",
        "potential": "B",
        "score": 55
      },
      "comparison": {
        "similarHomeAvgCost": number,
        "efficiencyPercentile": number,
        "description": "Comparison text with citations like [1] or [3]."
      },
      "dataSources": [
        { "title": "Exact Title from Library", "url": "Exact URL from Library" }
      ],
      "recommendations": [
        {
          "title": "Short title",
          "description": "Detailed explanation with citations like [2].",
          "estimatedCost": "Range string",
          "estimatedAnnualSavings": "Range string",
          "impact": "High" | "Medium" | "Low",
          "category": "Insulation" | "Heating" | "Solar" | "Behavioral" | "Windows"
        }
      ]
    }
  `;

  // Add Bills
  billFiles.forEach(file => {
    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    });
  });

  // Add Home Photos
  homeImages.forEach(base64 => {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64
      }
    });
  });

  // Add Video
  if (videoData && videoMimeType) {
    parts.push({
      inlineData: {
        mimeType: videoMimeType,
        data: videoData
      }
    });
  }

  // Add Prompt
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            address: { type: Type.STRING },
            auditDate: { type: Type.STRING },
            summary: { type: Type.STRING },
            currentMonthlyAvg: { type: Type.NUMBER },
            projectedMonthlyAvg: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            monthlyUsage: { 
              type: Type.ARRAY, 
              items: { type: Type.OBJECT, properties: { label: {type: Type.STRING}, kwh: {type: Type.NUMBER}, cost: {type: Type.NUMBER} } }
            },
            epc: {
              type: Type.OBJECT,
              properties: {
                current: { type: Type.STRING },
                potential: { type: Type.STRING },
                score: { type: Type.NUMBER }
              },
              required: ['current', 'potential', 'score']
            },
            comparison: {
              type: Type.OBJECT,
              properties: {
                similarHomeAvgCost: { type: Type.NUMBER },
                efficiencyPercentile: { type: Type.NUMBER },
                description: { type: Type.STRING }
              },
              required: ['similarHomeAvgCost', 'efficiencyPercentile', 'description']
            },
            dataSources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING }
                },
                required: ['title', 'url']
              }
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  estimatedCost: { type: Type.STRING },
                  estimatedAnnualSavings: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                  category: { type: Type.STRING, enum: ['Insulation', 'Heating', 'Solar', 'Behavioral', 'Windows'] },
                },
                required: ['title', 'description', 'estimatedCost', 'estimatedAnnualSavings', 'impact', 'category']
              }
            }
          },
          required: ['summary', 'currentMonthlyAvg', 'projectedMonthlyAvg', 'currency', 'recommendations', 'comparison', 'dataSources', 'epc', 'monthlyUsage']
        }
      }
    });

    if (response.text) {
      const rawResult = JSON.parse(response.text);
      
      // Programmatically generate daily and weekly breakdowns from the monthly data
      const usageBreakdown = generateDerivedUsageData(rawResult.monthlyUsage || []);
      
      const result: AnalysisResult = {
        ...rawResult,
        usageBreakdown // Inject the generated granular data
      };
      // Remove the temp property to match strict types if needed, though optional properties are fine.
      delete (result as any).monthlyUsage;
      
      // Capture source documents using new type
      const currentSources: SourceDoc[] = [];
      
      billFiles.forEach(f => {
        currentSources.push({ 
          name: f.name || 'Uploaded Bill', 
          type: 'pdf' 
        });
      });
      
      if (videoData) {
        currentSources.push({ name: 'Walkthrough Video', type: 'video' });
      }
      
      if (homeImages.length > 0) {
        homeImages.forEach((_, i) => {
           currentSources.push({ name: `Home Photo ${i+1}`, type: 'image' });
        });
      }

      // Merge with previous analysis sources if updating
      const previousSources = previousAnalysis?.sourceDocuments || [];
      
      // Merge and remove duplicates based on name
      const allSources = [...previousSources, ...currentSources];
      const uniqueSourcesMap = new Map();
      allSources.forEach(src => uniqueSourcesMap.set(src.name, src));
      
      result.sourceDocuments = Array.from(uniqueSourcesMap.values());

      return result;
    } else {
      throw new Error("No data returned from Gemini.");
    }
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const chatWithCopilot = async (
  history: { role: 'user' | 'model', text: string }[],
  newMessage: string,
  contextData: AnalysisResult
): Promise<string> => {
  
  const context = `
    Context from analysis:
    Customer: ${contextData.customerName}
    Address: ${contextData.address}
    Current Monthly Cost: ${contextData.currentMonthlyAvg} ${contextData.currency}
    Projected Monthly Cost: ${contextData.projectedMonthlyAvg} ${contextData.currency}
    Estimated EPC: ${contextData.epc?.current} -> ${contextData.epc?.potential}
    Neighborhood Benchmark: ${contextData.comparison.description} (Avg: ${contextData.comparison.similarHomeAvgCost})
    Data Sources: ${contextData.dataSources.map(d => d.title + ' (' + d.url + ')').join(', ')}
    Summary: ${contextData.summary}
    Recommendations: ${JSON.stringify(contextData.recommendations)}
  `;

  const historyContent = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  const chatSession = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: `You are EcoRetrofit Copilot. Use this analysis context: ${context}`
    },
    history: historyContent
  });

  const result = await chatSession.sendMessage({ message: newMessage });
  return result.text || "I couldn't generate a response.";
};
