import React, { useState, useMemo } from "react";
import { Briefcase, Layers, Upload, X, Loader2, FileText, Plus, Paperclip, ChevronDown, Eye, Check } from "lucide-react";
import EmployeeMultiSelect from "./EmployeeMultiSelect";
import { FOLDER_LOCATIONS } from "../FolderLocation";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";
import { getStageAssignment, getPhotoUrl, cn } from "../lib/utils";

interface WorkflowStage {
  "Workflow Stage"?: string;
  "Deliverables"?: string;
  [key: string]: any;
}

interface WorkflowTimelineProps {
  stages: WorkflowStage[];
  stageAssignments: Record<string, string[]>;
  isEditing?: boolean;
  employees?: any[];
  onStageAssignmentChange: (stageName: string, selectedEmployeeIds: string[]) => void;
  placement?: 'bottom' | 'top' | 'right-sidebar';
  jobTitle?: string;
  batch?: any;
  courseCode?: string;
  documents?: any[];
  onSaveDocument?: (formData: any, editingRow: any | null) => Promise<void>;
  viewType?: 'course' | 'batch';
  displayMode?: 'accordion' | 'vertical-tabs';
  borderless?: boolean;
  onViewDocuments?: (filter: string) => void;
  onViewFile?: (url: string, title: string, doc?: any) => void;
}

