import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function resolveNamesOrIdsToIds(valueStr: string, employees: any[]): string[] {
  if (!valueStr) return [];
  const parts = valueStr.split(',').map(p => p.trim()).filter(Boolean);
  return parts.map(part => {
    // Try matching ID
    const foundById = employees.find(e => String(e['Employee ID'] || '').trim() === part);
    if (foundById) return String(foundById['Employee ID']);

    // Try matching Name
    const foundByName = employees.find(e => String(e['Employee Name'] || '').trim().toLowerCase() === part.toLowerCase());
    if (foundByName) return String(foundByName['Employee ID']);

    return part; // fallback
  }).filter(Boolean);
}

export function resolveIdsToNames(ids: string[], employees: any[]): string {
  if (!ids || ids.length === 0) return '';
  return ids.map(id => {
    const emp = employees.find(e => String(e['Employee ID'] || '').trim() === String(id).trim());
    return emp ? String(emp['Employee Name']).trim() : id;
  }).filter(Boolean).join(', ');
}

export async function compressImage(file: File, maxWidth = 400): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(blob => {
          if (!blob) return resolve(file);
          // Always upload as JPEG to save space
          const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
          resolve(new File([blob], newName, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.7);
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export function extractFolderId(input: string): string {
  if (!input) return "";
  const match = input.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If it's not a URL, assume it's already a raw folder ID and return it trimmed
  if (!input.includes("/")) {
    return input.trim();
  }
  return "";
}

export function getDbOverridesHeaders(): Record<string, string> {
  try {
    const saved = localStorage.getItem("settings_data");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const link = parsed.find((r: any) => r.Title === "Google Sheet Link")?.Content || "";
        const api = parsed.find((r: any) => r.Title === "Apps Script API")?.Content || "";
        const driveLoc = parsed.find((r: any) => r.Title === "Drive Location")?.Content || "";
        
        let spreadsheetId = "";
        if (link) {
          const match = link.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match) {
            spreadsheetId = match[1];
          }
        }
        
        const folderId = extractFolderId(driveLoc);
        
        const headers: Record<string, string> = {};
        if (spreadsheetId) headers["x-spreadsheet-id"] = spreadsheetId;
        if (api) headers["x-apps-script-url"] = api;
        if (folderId) headers["x-drive-folder-id"] = folderId;
        return headers;
      }
    }
  } catch (e) {}
  return {};
}

export interface RemarkEntry {
  id: string;
  date: string;
  employeeName: string;
  text: string;
}

export const parseRemarks = (remarksStr: any): RemarkEntry[] => {
  if (!remarksStr) return [];
  if (typeof remarksStr === 'string') {
    try {
      const parsed = JSON.parse(remarksStr);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      return [{
        id: 'legacy',
        date: new Date().toISOString().split('T')[0],
        employeeName: 'System',
        text: remarksStr
      }];
    }
  }
  if (Array.isArray(remarksStr)) return remarksStr;
  return [];
};

export function formatToMmmDdYyyy(val: any): string {
  if (val == null || typeof val === "number" || typeof val === "boolean") {
    return String(val ?? "");
  }
  const str = String(val).trim();
  if (!str) return "";

  // Check if it strictly matches YYYY-MM-DD or YYYY/MM/DD
  const matchYmd = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (matchYmd) {
    const year = parseInt(matchYmd[1], 10);
    const month = parseInt(matchYmd[2], 10) - 1; // 0-indexed
    const day = parseInt(matchYmd[3], 10);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (month >= 0 && month < 12 && day >= 1 && day <= 31 && year >= 1970 && year <= 2100) {
      const monthStr = months[month];
      const dayStr = String(day).padStart(2, '0');
      return `${monthStr} ${dayStr}, ${year}`;
    }
  }

  // Check if it matches ISO date time or timestamp
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    // Only format strings that have standard separators to avoid treating random words as dates
    const hasSeparators = /[-/.]/.test(str) || /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(str);
    if (hasSeparators) {
      try {
        const d = new Date(timestamp);
        const year = d.getFullYear();
        if (year >= 1970 && year <= 2100) {
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const monthStr = months[d.getMonth()];
          const dayStr = String(d.getDate()).padStart(2, '0');
          return `${monthStr} ${dayStr}, ${year}`;
        }
      } catch (e) {}
    }
  }

  return str;
}

