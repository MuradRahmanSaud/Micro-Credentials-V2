import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Edit2, Save, Loader2, Maximize2, Minimize2, ChevronLeft, ChevronRight, Activity, Calendar, Users, Briefcase, FileText, Check, Plus, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatToMmmDdYyyy, isBatchRunning, parseWorkflowAndStages, serializeWorkflowAndStages, parseWorkflowTitle, getPhotoUrl, parseRemarks, RemarkEntry } from '../lib/utils';
import BatchDetailsView from './BatchDetailsView';
import WorkflowTimeline from './WorkflowTimeline';
import WorkflowMultiSelector from './WorkflowMultiSelector';
import EmployeeSearchableSelect from './EmployeeSearchableSelect';

export interface MCBatchDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onSelectBatch?: (batch: any) => void;
  allBatches?: any[];
  onSave: (formData: any, editingRow: any | null) => Promise<void>;
  employees?: any[];
  courses?: any[];
  documents?: any[];
  workflowData?: any[];
  extraFormProps?: any;
  initialExpanded?: boolean;
  headers?: string[];
}

export default function MCBatchDetails({
  isOpen,
  onClose,
  data,
  onSelectBatch,
  allBatches = [],
  onSave,
  employees = [],
  courses = [],
  documents = [],
  workflowData = [],
  extraFormProps = {},
  initialExpanded = true,
  headers = []
}: MCBatchDetailsProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editedData, setEditedData] = useState<any>(data || {});
  const [activeTab, setActiveTab] = useState<'routine' | 'workflow' | 'info' | 'financial' | 'documents'>('routine');
  const [localStages, setLocalStages] = useState<any[]>([]);

  const [newRemarkDate, setNewRemarkDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newRemarkEmployee, setNewRemarkEmployee] = useState<string>("");
  const [newRemarkText, setNewRemarkText] = useState<string>("");
  const [isSavingRemark, setIsSavingRemark] = useState(false);
  const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  const handleAddRemark = async () => {
    if (!newRemarkDate || !newRemarkEmployee || !newRemarkText.trim()) {
      alert("Please fill all fields for the remark.");
      return;
    }
    setIsSavingRemark(true);
    
    const currentRemarks = parseRemarks(editedData?.['Remarks']);
    const newRemark: RemarkEntry = {
      id: Date.now().toString(),
      date: newRemarkDate,
      employeeName: newRemarkEmployee,
      text: newRemarkText.trim()
    };
    
    const updatedRemarks = [newRemark, ...currentRemarks];
    const remarksStr = JSON.stringify(updatedRemarks);

    const newEditedData = {
      ...editedData,
      'Remarks': remarksStr
    };
    
    setEditedData(newEditedData);

    setNewRemarkText("");
    setNewRemarkEmployee("");
    setNewRemarkDate(new Date().toISOString().split('T')[0]);
    setIsAddRemarkOpen(false);

    if (onSave) {
       try {
         await onSave(newEditedData, data);
       } catch (err) {
         console.error("Failed to save remark", err);
         alert("Failed to save remark");
       }
    }

    setIsSavingRemark(false);
  };

  useEffect(() => {
    if (data) {
      setEditedData(data);
      setIsEditing(false);
    }
  }, [data]);

  useEffect(() => {
    if (isOpen) {
      setIsExpanded(initialExpanded);
    }
  }, [isOpen, initialExpanded]);

  const batchesList = useMemo(() => {
    if (Array.isArray(allBatches) && allBatches.length > 0) return allBatches;
    return data ? [data] : [];
  }, [allBatches, data]);

  const currentIndex = useMemo(() => {
    if (!data) return -1;
    const currentCode = String(data["Course Code"] || "").trim().toLowerCase();
    const currentBatchNo = String(data["Batch Number"] || "").trim().toLowerCase();
    return batchesList.findIndex((b) => {
      const bCode = String(b["Course Code"] || "").trim().toLowerCase();
      const bNo = String(b["Batch Number"] || "").trim().toLowerCase();
      return (bCode === currentCode && bNo === currentBatchNo) || b === data;
    });
  }, [batchesList, data]);

  const parentCourse = useMemo(() => {
    const code = editedData?.["Course Code"] || data?.["Course Code"] || "";
    if (!code) return null;
    return (courses || []).find((c) => String(c["Course Code"] || "").trim().toLowerCase() === String(code).trim().toLowerCase());
  }, [courses, editedData, data]);

  const parsedWorkflows = useMemo(() => {
    if (!Array.isArray(workflowData)) return [];
    return workflowData.map((row, idx) => {
      const idKey = Object.keys(row).find((h) => {
        const cleaned = h.trim().toLowerCase();
        return cleaned === "workflow title" || cleaned === "title";
      }) || Object.keys(row)[0] || "Workflow Title";

      const rawText = String(row[idKey] || "");
      const rowId = row["ID"] || row["id"] || row["Workflow ID"] || `row-${idx}`;
      const structured = parseWorkflowTitle(rawText, String(rowId));
      return {
        id: structured.id,
        title: structured.title || rawText || "",
        stages: structured.stages || [],
        rawText
      };
    }).filter((item) => item.title.trim() !== "");
  }, [workflowData]);

  // Load stages when workflow changes
  useEffect(() => {
    const batchWorkflow = editedData?.['Workflow'] || editedData?.['Publication Workflow'] || data?.['Workflow'] || data?.['Publication Workflow'] || parentCourse?.['Workflow'] || parentCourse?.['Publication Workflow'] || "";
    if (!batchWorkflow || !parsedWorkflows || parsedWorkflows.length === 0) {
      setLocalStages([]);
      return;
    }

    const { jobTitle, stageAssignments } = parseWorkflowAndStages(batchWorkflow);
    const assignedStageIds = new Set(Object.keys(stageAssignments));

    const rawTokens = jobTitle
      ? jobTitle.split(/[,&+]/).map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const mappedStages: any[] = [];
    let overallIdx = 1;

    parsedWorkflows.forEach(wf => {
      const wfIdLower = (wf.id || '').trim().toLowerCase();
      const wfTitleLower = (wf.title || '').trim().toLowerCase();

      const isTitleMatch = rawTokens.some(
        t => t === wfIdLower || t === wfTitleLower || wfTitleLower.includes(t) || t.includes(wfTitleLower)
      );

      const matchingStages = (wf.stages || []).filter(
        s => assignedStageIds.has(s.id) || assignedStageIds.has(`${wf.id}::${s.id}`)
      );
      const isStageMatch = matchingStages.length > 0;

      if (isTitleMatch || isStageMatch) {
        (wf.stages || []).forEach(stage => {
          const stageKey = `${wf.id}::${stage.id}`;
          const isIncluded = isStageMatch
            ? (assignedStageIds.has(stage.id) || assignedStageIds.has(stageKey))
            : true;

          if (isIncluded) {
            let name = stage.stageName || "Unnamed Stage";
            const cleanName = name.replace(/^\d+\.\s*/, '').trim();
            const displayStageName = `${overallIdx}. ${cleanName}`;
            overallIdx++;

            mappedStages.push({
              "ID": stage.id,
              "StageKey": stageKey,
              "Job Title": wf.id,
              "Workflow Title": wf.title,
              "Workflow Stage": displayStageName,
              "Key Task": (stage.tasks || []).join('\n'),
              "Tasks": stage.tasks || [],
              "Key Responsibilities": (stage.tasks || []).join(', '),
              "Deliverables": (stage.deliverables || []).join(', ')
            });
          }
        });
      }
    });

    setLocalStages(mappedStages);
  }, [editedData, data, parentCourse, parsedWorkflows]);

  const handleNavigateBatch = useCallback((direction: 'prev' | 'next') => {
    if (currentIndex === -1 || batchesList.length === 0) return;
    let targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex >= 0 && targetIndex < batchesList.length) {
      const targetBatch = batchesList[targetIndex];
      if (onSelectBatch) {
        onSelectBatch(targetBatch);
      }
    }
  }, [currentIndex, batchesList, onSelectBatch]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable
        )
      ) {
        return;
      }

      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavigateBatch('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavigateBatch('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleNavigateBatch]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      if (onSave) {
        await onSave(editedData, data);
      }
      setIsEditing(false);
    } catch (e) {
      console.error("Failed to save batch details:", e);
      alert("Failed to save batch. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen || !data) return null;

  const courseTitle = editedData?.["Course Title"] || parentCourse?.["Course Title"] || editedData?.["Course Code"] || data?.["Course Code"] || "Untitled Batch";
  const batchNumber = editedData?.["Batch Number"] || data?.["Batch Number"] || "Batch-01";
  const courseCode = editedData?.["Course Code"] || data?.["Course Code"] || parentCourse?.["Course Code"] || "CODE";
  const mode = editedData?.["Mode"] || data?.["Mode"] || parentCourse?.["Mode"] || "Online";
  const status = editedData?.["Status"] || data?.["Status"] || (isBatchRunning(data) ? "Running" : "Active");
  const bannerUrl = editedData?.["Banner"] || data?.["Banner"] || parentCourse?.["Banner"] || "";

  let displayBannerUrl = bannerUrl;
  const fileIdMatch = bannerUrl?.match(/[-\w]{25,}/);
  if (fileIdMatch && bannerUrl?.includes("drive.google.com")) {
    displayBannerUrl = `https://drive.google.com/thumbnail?id=${fileIdMatch[0]}&sz=w1000`;
  }

  const renderBannerContent = () => (
    <div className={cn("group/banner overflow-hidden relative", isExpanded ? "rounded-t-xl w-full" : "rounded-lg border border-slate-200/80 shadow-xs")}>
      <div className={cn(
        "w-full relative bg-teal-900 flex items-center justify-center overflow-hidden transition-all duration-200",
        isExpanded ? "rounded-t-xl" : "rounded-lg",
        isEditing ? "min-h-[135px] md:min-h-[145px]" : "min-h-[110px] md:min-h-[120px]"
      )}>
        {displayBannerUrl ? (
          <img
            src={displayBannerUrl}
            alt="Batch Banner"
            className={cn("absolute inset-0 w-full h-full object-cover", isExpanded ? "rounded-t-xl" : "rounded-lg")}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-teal-900 via-slate-900 to-teal-800" />
        )}

        {/* Glass Effect Overlay */}
        <div className={cn(
          "absolute inset-0 z-10 bg-black/40 backdrop-blur-md border border-white/10 flex flex-col justify-between transition-all duration-200 overflow-hidden",
          isExpanded ? "rounded-t-xl" : "rounded-lg",
          isEditing ? "p-2.5 md:p-3" : "p-3 md:p-3.5"
        )}>
          {/* Top Control Bar */}
          <div className="flex items-center justify-between w-full z-20">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-all border border-white/10 cursor-pointer shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center"
                  title="Collapse to Side View"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-all border border-white/10 cursor-pointer shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center"
                  title="Expand to Full View"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isEditing ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-xs transition-all border border-white/20 cursor-pointer shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center"
                    title="Edit Batch"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-xs transition-all border border-white/20 cursor-pointer shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedData(data);
                    }}
                    disabled={isSubmitting}
                    className="px-2 py-0.5 text-[10.5px] font-semibold text-white bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded transition-all uppercase disabled:opacity-50 cursor-pointer h-6 flex items-center"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-teal-500 hover:bg-teal-600 text-white rounded border border-teal-400 text-[10.5px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow cursor-pointer h-6"
                  >
                    {isSubmitting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Save className="w-2.5 h-2.5" />}
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Title & Badges */}
          <div className={cn("flex flex-col w-full mt-1", isEditing ? "gap-1" : "gap-1.5")}>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-1.5">
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className="px-1.5 py-0.5 bg-teal-500 text-white text-[9px] font-bold uppercase tracking-wider rounded shadow-xs">
                    {mode}
                  </span>
                  <span className="px-1.5 py-0.5 bg-amber-500/90 text-white text-[9px] font-bold uppercase tracking-wider rounded shadow-xs">
                    {batchNumber}
                  </span>
                  <span className="px-1.5 py-0.5 bg-white/15 text-white/90 text-[9px] font-bold uppercase tracking-wider rounded border border-white/10 font-mono">
                    {courseCode}
                  </span>
                </div>

                <h2 className="text-base md:text-lg font-bold text-white uppercase tracking-wider leading-tight drop-shadow-md truncate">
                  {courseTitle} — <span className="text-teal-200">{batchNumber}</span>
                </h2>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-white/80">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-medium uppercase tracking-widest opacity-60">Status</span>
                    <span className="text-[11px] font-bold uppercase text-teal-200">{status}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-medium uppercase tracking-widest opacity-60">Start Date</span>
                    <span className="text-[11px] font-medium uppercase font-mono">{formatToMmmDdYyyy(editedData?.["Start Date"] || data?.["Start Date"])}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-medium uppercase tracking-widest opacity-60">End Date</span>
                    <span className="text-[11px] font-medium uppercase font-mono">{formatToMmmDdYyyy(editedData?.["End Date"] || data?.["End Date"])}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-medium uppercase tracking-widest opacity-60">Students</span>
                    <span className="text-[11px] font-bold uppercase">{editedData?.["Student"] || data?.["Student"] || "0"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          layout
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 26,
            mass: 0.9
          }}
          className={cn(
            "z-50 bg-gradient-to-br from-slate-50 via-white to-teal-50 overflow-hidden flex flex-col",
            isExpanded
              ? "absolute inset-0 lg:flex-row shadow-xl"
              : "absolute top-0 right-0 bottom-0 w-[480px] max-w-full border-l border-slate-200 shadow-none"
          )}
        >
          {/* Main Left Section */}
          <motion.div
            layout
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 26,
              mass: 0.9
            }}
            className={cn(
              "flex flex-col overflow-hidden",
              isExpanded
                ? "flex-1 h-full border-r border-slate-100"
                : "shrink-0 w-full z-40 bg-transparent"
            )}
          >
            {!isExpanded ? (
              <div className="shrink-0 p-3 pb-0 z-40 bg-transparent">
                {renderBannerContent()}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto no-scrollbar p-3 flex flex-col min-h-0">
                <div className="w-full min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
                  {/* Banner inside panel */}
                  <div className="w-full border-b border-slate-200 shrink-0 rounded-t-xl overflow-hidden">
                    {renderBannerContent()}
                  </div>

                  {/* Header info bar */}
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50/50 gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Batch Information</span>
                      <span className="text-[10px] font-bold text-teal-700 font-mono bg-teal-50 border border-teal-200/80 px-1.5 py-0.5 rounded">
                        {batchNumber} ({courseCode})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {batchesList.length > 1 && (
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-600 shadow-2xs">
                          <button
                            onClick={() => handleNavigateBatch('prev')}
                            disabled={currentIndex <= 0}
                            title="Previous Batch"
                            className={cn(
                              "p-0.5 rounded transition-colors",
                              currentIndex <= 0 ? "opacity-30 cursor-not-allowed" : "hover:text-teal-600 hover:bg-slate-100 cursor-pointer"
                            )}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-bold font-mono px-1 text-slate-500 select-none">
                            {currentIndex !== -1 ? `${currentIndex + 1}/${batchesList.length}` : ''}
                          </span>
                          <button
                            onClick={() => handleNavigateBatch('next')}
                            disabled={currentIndex >= batchesList.length - 1}
                            title="Next Batch"
                            className={cn(
                              "p-0.5 rounded transition-colors",
                              currentIndex >= batchesList.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:text-teal-600 hover:bg-slate-100 cursor-pointer"
                            )}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Batch Details Body with BatchDetailsView */}
                  <div className="w-full flex-1 bg-white flex flex-col min-h-0 overflow-y-auto no-scrollbar">
                    <BatchDetailsView
                      batch={editedData}
                      allBatches={allBatches}
                      employees={employees}
                      isEditing={isEditing}
                      onSaveBatch={async (updatedData) => {
                        setEditedData(updatedData);
                        if (onSave) await onSave(updatedData, data);
                      }}
                      workflowData={workflowData}
                      documents={documents}
                      onSaveDocument={extraFormProps?.onSaveDocument}
                      courseFee={parentCourse?.["Course Fee"] || editedData?.["Course Fee"]}
                      expensesData={extraFormProps?.expensesData}
                      onSaveExpense={extraFormProps?.onSaveExpense}
                      expensesHeaders={extraFormProps?.expensesHeaders}
                      onViewFile={extraFormProps?.onViewFile}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Sidebar: Batch Activities & Workflow */}
          <motion.div
            layout
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 26,
              mass: 0.9
            }}
            className={cn(
              "bg-white flex flex-col overflow-hidden",
              isExpanded
                ? "w-full lg:w-[320px] xl:w-[360px] shrink-0 border-l border-slate-100 h-full"
                : "flex-1 border-t border-slate-100"
            )}
          >
            {/* Sidebar Header */}
            <div className="bg-slate-50/80 border-b border-slate-200 shrink-0 px-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Remarks
                </h3>
              </div>
              <button
                onClick={() => setIsAddRemarkOpen(!isAddRemarkOpen)}
                className="flex items-center gap-1 text-[11px] font-bold uppercase text-teal-600 hover:text-teal-700 tracking-wider transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> {isAddRemarkOpen ? "Close" : "Add"}
              </button>
            </div>

            {/* Sidebar Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
              {isAddRemarkOpen && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={newRemarkDate}
                      onChange={(e) => setNewRemarkDate(e.target.value)}
                      className="text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500 w-full"
                    />
                    <EmployeeSearchableSelect
                      employees={employees}
                      value={newRemarkEmployee}
                      onChange={setNewRemarkEmployee}
                      placeholder="Select Employee"
                    />
                  </div>
                  <textarea
                    value={newRemarkText}
                    onChange={(e) => setNewRemarkText(e.target.value)}
                    className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded px-3 py-2 focus:border-teal-500 outline-none resize-none"
                    placeholder="Enter remark..."
                    rows={3}
                  />
                  <button
                    onClick={handleAddRemark}
                    disabled={isSavingRemark}
                    className="w-full py-1.5 bg-teal-600 text-white text-xs font-bold rounded hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {isSavingRemark ? "Saving..." : "Save Remark"}
                  </button>
                </div>
              )}
              {parseRemarks(editedData?.['Remarks']).map((remark: any) => {
                const emp = employees.find(e => e['Employee Name'] === remark.employeeName);
                return (
                  <div key={remark.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        {emp && <img src={getPhotoUrl(emp['Photo'])} alt={remark.employeeName} className="w-7 h-7 rounded-full object-cover" />}
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-slate-800">{remark.employeeName}</span>
                          {emp && <span className="text-[10px] text-slate-500">{emp['Designation']}</span>}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">{remark.date}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{remark.text}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
