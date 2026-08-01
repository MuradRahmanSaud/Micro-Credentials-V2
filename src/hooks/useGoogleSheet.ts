import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

interface UseGoogleSheetOptions {
  gid: string;
  localStorageKey: string;
  fallbackHeaders: string[];
}

const getDbOverrides = () => {
  try {
    const saved = localStorage.getItem("settings_data");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const link = parsed.find((r: any) => r.Title === "Google Sheet Link")?.Content || "";
        const api = parsed.find((r: any) => r.Title === "Apps Script API")?.Content || "";
        
        let spreadsheetId = "";
        if (link) {
          const match = link.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match) {
            spreadsheetId = match[1];
          }
        }
        
        return {
          spreadsheetId,
          appsScriptUrl: api
        };
      }
    }
  } catch (e) {}
  return { spreadsheetId: "", appsScriptUrl: "" };
};

const getStaggerDelay = (gid: string): number => {
  const gids = [
    "0",          // Workforce / Employee
    "1972051572", // Settings
    "1120624852", // Course
    "1111164355", // MC Batch
    "880522927",  // Class Routine Slots
    "732376789",  // Documents
    "1007542549", // Expenses
    "1686458334", // Workflow
    "84557637"    // Program Name
  ];
  const idx = gids.indexOf(String(gid));
  if (idx !== -1) return idx * 250;
  
  // Simple hashing as fallback for other GIDs
  let hash = 0;
  const str = String(gid);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 8) * 250;
};

const parseCSV = (csvText: string): string[][] => {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      row.push(currentVal);
      lines.push(row);
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (row.length > 0 || currentVal !== '') {
    row.push(currentVal);
    lines.push(row);
  }
  return lines;
};

