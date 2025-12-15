
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
    let finalId = existingId || crypto.randomUUID();

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
                
                store.put(data);
                finalId = existingId;
            } else {
                // Fallback if ID provided but not found or legacy format
                createNewRecord(store, finalId);
            }
        };
        getRequest.onerror = () => createNewRecord(store, finalId);

    } else {
        // --- CREATE NEW ---
        createNewRecord(store, finalId);
    }

    function createNewRecord(store: IDBObjectStore, id: string) {
        newVersion.note = 'v1';
        const record: SavedAnalysis = {
            id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            userType,
            versions: [newVersion]
        };
        store.add(record);
    }

    // Wait for transaction to complete to ensure data is persisted
    transaction.oncomplete = () => resolve(finalId);
    transaction.onerror = () => reject("Failed to save analysis");
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
      }
    };
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject("Failed to update selection");
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
    store.delete(id);

    // Use oncomplete to ensure the delete is committed before resolving
    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject(`Failed to delete record: ${e}`);
    transaction.onabort = (e) => reject(`Transaction aborted: ${e}`);
  });
};

export const deleteAnalysisVersion = async (analysisId: string, versionId: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(analysisId);

    getRequest.onsuccess = () => {
      const data = getRequest.result as SavedAnalysis;
      if (!data) return; // Transaction will complete successfully with no action

      // Filter out the specific version
      const updatedVersions = data.versions.filter(v => v.versionId !== versionId);

      if (updatedVersions.length === 0) {
        // No versions left, delete the whole record
        store.delete(analysisId);
      } else {
        // Update with remaining versions
        data.versions = updatedVersions;
        // Update timestamp to the timestamp of the new "latest" version
        if (updatedVersions[0]) {
            data.updatedAt = updatedVersions[0].timestamp;
        }
        store.put(data);
      }
    };

    // Wait for transaction to complete
    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject(`Failed to delete version: ${e}`);
  });
};