export default function WorkflowTimeline({
  stages,
  stageAssignments,
  isEditing = false,
  employees = [],
  onStageAssignmentChange,
  placement = "bottom",
  jobTitle = "",
  batch,
  courseCode,
  documents = [],
  onSaveDocument,
  viewType = 'batch',
  displayMode = 'accordion',
  borderless = false,
  onViewDocuments,
  onViewFile
}: WorkflowTimelineProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState("");
  const [selectedStageName, setSelectedStageName] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [fileLink, setFileLink] = useState("");
  const [docNote, setDocNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [activeStageKey, setActiveStageKey] = useState<string | null>("none");
  const [prevStagesId, setPrevStagesId] = useState<string>("");

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

  const findMatchingDocument = (stageNameVal: string, item: string) => {
    const cleanStageName = stageNameVal.replace(/^\d+\.\s*/, '');
    const targetCourseCode = String(courseCode || batch?.["Course Code"] || "").trim().toUpperCase();
    const targetBatchNum = String(batch?.["Batch Number"] || batch?.["Batch"] || "").trim().toUpperCase();
    const normItem = item.trim().toUpperCase();
    const normCleanStage = cleanStageName.trim().toUpperCase();

    return documents.find(doc => {
      const tag = String(doc["Tag"] || "").toUpperCase();
      const title = String(doc["Documents Title"] || doc["Document Title"] || doc["Title"] || "").toUpperCase();
      const fullText = `${title} ${tag}`;

      const matchesItem = title === normItem || title.includes(normItem) || tag.includes(normItem) || fullText.includes(normItem);
      const matchesStage = !normCleanStage || fullText.includes(normCleanStage);
      const matchesCourse = !targetCourseCode || fullText.includes(targetCourseCode);
      const matchesBatch = !targetBatchNum || fullText.includes(targetBatchNum);

      return matchesItem && matchesStage && matchesCourse;
    });
  };

  const stagesIdStr = stages.map(s => s["ID"] || s["Workflow Stage"] || "").join(",");
  if (stagesIdStr !== prevStagesId) {
    setPrevStagesId(stagesIdStr);
    setActiveStageKey("none");
  }

  const toggleStage = (stageKey: string) => {
    setActiveStageKey(prev => {
      const currentActive = prev === null ? (stages[0]?.["ID"] || "0") : prev;
      if (currentActive === stageKey) {
        return "none"; // special state to indicate all collapsed
      }
      return stageKey;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        // Pre-fill a good default title if empty
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
      const courseCd = (batch && batch["Course Code"]) || courseCode || "";
      const batchNum = (batch && batch["Batch Number"]) || "";
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
        "Course Code": (batch && batch["Course Code"]) || courseCode || "",
        "Course Name": (batch && batch["Course Title"]) || "",
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

  const formatToMmmDdYyyy = (dateStr: string) => {
    try {
      if (!dateStr) return "";
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, monthIndex, day);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric"
          });
        }
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric"
      });
    } catch (e) {
      return dateStr;
    }
  };

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 rounded-md bg-slate-50/50">
        <Briefcase className="w-8 h-8 text-slate-300 mb-2" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No Stages Found</span>
        <p className="text-[9px] text-slate-400 mt-1">
          {jobTitle ? `No workflow stages defined for "${jobTitle}".` : "No workflow stages defined."}
        </p>
      </div>
    );
  }

  if (displayMode === 'vertical-tabs') {
    const currentActiveKey = (activeStageKey === "none" || !activeStageKey)
      ? (stages[0]?.["ID"] || "0")
      : activeStageKey;

    const activeStageIndex = Math.max(0, stages.findIndex((s, i) => (s["ID"] || String(i)) === currentActiveKey));
    const activeStage = stages[activeStageIndex] || stages[0];

    return (
      <div className={cn(
        "flex flex-col md:flex-row bg-white w-full h-full min-h-0 flex-1",
        borderless ? "border-0 rounded-none shadow-none" : "border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden"
      )}>
        {/* Left Column: Vertical Stage Tabs */}
        <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-slate-200/90 p-3 flex flex-col bg-slate-50/30 h-full min-h-0">
          <div className="px-2 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-1.5 mb-2 flex items-center justify-between">
            <span>Workflow Stages</span>
            <span className="bg-slate-200/70 text-slate-600 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">{stages.length}</span>
          </div>
          <div className="space-y-0.5 overflow-y-auto no-scrollbar flex-1 min-h-0">
            {stages.map((stg, idx) => {
              const stgKey = stg["ID"] || String(idx);
              const isSelected = (currentActiveKey === stgKey);
              const rawStageName = stg["Workflow Stage"] || "Unnamed Stage";
              const cleanName = rawStageName.replace(/^\d+\.\s*/, '');

              const deliverablesList = (() => {
                const str = String(stg["Deliverables"] || "");
                let items = str.split(/[\n|;]+/);
                if (items.length === 1 && str.includes(',')) {
                  items = str.split(',');
                }
                return items.map(item => item.trim()).filter(item => item.length > 0);
              })();

              const targetCourseCode = String(courseCode || batch?.["Course Code"] || "").trim().toUpperCase();
              const targetBatchNum = String(batch?.["Batch Number"] || batch?.["Batch"] || "").trim().toUpperCase();

              const submittedCount = deliverablesList.filter(item => {
                const normItem = item.trim().toUpperCase();
                return documents.some(doc => {
                  const tag = String(doc["Tag"] || "").toUpperCase();
                  const title = String(doc["Documents Title"] || doc["Document Title"] || doc["Title"] || "").toUpperCase();
                  const docCourseCode = String(doc["Course Code"] || "").trim().toUpperCase();
                  const docBatchNum = String(doc["Batch Number"] || doc["Batch"] || "").trim().toUpperCase();

                  if (targetCourseCode) {
                    const matchesCourse = 
                      docCourseCode === targetCourseCode || 
                      tag.includes(targetCourseCode) || 
                      title.includes(targetCourseCode);
                    if (!matchesCourse) return false;
                  }

                  if (viewType === 'batch' && targetBatchNum) {
                    const matchesBatch = 
                      docBatchNum === targetBatchNum || 
                      tag.includes(`BATCH ${targetBatchNum}`) || 
                      title.includes(`BATCH ${targetBatchNum}`);
                    if (!matchesBatch) return false;
                  }

                  if (targetCourseCode) {
                    const cPrefix = `${targetCourseCode}-${rawStageName}-${item}`.toUpperCase();
                    if (tag.startsWith(cPrefix)) return true;
                  }

                  const normStage = rawStageName.trim().toUpperCase();
                  const normCleanStage = cleanName.trim().toUpperCase();

                  const titleMatches = title === normItem || title.includes(normItem) || tag.includes(normItem);
                  const stageMatches = !normStage || tag.includes(normStage) || tag.includes(normCleanStage) || title.includes(normStage) || title.includes(normCleanStage);

                  return titleMatches && stageMatches;
                });
              }).length;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveStageKey(stgKey)}
                  className={cn(
                    "w-full text-left px-2.5 py-2 rounded-lg transition-all flex items-center justify-between gap-2 cursor-pointer select-none text-xs bg-transparent border-0",
                    isSelected
                      ? "text-teal-700 font-extrabold bg-teal-50/60"
                      : "text-slate-600 hover:text-slate-900 font-semibold hover:bg-slate-100/50"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold shrink-0 transition-colors",
                      isSelected ? "bg-teal-600 text-white" : "bg-slate-200/80 text-slate-600"
                    )}>
                      {idx + 1}
                    </span>
                    <span className="tracking-tight whitespace-normal break-words text-[11px] leading-snug">
                      {cleanName}
                    </span>
                  </div>

                  {deliverablesList.length > 0 && (
                    <span className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded-full shrink-0 font-bold",
                      isSelected
                        ? "bg-teal-100 text-teal-800"
                        : submittedCount === deliverablesList.length
                        ? "bg-teal-100 text-teal-700"
                        : submittedCount > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-200/60 text-slate-500"
                    )}>
                      {submittedCount}/{deliverablesList.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Panel: Selected Stage Detail */}
        <div className="flex-1 bg-white p-5 space-y-4 overflow-y-auto no-scrollbar h-full min-h-0">
          {/* Header Area: Workflow Title on top, Stage Title underneath */}
          <div className="border-b border-slate-100 pb-3 space-y-1">
            <h2 className="text-xs font-extrabold text-indigo-600 tracking-wide">
              {activeStage["Workflow Title"] || jobTitle || activeStage["Workflow"] || activeStage["Job Title"] || activeStage["Workflow Name"] || ""}
            </h2>
            <h3 className="text-xs font-black text-slate-900 break-words">
              {(activeStage["Workflow Stage"] || "Unnamed Stage").replace(/^\d+\.\s*/, '')}
            </h3>
          </div>

          {/* Key Task */}
          <div className="space-y-1 py-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Key Task</span>
            <p className="text-xs text-slate-700 font-medium whitespace-pre-line leading-relaxed">
              {Array.isArray(activeStage["Tasks"]) && activeStage["Tasks"].length > 0
                ? activeStage["Tasks"].join('\n')
                : (activeStage["Key Task"] || activeStage["Key Tasks"] || activeStage["Key Responsibilities"] || activeStage["Stage Objective"] || activeStage["Objective"] || activeStage["Task"] || activeStage["Description"] || activeStage["Objectives"] || "N/A")}
            </p>
          </div>

          {/* 4. Deliverables / Documents */}
          {activeStage["Deliverables"] && (() => {
            const deliverablesList = (() => {
              const str = String(activeStage["Deliverables"] || "");
              let items = str.split(/[\n|;]+/);
              if (items.length === 1 && str.includes(',')) {
                items = str.split(',');
              }
              return items.map(item => item.trim()).filter(item => item.length > 0);
            })();

            if (deliverablesList.length === 0) return null;

            return (
              <div className="space-y-2 bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deliverables / Documents</span>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {deliverablesList.map((item, index) => {
                    const stageNameVal = activeStage["Workflow Stage"] || "";
                    const matchingDoc = findMatchingDocument(stageNameVal, item);
                    const hasDoc = !!matchingDoc;

                    return (
                      <div key={index} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-md text-xs font-semibold shadow-3xs transition-all">
                        {hasDoc && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onViewFile) {
                                  onViewFile(matchingDoc["File Link"] || matchingDoc["Link"] || "", matchingDoc["Documents Title"] || matchingDoc["Title"] || item, matchingDoc);
                                } else {
                                  setViewingDoc(matchingDoc);
                                }
                              }}
                              className="text-teal-600 hover:text-teal-800 transition-colors cursor-pointer p-0.5 bg-teal-50 hover:bg-teal-100 rounded inline-flex items-center justify-center"
                              title={`View document: ${matchingDoc["Documents Title"] || item}`}
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            {onSaveDocument && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDeliverable(item);
                                  setSelectedStageName(stageNameVal);
                                  setDocTitle(matchingDoc["Documents Title"] || matchingDoc["Title"] || matchingDoc["Document Title"] || `${item} - ${(batch && batch["Batch Number"]) || courseCode || ""}`);
                                  setFileLink(matchingDoc["File Link"] || matchingDoc["Link"] || "");
                                  setDocNote(getNoteFromDoc(matchingDoc));
                                  setEditingDoc(matchingDoc);
                                  setErrorMsg("");
                                  setIsUploadModalOpen(true);
                                }}
                                className="text-amber-600 hover:text-amber-800 transition-colors cursor-pointer p-0.5 bg-amber-50 hover:bg-amber-100 rounded inline-flex items-center justify-center"
                                title={`Change / Update document for ${item}`}
                              >
                                <Upload className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (hasDoc) {
                              if (onViewFile) {
                                onViewFile(matchingDoc["File Link"] || matchingDoc["Link"] || "", matchingDoc["Documents Title"] || matchingDoc["Title"] || item, matchingDoc);
                              } else {
                                setViewingDoc(matchingDoc);
                              }
                            } else if (batch && onSaveDocument) {
                              setSelectedDeliverable(item);
                              setSelectedStageName(stageNameVal);
                              setDocTitle(`${item} - ${batch["Batch Number"] || courseCode || ""}`);
                              setFileLink("");
                              setDocNote("");
                              setEditingDoc(null);
                              setErrorMsg("");
                              setIsUploadModalOpen(true);
                            }
                          }}
                          className="text-teal-700 hover:text-teal-900 hover:underline transition-colors cursor-pointer font-semibold inline-flex items-center gap-1"
                          title={hasDoc ? `View ${item}` : `Upload document for ${item}`}
                        >
                          <span>{item}</span>
                          {hasDoc ? (
                            <Check className="w-3 h-3 text-teal-600 shrink-0" />
                          ) : (
                            <Plus className="w-3 h-3 text-teal-500 shrink-0" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 5. Assigned Person */}
          {(() => {
            const activeStageName = activeStage["Workflow Stage"] || "Unnamed Stage";
            const assignedIds = stageAssignments[activeStage["ID"]] || getStageAssignment(stageAssignments, activeStageName) || [];

            return (
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Person</span>
                {isEditing ? (
                  <div className="space-y-2">
                    <EmployeeMultiSelect
                      selectedIds={assignedIds}
                      onChange={(ids) => onStageAssignmentChange(activeStage["ID"], ids)}
                      employees={employees}
                      placement={placement}
                    />
                    {assignedIds.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {assignedIds.map((id) => {
                          const [empIdStr, assignedDate] = String(id).split('|');
                          const emp = employees.find(e => String(e['Employee ID'] || '').trim() === empIdStr.trim());
                          if (!emp) return null;
                          const designation = emp['Designation'] || emp['Administrative Designation'] || emp['Administrative'] || '';
                          return (
                            <div key={id} className="flex flex-col items-center text-center p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 shadow-2xs hover:bg-slate-100/50 transition-all">
                              <img 
                                src={getPhotoUrl(emp)} 
                                alt={emp['Employee Name']}
                                className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-white shadow-2xs mb-2"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp['Employee Name'] || 'User');
                                }}
                              />
                              <span className="text-xs font-bold text-slate-800 block truncate max-w-full">
                                {emp['Employee Name']}
                              </span>
                              {designation && (
                                <span className="text-[10px] text-slate-500 block truncate max-w-full leading-snug mt-0.5 font-medium">
                                  {designation}
                                </span>
                              )}
                              {assignedDate && (
                                <span className="text-[9px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100 font-mono mt-1.5">
                                  {formatToMmmDdYyyy(assignedDate)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  assignedIds.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {assignedIds.map((id) => {
                        const [empIdStr, assignedDate] = String(id).split('|');
                        const emp = employees.find(e => String(e['Employee ID'] || '').trim() === empIdStr.trim());
                        if (!emp) return null;
                        const designation = emp['Designation'] || emp['Administrative Designation'] || emp['Administrative'] || '';
                        return (
                          <div key={id} className="flex flex-col items-center text-center p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 shadow-2xs hover:bg-slate-100/50 transition-all">
                            <img 
                              src={getPhotoUrl(emp)} 
                              alt={emp['Employee Name']}
                              className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-white shadow-2xs mb-2"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp['Employee Name'] || 'User');
                              }}
                            />
                            <span className="text-xs font-bold text-slate-800 block truncate max-w-full">
                              {emp['Employee Name']}
                            </span>
                            {designation && (
                              <span className="text-[10px] text-slate-500 block truncate max-w-full leading-snug mt-0.5 font-medium">
                                {designation}
                              </span>
                            )}
                            {assignedDate && (
                              <span className="text-[9px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100 font-mono mt-1.5">
                                {formatToMmmDdYyyy(assignedDate)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic block py-1">No employee assigned to this stage</span>
                  )
                )}
              </div>
            );
          })()}

          {/* Upload Modal (Reused) */}
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

                  <div className="p-4 space-y-4 text-left">
                    {errorMsg && (
                      <div className="bg-red-50 text-red-600 text-[10px] font-semibold px-3 py-2 rounded-lg border border-red-200">
                        {errorMsg}
                      </div>
                    )}

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

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        File Upload
                      </label>
                      
                      <div className="flex gap-2">
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
                            onChange={handleFileUpload}
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
      </div>
    );
  }

  return (
    <div className="relative pl-1 pt-1 space-y-2">
      {stages.map((stage, idx) => {
        const stageName = stage["Workflow Stage"] || "Unnamed Stage";
        const currentSelectedEmployeeIds = stageAssignments[stage["ID"]] || getStageAssignment(stageAssignments, stageName) || [];
        const stageKey = stage["ID"] || String(idx);
        const isStageExpanded = activeStageKey === stageKey;

        return (
          <div key={idx} className="relative flex gap-3.5 items-center">
            {/* Left Line Segment container */}
            <div className="absolute left-[10px] -translate-x-1/2 top-0 bottom-0 w-0.5 pointer-events-none">
              {idx > 0 && (
                <div className="absolute top-[-8px] left-0 right-0 h-[calc(50%+8px)] bg-slate-200" />
              )}
              {idx < stages.length - 1 && (
                <div className="absolute top-1/2 bottom-[-8px] left-0 right-0 bg-slate-200" />
              )}
            </div>

            {/* Timeline bullet */}
            <div className="relative shrink-0 z-10 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-teal-600 bg-white flex items-center justify-center font-mono text-[9px] font-bold text-teal-600 shadow-3xs">
                {idx + 1}
              </div>
            </div>

            {/* Stage Box */}
            <div 
              className="flex-1 min-w-0 bg-white border border-slate-200 py-1.5 px-2.5 rounded-md cursor-pointer hover:border-slate-300 hover:bg-slate-50/20 transition-all select-none"
              onClick={() => toggleStage(stageKey)}
            >
              <div 
                className="flex items-center justify-between select-none"
              >
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 hover:text-teal-600 transition-colors">
                  <Layers className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>{(stage["Workflow Stage"] || "Unnamed Stage").replace(/^\d+\.\s*/, '')}</span>
                </span>
                
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const deliverablesList = (() => {
                      const str = String(stage["Deliverables"] || "");
                      let items = str.split(/[\n|;]+/);
                      if (items.length === 1 && str.includes(',')) {
                        items = str.split(',');
                      }
                      return items.map(item => item.trim()).filter(item => item.length > 0);
                    })();
                    
                    if (deliverablesList.length === 0) return null;

                    const stageNameVal = stage["Workflow Stage"] || "";
                    const cleanStageName = stageNameVal.replace(/^\d+\.\s*/, '');

                    const targetCourseCode = String(courseCode || batch?.["Course Code"] || "").trim().toUpperCase();
                    const targetBatchNum = String(batch?.["Batch Number"] || batch?.["Batch"] || "").trim().toUpperCase();

                    const submittedCount = deliverablesList.filter(item => {
                      const normItem = item.trim().toUpperCase();
                      return documents.some(doc => {
                        const tag = String(doc["Tag"] || "").toUpperCase();
                        const title = String(doc["Documents Title"] || doc["Document Title"] || doc["Title"] || "").toUpperCase();
                        const docCourseCode = String(doc["Course Code"] || "").trim().toUpperCase();
                        const docBatchNum = String(doc["Batch Number"] || doc["Batch"] || "").trim().toUpperCase();

                        if (targetCourseCode) {
                          const matchesCourse = 
                            docCourseCode === targetCourseCode || 
                            tag.includes(targetCourseCode) || 
                            title.includes(targetCourseCode);
                          if (!matchesCourse) return false;
                        }

                        if (viewType === 'batch' && targetBatchNum) {
                          const matchesBatch = 
                            docBatchNum === targetBatchNum || 
                            tag.includes(`BATCH ${targetBatchNum}`) || 
                            tag.includes(`BATCH-${targetBatchNum}`) || 
                            tag.includes(`BATCH:${targetBatchNum}`) || 
                            tag.includes(`BATCH ${targetBatchNum},`) || 
                            tag.includes(`BATCH ${targetBatchNum} `) ||
                            title.includes(`BATCH ${targetBatchNum}`) ||
                            title.includes(`BATCH-${targetBatchNum}`);
                          if (!matchesBatch) return false;
                        }

                        if (targetCourseCode) {
                          const cPrefix = `${targetCourseCode}-${stageNameVal}-${item}`.toUpperCase();
                          if (tag.startsWith(cPrefix)) return true;
                          if (targetBatchNum) {
                            const bPrefix = `${targetCourseCode}-${targetBatchNum}-${stageNameVal}-${item}`.toUpperCase();
                            if (tag.startsWith(bPrefix)) return true;
                          }
                        }

                        const normStage = stageNameVal.trim().toUpperCase();
                        const normCleanStage = cleanStageName.trim().toUpperCase();

                        const titleMatches = title === normItem || title.includes(normItem) || tag.includes(normItem);
                        const stageMatches = !normStage || tag.includes(normStage) || tag.includes(normCleanStage) || title.includes(normStage) || title.includes(normCleanStage);

                        return titleMatches && stageMatches;
                      });
                    }).length;

                    const allSubmitted = submittedCount === deliverablesList.length;
                    const someSubmitted = submittedCount > 0;

                    return (
                      <button
                        type="button"
                        onClick={() => {
                          if (onViewDocuments) {
                            const cleanStage = (stage["Workflow Stage"] || "").replace(/^\d+\.\s*/, '');
                            const fullStage = stage["Workflow Stage"] || "";
                            onViewDocuments(cleanStage || fullStage);
                          }
                        }}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full cursor-pointer transition-colors ${allSubmitted ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' : someSubmitted ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {submittedCount}/{deliverablesList.length}
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStage(stageKey);
                    }}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-250 ease-out ${isStageExpanded ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isStageExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="pt-2.5 mt-2 border-t border-slate-100 space-y-2.5">
                      {/* Deliverables */}
                      {stage["Deliverables"] && (() => {
                        const deliverablesList = (() => {
                          const str = String(stage["Deliverables"] || "");
                          let items = str.split(/[\n|;]+/);
                          if (items.length === 1 && str.includes(',')) {
                            items = str.split(',');
                          }
                          return items.map(item => item.trim()).filter(item => item.length > 0);
                        })();

                        if (deliverablesList.length === 0) return null;

                        return (
                          <div className="text-[9px] leading-relaxed pl-5">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              {deliverablesList.map((item, index) => {
                                const stageNameVal = stage["Workflow Stage"] || "";
                                const matchingDoc = findMatchingDocument(stageNameVal, item);
                                const hasDoc = !!matchingDoc;

                                return (
                                  <React.Fragment key={index}>
                                    {index > 0 && <span className="text-slate-300 font-light select-none">|</span>}
                                    <div className="inline-flex items-center gap-1">
                                      {hasDoc && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (onViewFile) {
                                                onViewFile(matchingDoc["File Link"] || matchingDoc["Link"] || "", matchingDoc["Documents Title"] || matchingDoc["Title"] || item, matchingDoc);
                                              } else {
                                                setViewingDoc(matchingDoc);
                                              }
                                            }}
                                            className="text-teal-600 hover:text-teal-800 transition-colors cursor-pointer p-0.5 bg-teal-50 hover:bg-teal-100 rounded inline-flex items-center justify-center"
                                            title={`View document: ${matchingDoc["Documents Title"] || item}`}
                                          >
                                            <Eye className="w-2.5 h-2.5" />
                                          </button>
                                           {onSaveDocument && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedDeliverable(item);
                                                setSelectedStageName(stageNameVal);
                                                setDocTitle(matchingDoc["Documents Title"] || matchingDoc["Title"] || matchingDoc["Document Title"] || `${item} - ${(batch && batch["Batch Number"]) || courseCode || ""}`);
                                                setFileLink(matchingDoc["File Link"] || matchingDoc["Link"] || "");
                                                setDocNote(getNoteFromDoc(matchingDoc));
                                                setEditingDoc(matchingDoc);
                                                setErrorMsg("");
                                                setIsUploadModalOpen(true);
                                              }}
                                              className="text-amber-600 hover:text-amber-800 transition-colors cursor-pointer p-0.5 bg-amber-50 hover:bg-amber-100 rounded inline-flex items-center justify-center"
                                              title={`Change / Update document for ${item}`}
                                            >
                                              <Upload className="w-2.5 h-2.5" />
                                            </button>
                                          )}
                                        </>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (hasDoc) {
                                            if (onViewFile) {
                                              onViewFile(matchingDoc["File Link"] || matchingDoc["Link"] || "", matchingDoc["Documents Title"] || matchingDoc["Title"] || item, matchingDoc);
                                            } else {
                                              setViewingDoc(matchingDoc);
                                            }
                                          } else if (batch && onSaveDocument) {
                                            setSelectedDeliverable(item);
                                            setSelectedStageName(stageNameVal);
                                            setDocTitle(`${item} - ${batch["Batch Number"] || courseCode || ""}`);
                                            setFileLink("");
                                            setDocNote("");
                                            setEditingDoc(null);
                                            setErrorMsg("");
                                            setIsUploadModalOpen(true);
                                          }
                                        }}
                                        className="text-teal-600 hover:text-teal-800 hover:underline transition-colors cursor-pointer font-semibold inline-flex items-center gap-0.5"
                                        title={hasDoc ? `View ${item}` : `Upload document for ${item}`}
                                      >
                                        <span>{item}</span>
                                        {hasDoc ? (
                                          <Check className="w-2 h-2 text-teal-600 shrink-0" />
                                        ) : (
                                          <Plus className="w-2 h-2 text-teal-400 shrink-0" />
                                        )}
                                      </button>
                                    </div>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Assignees */}
                      {(() => {
                        const assignedIds = stageAssignments[stage["ID"]] || getStageAssignment(stageAssignments, stage["Workflow Stage"] || "Unnamed Stage") || [];
                        
                        return isEditing ? (
                          <div className="space-y-2 pl-5">
                            <EmployeeMultiSelect
                              selectedIds={assignedIds}
                              onChange={(ids) => onStageAssignmentChange(stage["ID"], ids)}
                              employees={employees}
                              placement={placement}
                            />
                            {assignedIds.length > 0 && (
                              <div className="pt-2 border-t border-slate-100 space-y-1.5 mt-2">
                                {assignedIds.map((id) => {
                                  const [empIdStr, assignedDate] = String(id).split('|');
                                  const emp = employees.find(e => String(e['Employee ID'] || '').trim() === empIdStr.trim());
                                  if (!emp) return null;
                                  const designation = emp['Designation'] || emp['Administrative Designation'] || emp['Administrative'] || '';
                                  return (
                                    <div key={id} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded border border-slate-100" title={emp['Employee Name']}>
                                      <img 
                                        src={getPhotoUrl(emp)} 
                                        alt={emp['Employee Name']}
                                        className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200/50"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp['Employee Name'] || 'User');
                                        }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[11px] font-bold text-slate-800 block truncate leading-snug">
                                            {emp['Employee Name']}
                                          </span>
                                          {assignedDate && (
                                            <span className="text-[9px] text-teal-600 bg-teal-50 px-1 py-0.5 rounded border border-teal-100 whitespace-nowrap ml-1">
                                              {formatToMmmDdYyyy(assignedDate)}
                                            </span>
                                          )}
                                        </div>
                                        {designation && (
                                          <span className="text-[9px] text-slate-500 block truncate leading-none mt-0.5">
                                            {designation}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          assignedIds.length > 0 ? (
                            <div className="space-y-1.5 pl-5">
                              {assignedIds.map((id) => {
                                const [empIdStr, assignedDate] = String(id).split('|');
                                const emp = employees.find(e => String(e['Employee ID'] || '').trim() === empIdStr.trim());
                                if (!emp) return null;
                                const designation = emp['Designation'] || emp['Administrative Designation'] || emp['Administrative'] || '';
                                return (
                                  <div key={id} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded border border-slate-100" title={emp['Employee Name']}>
                                    <img 
                                      src={getPhotoUrl(emp)} 
                                      alt={emp['Employee Name']}
                                      className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200/50"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp['Employee Name'] || 'User');
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[11px] font-bold text-slate-800 block truncate leading-snug">
                                          {emp['Employee Name']}
                                        </span>
                                        {assignedDate && (
                                          <span className="text-[9px] text-teal-600 bg-teal-50 px-1 py-0.5 rounded border border-teal-100 whitespace-nowrap ml-1">
                                            {formatToMmmDdYyyy(assignedDate)}
                                          </span>
                                        )}
                                      </div>
                                      {designation && (
                                        <span className="text-[9px] text-slate-500 block truncate leading-none mt-0.5">
                                          {designation}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[8px] text-slate-400 italic block mt-1 pl-5">No employee assigned</span>
                          )
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

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
                        onChange={handleFileUpload}
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
      {/* Viewing Document Details Modal */}
      <AnimatePresence>
        {viewingDoc && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col"
            >
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Document Details
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate max-w-[280px]">
                    {viewingDoc["Tag"] || "Course / Batch Document"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Document Title</span>
                  <p className="text-xs font-bold text-slate-800">
                    {viewingDoc["Documents Title"] || viewingDoc["Document Title"] || viewingDoc["Title"] || "Untitled Document"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date</span>
                    <p className="text-xs font-medium text-slate-700">
                      {viewingDoc["Date"] ? viewingDoc["Date"] : "N/A"}
                    </p>
                  </div>
                  {viewingDoc["Tag"] && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tag</span>
                      <p className="text-xs font-medium text-teal-600 truncate">
                        {viewingDoc["Tag"]}
                      </p>
                    </div>
                  )}
                </div>

                {(viewingDoc["File Link"] || viewingDoc["Link"]) ? (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">File Link / URL</span>
                    <div className="bg-teal-50/50 border border-teal-100 rounded-lg p-2.5 flex items-center justify-between">
                      <a
                        href={viewingDoc["File Link"] || viewingDoc["Link"]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-700 font-medium truncate max-w-[260px] hover:underline flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0 text-teal-600" />
                        <span className="truncate">{viewingDoc["File Link"] || viewingDoc["Link"]}</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No file link attached.</p>
                )}
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex justify-end gap-2 shrink-0">
                {(viewingDoc["File Link"] || viewingDoc["Link"]) && (
                  <a
                    href={viewingDoc["File Link"] || viewingDoc["Link"]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 no-underline"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open Document</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
