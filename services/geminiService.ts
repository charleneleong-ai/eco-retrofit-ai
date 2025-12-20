
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, UserType, SourceDoc, EPCRating, HomeProfile, ComparisonData, UsageBreakdown } from '../types';
import { generateDerivedUsageData } from '../utils';

// Switching to Gemini 2.5 Flash for faster inference speeds while maintaining high multimodal capability
const MODEL_NAME = 'gemini-3-flash-preview';
const IMAGE_MODEL_NAME = 'gemini-2.5-flash-image';
const PRO_IMAGE_MODEL_NAME = 'gemini-3-pro-image-preview';

// Verified Source Library - Single Source of Truth for the AI
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

export const generateRetrofitVisualization = async (
  base64Image: string, 
  retrofitType: string,
  viewAngle: string = 'Front Isometric',
  detailLevel: string = 'Standard',
  mode: 'retrofit' | 'structure' = 'retrofit',
  style: 'Realistic' | 'Clay' | 'Blueprint' = 'Realistic'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isHighDetail = detailLevel === 'High';
  const isStructureMode = mode === 'structure';
  
  let styleInstruction = '';
  switch (style) {
      case 'Clay':
          styleInstruction = 'Render Style: "Clay Render". Pure white/light-grey matte material. Soft ambient occlusion shadows. No textures, just pure form and geometry. Clean, minimalist architectural model look. High contrast ambient occlusion.';
          break;
      case 'Blueprint':
          styleInstruction = 'Render Style: "Architectural Blueprint 3D". Deep blue blueprint background with crisp white technical line work, or white background with distinct black outlines. Orthographic projection style. High precision lines.';
          break;
      case 'Realistic':
      default:
          styleInstruction = 'Render Style: Ultra-Photorealistic Architectural Visualization. 8K resolution, highly detailed textures, physically based rendering (PBR), ray-traced global illumination, soft shadows. Unreal Engine 5 Lumen quality. Focus on material accuracy (wood grain, fabric weave, glass reflections, metal sheen).';
          break;
  }

  let prompt = '';

  if (isStructureMode) {
      prompt = `
        You are a world-class AI Architect and 3D Visualizer.
        Task: Generate a masterpiece quality, high-fidelity ${viewAngle} 3D architectural cutaway of the room/building shown in the input image.
        Input Context: The image is a frame from a walkthrough video or a photo of a home. Use it to accurately infer the structure, room layout, and furniture placement.
        Specific Instructions:
        1. View Angle: ${viewAngle}.
        2. ${styleInstruction}
        3. Geometry & Layout:
           - Accurately represent the inferred layout of the visible rooms.
           - CRITICAL: Show realistic wall thickness.
           - Exclude the ceiling/roof to show the interior (Cutaway view).
        4. Lighting: Soft studio lighting, global illumination.
        5. Background: Clean, solid neutral background.
      `;
  } else {
      prompt = `
        You are a world-class AI Architectural Visualizer. 
        Task: Create a ${isHighDetail ? 'photorealistic, 8K resolution' : 'standard'} 3D visualization of the house in this photo.
        Visualization Goal: Show the effect of: "${retrofitType}".
        Target View Angle: ${viewAngle}.
        Specific Rendering Instructions:
        1. Base Geometry: Use the uploaded photo/frame to infer the 3D structure.
        2. ${styleInstruction}
        3. Retrofit Integration: Ensure "${retrofitType}" is clearly visible.
      `;
  }

  const attemptGeneration = async (model: string, useAdvancedConfig: boolean): Promise<string> => {
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: prompt }
          ]
        },
        config: useAdvancedConfig ? {
            imageConfig: {
                aspectRatio: "4:3", 
            }
        } : undefined
      });

      if (response.candidates && response.candidates[0].content.parts) {
         for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
               return part.inlineData.data;
            }
         }
      }
      throw new Error(`No image generated by model ${model}`);
  };

  try {
    const primaryModel = (isStructureMode || isHighDetail) ? PRO_IMAGE_MODEL_NAME : IMAGE_MODEL_NAME;
    return await attemptGeneration(primaryModel, primaryModel === PRO_IMAGE_MODEL_NAME);
  } catch (error) {
    if ((isStructureMode || isHighDetail)) {
        try {
            return await attemptGeneration(IMAGE_MODEL_NAME, false);
        } catch (fallbackError) {
            throw fallbackError;
        }
    }
    throw error;
  }
};