export function parseDateToMidnight(val: any, isEndOfDay = false): Date | null {
  if (val == null) return null;
  const str = String(val).trim();
  if (!str) return null;

  let year: number, month: number, day: number;

  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const matchYmd = str.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})/);
  if (matchYmd) {
    year = parseInt(matchYmd[1], 10);
    month = parseInt(matchYmd[2], 10) - 1;
    day = parseInt(matchYmd[3], 10);
  } else {
    // Pattern 2: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
    const matchDmy = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})/);
    if (matchDmy) {
      day = parseInt(matchDmy[1], 10);
      month = parseInt(matchDmy[2], 10) - 1;
      year = parseInt(matchDmy[3], 10);
    } else {
      // Fallback Date.parse
      const ts = Date.parse(str);
      if (isNaN(ts)) return null;
      const d = new Date(ts);
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    }
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (year < 1970 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) return null;

  const res = new Date(year, month, day);
  if (isEndOfDay) {
    res.setHours(23, 59, 59, 999);
  } else {
    res.setHours(0, 0, 0, 0);
  }
  return res;
}

export function isBatchRunning(batch: any): boolean {
  if (!batch) return false;
  const startVal = batch["Start Date"] || batch["startDate"] || batch["start_date"];
  const endVal = batch["End Date"] || batch["endDate"] || batch["end_date"];

  if (!startVal || !endVal) return false;

  const startDate = parseDateToMidnight(startVal, false);
  const endDate = parseDateToMidnight(endVal, true);

  if (!startDate || !endDate) return false;

  const today = new Date();

  return today >= startDate && today <= endDate;
}

export function getPhotoUrl(empOrUrl: any, nameFallback?: string): string {
  if (!empOrUrl) {
    const name = nameFallback || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff`;
  }

  let rawUrl = '';
  let name = nameFallback || '';

  if (typeof empOrUrl === 'string') {
    rawUrl = empOrUrl;
  } else if (typeof empOrUrl === 'object') {
    name = empOrUrl['Employee Name'] || empOrUrl['name'] || empOrUrl['Instractor'] || empOrUrl['Instructor'] || nameFallback || 'User';
    const photoKey = Object.keys(empOrUrl).find(k => {
      const lk = k.toLowerCase().trim();
      return lk.includes("photo") || lk.includes("image") || lk.includes("picture") || lk.includes("avatar") || lk === "img" || lk.includes("profile");
    });
    rawUrl = photoKey ? empOrUrl[photoKey] : '';
  }

  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    const avatarName = name || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=0D9488&color=fff`;
  }

  const cleanUrl = rawUrl.trim();

  if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:') || cleanUrl.startsWith('/uploads/')) {
    return cleanUrl;
  }

  const fileIdMatch = cleanUrl.match(/[-\w]{25,}/);
  if (fileIdMatch && (
    cleanUrl.includes('drive.google.com') || 
    cleanUrl.includes('docs.google.com') || 
    cleanUrl.includes('googleusercontent.com')
  )) {
    const fileId = fileIdMatch[0];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }

  return cleanUrl;
}

