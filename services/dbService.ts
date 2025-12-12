
import { SavedAnalysis, AnalysisResult, UserType, FileData, AnalysisVersion } from '../types';

const DB_NAME = 'EcoRetrofitDB';
const STORE_NAME = 'analyses';
const DB_VERSION = 3; // Bump version for schema change

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Database error:", (event.target as IDBOpenDBRequest).error);
      reject("Could not open database");
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      } else {
        // Simple migration strategy: Delete old store if structure is incompatible
        // In prod, we'd iterate and transform.
        db.deleteObjectStore(STORE_NAME);
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveAnalysis = async (
  userType: UserType,
  result: AnalysisResult,
  inputFiles: FileData[],
  existingId?: string | null, // Pass ID to update existing
  selectedRecommendationIndices?: number[]
): Promise<string> => {
  const db = await initDB();
  
  // Default to all selected if not specified
  const defaultIndices = selectedRecommendationIndices 
    ? selectedRecommendationIndices 
    : result.recommendations.map((_, i) => i);

  // Create the new version object
  const newVersion: AnalysisVersion = {
      versionId: crypto.randomUUID(),
      timestamp: Date.now(),
      result,
      inputFiles: inputFiles,
      selectedRecommendationIndices: defaultIndices,
      note: existingId ? 'Updated Analysis' : 'Initial Audit'
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    if (existingId) {
        // --- UPDATE EXISTING ---
        const getRequest = store.get(existingId);
        
        getRequest.onsuccess = () => {
            const data = getRequest.result as SavedAnalysis;
            
            if (data && data.versions) {
                // Determine note based on previous version count
                newVersion.note = `v${data.versions.length + 1}`;
                
                // Add new version to start of array (Newest First)
                data.versions.unshift(newVersion);
                data.updatedAt = Date.now();
                
                const updateRequest = store.put(data);
                updateRequest.onsuccess = () => resolve(existingId);
                updateRequest.onerror = () => reject("Failed to update analysis version");
            } else {
                // Fallback if ID provided but not found or legacy format
                createNewRecord();
            }
        };
        getRequest.onerror = () => createNewRecord();

    } else {
        // --- CREATE NEW ---
        createNewRecord();
    }

    function createNewRecord() {
        const id = crypto.randomUUID();
        newVersion.note = 'v1';
        const record: SavedAnalysis = {
            id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            userType,
            versions: [newVersion]
        };

        const request = store.add(record);
        request.onsuccess = () => resolve(id);
        request.onerror = () => reject("Failed to save new analysis");
    }
  });
};

export const updateAnalysisSelection = async (id: string, selectedIndices: number[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const data = getRequest.result as SavedAnalysis;
      if (data && data.versions && data.versions.length > 0) {
        // Update the LATEST version's selection preference
        data.versions[0].selectedRecommendationIndices = selectedIndices;
        store.put(data);
        resolve();
      } else {
        resolve(); 
      }
    };
    getRequest.onerror = () => reject("Failed to get analysis");
  });
};

export const getAllAnalyses = async (): Promise<SavedAnalysis[]> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by updatedAt descending
      const results = (request.result as SavedAnalysis[]).sort((a, b) => b.updatedAt - a.updatedAt);
      
      // Filter out invalid records (e.g. from old schema versions if any remain)
      const validResults = results.filter(r => r.versions && Array.isArray(r.versions));
      resolve(validResults);
    };
    request.onerror = () => reject("Failed to fetch history");
  });
};

export const deleteAnalysis = async (id: string): Promise<void> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject("Failed to delete record");
  });
};