export const extractEPCData = async (
  file: { mimeType: string; data: string; name?: string }
): Promise<EPCRating> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [{
    inlineData: {
      mimeType: file.mimeType,
      data: file.data
    }
  }];

  const prompt = `
    Analyze this Energy Performance Certificate (EPC).
    Extract the following details:
    1. Current and Potential Energy Rating (A-G).
    2. Current Energy Score (1-100).
    3. Certificate Validity Date (Valid until).
    4. Certificate Number.
    5. Property Type.
    6. Total Floor Area.
    7. Detailed breakdown of features and ratings.
    8. upgradePotentialExplanation.
    Output PURE JSON.
  `;
  
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
            current: { type: Type.STRING },
            potential: { type: Type.STRING },
            score: { type: Type.NUMBER },
            validUntil: { type: Type.STRING },
            certificateNumber: { type: Type.STRING },
            propertyType: { type: Type.STRING },
            totalFloorArea: { type: Type.STRING },
            upgradePotentialExplanation: { type: Type.STRING },
            breakdown: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        rating: { type: Type.STRING }
                    }
                }
            }
          },
          required: ['current', 'potential', 'score']
        }
      }
    });

    if (response.text) {
        const data = JSON.parse(response.text);
        return { ...data, isEstimate: false };
    }
    throw new Error("Failed to extract EPC data");
  } catch (error) {
    throw error;
  }
};

export const updateBenchmark = async (
    currentAnalysis: AnalysisResult, 
    newProfile: HomeProfile
): Promise<ComparisonData> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
        You are a Home Energy Intelligence Engine.
        Refine the comparison between this user and regional averages, incorporating BOTH structural build stock AND living patterns.

        Context:
        Location: ${currentAnalysis.comparison.neighborhoodName || currentAnalysis.address}
        Current User Monthly Cost: ${currentAnalysis.currentMonthlyAvg} ${currentAnalysis.currency}
        
        New Profile Details (Behavioral Context):
        - Occupancy: ${newProfile.occupants} people (Density matters!)
        - Size/Bedrooms: ${newProfile.bedrooms} bedroom(s), ${newProfile.propertyType}
        - Hours at Home: ${newProfile.homeHours} (WFH patterns significantly increase daytime heating/elec baseline)
        - Heating: ${newProfile.heatingType}
        - EV Charging: ${newProfile.hasEV ? 'Yes' : 'No'}
        - Appliances: ${newProfile.appliances.join(', ')} (Analyze the intensity of these specific appliances)

        Task:
        1. Recalculate 'similarHomeAvgCost' and 'efficientHomeCost'.
        2. Write a 'description' explaining how the USER'S LIFESTYLE (hours at home, occupancy density, appliance choice) impacts their ranking compared to the structural average.
        3. Populate 'factors' array. 
           - MANDATORY: Include at least TWO factors focused on "Living Patterns" (e.g., Occupancy Density, Energy Intensity, Home Hours).
           - 'variance' should be a concise insight (e.g., "60% higher occupancy than regional typicals", "Daytime usage increases base heat demand by 15%").

        Output PURE JSON matching schema: ComparisonData.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        similarHomeAvgCost: { type: Type.NUMBER },
                        areaAverageCost: { type: Type.NUMBER },
                        efficientHomeCost: { type: Type.NUMBER },
                        efficiencyPercentile: { type: Type.NUMBER },
                        description: { type: Type.STRING },
                        neighborhoodName: { type: Type.STRING },
                        factors: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING },
                                    userValue: { type: Type.STRING },
                                    localAvg: { type: Type.STRING },
                                    variance: { type: Type.STRING }
                                }
                            }
                        }
                    },
                    required: ['similarHomeAvgCost', 'efficiencyPercentile', 'description', 'factors']
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        throw new Error("Failed to refine benchmark");
    } catch (error) {
        console.error("Benchmark Update Error", error);
        throw error;
    }
}