export function getCourseStatusName(
  course: any,
  documentsData: any[] = [],
  workflowData: any[] = []
): string {
  if (!course) return "N/A";

  const workflowStr = course["Workflow"] || course["Publication Workflow"] || "";
  const rawStatus = String(course["Status"] || "").trim();

  let totalStages = 10;
  let stageList: Array<{ id: string; name: string; deliverables: string[] }> = [];

  if (workflowStr) {
    const { jobTitle, stageAssignments } = parseWorkflowAndStages(workflowStr);
    const assignedStageIds = new Set(Object.keys(stageAssignments));

    const rawTokens = jobTitle
      ? jobTitle.split(/[,&+]/).map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const parsedWorkflows = workflowData.map((item: any) => {
      const parsed = parseWorkflowTitle(item["Workflow Title"] || item["Title"] || "", item.id);
      return {
        id: item.id || parsed.id,
        title: parsed.title || item["Workflow Title"] || item.id,
        stages: parsed.stages || []
      };
    });

    const matchingWorkflows = parsedWorkflows.filter(wf => {
      const wfIdLower = (wf.id || '').trim().toLowerCase();
      const wfTitleLower = (wf.title || '').trim().toLowerCase();

      const isTitleMatch = rawTokens.some(
        t => t === wfIdLower || t === wfTitleLower || wfTitleLower.includes(t) || t.includes(wfTitleLower)
      );

      const isStageMatch = (wf.stages || []).some(
        s => assignedStageIds.has(s.id) || assignedStageIds.has(`${wf.id}::${s.id}`)
      );

      return isTitleMatch || isStageMatch;
    });

    const targetWorkflows = matchingWorkflows.length > 0 ? matchingWorkflows : parsedWorkflows;
    const gatheredStages: Array<{ id: string; name: string; deliverables: string[] }> = [];

    if (assignedStageIds.size > 0) {
      Object.keys(stageAssignments).forEach(assignedKey => {
        let foundStage: any = null;
        for (const wf of targetWorkflows) {
          const stg = (wf.stages || []).find(s =>
            s.id === assignedKey ||
            `${wf.id}::${s.id}` === assignedKey ||
            (assignedKey.includes('::') && assignedKey.split('::')[1] === s.id) ||
            s.stageName.replace(/^\d+\.\s*/, '').trim().toLowerCase() === assignedKey.replace(/^\d+\.\s*/, '').trim().toLowerCase()
          );
          if (stg) {
            foundStage = stg;
            break;
          }
        }

        if (!foundStage && targetWorkflows !== parsedWorkflows) {
          for (const wf of parsedWorkflows) {
            const stg = (wf.stages || []).find(s =>
              s.id === assignedKey ||
              `${wf.id}::${s.id}` === assignedKey ||
              (assignedKey.includes('::') && assignedKey.split('::')[1] === s.id) ||
              s.stageName.replace(/^\d+\.\s*/, '').trim().toLowerCase() === assignedKey.replace(/^\d+\.\s*/, '').trim().toLowerCase()
            );
            if (stg) {
              foundStage = stg;
              break;
            }
          }
        }

        if (foundStage) {
          gatheredStages.push({
            id: assignedKey,
            name: foundStage.stageName.replace(/^\d+\.\s*/, '').trim(),
            deliverables: foundStage.deliverables || []
          });
        } else {
          let fallbackName = assignedKey;
          if (assignedKey.includes('::')) fallbackName = assignedKey.split('::')[1];
          fallbackName = fallbackName.replace(/^\d+\.\s*/, '').trim();
          gatheredStages.push({
            id: assignedKey,
            name: fallbackName,
            deliverables: []
          });
        }
      });
    } else if (targetWorkflows.length > 0) {
      targetWorkflows.forEach(wf => {
        (wf.stages || []).forEach(s => {
          gatheredStages.push({
            id: s.id,
            name: s.stageName.replace(/^\d+\.\s*/, '').trim(),
            deliverables: s.deliverables || []
          });
        });
      });
    }

    if (gatheredStages.length > 0) {
      totalStages = gatheredStages.length;
      stageList = gatheredStages;
    }
  }

  if (totalStages <= 0) totalStages = 10;

  const courseCode = String(course["Course Code"] || "").trim().toUpperCase();
  const courseTitle = String(course["Course Title"] || course["Name"] || "").trim().toUpperCase();

  // Count Verified stages from uploaded/reviewed documents
  let verifiedStagesCount = 0;

  if (stageList.length > 0) {
    stageList.forEach(stage => {
      const normStage = stage.name.toUpperCase();
      const stageDelivs = stage.deliverables.map(d => d.trim().toUpperCase()).filter(Boolean);

      const isStageVerified = documentsData.some(doc => {
        const tag = String(doc["Tag"] || "").toUpperCase();
        const status = String(doc["Status"] || "").toUpperCase();
        const title = String(doc["Documents Title"] || doc["Title"] || "").toUpperCase();

        const isVerified = 
          tag.includes("VERIFIED") || 
          tag.includes("JOB DONE") || 
          tag.includes("APPROVED") || 
          status.includes("VERIFIED") || 
          status.includes("JOB DONE") || 
          status.includes("APPROVED");

        if (!isVerified) return false;

        // Check course code / title match
        const docCourseCode = String(doc["Course Code"] || "").toUpperCase();
        const docCourseName = String(doc["Course Name"] || "").toUpperCase();
        const matchesCourse = 
          !courseCode || 
          docCourseCode === courseCode || 
          tag.includes(courseCode) || 
          title.includes(courseCode) ||
          (courseTitle && (docCourseName.includes(courseTitle) || tag.includes(courseTitle)));

        if (!matchesCourse) return false;

        // Check stage name or deliverable match
        const matchesStage = 
          (normStage && (tag.includes(normStage) || title.includes(normStage))) ||
          stageDelivs.some(d => title.includes(d) || tag.includes(d));

        return matchesStage;
      });

      if (isStageVerified) {
        verifiedStagesCount++;
      }
    });
  } else {
    // If no stage list parsed, count unique verified stage documents for this course
    const verifiedDocs = documentsData.filter(doc => {
      const tag = String(doc["Tag"] || "").toUpperCase();
      const status = String(doc["Status"] || "").toUpperCase();
      const title = String(doc["Documents Title"] || doc["Title"] || "").toUpperCase();

      const isVerified = 
        tag.includes("VERIFIED") || 
        tag.includes("JOB DONE") || 
        tag.includes("APPROVED") || 
        status.includes("VERIFIED") || 
        status.includes("JOB DONE") || 
        status.includes("APPROVED");

      if (!isVerified) return false;

      const docCourseCode = String(doc["Course Code"] || "").toUpperCase();
      const docCourseName = String(doc["Course Name"] || "").toUpperCase();
      return !courseCode || docCourseCode === courseCode || tag.includes(courseCode) || title.includes(courseCode) || (courseTitle && (docCourseName.includes(courseTitle) || tag.includes(courseTitle)));
    });

    verifiedStagesCount = verifiedDocs.length;
  }

  if (verifiedStagesCount > 0) {
    const completePercentage = Math.min(100, Math.round((verifiedStagesCount / totalStages) * 100));
    return `${completePercentage}%`;
  }

  // Fallback if no verified documents yet
  if (rawStatus.endsWith("%")) {
    const parsedVal = parseInt(rawStatus, 10);
    if (!isNaN(parsedVal)) {
      return `${parsedVal}%`;
    }
  }

  // If 0 stages verified so far, 0% complete
  return "0%";
}

