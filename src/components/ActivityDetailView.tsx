import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  Layers, 
  Calendar, 
  Clock, 
  ClipboardList, 
  CheckCircle2, 
  FileText, 
  CheckSquare, 
  ShieldCheck, 
  BookOpen, 
  Bookmark,
  X,
  Eye,
  Upload,
  Loader2
} from "lucide-react";
import { cn } from "../lib/utils";
import axios from "axios";
import { FOLDER_LOCATIONS } from "../FolderLocation";

interface ActivityDetailViewProps {
  selectedActivity: any;
  allActivities?: any[];
  courseData?: any[];
  onClose?: () => void;
  documents?: any[];
  onSaveDocument?: (formData: any, editingRow: any | null) => Promise<void>;
  onViewFile?: (url: string, title: string, doc?: any) => void;
}

const getThumbnail = (photoUrl: string) => {
  if (!photoUrl) return "";
  const fileIdMatch = photoUrl.match(/[-\w]{25,}/);
  if (fileIdMatch) {
    return `https://drive.google.com/thumbnail?id=${fileIdMatch[0]}&sz=w200`;
  }
  return photoUrl;
};

const getBannerUrl = (url: any) => {
  if (!url || typeof url !== "string") return "";
  if (url.includes("drive.google.com/uc") && url.includes("id=")) {
    try {
      const id = new URL(url).searchParams.get("id");
      return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    } catch (e) {
      return url;
    }
  }
  const fileIdMatch = url.match(/[-\w]{25,}/);
  if (fileIdMatch && url.includes('drive.google.com')) {
    return `https://drive.google.com/thumbnail?id=${fileIdMatch[0]}&sz=w1000`;
  }
  return url;
};

const getDocStatus = (doc: any) => {
  if (!doc) return { text: "Pending", color: "bg-slate-100 text-slate-600 border-slate-200" };
  const tag = String(doc["Tag"] || "").toUpperCase();
  const status = String(doc["Status"] || "").toUpperCase();
  const combined = `${tag} ${status}`;
  if (combined.includes("REVISION") || combined.includes("REVISION REQUIRED")) {
    return { text: "Revision", color: "bg-amber-100 text-amber-800 border-amber-200" };
  }
  if (combined.includes("VERIFIED") || combined.includes("JOB DONE") || combined.includes("APPROVED")) {
    return { text: "Verified", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  }
  return { text: "Review", color: "bg-teal-100 text-teal-800 border-teal-200" };
};

const getDeadlineStatus = (deadlineStr: string) => {
  if (!deadlineStr || deadlineStr === "-") return null;
  const target = new Date(deadlineStr);
  if (isNaN(target.getTime())) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return {
      text: `Overdue by ${Math.abs(diffDays)}d`,
      className: "bg-rose-50 text-rose-700 border-rose-200"
    };
  } else if (diffDays === 0) {
    return {
      text: "Due Today",
      className: "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
    };
  } else if (diffDays <= 3) {
    return {
      text: `${diffDays} days left`,
      className: "bg-amber-50 text-amber-700 border-amber-200 font-semibold"
    };
  } else {
    return {
      text: `${diffDays} days left`,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
    };
  }
};

