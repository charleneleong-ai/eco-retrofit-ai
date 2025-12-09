
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, UserType, SourceDoc } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Switching to Gemini 2.5 Flash for faster inference speeds while maintaining high multimodal capability
const MODEL_NAME = 'gemini-2.5-flash';

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
       - GENERATE A FULL 12-MONTH TIMELINE ('monthly' array) representing the last year (or a typical year) based on the data provided. Account for seasonality.
    3. EPC (Energy Performance Certificate):
       - PRIMARY GOAL: Look for an "Energy Rating" or "EPC" on the bill documents or try to infer the REAL rating from the specific address if known/visible.
       - FALLBACK: If no official rating is found, ESTIMATE the EPC rating (A-G) based on visual evidence (insulation thickness, glazing type, boiler age).
       - Provide a numeric score (1-100) if possible.
    4. Identify Inefficiencies: Analyze photos/video for windows, insulation gaps, appliances.
    5. Generate Plan: Create a retrofit/improvement plan tailored STRICTLY to the User Profile.
    6. Benchmarking: Compare against typical homes in the region (infer location from currency/text).
    7. Sources: Cite specific official data sources. 
       CRITICAL - USE ONLY THESE VERIFIED STABLE URLS to avoid broken links (404s):
       - UK OFGEM: "https://www.ofgem.gov.uk/information-consumers"
       - UK Energy Saving Trust: "https://energysavingtrust.org.uk/energy-at-home"
       - UK Government EPC: "https://www.gov.uk/find-energy-certificate"
       - US EIA: "https://www.eia.gov/consumption/residential/"
       - US Energy Saver: "https://www.energy.gov/save"
       If you need to cite another source, use the main homepage URL (e.g., "https://www.bbc.co.uk") rather than a deep link that might rot.

    Output PURE JSON matching the following structure:
    {
      "customerName": "Extracted Name or 'Valued Customer'",
      "address": "Extracted Address or 'Property Address'",
      "auditDate": "Current Date (e.g. Oct 24, 2023)",
      "summary": "Markdown executive summary.",
      "currentMonthlyAvg": number,
      "projectedMonthlyAvg": number,
      "currency": "USD" or "GBP" or "EUR",
      "usageBreakdown": {
        "daily": [{ "label": "Mon", "kwh": 10, "cost": 2.5 }, ...],
        "weekly": [{ "label": "Week 1", "kwh": 70, "cost": 15 }, ...],
        "monthly": [{ "label": "Jan", "kwh": 300, "cost": 80 }, ...] // Must contain 12 months
      },
      "epc": {
        "current": "D",
        "potential": "B",
        "score": 55
      },
      "comparison": {
        "similarHomeAvgCost": number,
        "efficiencyPercentile": number,
        "description": "Comparison text"
      },
      "dataSources": [
        { "title": "Source Name", "url": "https://source.url" }
      ],
      "recommendations": [
        {
          "title": "Short title",
          "description": "Detailed explanation",
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
            usageBreakdown: {
              type: Type.OBJECT,
              properties: {
                daily: { 
                  type: Type.ARRAY, 
                  items: { type: Type.OBJECT, properties: { label: {type: Type.STRING}, kwh: {type: Type.NUMBER}, cost: {type: Type.NUMBER} } }
                },
                weekly: { 
                  type: Type.ARRAY, 
                  items: { type: Type.OBJECT, properties: { label: {type: Type.STRING}, kwh: {type: Type.NUMBER}, cost: {type: Type.NUMBER} } }
                },
                monthly: { 
                  type: Type.ARRAY, 
                  items: { type: Type.OBJECT, properties: { label: {type: Type.STRING}, kwh: {type: Type.NUMBER}, cost: {type: Type.NUMBER} } }
                }
              }
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
          required: ['summary', 'currentMonthlyAvg', 'projectedMonthlyAvg', 'currency', 'recommendations', 'comparison', 'dataSources', 'epc']
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text) as AnalysisResult;
      
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