export function parseWorkflowAndStages(workflowStr: string) {
  if (!workflowStr) return { jobTitle: '', stageAssignments: {} as Record<string, string[]> };
  
  const match = workflowStr.match(/^(.*?)\s*\{(.*?)\}$/);
  if (match) {
    const jobTitle = match[1].trim();
    const stagesPart = match[2].trim();
    const stageAssignments: Record<string, string[]> = {};
    
    // Split stages by ';'
    const parts = stagesPart.split(/\s*;\s*/);
    
    parts.forEach(part => {
      const idx = part.indexOf(':');
      if (idx !== -1) {
        const stageId = part.substring(0, idx).trim();
        const idsStr = part.substring(idx + 1).trim();
        
        // Split employees by ','
        const rawIds = idsStr ? idsStr.split(/\s*,\s*/).map(s => s.trim()) : [];
        
        // Normalize employee id strings to: EmpId|Date|Deadline
        const ids = rawIds.map(id => {
          const parts = id.split('|');
          const empId = parts[0] || '';
          let assignedDate = parts[1] || '';
          const deadline = parts[2] || '';
          if (empId && !assignedDate) {
            assignedDate = new Date().toISOString().split('T')[0];
          }
          return `${empId}|${assignedDate}|${deadline}`;
        }).filter(item => item.split('|')[0]);
        
        if (stageId) {
          stageAssignments[stageId] = ids;
        }
      } else {
        const stageId = part.trim();
        if (stageId) {
          stageAssignments[stageId] = [];
        }
      }
    });
    
    return { jobTitle, stageAssignments };
  }
  
  return { jobTitle: workflowStr.trim(), stageAssignments: {} as Record<string, string[]> };
}