export const analyzeHomeData = async (
  billFiles: { mimeType: string; data: string; name?: string }[],
  homeImages: string[], 
  videoFiles: { mimeType: string; data: string }[], 
  userType: UserType,
  previousAnalysis?: AnalysisResult | null
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];

  let previousUsageContext = '';
  if (previousAnalysis?.usageBreakdown?.monthly) {
      const simpleHistory = previousAnalysis.usageBreakdown.monthly.map(m => ({
          label: m.label, cost: m.cost, kwh: m.kwh,
          elec: m.electricity ? { kwh: m.electricity.kwh, cost: m.electricity.cost } : undefined,
          gas: m.gas ? { kwh: m.gas.kwh, cost: m.gas.cost } : undefined
      }));
      previousUsageContext = JSON.stringify(simpleHistory);
  }

  const prompt = `
    Expert Home Energy Auditor. Analyze energy bills and visual evidence.
    
    Update Context: ${previousAnalysis ? `PREVIOUS SUMMARY: ${previousAnalysis.summary}` : ''}
    Previous Usage: ${previousUsageContext}

    1. Extract Customer Details.
    2. Analyze Usage & Costs (12-month timeline MMM YY).
    3. EPC: Inferred or official.
    4. Plan: Tailored to ${userType}.
    5. Benchmarking: Compare build stock AND living patterns (occupancy, hours, appliance density).
    6. Spatial Layout Inference.
    7. Citations: Use VERIFIED SOURCE LIBRARY URLs.

    === VERIFIED SOURCE LIBRARY ===
    ${VERIFIED_SOURCES_LIBRARY}
    ===============================
       
    Output PURE JSON.
  `;

  billFiles.forEach(file => parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } }));
  homeImages.forEach(base64 => parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } }));
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
            monthlyUsage: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: {type: Type.STRING}, kwh: {type: Type.NUMBER}, cost: {type: Type.NUMBER}, electricity: {type: Type.OBJECT, properties: {kwh: {type: Type.NUMBER}, cost: {type: Type.NUMBER}}}, gas: {type: Type.OBJECT, properties: {kwh: {type: Type.NUMBER}, cost: {type: Type.NUMBER}}}} } },
            epc: { type: Type.OBJECT, properties: { current: { type: Type.STRING }, potential: { type: Type.STRING }, score: { type: Type.NUMBER }, isEstimate: { type: Type.BOOLEAN }, validUntil: { type: Type.STRING }, certificateNumber: { type: Type.STRING }, propertyType: { type: Type.STRING }, totalFloorArea: { type: Type.STRING }, upgradePotentialExplanation: { type: Type.STRING }, breakdown: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, rating: { type: Type.STRING } } } } }, required: ['current', 'potential', 'score', 'isEstimate'] },
            homeProfile: { type: Type.OBJECT, properties: { propertyType: { type: Type.STRING }, bedrooms: { type: Type.NUMBER }, occupants: { type: Type.NUMBER }, homeHours: { type: Type.STRING }, heatingType: { type: Type.STRING }, hasEV: { type: Type.BOOLEAN }, appliances: { type: Type.ARRAY, items: { type: Type.STRING } } } },
            spatialLayout: { type: Type.OBJECT, properties: { rooms: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, type: { type: Type.STRING }, dimensions: { type: Type.OBJECT, properties: { width: { type: Type.NUMBER }, depth: { type: Type.NUMBER } } }, features: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, name: { type: Type.STRING }, position: { type: Type.STRING } } } } } } } } },
            comparison: { type: Type.OBJECT, properties: { similarHomeAvgCost: { type: Type.NUMBER }, areaAverageCost: { type: Type.NUMBER }, efficientHomeCost: { type: Type.NUMBER }, efficiencyPercentile: { type: Type.NUMBER }, description: { type: Type.STRING }, neighborhoodName: { type: Type.STRING }, factors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, userValue: { type: Type.STRING }, localAvg: { type: Type.STRING }, variance: { type: Type.STRING } } } } }, required: ['similarHomeAvgCost', 'efficiencyPercentile', 'description'] },
            dataSources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, url: { type: Type.STRING } }, required: ['title', 'url'] } },
            recommendations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, estimatedCost: { type: Type.STRING }, estimatedAnnualSavings: { type: Type.STRING }, impact: { type: Type.STRING }, category: { type: Type.STRING } }, required: ['title', 'description', 'estimatedCost', 'estimatedAnnualSavings', 'impact', 'category'] } }
          },
          required: ['summary', 'currentMonthlyAvg', 'projectedMonthlyAvg', 'currency', 'recommendations', 'comparison', 'dataSources', 'epc', 'monthlyUsage']
        }
      }
    });

    if (response.text) {
      const rawResult = JSON.parse(response.text);
      const usageBreakdown = generateDerivedUsageData(rawResult.monthlyUsage || []);
      const result: AnalysisResult = { ...rawResult, usageBreakdown };
      delete (result as any).monthlyUsage;
      result.sourceDocuments = [...(previousAnalysis?.sourceDocuments || []), ...billFiles.map(f => ({ name: f.name || 'Bill', type: 'pdf' as const })), ...videoFiles.map((v, i) => ({ name: `Video ${i+1}`, type: 'video' as const }))];
      return result;
    }
    throw new Error("No data returned from Gemini.");
  } catch (error) {
    throw error;
  }
};

export const chatWithCopilot = async (
  history: { role: 'user' | 'model', text: string }[],
  newMessage: string,
  contextData: AnalysisResult
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = `EcoRetrofit Copilot. Analysis: ${contextData.customerName}, Address: ${contextData.address}, Monthly: ${contextData.currentMonthlyAvg}, Savings: ${contextData.currentMonthlyAvg - contextData.projectedMonthlyAvg}.`;
  const chatSession = ai.chats.create({
    model: MODEL_NAME,
    config: { systemInstruction: context },
    history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] }))
  });
  const result = await chatSession.sendMessage({ message: newMessage });
  return result.text || "I couldn't generate a response.";
};