const formatDateMmmDDYYYY = (dateStr: string) => {
  if (!dateStr || dateStr === "-") return "-";
  const ymdMatch = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1; // 0-based
    const day = parseInt(ymdMatch[3], 10);
    const date = new Date(year, month, day);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const calculatePerformanceNote = (assignedDateStr: string, deadlineStr: string, uploadDateStr: string) => {
  if (!uploadDateStr) return null;

  const parseDate = (dStr: string) => {
    if (!dStr || dStr === "-") return null;
    const ymdMatch = String(dStr).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
      return new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10));
    }
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const uploadDate = parseDate(uploadDateStr) || new Date();
  const deadlineDate = parseDate(deadlineStr);
  const assignedDate = parseDate(assignedDateStr);

  if (!deadlineDate) return null;

  const startDate = assignedDate || new Date(deadlineDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  uploadDate.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);

  const totalDurationMs = Math.max(deadlineDate.getTime() - startDate.getTime(), 1000 * 60 * 60 * 24);
  const elapsedMs = Math.max(0, uploadDate.getTime() - startDate.getTime());
  const msInDay = 1000 * 60 * 60 * 24;

  const elapsedDays = Math.max(0, Math.round(elapsedMs / msInDay));
  const pctUsed = (elapsedMs / totalDurationMs) * 100;

  if (uploadDate.getTime() <= deadlineDate.getTime()) {
    const dayLabel = elapsedDays === 1 ? "1 day" : `${elapsedDays} days`;
    if (pctUsed <= 25) {
      return {
        badgeText: `⚡ 25% Time Used (${dayLabel})`,
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
        note: "Outstanding performance! Submitted within 25% of the allocated timeframe."
      };
    } else if (pctUsed <= 50) {
      return {
        badgeText: `🌟 50% Time Used (${dayLabel})`,
        badgeClass: "bg-teal-100 text-teal-800 border-teal-300",
        note: "Great performance! Submitted within 50% of the allocated timeframe."
      };
    } else if (pctUsed <= 75) {
      return {
        badgeText: `👍 75% Time Used (${dayLabel})`,
        badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
        note: "Good performance! Submitted within 75% of the allocated timeframe."
      };
    } else {
      return {
        badgeText: `⏱️ 100% Time Used (${dayLabel})`,
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
        note: "Submitted on time within the 100% deadline window."
      };
    }
  } else {
    const extraMs = uploadDate.getTime() - deadlineDate.getTime();
    const extraPct = (extraMs / totalDurationMs) * 100;
    const overdueDays = Math.max(1, Math.round(extraMs / msInDay));
    const lateDayLabel = overdueDays === 1 ? "1 day late" : `${overdueDays} days late`;

    if (extraPct <= 25) {
      return {
        badgeText: `⚠️ +25% Overdue (${lateDayLabel})`,
        badgeClass: "bg-orange-100 text-orange-800 border-orange-300",
        note: "Slight delay. Submitted within 25% extra time past the deadline."
      };
    } else if (extraPct <= 50) {
      return {
        badgeText: `🟧 +50% Overdue (${lateDayLabel})`,
        badgeClass: "bg-amber-200 text-amber-900 border-amber-400",
        note: "Moderate delay. Submitted within 50% extra time past the deadline."
      };
    } else if (extraPct <= 75) {
      return {
        badgeText: `🔴 +75% Overdue (${lateDayLabel})`,
        badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
        note: "Significant delay. Submitted within 75% extra time past the deadline."
      };
    } else {
      const overdueDayText = overdueDays === 1 ? "1 day" : `${overdueDays} days`;
      return {
        badgeText: `🚨 Overdue by ${overdueDayText}`,
        badgeClass: "bg-red-200 text-red-900 border-red-400",
        note: `Critical delay! Submission was overdue by ${overdueDayText}.`
      };
    }
  }
};