export function serializeWorkflowAndStages(jobTitle: string, stageAssignments: Record<string, string[]>) {
  const parts: string[] = [];
  const today = new Date().toISOString().split('T')[0];
  Object.entries(stageAssignments).forEach(([stageId, ids]) => {
    if (ids && ids.length > 0) {
      // Ensure all IDs are formatted as "empId|assignedDate|deadline"
      const normalizedIds = ids.map(idStr => {
        const parts = String(idStr).split('|');
        const empId = parts[0] || '';
        let assignedDate = parts[1] || '';
        const deadline = parts[2] || '';
        if (empId && !assignedDate) {
          assignedDate = today;
        }
        return `${empId}|${assignedDate}|${deadline}`;
      }).filter(item => item.split('|')[0]);

      if (normalizedIds.length > 0) {
        parts.push(`${stageId}:${normalizedIds.join(', ')}`);
      } else {
        parts.push(`${stageId}:`);
      }
    } else {
      parts.push(`${stageId}:`);
    }
  });
  
  if (parts.length === 0 && Object.keys(stageAssignments).length === 0) return jobTitle;
  return `${jobTitle} {${parts.join('; ')}}`;
}

export function getStageAssignment(assignments: Record<string, string[]>, name: string): string[] {
  if (!assignments) return [];
  if (assignments[name]) return assignments[name];
  const cleanName = name.replace(/^\d+\.\s*/, '').trim();
  const matchingKey = Object.keys(assignments).find(key => {
    const cleanKey = key.replace(/^\d+\.\s*/, '').trim();
    return cleanKey.toLowerCase() === cleanName.toLowerCase();
  });
  return matchingKey ? assignments[matchingKey] : [];
}

// --- Types & Parsers for Workflow Title ---
export interface WorkflowStageData {
  id: string;
  stageName: string;
  tasks: string[];
  deliverables: string[];
  approval: string;
  assigned?: string;
  policies?: string[];
}

export interface StructuredWorkflow {
  id: string; // Added stable ID
  title: string;
  stages: WorkflowStageData[];
}

export function parseWorkflowTitle(text: string, rowId?: string): StructuredWorkflow {
  // Simple hash function for stable ID generation if rowId and ID: are missing
  const getStableId = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36) || 'fallback';
  };

  if (!text) return { id: rowId || "empty", title: "", stages: [] };
  
  const stages: WorkflowStageData[] = [];
  let title = "";
  let id = rowId || getStableId(text);
  
  const lines = text.split('\n');
  let currentStage: WorkflowStageData | null = null;
  let currentSection = ""; 
  let isPlain = true;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith("ID: ")) {
        id = trimmed.substring(4);
    } else if (trimmed.startsWith("Title: ")) {
      isPlain = false;
      title = trimmed.substring(7);
      currentSection = "";
    } else if (trimmed.startsWith("Stage: ")) {
      isPlain = false;
      const content = trimmed.substring(7);
      const idMatch = content.match(/^(.*?) \[ID: (.*?)\]$/);
      
      let stageName = content;
      let stageId = getStableId(content);
      
      if (idMatch) {
          stageName = idMatch[1];
          stageId = idMatch[2];
      }

      currentStage = {
        id: stageId,
        stageName: stageName,
        tasks: [],
        deliverables: [],
        approval: "",
        assigned: "",
        policies: []
      };
      stages.push(currentStage);
      currentSection = "";
    } else if (trimmed === "Tasks:") {
      isPlain = false;
      currentSection = "tasks";
    } else if (trimmed === "Deliverables:") {
      isPlain = false;
      currentSection = "deliverables";
    } else if (trimmed === "Policies:") {
      isPlain = false;
      currentSection = "policies";
    } else if (trimmed.startsWith("Assigned: ")) {
      isPlain = false;
      if (currentStage) {
        currentStage.assigned = trimmed.substring(10);
      }
      currentSection = "assigned";
    } else if (trimmed.startsWith("Approval: ")) {
      isPlain = false;
      if (currentStage) {
        currentStage.approval = trimmed.substring(10);
      }
      currentSection = "approval";
    } else if (trimmed.startsWith("• ")) {
      isPlain = false;
      const item = trimmed.substring(2);
      if (currentStage) {
         if (currentSection === "tasks") currentStage.tasks.push(item);
         else if (currentSection === "deliverables") currentStage.deliverables.push(item);
         else if (currentSection === "policies") {
           if (!currentStage.policies) currentStage.policies = [];
           currentStage.policies.push(item);
         }
      }
    } else if (currentStage) {
      if (currentSection === "tasks") {
        isPlain = false;
        currentStage.tasks.push(trimmed);
      } else if (currentSection === "deliverables") {
        isPlain = false;
        currentStage.deliverables.push(trimmed);
      } else if (currentSection === "policies") {
        isPlain = false;
        if (!currentStage.policies) currentStage.policies = [];
        currentStage.policies.push(trimmed);
      }
    }
  }
  
  if (isPlain) {
    title = text;
  } else if (!title && lines.length > 0) {
     const firstLine = lines[0].trim();
     if (firstLine && !firstLine.includes(":")) {
         title = firstLine;
     }
  }
  
  return { id, title, stages };
}

