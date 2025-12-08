import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, UserType } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using Gemini 3 Pro Preview for complex multimodal reasoning
const MODEL_NAME = 'gemini-3-pro-preview';

export const analyzeHomeData = async (
  billFiles: { mimeType: string; data: string }[],
  homeImages: string[],
  videoData: string | null,
  videoMimeType: string | null,
  userType: UserType
): Promise<AnalysisResult> => {
  
  const parts: any[] = [];

  const prompt = `
    You are an expert Home Energy Auditor and Retrofit Planner. 
    Analyze the provided energy bills (images/PDFs), home photos, and walkthrough video.
    
    User Profile: ${userType === 'renter' 
      ? 'RENTER. Constraints: You CANNOT recommend structural changes (no wall insulation, no new windows, no solar panels on roof). Focus on: Window films, heavy curtains, draft excluders, portable induction hobs, smart plugs, behavioral changes, and specific things to ask the landlord for.' 
      : 'HOMEOWNER. Focus on: Property value increase, ROI of deep retrofits, heat pumps, solar PV, wall/loft insulation, and window replacement.'}

    1. Identify the current energy usage patterns and costs from the bills.
    2. Analyze the photos and video for inefficiencies (windows, insulation gaps, appliances, lighting).
    3. Generate a retrofit/improvement plan tailored STRICTLY to the User Profile defined above.
    4. Compare this home's usage against typical homes in the same region/climate (infer location from currency/text on bills).
    5. Cite specific data sources for your benchmarks. For each source, provide the 'title' and a valid 'url' (e.g. to the agency website, statistics report, or official guidance page).
    
    Output PURE JSON matching the following structure:
    {
      "summary": "A friendly, markdown-formatted executive summary of the findings.",
      "currentMonthlyAvg": number (estimated current monthly cost),
      "projectedMonthlyAvg": number (estimated cost after improvements),
      "currency": "USD" or "GBP" or "EUR" detected from bills,
      "comparison": {
        "similarHomeAvgCost": number (benchmark cost for similar home),
        "efficiencyPercentile": number (0-100, where 100 is top 1% most efficient),
        "description": "Short comparison text e.g. 'You use 20% more energy than similar 2-bed apartments in this area.'"
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
            summary: { type: Type.STRING },
            currentMonthlyAvg: { type: Type.NUMBER },
            projectedMonthlyAvg: { type: Type.NUMBER },
            currency: { type: Type.STRING },
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
          required: ['summary', 'currentMonthlyAvg', 'projectedMonthlyAvg', 'currency', 'recommendations', 'comparison', 'dataSources']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
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
    Current Monthly Cost: ${contextData.currentMonthlyAvg} ${contextData.currency}
    Projected Monthly Cost: ${contextData.projectedMonthlyAvg} ${contextData.currency}
    Neighborhood Benchmark: ${contextData.comparison.description} (Avg: ${contextData.comparison.similarHomeAvgCost})
    Data Sources: ${contextData.dataSources.map(d => d.title + ' (' + d.url + ')').join(', ')}
    Summary: ${contextData.summary}
    Recommendations: ${JSON.stringify(contextData.recommendations)}
  `;

  // Map history to the format expected by the SDK
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