export function useGoogleSheet({ gid, localStorageKey, fallbackHeaders }: UseGoogleSheetOptions) {
  const [data, setData] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  const [sheetHeaders, setSheetHeaders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(localStorageKey + "_headers");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return fallbackHeaders;
  });

  const [isLoading, setIsLoading] = useState(true);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const fetchData = useCallback(async (isManual = false) => {
    // Only show loading spinner on manual refresh or initial load
    if (isManual || dataRef.current.length === 0) {
      setIsLoading(true);
    }

    // Stagger automatic initial fetches to avoid concurrent 429 rate limit spikes on container/proxy
    if (!isManual) {
      const delay = getStaggerDelay(gid);
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    try {
      const { spreadsheetId, appsScriptUrl } = getDbOverrides();
      const headers: Record<string, string> = {};
      if (spreadsheetId) headers["x-spreadsheet-id"] = spreadsheetId;
      if (appsScriptUrl) headers["x-apps-script-url"] = appsScriptUrl;

      let receivedData: any;
      try {
        const response = await axios.get(`/api/data?gid=${gid}${isManual ? "&force=true" : ""}`, {
          headers
        });
        receivedData = response.data;
      } catch (apiErr: any) {
        console.warn(`API fetch failed for GID ${gid}, attempting direct client fallback...`, apiErr.message);
        try {
          const targetSpreadsheetId = spreadsheetId || "1zpDWjuTLdSIdZ8GCICEo6EFs962kAkBk1TpIPDvmZwc";
          const directCsvUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/export?format=csv&gid=${gid}`;
          const directResponse = await axios.get(directCsvUrl, { timeout: 12000 });
          if (directResponse && directResponse.data) {
            receivedData = parseCSV(directResponse.data);
            console.log(`Successfully recovered data for GID ${gid} via direct client fallback.`);
          } else {
            throw apiErr;
          }
        } catch (fallbackErr: any) {
          console.error(`Direct fallback also failed for GID ${gid}:`, fallbackErr.message);
          throw apiErr; // propagate the original api error so we don't wipe out cache
        }
      }

      if (typeof receivedData === "string") {
        try {
          receivedData = JSON.parse(receivedData);
        } catch (e) {}
      }

      const transformData = (raw: any): any[] => {
        const findArray = (obj: any): any[] | null => {
          if (Array.isArray(obj)) return obj;
          if (!obj || typeof obj !== "object") return null;
          const commonKeys = ["content", "data", "records", "rows", "values", "result", "items"];
          for (const key of commonKeys) {
            if (Array.isArray(obj[key])) return obj[key];
          }
          return null;
        };

        const dataArr = findArray(raw);
        if (!dataArr || dataArr.length === 0) return [];

        if (Array.isArray(dataArr[0])) {
          const headers = dataArr[0].map((h) => String(h).trim()).filter((h) => h !== "");
          return dataArr
            .slice(1)
            .filter((row) => Array.isArray(row) && row.length > 0)
            .map((row) => {
              const obj: any = {};
              headers.forEach((h: string, i: number) => {
                const val = row[i];
                obj[h] = val === null || val === undefined ? "" : val;
              });
              return obj;
            });
        }
        return dataArr;
      };

      const normalized = transformData(receivedData);
      setData(normalized);
      localStorage.setItem(localStorageKey, JSON.stringify(normalized));

      // Extract original headers from fetched data to prevent client pollution
      let actualHeaders: string[] = [];
      const findArray = (obj: any): any[] | null => {
        if (Array.isArray(obj)) return obj;
        if (!obj || typeof obj !== "object") return null;
        const commonKeys = ["content", "data", "records", "rows", "values", "result", "items"];
        for (const key of commonKeys) {
          if (Array.isArray(obj[key])) return obj[key];
        }
        return null;
      };
      const dataArr = findArray(receivedData);
      if (dataArr && dataArr.length > 0) {
        if (Array.isArray(dataArr[0])) {
          actualHeaders = dataArr[0].map((h) => String(h).trim()).filter((h) => h !== "");
        } else {
          actualHeaders = Object.keys(dataArr[0]);
        }
      }
      if (actualHeaders.length > 0) {
        setSheetHeaders(actualHeaders);
        localStorage.setItem(localStorageKey + "_headers", JSON.stringify(actualHeaders));
      }
    } catch (error) {
      console.error(`Error fetching sheet GID ${gid}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [gid, localStorageKey]);

  // Polling setup
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 600000); // 10 minutes
    return () => clearInterval(interval);
  }, [fetchData]);

  const saveRow = useCallback(async (formData: any, editingRow: any | null, idKey: string) => {
    const previousData = [...dataRef.current];

    // Set local optimistic state first using a functional update to queue multiple updates correctly
    setData((prev) => {
      let newData: any[];
      if (editingRow && editingRow[idKey] !== undefined) {
        // Optimized mapping for large datasets
        // To avoid overwriting multiple rows when idKey is not globally unique, 
        // we prefer object equality or full stringify match if multiple rows share the same idValue
        const matchingIndices = prev.reduce((acc, row, idx) => {
          if (String(row[idKey]) === String(editingRow[idKey])) acc.push(idx);
          return acc;
        }, [] as number[]);

        if (matchingIndices.length === 1) {
          // Unique match
          newData = prev.map((row, idx) =>
            idx === matchingIndices[0] ? { ...row, ...formData } : row
          );
        } else if (matchingIndices.length > 1) {
          // Multiple matches: try to find exact object or deep equal match
          const exactIdx = prev.findIndex(row => row === editingRow || JSON.stringify(row) === JSON.stringify(editingRow));
          if (exactIdx !== -1) {
            newData = prev.map((row, idx) => idx === exactIdx ? { ...row, ...formData } : row);
          } else {
            // Fallback to updating the first match (matches backend behavior)
            newData = prev.map((row, idx) =>
              idx === matchingIndices[0] ? { ...row, ...formData } : row
            );
          }
        } else {
          newData = prev.map((row) =>
            String(row[idKey]) === String(editingRow[idKey]) ? { ...row, ...formData } : row
          );
        }
      } else {
        newData = [formData, ...prev];
      }
      localStorage.setItem(localStorageKey, JSON.stringify(newData));
      return newData;
    });

    // Fire and forget the sync (with background retry/revert logic if needed)
    // We don't await this if we want maximum perceived speed, but for data integrity 
    // we keep the try/catch. The caller can choose to await if they need sequentiality.
    try {
      const { spreadsheetId, appsScriptUrl } = getDbOverrides();
      const headers: Record<string, string> = {};
      if (spreadsheetId) headers["x-spreadsheet-id"] = spreadsheetId;
      if (appsScriptUrl) headers["x-apps-script-url"] = appsScriptUrl;

      const response = await axios.post("/api/proxy", {
        action: editingRow ? "UPDATE" : "ADD",
        data: formData,
        gid,
        ...(editingRow && { idKey, idValue: editingRow[idKey] })
      }, {
        headers
      });

      if (response.data && response.data.success === false) {
        console.warn("Proxy save returned warning:", response.data);
      }
    } catch (error) {
      console.warn("Proxy save background sync warning (local save retained):", error);
    }
  }, [gid, localStorageKey]);

  const deleteRow = useCallback(async (row: any, idKey: string) => {
    if (row[idKey] === undefined) {
      console.warn(`Delete failed: No value for key ${idKey} found in row`, row);
      return;
    }

    const previousData = [...dataRef.current];
    const targetId = row[idKey];

    // Optimistic local update with functional state updates to prevent race conditions
    setData((prev) => {
      const newData = prev.filter((r) => String(r[idKey]) !== String(targetId));
      localStorage.setItem(localStorageKey, JSON.stringify(newData));
      return newData;
    });

    try {
      const { spreadsheetId, appsScriptUrl } = getDbOverrides();
      const headers: Record<string, string> = {};
      if (spreadsheetId) headers["x-spreadsheet-id"] = spreadsheetId;
      if (appsScriptUrl) headers["x-apps-script-url"] = appsScriptUrl;

      const response = await axios.post("/api/proxy", {
        action: "DELETE",
        idKey,
        idValue: targetId,
        gid,
        data: row,
        id: targetId 
      }, {
        headers
      });

      if (response.data && response.data.success === false) {
        console.warn("Proxy delete returned warning:", response.data);
      }
    } catch (error) {
      console.warn("Proxy delete background sync warning (local change retained):", error);
    }
  }, [gid, localStorageKey]);

  const headers = (sheetHeaders.length > 0 ? sheetHeaders : fallbackHeaders)
    .filter(h => !h.endsWith(" L1") && !h.endsWith(" L2") && h !== "Publication Workflow");

  return {
    data,
    setData,
    headers,
    isLoading,
    fetchData,
    saveRow,
    deleteRow
  };
}