export const ActivityDetailView: React.FC<ActivityDetailViewProps> = ({ 
  selectedActivity, 
  allActivities,
  courseData,
  onClose,
  documents,
  onSaveDocument,
  onViewFile
}) => {
  const isCourse = selectedActivity["Type"] === "Course";
  const status = getDeadlineStatus(selectedActivity["deadlineRaw"]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadingDeliv, setUploadingDeliv] = React.useState<string | null>(null);

  const diffDays = React.useMemo(() => {
    const deadlineStr = selectedActivity["deadlineRaw"];
    if (!deadlineStr || deadlineStr === "-") return null;
    const target = new Date(deadlineStr);
    if (isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [selectedActivity]);

  // Find course to get banner
  const course = React.useMemo(() => {
    if (!courseData || !selectedActivity) return null;
    const code = selectedActivity["Code"];
    return courseData.find(c => String(c["Course Code"] || "").trim().toLowerCase() === String(code || "").trim().toLowerCase());
  }, [courseData, selectedActivity]);

  const bannerUrl = course ? course["Banner"] : "";

  // Find all matching activities in the same merged group
  const matchingActivities = React.useMemo(() => {
    if (!allActivities || !selectedActivity) return [selectedActivity];
    const type = selectedActivity["Type"];
    const code = selectedActivity["Code"];
    const batch = selectedActivity["Batch Number"];
    const stage = selectedActivity["_stageName"];
    return allActivities.filter(
      (act) => act["Type"] === type && act["Code"] === code && act["Batch Number"] === batch && act["_stageName"] === stage
    );
  }, [allActivities, selectedActivity]);

  const assignedEmployees = React.useMemo(() => {
    const list: any[] = [];
    const seenIds = new Set<string>();
    
    matchingActivities.forEach((act) => {
      const empId = act["Employee ID"];
      if (empId && !seenIds.has(empId)) {
        seenIds.add(empId);
        list.push({
          id: empId,
          name: act["Employee Name"],
          designation: act["Designation"],
          photo: act["Photo"]
        });
      }
    });
    return list;
  }, [matchingActivities]);
  
  // Parse tasks list
  const tasks = Array.isArray(selectedActivity["tasksList"]) && selectedActivity["tasksList"].length > 0
    ? selectedActivity["tasksList"]
    : typeof selectedActivity["Key Tasks"] === "string" && selectedActivity["Key Tasks"] !== "N/A"
      ? selectedActivity["Key Tasks"].split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

  // Parse deliverables list
  const deliverables = Array.isArray(selectedActivity["deliverablesList"]) && selectedActivity["deliverablesList"].length > 0
    ? selectedActivity["deliverablesList"]
    : typeof selectedActivity["_deliverables"] === "string" && selectedActivity["_deliverables"] !== "N/A"
      ? selectedActivity["_deliverables"].split(',').map((d: string) => d.trim()).filter(Boolean)
      : [];

  const courseCode = selectedActivity["Course Code"] || selectedActivity["Code"] || "N/A";
  const batchNumber = selectedActivity["Type"] === "Batch" ? selectedActivity["Batch Number"] : null;
  
  // Explicitly handle title for Batch
  const courseTitle = selectedActivity["Type"] === "Batch"
    ? (course ? course["Course Title"] : (selectedActivity["Course Title"] || selectedActivity["Name"] || ""))
    : (selectedActivity["Course Title"] || selectedActivity["Name"] || "");

  const empId = selectedActivity["Employee ID"] || "GENERAL";
  const batchInfo = selectedActivity["Type"] === "Batch" && selectedActivity["Batch Number"] ? `Batch ${selectedActivity["Batch Number"]}` : "Course";
  const cleanStageName = selectedActivity["_actualStageName"] || "";

  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [selectedStageName, setSelectedStageName] = React.useState("");
  const [selectedDeliverable, setSelectedDeliverable] = React.useState("");
  const [docTitle, setDocTitle] = React.useState("");
  const [fileLink, setFileLink] = React.useState("");
  const [docNote, setDocNote] = React.useState("");
  const [editingDoc, setEditingDoc] = React.useState<any | null>(null);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const getNoteFromDoc = (doc: any) => {
    if (!doc) return "";
    if (doc["Note"]) return doc["Note"];
    const tag = String(doc["Tag"] || "");
    const noteMarker = ", Note: ";
    const index = tag.indexOf(noteMarker);
    if (index !== -1) {
      return tag.substring(index + noteMarker.length);
    }
    return "";
  };

  const openUploadModalFor = (deliv: string, existingDoc?: any) => {
    setSelectedDeliverable(deliv);
    setSelectedStageName(cleanStageName || "General");
    const batchNum = selectedActivity["Batch Number"] || "";
    const courseCd = courseCode || "";
    if (existingDoc) {
      setDocTitle(existingDoc["Documents Title"] || existingDoc["Title"] || existingDoc["Document Title"] || `${deliv} - ${batchNum || courseCd}`);
      setFileLink(existingDoc["File Link"] || existingDoc["Link"] || "");
      setDocNote(getNoteFromDoc(existingDoc));
      setEditingDoc(existingDoc);
    } else {
      setDocTitle(`${deliv} - ${batchNum || courseCd}`);
      setFileLink("");
      setDocNote("");
      setEditingDoc(null);
    }
    setErrorMsg("");
    setIsUploadModalOpen(true);
  };

  const handleFileUploadInModal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setErrorMsg("");
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    formDataUpload.append("folderPath", FOLDER_LOCATIONS.DOCUMENTS);
    try {
      const response = await axios.post("/api/upload", formDataUpload, { timeout: 60000 });
      const uploadedUrl = response.data?.url || response.data?.fileLink;
      if (uploadedUrl) {
        let viewUrl = uploadedUrl;
        if (viewUrl.includes("drive.google.com/uc") || viewUrl.includes("export=download")) {
          const fileIdMatch = viewUrl.match(/[?&]id=([^&]+)/);
          if (fileIdMatch && fileIdMatch[1]) {
            viewUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
          }
        }
        setFileLink(viewUrl);
        if (!docTitle) {
          const cleanFileName = file.name.split('.').slice(0, -1).join('.') || file.name;
          setDocTitle(cleanFileName);
        }
      } else {
        setErrorMsg("Failed to upload file. Please try again.");
      }
    } catch (err) {
      setErrorMsg("Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!docTitle.trim()) {
      setErrorMsg("Document Title is required");
      return;
    }
    if (!fileLink.trim() && !docNote.trim()) {
      setErrorMsg("Please provide a File Link/Upload or a Note");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      const courseCd = courseCode || "";
      const batchNum = selectedActivity["Batch Number"] || "";
      const stageNameVal = selectedStageName.replace(/^\d+\.\s*/, '');
      
      const baseTag = batchNum
        ? `${courseCd} - Batch ${batchNum} - ${stageNameVal} - ${selectedDeliverable}`
        : `${courseCd} - ${stageNameVal} - ${selectedDeliverable}`;

      let status = "Review";
      if (editingDoc) {
        const existingTag = String(editingDoc["Tag"] || "");
        if (existingTag.includes("Revision Required") || existingTag.includes("Revision")) {
          status = "Revision";
        } else if (existingTag.includes("Verified") || existingTag.includes("Job Done") || existingTag.includes("Approved")) {
          status = "Verified";
        }
      }

      let tag = `${baseTag} - ${status}`;
      if (docNote.trim()) {
        tag += `, Note: ${docNote.trim()}`;
      }

      const docToSave = {
        ...(editingDoc || {}),
        "Documents Title": docTitle.trim(),
        "File Link": fileLink.trim(),
        "Date": new Date().toISOString().split('T')[0],
        "Tag": tag,
        "Note": docNote.trim(),
        "Course Code": courseCode || "",
        "Course Name": courseTitle || "",
        "Status": status
      };
      if (onSaveDocument) {
        await onSaveDocument(docToSave, editingDoc || null);
      }
      setIsUploadModalOpen(false);
      setFileLink("");
      setDocTitle("");
      setDocNote("");
      setEditingDoc(null);
    } catch (err) {
      setErrorMsg("Failed to save document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setDocTitle("");
    setFileLink("");
    setDocNote("");
    setEditingDoc(null);
    setErrorMsg("");
  };

  const getUploadedDocForDeliverable = (deliv: string) => {
    if (!documents) return null;
    const normCode = String(courseCode || "").toUpperCase();
    const normStage = String(cleanStageName || "").replace(/^\d+\.\s*/, '').toUpperCase();
    const normDeliv = deliv.trim().toUpperCase();
    const normBatch = String(selectedActivity["Batch Number"] || "").toUpperCase();

    return documents.find(doc => {
      const title = String(doc["Documents Title"] || doc["Document Name"] || doc["Title"] || "").toUpperCase();
      const tag = String(doc["Tag"] || "").toUpperCase();
      const fullText = `${title} ${tag}`;

      const matchesDeliv = title === normDeliv || title.includes(normDeliv) || tag.includes(normDeliv) || fullText.includes(normDeliv);
      const matchesStage = !normStage || fullText.includes(normStage);
      const matchesCode = !normCode || normCode === "N/A" || fullText.includes(normCode);
      const matchesBatch = !normBatch || fullText.includes(normBatch);

      return matchesDeliv && matchesStage && matchesCode;
    });
  };

  const deliverableDocsInfo = React.useMemo(() => {
    if (!deliverables || deliverables.length === 0) {
      return { hasUpload: false, hasRevision: false, showPerformance: false, latestDocDate: null, performanceInfo: null };
    }

    let hasUpload = false;
    let hasRevision = false;
    let latestDate: string | null = null;

    deliverables.forEach((deliv: string) => {
      const doc = getUploadedDocForDeliverable(deliv);
      if (doc) {
        hasUpload = true;
        const statusObj = getDocStatus(doc);
        if (statusObj.text === "Revision") {
          hasRevision = true;
        }
        const d = doc["Date"] || doc["Created Date"];
        if (d) {
          if (!latestDate || new Date(d) > new Date(latestDate)) {
            latestDate = d;
          }
        }
      }
    });

    const showPerformance = hasUpload && !hasRevision;
    const perfInfo = (showPerformance && latestDate) 
      ? calculatePerformanceNote(selectedActivity["assignedDateRaw"], selectedActivity["deadlineRaw"], latestDate)
      : null;

    return {
      hasUpload,
      hasRevision,
      showPerformance,
      latestDocDate: latestDate,
      performanceInfo: perfInfo
    };
  }, [deliverables, documents, selectedActivity, courseCode, empId, cleanStageName, batchInfo]);

  const triggerUploadFor = (deliv: string) => {
    setUploadingDeliv(deliv);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingDeliv) return;

    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("folderPath", FOLDER_LOCATIONS.DOCUMENTS);

      const response = await axios.post("/api/upload", formDataUpload, { timeout: 60000 });
      let viewUrl = response.data?.url || response.data?.fileLink;

      if (!viewUrl) {
        alert("File upload completed, but no file link was returned. Please try again.");
        setIsUploading(false);
        setUploadingDeliv(null);
        return;
      }

      if (viewUrl.includes("drive.google.com/uc") || viewUrl.includes("export=download")) {
        const fileIdMatch = viewUrl.match(/[?&]id=([^&]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          viewUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
        }
      }

      // Requirement: Documents Title contains ONLY the deliverable name.
      const deliverableTitle = uploadingDeliv.trim();

      const existingDoc = getUploadedDocForDeliverable(uploadingDeliv);

      const courseCd = courseCode || "";
      const batchNum = selectedActivity["Batch Number"] || "";
      const stageNameVal = cleanStageName.replace(/^\d+\.\s*/, '');
      const generatedTags = batchNum
        ? `${courseCd} - Batch ${batchNum} - ${stageNameVal} - ${uploadingDeliv} - Review`
        : `${courseCd} - ${stageNameVal} - ${uploadingDeliv} - Review`;

      const newDoc = {
        "Date": new Date().toISOString().split('T')[0],
        "Documents Title": deliverableTitle,
        "File Link": viewUrl,
        "Tag": generatedTags,
        "Course Code": courseCode,
        "Course Name": courseTitle,
        "Status": "Review"
      };

      if (onSaveDocument) {
        await onSaveDocument(newDoc, existingDoc || null);
      }
    } catch (err: any) {
      console.error("File upload failed:", err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || "Please try again.";
      alert("File upload failed: " + errorMessage);
    } finally {
      setIsUploading(false);
      setUploadingDeliv(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: "24rem", opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="relative h-full flex flex-col border border-gray-200 shadow-sm rounded-xl select-none bg-white overflow-hidden shrink-0 ml-4"
    >
      <div className="w-96 h-full flex flex-col overflow-hidden">
        {/* 1. Course Banner (with Course Title and Course Code inside) */}
        <div className="relative w-full h-44 bg-teal-900 shrink-0 overflow-hidden mb-3">
        {bannerUrl ? (
          <img
            src={getBannerUrl(bannerUrl)}
            alt="Course Banner"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-800 to-teal-700" />
        )}
        
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* Top Right Close Button */}
        {onClose && (
          <div className="absolute top-2.5 right-2.5 z-20">
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors border border-white/10 cursor-pointer shadow-sm flex items-center justify-center"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Bottom content inside the banner: Course Title & Course Code */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 z-10">
          <div className="flex flex-col items-start text-left min-w-0">
            <h3 className="text-sm font-bold text-white leading-snug tracking-wide line-clamp-2 drop-shadow-md uppercase">
              {courseTitle}
            </h3>
            <div className="flex gap-1.5 mt-1.5">
              {courseCode !== "N/A" && (
                <span className="text-[9px] font-bold text-teal-200 bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-500/30 uppercase tracking-wider font-mono">
                  {courseCode}
                </span>
              )}
              {selectedActivity["Type"] === "Batch" && (
                <span className="text-[9px] font-bold text-teal-200 bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-500/30 uppercase tracking-wider font-mono">
                  Batch {batchNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Main details body */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 pb-8 space-y-4">
        
        {/* Bordered Container */}
        <div className="relative border border-gray-200 rounded-xl p-4 pt-6 pb-10 mt-2">
          
          {/* Stage Badge on Top Border */}
          {selectedActivity["_actualStageName"] && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-teal-50 text-teal-800 border border-teal-200 px-5 py-1.5 rounded-full shadow-sm w-[92%] text-center whitespace-normal break-words z-10">
              <span className="text-[11.5px] font-bold uppercase tracking-wider block leading-normal">
                {selectedActivity["_actualStageName"]}
              </span>
            </div>
          )}

          <div className="space-y-3">
            {/* Key Tasks */}
            <div className="space-y-1">
    
              {tasks.length > 0 ? (
                <div className="space-y-2 px-1">
                  {tasks.map((task: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <p className="text-[11.5px] text-slate-700 font-semibold leading-relaxed text-justify w-full break-words">{task}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-[11px] text-slate-400 italic py-1">
                  No explicit key tasks specified.
                </div>
              )}
            </div>
    
            {/* Deliverables Card (containing Assign Date, Deadline, Days Left and Deliverables list) */}
            <div className="relative border border-gray-200 rounded-xl p-4 pt-8 mt-6 mb-4 bg-slate-50/30">
              
              {/* Deliverable Submission Title Badge on Top Border Middle */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-teal-800 border border-teal-200 px-4 py-1 rounded-full shadow-xs text-[11px] font-bold uppercase tracking-wider whitespace-nowrap z-10">
                Deliverable Submission {deliverables.length > 0 ? `(${deliverables.length})` : ""}
              </div>

              {/* Row 1: Assigned Date (left) & Deadline (right) */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Assigned Date</span>
                  <span className="text-[11px] font-mono font-bold text-slate-700">
                    {formatDateMmmDDYYYY(selectedActivity["assignedDateRaw"])}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Deadline</span>
                  <span className="text-[11px] font-mono font-bold text-slate-700">
                    {formatDateMmmDDYYYY(selectedActivity["deadlineRaw"])}
                  </span>
                </div>
              </div>

              {/* Row 2: Deliverables Items Header & List */}
              <div className="space-y-2 mt-2 pt-2 border-t border-gray-200/60 mb-4">
                {deliverables.length > 0 ? (
                  <div className="flex flex-col gap-3 pt-1">
                    {deliverables.map((deliv: string, idx: number) => {
                      const doc = getUploadedDocForDeliverable(deliv);
                      const isItemUploading = isUploading && uploadingDeliv === deliv;
                      const docStatus = doc ? getDocStatus(doc) : null;
                      const performanceInfo = doc ? calculatePerformanceNote(
                        selectedActivity["assignedDateRaw"],
                        selectedActivity["deadlineRaw"],
                        doc["Date"] || doc["Created Date"]
                      ) : null;
                      
                      return (
                        <div 
                          key={idx} 
                          className={cn(
                            "border rounded-lg p-2.5 pt-3 flex flex-col gap-1.5 shadow-2xs transition-all relative group select-none w-full",
                            doc ? "pb-4" : "",
                            doc 
                              ? "bg-teal-50/40 border-teal-200 text-teal-950" 
                              : "bg-white border-dashed border-slate-300 hover:border-teal-500 hover:bg-teal-50/20 text-slate-700 cursor-pointer"
                          )}
                          onClick={() => {
                            if (!doc && !isItemUploading) {
                              openUploadModalFor(deliv);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {isItemUploading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600 shrink-0" />
                              ) : (
                                <CheckSquare className={cn("w-3.5 h-3.5 shrink-0", doc ? "text-teal-600" : "text-gray-400")} />
                              )}
                              
                              <span className="text-[11.5px] font-bold leading-snug break-words" title={deliv}>
                                {deliv}
                              </span>
                            </div>

                            {!isItemUploading && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {doc ? (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onViewFile) {
                                          onViewFile(doc["File Link"] || "", doc["Documents Title"] || deliv, doc);
                                        }
                                      }}
                                      className="p-1 hover:bg-teal-100/80 rounded text-teal-700 cursor-pointer transition-colors"
                                      title="View Uploaded Document"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openUploadModalFor(deliv, doc);
                                      }}
                                      className="p-1 hover:bg-teal-100/80 rounded text-teal-700 cursor-pointer transition-colors"
                                      title="Re-upload Deliverable File"
                                    >
                                      <Upload className="w-3.5 h-3.5 text-teal-600" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openUploadModalFor(deliv);
                                    }}
                                    className="flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                                    title="Click to Submit Deliverable File"
                                  >
                                    <Upload className="w-3 h-3 text-teal-600 shrink-0" />
                                    <span>Submit File</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Submitted Date string on item if no global performance section */}
                          {doc && (
                            <div className="text-[10.5px] text-slate-700 leading-snug font-medium pt-0.5 px-0.5">
                              {!deliverableDocsInfo.showPerformance && performanceInfo && (
                                <p>{performanceInfo.note}</p>
                              )}
                              {(doc["Date"] || doc["Created Date"]) && (
                                <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                                  Submitted: {formatDateMmmDDYYYY(doc["Date"] || doc["Created Date"])}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Review / Verified / Revision status badge centered on bottom border */}
                          {doc && docStatus && (
                            <span className={cn("absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[9px] px-2.5 py-0.5 rounded-full font-bold border tracking-wider uppercase shadow-2xs whitespace-nowrap z-10", docStatus.color)}>
                              {docStatus.text}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-[11px] text-slate-400 italic py-1">
                    No deliverables assigned.
                  </div>
                )}
              </div>

              {/* Row 3: Day Left OR Performance Note */}
              {deliverableDocsInfo.showPerformance && deliverableDocsInfo.performanceInfo ? (
                <div>
                  <div className="border-t border-gray-200/70 my-4" />
                  <div className="relative text-center border border-teal-200/80 pt-4.5 pb-3.5 px-3 mb-3 mt-4 bg-teal-50/50 rounded-xl shadow-2xs flex flex-col items-center justify-center gap-1">
                    {/* Performance Note Badge on Top Border Middle */}
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white text-teal-800 border border-teal-200/90 px-3 py-0.5 rounded-full shadow-2xs text-[9.5px] font-bold uppercase tracking-wider whitespace-nowrap z-10">
                      Performance Note
                    </span>

                    <p className="text-[11.5px] font-semibold text-slate-800 leading-snug max-w-[95%] text-center mt-0.5">
                      {deliverableDocsInfo.performanceInfo.note}
                    </p>
                    {deliverableDocsInfo.latestDocDate && (
                      <span className="text-[9.5px] font-mono text-slate-500 font-medium block">
                        Submitted: {formatDateMmmDDYYYY(deliverableDocsInfo.latestDocDate)}
                      </span>
                    )}
                    {/* Rating Badge on Bottom Border Middle */}
                    <span className={cn("absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[9px] px-2.5 py-0.5 rounded-full font-extrabold border tracking-wider uppercase shadow-2xs whitespace-nowrap z-10", deliverableDocsInfo.performanceInfo.badgeClass)}>
                      {deliverableDocsInfo.performanceInfo.badgeText}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center border-t border-b border-gray-200/50 py-2.5 mb-1 bg-white/40 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Day Left</span>
                  <span className={cn(
                    "text-xl font-extrabold tracking-tight mt-0.5 block",
                    diffDays !== null && diffDays < 0 ? "text-rose-600" :
                    diffDays !== null && diffDays <= 3 ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {diffDays !== null ? `${diffDays} days` : "N/A"}
                  </span>
                </div>
              )}

            </div>
          </div>

          {/* Sign-off Authority Badge on Bottom Border of the Main Stage Card */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-white text-teal-800 border border-teal-200 px-3.5 py-1.5 rounded-xl shadow-xs z-10 flex flex-col items-center justify-center gap-0.5 w-[88%] max-w-xs text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 uppercase tracking-wider text-[9.5px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Approved By</span>
            </div>
            <span className="text-[11.5px] font-bold text-teal-950 truncate max-w-full px-1 leading-snug">
              {selectedActivity["Approval / Sign-off"] || "N/A"}
            </span>
          </div>

        </div>

      </div>
      
      {/* Hidden File Input for Deliverables Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
      />

      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    {editingDoc ? "Update Document" : "Add Document"}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Stage: {selectedStageName.replace(/^\d+\.\s*/, '')} | {selectedDeliverable}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeUploadModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-4 text-left">
                {errorMsg && (
                  <div className="bg-red-50 text-red-600 text-[10px] font-semibold px-3 py-2 rounded-lg border border-red-200">
                    {errorMsg}
                  </div>
                )}

                {/* Document Title */}
                <div className="space-y-1 hidden">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Enter document title"
                    className="w-full text-xs font-medium p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                  />
                </div>

                {/* File Upload or Link */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    File Upload
                  </label>
                  
                  <div className="flex gap-2">
                    {/* Upload File button */}
                    <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer transition-all flex-1">
                      {isUploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                          <span className="text-teal-600">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Choose File</span>
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUploadInModal}
                        disabled={isUploading}
                      />
                    </label>
                  </div>

                  <div className="relative mt-2">
                    <div className="absolute left-2.5 top-2.5 text-slate-400">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="url"
                      value={fileLink}
                      onChange={(e) => setFileLink(e.target.value)}
                      placeholder="Or enter File Link / URL"
                      className="w-full text-xs font-medium pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                    />
                  </div>

                  {fileLink && (
                    <div className="bg-teal-50/50 border border-teal-100 rounded-lg p-2 flex items-center justify-between mt-1">
                      <span className="text-[10px] text-teal-700 font-medium truncate max-w-[280px]">
                        Link: {fileLink}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFileLink("")}
                        className="text-teal-600 hover:text-teal-800 text-[10px] font-bold cursor-pointer hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Note
                  </label>
                  <textarea
                    value={docNote}
                    onChange={(e) => setDocNote(e.target.value)}
                    placeholder="Write a note about this deliverable here... (If no file is uploaded, saving a note will create the deliverable with this note)"
                    rows={3}
                    className="w-full text-xs font-medium p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-teal-500 resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={closeUploadModal}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDocument}
                  disabled={isSubmitting || isUploading}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Document</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </motion.div>
  );
};