export function stringifyWorkflowTitle(data: StructuredWorkflow): string {
  let result = `ID: ${data.id}\n`;
  if (data.title) {
    result += `Title: ${data.title}\n\n`;
  }
  data.stages.forEach(stage => {
    if (stage.stageName) {
      result += `Stage: ${stage.stageName} [ID: ${stage.id}]\n`;
      if (stage.tasks.length > 0) {
        result += `Tasks:\n`;
        stage.tasks.forEach(t => {
          if (t) result += `• ${t}\n`;
        });
      }
      if (stage.deliverables.length > 0) {
        result += `Deliverables:\n`;
        stage.deliverables.forEach(d => {
          if (d) result += `• ${d}\n`;
        });
      }
      if (stage.policies && stage.policies.length > 0) {
        result += `Policies:\n`;
        stage.policies.forEach(p => {
          if (p) result += `• ${p}\n`;
        });
      }
      if (stage.assigned) {
        result += `Assigned: ${stage.assigned}\n`;
      }
      if (stage.approval) {
        result += `Approval: ${stage.approval}\n`;
      }
      result += "\n";
    }
  });
  return result.trim();
}

export function formatRoutineDisplay(rawVal: any): string {
  if (!rawVal) return "—";
  const str = String(rawVal).trim();
  if (!str) return "—";

  if (str.startsWith("[") && str.endsWith("]")) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr) && arr.length > 0) {
        if (arr.length === 1) {
          const item = arr[0];
          const d = item.date || "";
          const st = item.startTime || "";
          const et = item.endTime || "";
          return `${d} ${st}${et ? "-" + et : ""}`.trim() || "—";
        }
        return `${arr.length} Classes Scheduled`;
      }
    } catch (e) {
      // fallback
    }
  }
  return str;
}

