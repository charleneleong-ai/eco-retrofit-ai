
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, UserType, SourceDoc, EPCRating, HomeProfile, ComparisonData } from '../types';
import { generateDerivedUsageData } from '../utils';

// Switching to Gemini 2.5 Flash for faster inference speeds while maintaining high multimodal capability
const MODEL_NAME = 'gemini-2.5-flash';
const IMAGE_MODEL_NAME = 'gemini-2.5-flash-image';
const PRO_IMAGE_MODEL_NAME = 'gemini-3-pro-image-preview';

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

export const generateRetrofitVisualization = async (
  base64Image: string, 
  retrofitType: string,
  viewAngle: string = 'Front Isometric', // Default
  detailLevel: string = 'Standard', // Standard or High
  mode: 'retrofit' | 'structure' = 'retrofit', // New parameter for 3D model generation
  style: 'Realistic' | 'Clay' | 'Blueprint' = 'Realistic' // New style parameter
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
           - If 'Top-Down Plan': Generate a clean, orthogonal 3D floor plan cutaway (section cut at 1.5m height) with realistic furniture and floor textures.
           - If 'Front Isometric' or Rotated: Generate a sharp 3D isometric cutaway view.
        2. ${styleInstruction}
        3. Geometry & Layout:
           - Accurately represent the inferred layout of the visible rooms (Living Room, Kitchen, etc.).
           - CRITICAL: Show realistic wall thickness (solid walls, not thin planes).
           - Exclude the ceiling/roof to show the interior (Cutaway view).
           - Furniture should be highly detailed models, not blocky approximations.
        4. Lighting: Soft studio lighting, global illumination. No dark shadows.
        5. Background: Clean, solid neutral background (white or light grey).
      `;
  } else {
      prompt = `
        You are a world-class AI Architectural Visualizer. 
        Task: Create a ${isHighDetail ? 'photorealistic, 8K resolution' : 'standard'} 3D visualization of the house in this photo.
        
        Visualization Goal: Show the effect of: "${retrofitType}".
        Target View Angle: ${viewAngle}.
        
        Specific Rendering Instructions:
        1. Base Geometry: Use the uploaded photo/frame to infer the 3D structure with high precision.
        2. ${styleInstruction}
        3. Retrofit Integration:
           - Ensure "${retrofitType}" is clearly visible and integrated into the design with realistic materials.
           - If 'Insulation': Show a detailed cross-section or cutaway revealing the insulation layers (e.g. pink fiberglass, rigid foam) in the wall/roof.
           - If 'Heat Pump': Show the unit installed on the exterior/interior with accurate piping and branding details.
      `;
  }

  // Internal function to attempt generation with specific model and config
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
                // Removed imageSize: "2K" to prevent 500 Internal Errors during image-to-image tasks
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
    // 1. Try with the preferred model (Pro if high detail, else Flash)
    const primaryModel = (isStructureMode || isHighDetail) ? PRO_IMAGE_MODEL_NAME : IMAGE_MODEL_NAME;
    return await attemptGeneration(primaryModel, primaryModel === PRO_IMAGE_MODEL_NAME);
  } catch (error) {
    console.warn("Primary visualization attempt failed:", error);
    
    // 2. Fallback Mechanism
    // If the Pro model failed (e.g., 500 Internal Error), try the standard Flash model
    if ((isStructureMode || isHighDetail)) {
        try {
            console.log("Attempting fallback to Gemini 2.5 Flash Image...");
            return await attemptGeneration(IMAGE_MODEL_NAME, false);
        } catch (fallbackError) {
            console.error("Fallback visualization also failed:", fallbackError);
            throw fallbackError;
        }
    }
    
    // If it was not the Pro model or both failed
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
    7. The breakdown of property's energy performance features (Wall, Window, Main heating, etc.) with their ratings.
    8. 'upgradePotentialExplanation': 
       - If Current Rating equals Potential Rating: Analyze the 'breakdown' to explain WHY. Is it because the property is already efficient (features rated Good/Very Good)? Or are there constraints (e.g. Electric heating penalties, Listed building status, physical inability to insulate)? Provide a concise explanation.
       - If they differ: Briefly summarize the key upgrades needed to reach the potential.

    Output PURE JSON matching the schema.
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
        // Explicitly set isEstimate to false since this is an extraction from an official doc
        return { ...data, isEstimate: false };
    }
    throw new Error("Failed to extract EPC data");
  } catch (error) {
    console.error("EPC Extraction Error:", error);
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
        Refine the neighborhood benchmark comparison based on Updated Home Profile constraints.

        Context:
        Location: ${currentAnalysis.comparison.neighborhoodName || currentAnalysis.address}
        Current User Monthly Cost: ${currentAnalysis.currentMonthlyAvg} ${currentAnalysis.currency}
        
        New Profile Details:
        - Occupancy: ${newProfile.occupants} people
        - Size/Bedrooms: ${newProfile.bedrooms} bedroom(s), ${newProfile.propertyType}
        - Hours at Home: ${newProfile.homeHours}
        - Heating: ${newProfile.heatingType}
        - EV Charging: ${newProfile.hasEV ? 'Yes' : 'No'}
        - Appliances: ${newProfile.appliances.join(', ')}

        Task:
        1. Estimate a new 'similarHomeAvgCost' for this SPECIFIC profile in this location. 
        2. Estimate 'efficientHomeCost': What would the monthly cost be for a Top 20% efficient home with this same profile?
        3. Estimate 'areaAverageCost': What is the broad average for ALL homes of this size in this area (regardless of profile specifics)?
        4. Recalculate 'efficiencyPercentile' (0-100).
        5. Write a new 'description' explaining the variance based on these specific factors.
        6. Update the 'factors' array.
           - IMPORTANT: 'variance' should be a SHORT sentence/phrase (max 10-12 words) explaining the context (e.g. "Higher usage due to WFH", "Consistent with typical 1-bed", "Lower than avg occupancy"). Do NOT use single words like 'Higher' or 'Match'.

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
  videoFiles: { mimeType: string; data: string }[], // Updated to accept multiple videos
  userType: UserType,
  previousAnalysis?: AnalysisResult | null
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];

  const updateContext = previousAnalysis 
    ? `IMPORTANT: This is an UPDATE to an existing analysis. 
       Previous Summary: ${previousAnalysis.summary}
       Previous Address: ${previousAnalysis.address || 'Unknown'}
       Previous Customer Name: ${previousAnalysis.customerName || 'Unknown'}
       Merge the new files/info with the previous findings. 
       PRESERVE the customer name "${previousAnalysis.customerName}" unless the new files clearly indicate a different name (e.g. a bill with a different name).
       If the new files are just more bills, refine the cost estimates. If they are new photos, refine the retrofit plan.
       IF THE NEW FILE IS AN OFFICIAL EPC CERTIFICATE, EXTRACT THE EXACT RATINGS AND SET 'isEstimate' TO FALSE. ALSO EXTRACT THE FULL BREAKDOWN TABLE AND METADATA.`
    : '';

  const prompt = `
    You are an expert Home Energy Auditor and Retrofit Planner. 
    Analyze the provided energy bills (images/PDFs), home photos, and walkthrough videos.
    
    ${updateContext}

    User Profile: ${userType === 'renter' 
      ? 'RENTER. Constraints: You CANNOT recommend structural changes (no wall insulation, no new windows, no solar panels on roof). Focus on: Window films, heavy curtains, draft excluders, portable induction hobs, smart plugs, behavioral changes, and specific things to ask the landlord for.' 
      : 'HOMEOWNER. Focus on: Property value increase, ROI of deep retrofits, heat pumps, solar PV, wall/loft insulation, and window replacement.'}

    1. Extract Customer Details: Look for the customer Name and Property Address on the bills.
       - IF UPDATING: Use the previous name unless you see a new one.
       - IF NEW: If no name is found, default to 'Valued Customer'.
    2. Analyze Usage & Costs: 
       - Identify patterns (e.g., winter peaks). 
       - GENERATE A FULL 12-MONTH TIMELINE of monthly totals ('monthlyUsage' array) representing the last year (or a typical year) based on the data provided. 
       - IMPORTANT: The 'monthlyUsage' array MUST contain exactly 12 items. If you have fewer bills, infer missing months based on seasonality. If you have more bills, use the most recent 12 months.
       - IMPORTANT: The 'label' for each month MUST be in the format "MMM YY" (e.g., "Jan 24", "Feb 24").
       - CRITICAL: Separate 'electricity' and 'gas' usage if available on the bill.
    3. EPC (Energy Performance Certificate):
       - PRIMARY GOAL: Look for an "Energy Rating" or "EPC" on the bill documents or try to infer the REAL rating from the specific address if known/visible.
       - FALLBACK: If no official rating is found, ESTIMATE the EPC rating (A-G) based on visual evidence (insulation thickness, glazing type, boiler age).
       - Provide a numeric score (1-100) if possible.
       - Set 'isEstimate' to TRUE if you inferred it, or FALSE if you found an official document or valid record.
       - IF AN OFFICIAL DOCUMENT IS FOUND: Extract 'validUntil', 'certificateNumber', 'propertyType', 'totalFloorArea', and the detailed 'breakdown' of features (Wall, Window, Main heating, etc.).
    4. Identify Inefficiencies: Analyze photos/video for windows, insulation gaps, appliances.
    5. Generate Plan: Create a retrofit/improvement plan tailored STRICTLY to the User Profile.
    6. Benchmarking: Compare against typical homes in the region (infer location from currency/text).
       - Calculate 'similarHomeAvgCost' based on size/type.
       - Calculate 'efficientHomeCost' (Top 20% target).
       - Calculate 'areaAverageCost' (Broad average).
    7. Sources & Citations (STRICT RULE): 
       - You MUST cite sources for every recommendation using bracketed numbers like [1], [2].
       - The 'dataSources' array in your JSON output MUST be populated by selecting the MOST RELEVANT URL from the "VERIFIED SOURCE LIBRARY" below.
       - DO NOT hallucinate URLs. Use EXACTLY the URLs provided in the library.

    8. Neighborhood Intelligence (NEW):
       - Estimate the 'neighborhoodName' (e.g. "Islington, London") based on address.
       - Populate 'homeProfile' object with inferred or default data (e.g. Property type from photos, occupancy inferred from usage or default to 2).
       - Populate 'factors' array in comparison object with:
         - 'Build Type': User's home vs Local Avg.
         - 'Size': User's home vs Local Avg.
         - 'Occupancy': User occupancy vs Local Avg.
         - 'Heating': User's system vs Standard.
         - IMPORTANT: 'variance' field should be a SHORT sentence/phrase (max 10-12 words) explaining the context/impact (e.g. "Higher usage due to WFH", "Consistent with typical 1-bed", "Matches area standard"). Do NOT use single words like 'Match' or 'Higher'.
       
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
        { 
            "label": "Jan 24", 
            "kwh": 300, 
            "cost": 80, 
            "electricity": { "kwh": 100, "cost": 30 },
            "gas": { "kwh": 200, "cost": 50 } 
        }, ...
      ],
      "epc": {
        "current": "D",
        "potential": "B",
        "score": 55,
        "isEstimate": boolean,
        "validUntil": "22 July 2034",
        "certificateNumber": "0000-0000-...",
        "propertyType": "Semi-detached house",
        "totalFloorArea": "85 square metres",
        "upgradePotentialExplanation": "Brief explanation...",
        "breakdown": [
           { "name": "Wall", "description": "Cavity wall, filled", "rating": "Good" },
           { "name": "Window", "description": "Single glazed", "rating": "Very Poor" }
        ]
      },
      "homeProfile": {
          "propertyType": "Semi-detached",
          "bedrooms": 3,
          "occupants": 2,
          "homeHours": "Evenings & Weekends",
          "heatingType": "Gas Boiler",
          "hasEV": false,
          "appliances": ["Washing Machine", "Dishwasher"]
      },
      "comparison": {
        "similarHomeAvgCost": number,
        "areaAverageCost": number,
        "efficientHomeCost": number,
        "efficiencyPercentile": number,
        "description": "Comparison text with citations like [1] or [3].",
        "neighborhoodName": "String",
        "factors": [
           { "label": "Build Type", "userValue": "String", "localAvg": "String", "variance": "Contextual insight string" },
           { "label": "Size", "userValue": "String", "localAvg": "String", "variance": "Contextual insight string" }
        ]
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

  // Add Videos (Updated to handle multiple)
  videoFiles.forEach(video => {
    parts.push({
        inlineData: {
            mimeType: video.mimeType,
            data: video.data
        }
    });
  });

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
              items: { 
                  type: Type.OBJECT, 
                  properties: { 
                      label: {type: Type.STRING}, 
                      kwh: {type: Type.NUMBER}, 
                      cost: {type: Type.NUMBER},
                      electricity: {
                          type: Type.OBJECT,
                          properties: { kwh: {type: Type.NUMBER}, cost: {type: Type.NUMBER} }
                      },
                      gas: {
                          type: Type.OBJECT,
                          properties: { kwh: {type: Type.NUMBER}, cost: {type: Type.NUMBER} }
                      }
                  } 
              }
            },
            epc: {
              type: Type.OBJECT,
              properties: {
                current: { type: Type.STRING },
                potential: { type: Type.STRING },
                score: { type: Type.NUMBER },
                isEstimate: { type: Type.BOOLEAN },
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
              required: ['current', 'potential', 'score', 'isEstimate']
            },
            homeProfile: {
                type: Type.OBJECT,
                properties: {
                    propertyType: { type: Type.STRING },
                    bedrooms: { type: Type.NUMBER },
                    occupants: { type: Type.NUMBER },
                    homeHours: { type: Type.STRING },
                    heatingType: { type: Type.STRING },
                    hasEV: { type: Type.BOOLEAN },
                    appliances: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            },
            comparison: {
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
      
      videoFiles.forEach((v, i) => {
        currentSources.push({ name: `Video ${i+1}`, type: 'video' });
      });
      
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const context = `
    Context from analysis:
    Customer: ${contextData.customerName}
    Address: ${contextData.address}
    Current Monthly Cost: ${contextData.currentMonthlyAvg} ${contextData.currency}
    Projected Monthly Cost: ${contextData.projectedMonthlyAvg} ${contextData.currency}
    Estimated EPC: ${contextData.epc?.current} -> ${contextData.epc?.potential} (Is Estimate: ${contextData.epc?.isEstimate})
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
