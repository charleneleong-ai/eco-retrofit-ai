
import { SavedAnalysis, AnalysisResult, UserType, FileData } from '../types';

const DB_NAME = 'EcoRetrofitDB';
const STORE_NAME = 'analyses';
const DB_VERSION = 1;

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
      }
    };
  });
};

export const saveAnalysis = async (
  userType: UserType,
  result: AnalysisResult,
  billFiles: FileData[],
  selectedRecommendationIndices?: number[]
): Promise<string> => {
  const db = await initDB();
  
  // Create a unique ID
  const id = crypto.randomUUID();
  
  // Default to all selected if not specified
  const defaultIndices = selectedRecommendationIndices 
    ? selectedRecommendationIndices 
    : result.recommendations.map((_, i) => i);

  const record: SavedAnalysis = {
    id,
    date: Date.now(),
    userType,
    result,
    billFiles,
    selectedRecommendationIndices: defaultIndices
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(record);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject("Failed to save analysis");
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
      if (data) {
        data.selectedRecommendationIndices = selectedIndices;
        store.put(data);
        resolve();
      } else {
        // Silently fail if ID not found (e.g. demo data not in DB yet)
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
      // Sort by date descending
      const results = (request.result as SavedAnalysis[]).sort((a, b) => b.date - a.date);
      resolve(results);
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