export function isValidCourseFieldValue(val: any): boolean {
  if (val === null || val === undefined) return false;

  // Handle actual JavaScript Array
  if (Array.isArray(val)) {
    if (val.length === 0) return false;
    return val.some(item => isValidCourseFieldValue(item));
  }

  // Handle Object (if serialized or structured)
  if (typeof val === "object") {
    const keys = Object.keys(val);
    if (keys.length === 0) return false;
    return keys.some(k => isValidCourseFieldValue(val[k]));
  }

  const str = String(val).trim();
  if (!str) return false;

  const lower = str.toLowerCase();
  if (
    lower === "-" ||
    lower === "—" ||
    lower === "–" ||
    lower === "n/a" ||
    lower === "none" ||
    lower === "null" ||
    lower === "undefined"
  ) {
    return false;
  }

  // Normalize whitespace out for [] checks
  const compact = str.replace(/\s+/g, '');
  if (
    compact === "[]" ||
    compact === '[""]' ||
    compact === "['']" ||
    compact === '[null]' ||
    compact === '[undefined]'
  ) {
    return false;
  }

  // Handle JSON string representing array or object
  if (str.startsWith("[") && str.endsWith("]")) {
    const inner = str.slice(1, -1).trim();
    if (!inner || inner === '""' || inner === "''") return false;
    try {
      const parsed = JSON.parse(str.replace(/'/g, '"'));
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return false;
        return parsed.some(item => isValidCourseFieldValue(item));
      }
    } catch {
      // Fallback if parsing fails
      const cleanInner = inner.replace(/['"]/g, '').trim().toLowerCase();
      if (!cleanInner || cleanInner === "-" || cleanInner === "n/a") return false;
    }
  }

  return true;
}

export function getPublicationStatus(course: any, courseOfferData: any[] = []): "Under Review" | "Ready to Publish" {
  if (!course || typeof course !== "object") return "Under Review";

  const getFieldValue = (candidateKeys: string[]): any => {
    for (const key of candidateKeys) {
      if (course[key] !== undefined && course[key] !== null) {
        return course[key];
      }
    }
    const courseKeys = Object.keys(course);
    for (const targetKey of candidateKeys) {
      const targetNorm = targetKey.toLowerCase().replace(/[\s_-]+/g, '');
      const foundKey = courseKeys.find(
        ck => ck.toLowerCase().replace(/[\s_-]+/g, '') === targetNorm
      );
      if (foundKey && course[foundKey] !== undefined && course[foundKey] !== null) {
        return course[foundKey];
      }
    }
    return undefined;
  };

  // 1. Objective
  const objective = getFieldValue(["Objective", "Objectives", "Course Objective"]);
  if (!isValidCourseFieldValue(objective)) return "Under Review";

  // 2. Learning Outcome
  const learningOutcome = getFieldValue(["Learning Outcome", "Learning Outcomes", "Learning_Outcome"]);
  if (!isValidCourseFieldValue(learningOutcome)) return "Under Review";

  // 3. Industry Demand
  const industryDemand = getFieldValue(["Industry Demand", "Industry_Demand"]);
  if (!isValidCourseFieldValue(industryDemand)) return "Under Review";

  // 4. Target Audience
  const targetAudience = getFieldValue(["Target Audience", "Target_Audience", "Terget Audience", "Terget_Audience"]);
  if (!isValidCourseFieldValue(targetAudience)) return "Under Review";

  // 5. Industry Expert
  const industryExpert = getFieldValue(["Industry Expert", "Industry Expart", "Industry_Expert", "Industry_Expart"]);
  if (!isValidCourseFieldValue(industryExpert)) return "Under Review";

  // 6. Syllabus
  const syllabus = getFieldValue(["Syllabus", "Syllabus / Modules", "Course Syllabus", "Modules"]);
  if (!isValidCourseFieldValue(syllabus)) return "Under Review";

  // 7. Learning Material
  const learningMaterial = getFieldValue(["Learning Material", "Learning Meterial", "Learning_Material", "Learning_Meterial", "Learning Materials", "Materials"]);
  if (!isValidCourseFieldValue(learningMaterial)) return "Under Review";

  // 8. Aligned Course
  let alignedCourse = getFieldValue([
    "Aligned Course", "Aligned Course name", "Aligned Course Name",
    "Aligned Course Title", "Aligned Course Code", "Aligned Course ID",
    "Aligned_Course", "Aligned Program", "Program Aligned", "Aligned_Program",
    "P-ID", "PID", "Program Name", "Program ID", "Program"
  ]);

  if (!isValidCourseFieldValue(alignedCourse)) {
    const code = String(course["Course Code"] || course["Code"] || "").trim().toLowerCase();
    const title = String(course["Course Title"] || course["Title"] || course["Name"] || "").trim().toLowerCase();

    if (courseOfferData && courseOfferData.length > 0) {
      const matchOffer = courseOfferData.find(o => {
        if (!o) return false;
        const oCode = String(o["Course Code"] || o["Course ID"] || "").trim().toLowerCase();
        const oTitle = String(o["Course Title"] || o["Course Name"] || "").trim().toLowerCase();
        return (code && oCode && code === oCode) || (title && oTitle && title === oTitle);
      });

      if (matchOffer) {
        alignedCourse = matchOffer["Aligned Course name"] ||
          matchOffer["Aligned Course Name"] ||
          matchOffer["Aligned Course"] ||
          matchOffer["Aligned Course Title"] ||
          matchOffer["Aligned Course Code"] ||
          matchOffer["P-ID"] || matchOffer["PID"] ||
          matchOffer["Program Name"] || matchOffer["Program"];
      }
    }
  }

  if (!isValidCourseFieldValue(alignedCourse)) return "Under Review";

  return "Ready to Publish";
}



