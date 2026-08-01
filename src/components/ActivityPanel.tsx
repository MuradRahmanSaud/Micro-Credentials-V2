import React, { useMemo, useState, useEffect, useRef } from "react";
import Table from "./Table";
import { parseWorkflowAndStages, parseWorkflowTitle, serializeWorkflowAndStages, cn, formatToMmmDdYyyy } from "../lib/utils";
import { Pencil, User, ChevronDown, Calendar, Clock, ClipboardList, CheckCircle2, ShieldCheck, Layers, BookOpen, AlertCircle, FileText, CheckSquare, Sparkles } from "lucide-react";
import { ActivityDetailView } from "./ActivityDetailView";
import { AnimatePresence } from "motion/react";

interface ActivityPanelProps {
  courseData: any[];
  mcBatchData: any[];
  employees: any[];
  workflowData: any[];
  onSaveCourse: (formData: any, editingRow: any | null) => Promise<void>;
  onSaveBatch: (formData: any, editingRow: any | null) => Promise<void>;
  documents?: any[];
  onSaveDocument?: (formData: any, editingRow: any | null) => Promise<void>;
  onViewFile?: (url: string, title: string, doc?: any) => void;
  fileLocation?: any;
}

// Dummy FormPanel to satisfy Table requirements
const EmptyPanel = () => null;

const getThumbnail = (photoUrl: string) => {
  if (!photoUrl) return "";
  const fileIdMatch = photoUrl.match(/[-\w]{25,}/);
  if (fileIdMatch) {
    return `https://drive.google.com/thumbnail?id=${fileIdMatch[0]}&sz=w200`;
  }
  return photoUrl;
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

const EditableDateCell = ({
  initialValue,
  onSaveDate
}: {
  initialValue: string;
  onSaveDate: (newDate: string) => Promise<void>;
}) => {
  const [val, setVal] = useState(() => {
    if (!initialValue || initialValue === "-") return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(initialValue)) return initialValue;
    const d = new Date(initialValue);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  const handleSave = async (newDate: string) => {
    try {
      await onSaveDate(newDate);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        type="date"
        value={val}
        onChange={(e) => {
            const newDate = e.target.value;
            setVal(newDate);
            handleSave(newDate);
        }}
        className="px-1.5 py-0.5 text-[11px] bg-white border border-gray-300 rounded text-gray-700 focus:outline-none focus:border-teal-500 cursor-pointer shadow-sm w-32 font-medium"
      />
    </div>
  );
};

const EditableEmployeeCell = ({
  currentEmpId,
  currentEmpName,
  employees,
  onSaveEmployee
}: {
  currentEmpId: string;
  currentEmpName: string;
  employees: any[];
  onSaveEmployee: (newEmpId: string) => Promise<void>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const filteredEmployees = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return employees;
    return employees.filter(emp => {
      const name = String(emp["Employee Name"] || "").toLowerCase();
      const id = String(emp["Employee ID"] || "").toLowerCase();
      const designation = String(emp["Designation"] || "").toLowerCase();
      return name.includes(term) || id.includes(term) || designation.includes(term);
    });
  }, [employees, search]);

  const handleSelect = async (newEmpId: string) => {
    if (newEmpId === currentEmpId) {
      setIsOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSaveEmployee(newEmpId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full" onClick={(e) => e.stopPropagation()}>
      <div
        onClick={() => !isSaving && setIsOpen(!isOpen)}
        className={cn(
          "px-2 py-1.5 text-[11px] border border-gray-300 rounded focus:border-teal-500 outline-none bg-white cursor-pointer font-medium flex items-center justify-between shadow-xs hover:border-gray-400 hover:shadow-xs transition-all w-full min-w-[160px] max-w-[220px]",
          isSaving && "opacity-60 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="truncate text-gray-800 font-bold">{currentEmpName}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1.5" />
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 flex flex-col w-64 max-h-64 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100 flex items-center gap-1.5 shrink-0 bg-gray-50/50">
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[11px] outline-none focus:border-teal-500"
              autoFocus
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto py-1 max-h-48 no-scrollbar flex-1">
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp, idx) => {
                const id = String(emp["Employee ID"] || "");
                const isSelected = id === currentEmpId;
                const photo = emp["Photo"];
                const thumb = getThumbnail(photo);

                return (
                  <div
                    key={`${id}-${idx}`}
                    onClick={() => handleSelect(id)}
                    className={cn(
                      "px-3 py-1.5 cursor-pointer flex items-center gap-2 transition-colors",
                      isSelected
                        ? "bg-teal-50 text-teal-950 font-bold"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <div className="w-6 h-6 rounded bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {photo ? (
                        <img
                          src={thumb}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-[8px] text-gray-400 font-bold">Pic</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] truncate">{emp["Employee Name"]}</div>
                      <div className="text-[9px] text-gray-400 truncate">{emp["Designation"]}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">
                No employees found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function ActivityPanel({ 
  courseData, 
  mcBatchData, 
  employees, 
  workflowData,
  onSaveCourse,
  onSaveBatch,
  documents,
  onSaveDocument,
  onViewFile
}: ActivityPanelProps) {
  const [isEditing, setIsEditing] = useState(false);

  const getDocStatus = (doc: any) => {
    if (!doc) return { text: "Pending", color: "bg-transparent text-slate-500 font-bold" };
    const tag = String(doc["Tag"] || "").toUpperCase();
    const status = String(doc["Status"] || "").toUpperCase();
    const combined = `${tag} ${status}`;
    if (combined.includes("REVISION") || combined.includes("REVISION REQUIRED")) return { text: "Revision", color: "bg-transparent text-amber-600 font-bold" };
    if (combined.includes("VERIFIED") || combined.includes("JOB DONE") || combined.includes("APPROVED")) return { text: "Verified", color: "bg-transparent text-emerald-600 font-bold" };
    return { text: "Review", color: "bg-transparent text-teal-600 font-bold" };
  };

  const getAnyDocForActivity = (row: any) => {
    if (!documents) return null;
    const code = String(row["Course Code"] || row["Code"] || "N/A").toUpperCase();
    const batchNum = row["Batch Number"];
    const stageName = String(row["_actualStageName"] || "").replace(/^\d+\.\s*/, '').toUpperCase();
    const deliverables = row["deliverablesList"] || [];
    
    for (const deliv of deliverables) {
       const normDeliv = String(deliv).trim().toUpperCase();
       const doc = documents.find(d => {
          const title = String(d["Documents Title"] || d["Document Name"] || d["Title"] || "").toUpperCase();
          const tag = String(d["Tag"] || "").toUpperCase();
          const fullText = `${title} ${tag}`;

          const matchesDeliv = title === normDeliv || title.includes(normDeliv) || tag.includes(normDeliv) || fullText.includes(normDeliv);
          const matchesStage = !stageName || fullText.includes(stageName);
          const matchesCode = !code || code === "N/A" || code === "UNDEFINED" || fullText.includes(code);
          const matchesBatch = !batchNum || fullText.includes(String(batchNum));

          return matchesDeliv && matchesStage && matchesCode;
       });
       if (doc) return doc;
    }
    return null;
  };

  const handleSaveDeadline = async (activityRow: any, newDeadline: string) => {
    const isCourse = activityRow["Type"] === "Course";
    const code = activityRow["Code"];
    const batchNum = activityRow["Batch Number"];
    const stageName = activityRow["_stageName"];

    if (isCourse) {
      const originalCourse = courseData.find(c => c["Course Code"] === code);
      if (!originalCourse) return;

      const workflowStr = originalCourse["Workflow"] || originalCourse["Publication Workflow"] || "";
      const { jobTitle, stageAssignments } = parseWorkflowAndStages(workflowStr);

      let foundKey = Object.keys(stageAssignments).find(key => {
        const cleanKey = key.replace(/^\d+\.\s*/, '').trim();
        return cleanKey.toLowerCase() === stageName.toLowerCase();
      });

      if (!foundKey) {
        foundKey = stageName;
      }

      let currentAssignments = stageAssignments[foundKey] || [];
      if (currentAssignments.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        currentAssignments = [`|${today}|${newDeadline}`];
      } else {
        currentAssignments = currentAssignments.map(idStr => {
          const parts = String(idStr).split('|');
          const currentEmpId = parts[0].trim();
          const assignedDate = parts[1] || "";
          return `${currentEmpId}|${assignedDate}|${newDeadline}`;
        });
      }

      stageAssignments[foundKey] = currentAssignments;
      const updatedWorkflowStr = serializeWorkflowAndStages(jobTitle, stageAssignments);

      const updatedCourse = {
        ...originalCourse,
        "Workflow": updatedWorkflowStr,
        "Publication Workflow": updatedWorkflowStr
      };

      await onSaveCourse(updatedCourse, originalCourse);
    } else {
      const originalBatch = mcBatchData.find(b => b["Course Code"] === code && b["Batch Number"] === batchNum);
      if (!originalBatch) return;

      const workflowStr = originalBatch["Workflow"] || originalBatch["Publication Workflow"] || "";
      const { jobTitle, stageAssignments } = parseWorkflowAndStages(workflowStr);

      let foundKey = Object.keys(stageAssignments).find(key => {
        const cleanKey = key.replace(/^\d+\.\s*/, '').trim();
        return cleanKey.toLowerCase() === stageName.toLowerCase();
      });

      if (!foundKey) {
        foundKey = stageName;
      }

      let currentAssignments = stageAssignments[foundKey] || [];
      if (currentAssignments.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        currentAssignments = [`|${today}|${newDeadline}`];
      } else {
        currentAssignments = currentAssignments.map(idStr => {
          const parts = String(idStr).split('|');
          const currentEmpId = parts[0].trim();
          const assignedDate = parts[1] || "";
          return `${currentEmpId}|${assignedDate}|${newDeadline}`;
        });
      }

      stageAssignments[foundKey] = currentAssignments;
      const updatedWorkflowStr = serializeWorkflowAndStages(jobTitle, stageAssignments);

      const updatedBatch = {
        ...originalBatch,
        "Workflow": updatedWorkflowStr,
        "Publication Workflow": updatedWorkflowStr
      };

      await onSaveBatch(updatedBatch, originalBatch);
    }
  };

  const handleSaveAssignedDate = async (activityRow: any, newAssignedDate: string) => {
    const isCourse = activityRow["Type"] === "Course";
    const code = activityRow["Code"];
    const batchNum = activityRow["Batch Number"];
    const stageName = activityRow["_stageName"];

    if (isCourse) {
      const originalCourse = courseData.find(c => c["Course Code"] === code);
      if (!originalCourse) return;

      const workflowStr = originalCourse["Workflow"] || originalCourse["Publication Workflow"] || "";
      const { jobTitle, stageAssignments } = parseWorkflowAndStages(workflowStr);

      let foundKey = Object.keys(stageAssignments).find(key => {
        const cleanKey = key.replace(/^\d+\.\s*/, '').trim();
        return cleanKey.toLowerCase() === stageName.toLowerCase();
      });

      if (!foundKey) {
        foundKey = stageName;
      }

      let currentAssignments = stageAssignments[foundKey] || [];
      if (currentAssignments.length === 0) {
        currentAssignments = [`|${newAssignedDate}|`];
      } else {
        currentAssignments = currentAssignments.map(idStr => {
          const parts = String(idStr).split('|');
          const currentEmpId = parts[0].trim();
          const deadline = parts[2] || "";
          return `${currentEmpId}|${newAssignedDate}|${deadline}`;
        });
      }

      stageAssignments[foundKey] = currentAssignments;
      const updatedWorkflowStr = serializeWorkflowAndStages(jobTitle, stageAssignments);

      const updatedCourse = {
        ...originalCourse,
        "Workflow": updatedWorkflowStr,
        "Publication Workflow": updatedWorkflowStr
      };

      await onSaveCourse(updatedCourse, originalCourse);
    } else {
      const originalBatch = mcBatchData.find(b => b["Course Code"] === code && b["Batch Number"] === batchNum);
      if (!originalBatch) return;

      const workflowStr = originalBatch["Workflow"] || originalBatch["Publication Workflow"] || "";
      const { jobTitle, stageAssignments } = parseWorkflowAndStages(workflowStr);

      let foundKey = Object.keys(stageAssignments).find(key => {
        const cleanKey = key.replace(/^\d+\.\s*/, '').trim();
        return cleanKey.toLowerCase() === stageName.toLowerCase();
      });

      if (!foundKey) {
        foundKey = stageName;
      }

      let currentAssignments = stageAssignments[foundKey] || [];
      if (currentAssignments.length === 0) {
        currentAssignments = [`|${newAssignedDate}|`];
      } else {
        currentAssignments = currentAssignments.map(idStr => {
          const parts = String(idStr).split('|');
          const currentEmpId = parts[0].trim();
          const deadline = parts[2] || "";
          return `${currentEmpId}|${newAssignedDate}|${deadline}`;
        });
      }

      stageAssignments[foundKey] = currentAssignments;
      const updatedWorkflowStr = serializeWorkflowAndStages(jobTitle, stageAssignments);

      const updatedBatch = {
        ...originalBatch,
        "Workflow": updatedWorkflowStr,
        "Publication Workflow": updatedWorkflowStr
      };

      await onSaveBatch(updatedBatch, originalBatch);
    }
  };

  const handleSaveEmployee = async (activityRow: any, newEmpId: string) => {
    const isCourse = activityRow["Type"] === "Course";
    const code = activityRow["Code"];
    const batchNum = activityRow["Batch Number"];
    const stageName = activityRow["_stageName"];
    const oldEmpId = activityRow["Employee ID"];

    if (isCourse) {
      const originalCourse = courseData.find(c => c["Course Code"] === code);
      if (!originalCourse) return;

      const workflowStr = originalCourse["Workflow"] || originalCourse["Publication Workflow"] || "";
      const { jobTitle, stageAssignments } = parseWorkflowAndStages(workflowStr);

      let foundKey = Object.keys(stageAssignments).find(key => {
        const cleanKey = key.replace(/^\d+\.\s*/, '').trim();
        return cleanKey.toLowerCase() === stageName.toLowerCase();
      });

      if (!foundKey) {
        foundKey = stageName;
      }

      const currentAssignments = stageAssignments[foundKey] || [];
      if (currentAssignments.length === 0 || !oldEmpId) {
        const today = new Date().toISOString().split('T')[0];
        stageAssignments[foundKey] = [`${newEmpId}|${today}|`];
      } else {
        const updatedAssignments = currentAssignments.map(idStr => {
          const parts = String(idStr).split('|');
          const currentEmpId = parts[0].trim();
          if (currentEmpId === String(oldEmpId).trim()) {
            const assignedDate = parts[1] || "";
            const deadline = parts[2] || "";
            return `${newEmpId}|${assignedDate}|${deadline}`;
          }
          return idStr;
        });
        stageAssignments[foundKey] = updatedAssignments;
      }

      const updatedWorkflowStr = serializeWorkflowAndStages(jobTitle, stageAssignments);

      const updatedCourse = {
        ...originalCourse,
        "Workflow": updatedWorkflowStr,
        "Publication Workflow": updatedWorkflowStr
      };

      await onSaveCourse(updatedCourse, originalCourse);
    } else {
      const originalBatch = mcBatchData.find(b => b["Course Code"] === code && b["Batch Number"] === batchNum);
      if (!originalBatch) return;

      const workflowStr = originalBatch["Workflow"] || originalBatch["Publication Workflow"] || "";
      const { jobTitle, stageAssignments } = parseWorkflowAndStages(workflowStr);

      let foundKey = Object.keys(stageAssignments).find(key => {
        const cleanKey = key.replace(/^\d+\.\s*/, '').trim();
        return cleanKey.toLowerCase() === stageName.toLowerCase();
      });

      if (!foundKey) {
        foundKey = stageName;
      }

      const currentAssignments = stageAssignments[foundKey] || [];
      if (currentAssignments.length === 0 || !oldEmpId) {
        const today = new Date().toISOString().split('T')[0];
        stageAssignments[foundKey] = [`${newEmpId}|${today}|`];
      } else {
        const updatedAssignments = currentAssignments.map(idStr => {
          const parts = String(idStr).split('|');
          const currentEmpId = parts[0].trim();
          if (currentEmpId === String(oldEmpId).trim()) {
            const assignedDate = parts[1] || "";
            const deadline = parts[2] || "";
            return `${newEmpId}|${assignedDate}|${deadline}`;
          }
          return idStr;
        });
        stageAssignments[foundKey] = updatedAssignments;
      }

      const updatedWorkflowStr = serializeWorkflowAndStages(jobTitle, stageAssignments);

      const updatedBatch = {
        ...originalBatch,
        "Workflow": updatedWorkflowStr,
        "Publication Workflow": updatedWorkflowStr
      };

      await onSaveBatch(updatedBatch, originalBatch);
    }
  };

  const activityData = useMemo(() => {
    const activities: any[] = [];

    const parsedWorkflows = workflowData.map((item: any) => {
      const parsed = parseWorkflowTitle(item["Workflow Title"] || item["Title"] || "", item.id);
      return {
        id: item.id || parsed.id,
        title: parsed.title || item["Workflow Title"] || item.id,
        stages: parsed.stages || []
      };
    });

    const processWorkflow = (items: any[], type: string) => {
      items.forEach((item) => {
        const workflowStr = item["Workflow"] || item["Publication Workflow"] || "";
        if (!workflowStr) return;
        
        const { jobTitle, stageAssignments } = parseWorkflowAndStages(workflowStr);
        const assignedStageIds = new Set(Object.keys(stageAssignments));

        const rawTokens = jobTitle
          ? jobTitle.split(/[,&+]/).map(s => s.trim().toLowerCase()).filter(Boolean)
          : [];

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

        const stageMap = new Map<string, { id: string; stageName: string; tasks: string[]; deliverables: string[]; approval: string; assignedIds: string[] }>();

        // Process assigned keys first
        Object.entries(stageAssignments).forEach(([assignedKey, employeeIds]) => {
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
            stageMap.set(assignedKey, {
              id: assignedKey,
              stageName: foundStage.stageName || assignedKey,
              tasks: foundStage.tasks || [],
              deliverables: foundStage.deliverables || [],
              approval: foundStage.approval || "",
              assignedIds: employeeIds || []
            });
          } else {
            let displayFallback = assignedKey;
            if (assignedKey.includes('::')) {
              displayFallback = assignedKey.split('::')[1];
            }
            displayFallback = displayFallback.replace(/^\d+\.\s*/, '').trim();

            stageMap.set(assignedKey, {
              id: assignedKey,
              stageName: displayFallback,
              tasks: [],
              deliverables: [],
              approval: "",
              assignedIds: employeeIds || []
            });
          }
        });

        // Add any remaining unassigned stages from target workflows if stageAssignments was empty
        if (assignedStageIds.size === 0 && targetWorkflows.length > 0) {
          targetWorkflows.forEach(wf => {
            (wf.stages || []).forEach(s => {
              const stageKey = `${wf.id}::${s.id}`;
              if (!stageMap.has(stageKey) && !stageMap.has(s.id)) {
                stageMap.set(s.id, {
                  id: s.id,
                  stageName: s.stageName,
                  tasks: s.tasks || [],
                  deliverables: s.deliverables || [],
                  approval: s.approval || "",
                  assignedIds: []
                });
              }
            });
          });
        }

        if (stageMap.size === 0 && jobTitle) {
          stageMap.set(jobTitle, {
            id: jobTitle,
            stageName: jobTitle,
            tasks: [],
            deliverables: [],
            approval: "",
            assignedIds: []
          });
        }

        stageMap.forEach((stageInfo, stageKey) => {
          const cleanStageName = stageInfo.stageName.replace(/^\d+\.\s*/, '').trim();
          const assignedIds = stageInfo.assignedIds.length > 0 ? stageInfo.assignedIds : [""];

          assignedIds.forEach((idStr) => {
            const parts = String(idStr || "").split('|');
            const empId = (parts[0] || "").trim();
            const assignedDate = parts[1] || "";
            const deadline = parts[2] || "";

            const emp = empId ? employees.find(e => String(e['Employee ID'] || '').trim() === empId) : null;
            const currentDeadline = deadline || "";

            const rowRef = {
              "Type": type,
              "Code": item["Course Code"],
              "Batch Number": item["Batch Number"] || "",
              "_stageName": stageInfo.id,
              "Employee ID": emp ? emp['Employee ID'] : empId
            };

            const docForStatus = getAnyDocForActivity({
              "Employee ID": emp ? emp['Employee ID'] : empId,
              "Course Code": item["Course Code"],
              "Code": item["Course Code"],
              "Type": type,
              "Batch Number": item["Batch Number"] || "",
              "_actualStageName": cleanStageName,
              "deliverablesList": stageInfo.deliverables
            });
            const docStatus = getDocStatus(docForStatus);

            activities.push({
              "Photo": emp ? emp['Photo'] : "",
              "Employee Name": emp ? emp['Employee Name'] : (empId ? empId : "Unassigned"),
              "Designation": emp ? emp['Designation'] : (empId ? "N/A" : "-"),
              "Type": type,
              "Name": item["Course Title"] || `Batch ${item["Batch Number"]}`,
              "Code": item["Course Code"],
              "Course Code": item["Course Code"] || "",
              "Course Title": item["Course Title"] || "",
              "Batch Number": item["Batch Number"] || "",
              "Employee ID": emp ? emp['Employee ID'] : empId,
              "workflowTitle": jobTitle,
              "_stageName": stageInfo.id,
              "_actualStageName": cleanStageName,
              "_deliverables": stageInfo.deliverables.length > 0 ? stageInfo.deliverables.join(', ') : 'N/A',
              "Status": docStatus.text,
              "Context": (
                <div className="flex flex-col gap-1 items-start">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm", 
                    type === "Course" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                  )}>
                    {type}
                  </span>
                  <span className="text-[11px] text-slate-600 font-semibold whitespace-nowrap">
                    {item["Course Code"]}
                  </span>
                  {type === "Batch" && (
                    <span className="text-[11px] text-slate-500 whitespace-nowrap">
                      Batch {item["Batch Number"]}
                    </span>
                  )}
                </div>
              ),
              "Stage & Deliverables": (
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-800 text-[1.08em] leading-snug">{cleanStageName}</span>
                </div>
              ),
              "Assigned Date": isEditing ? (
                <EditableDateCell 
                  initialValue={assignedDate || ""} 
                  onSaveDate={async (newDate) => {
                    await handleSaveAssignedDate(rowRef, newDate);
                  }} 
                />
              ) : (
                assignedDate || "-"
              ),
              "Deadline": isEditing ? (
                <EditableDateCell 
                  initialValue={currentDeadline} 
                  onSaveDate={async (newDate) => {
                    await handleSaveDeadline(rowRef, newDate);
                  }} 
                />
              ) : (
                currentDeadline || "-"
              ),
              "Key Tasks": stageInfo.tasks.length > 0 ? stageInfo.tasks.join(', ') : 'N/A',
              "Approval / Sign-off": stageInfo.approval || (stageInfo.deliverables.length > 0 ? stageInfo.deliverables.join(', ') : 'N/A'),
              "assignedDateRaw": assignedDate || "",
              "deadlineRaw": currentDeadline,
              "tasksList": stageInfo.tasks,
              "deliverablesList": stageInfo.deliverables
            });
          });
        });
      });
    };

    processWorkflow(courseData, "Course");
    processWorkflow(mcBatchData, "Batch");

    return activities;
  }, [courseData, mcBatchData, employees, workflowData, isEditing]);

  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [activityFilterTab, setActivityFilterTab] = useState<string>("All");
  const hasInitialized = useRef(false);

  const filteredActivityData = useMemo(() => {
    return activityData.filter(row => {
      if (activityFilterTab === "All") return true;
      if (activityFilterTab === "Unassigned") {
        const empId = String(row["Employee ID"] || "").trim();
        const empName = String(row["Employee Name"] || "").trim();
        return !empId || empId === "-" || empName === "Unassigned" || empName === "-" || empName === "";
      }
      if (activityFilterTab === "Pending") {
        return row["Status"] === "Pending";
      }
      if (activityFilterTab === "Review") {
        return row["Status"] === "Review";
      }
      if (activityFilterTab === "Revision") {
        return row["Status"] === "Revision";
      }
      if (activityFilterTab === "Verified") {
        return row["Status"] === "Verified";
      }
      if (activityFilterTab === "Deadline Over") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();
        const deadlineStr = (row.deadlineRaw || "").trim();
        if (!deadlineStr || deadlineStr === "-") return false;
        const target = new Date(deadlineStr);
        if (isNaN(target.getTime())) return false;
        target.setHours(0, 0, 0, 0);
        return target.getTime() < todayTime;
      }
      return true;
    });
  }, [activityData, activityFilterTab]);

  useEffect(() => {
    if (activityData.length > 0) {
      if (!hasInitialized.current) {
        setSelectedActivity(activityData[0]);
        hasInitialized.current = true;
      } else {
        setSelectedActivity((prevSelected: any) => {
          if (!prevSelected) return prevSelected;
          const freshSelected = activityData.find((row) =>
            row["Type"] === prevSelected["Type"] &&
            row["Code"] === prevSelected["Code"] &&
            row["Batch Number"] === prevSelected["Batch Number"] &&
            row["_stageName"] === prevSelected["_stageName"] &&
            row["Employee ID"] === prevSelected["Employee ID"]
          ) || activityData.find((row) =>
            row["Type"] === prevSelected["Type"] &&
            row["Code"] === prevSelected["Code"] &&
            row["Batch Number"] === prevSelected["Batch Number"] &&
            row["_stageName"] === prevSelected["_stageName"]
          );
          return freshSelected || prevSelected;
        });
      }
    }
  }, [activityData]);

  const headers = ["Photo", "Employee Name", "Stage & Deliverables", "Assigned Date", "Deadline", "Status"];

  return (
    <div className="flex h-full w-full bg-transparent gap-0 overflow-hidden relative p-4">
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full font-['Arial'] flex flex-col">
        {/* Filter Tabs Bar */}
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50/80 flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1">Filter:</span>
          {["All", "Unassigned", "Pending", "Review", "Revision", "Verified", "Deadline Over"].map((tab) => {
            const isActive = activityFilterTab === tab;
            const count = tab === "All" ? activityData.length : activityData.filter(row => {
              if (tab === "Unassigned") {
                const empId = String(row["Employee ID"] || "").trim();
                const empName = String(row["Employee Name"] || "").trim();
                return !empId || empId === "-" || empName === "Unassigned" || empName === "-" || empName === "";
              }
              if (tab === "Pending") {
                return row["Status"] === "Pending";
              }
              if (tab === "Review") {
                return row["Status"] === "Review";
              }
              if (tab === "Revision") {
                return row["Status"] === "Revision";
              }
              if (tab === "Verified") {
                return row["Status"] === "Verified";
              }
              if (tab === "Deadline Over") {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayTime = today.getTime();
                const deadlineStr = (row.deadlineRaw || "").trim();
                if (!deadlineStr || deadlineStr === "-") return false;
                const target = new Date(deadlineStr);
                if (isNaN(target.getTime())) return false;
                target.setHours(0, 0, 0, 0);
                return target.getTime() < todayTime;
              }
              return false;
            }).length;

            return (
              <button
                key={tab}
                onClick={() => setActivityFilterTab(tab)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                  isActive 
                    ? "bg-teal-600 text-white shadow-xs" 
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
              >
                <span>{tab}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px]",
                  isActive ? "bg-teal-700 text-white" : "bg-gray-100 text-gray-500"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0">
          <Table 
            data={filteredActivityData}
          headers={headers}
          columnStyles={{
            "Photo": "w-10 text-center",
            "Employee Name": "w-px whitespace-nowrap",
            "Stage & Deliverables": "w-full normal whitespace-normal break-words",
            "Assigned Date": "w-px whitespace-nowrap text-center",
            "Deadline": "w-px whitespace-nowrap text-center",
            "Status": "w-px whitespace-nowrap text-center"
          }}
          isLoading={false}
          onSave={async () => {}}
          onDelete={async () => {}}
          onRowClick={(row) => setSelectedActivity(row)}
          isActiveRow={(row) => 
            selectedActivity &&
            selectedActivity["Type"] === row["Type"] &&
            selectedActivity["Code"] === row["Code"] &&
            selectedActivity["Batch Number"] === row["Batch Number"] &&
            selectedActivity["_stageName"] === row["_stageName"]
          }
          mergeGroups={{
            groupBy: ["Type", "Code", "Batch Number", "_stageName"],
            mergeColumns: ["Stage & Deliverables", "Assigned Date", "Deadline", "Status"]
          }}
          renderCell={(header, val, row) => {
            if (header === "Employee Name" && isEditing) {
              const rowRef = {
                "Type": row["Type"],
                "Code": row["Code"],
                "Batch Number": row["Batch Number"] || "",
                "_stageName": row["_stageName"],
                "Employee ID": row["Employee ID"]
              };
              return (
                <EditableEmployeeCell
                  currentEmpId={row["Employee ID"]}
                  currentEmpName={val}
                  employees={employees}
                  onSaveEmployee={async (newEmpId) => {
                    await handleSaveEmployee(rowRef, newEmpId);
                  }}
                />
              );
            }
            if (header === "Deadline" && !isEditing) {
              const deadlineStr = (row["deadlineRaw"] || "").trim();
              const formattedDate = (val && val !== "-") ? formatToMmmDdYyyy(val) : "-";

              if (deadlineStr && deadlineStr !== "-") {
                const target = new Date(deadlineStr);
                if (!isNaN(target.getTime())) {
                  target.setHours(0, 0, 0, 0);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (target.getTime() < today.getTime()) {
                    return (
                      <span className="text-rose-600 font-bold flex items-center gap-1 justify-center">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        {formattedDate}
                      </span>
                    );
                  }
                }
              }
              return formattedDate;
            }
            if (header === "Status") {
              const doc = getAnyDocForActivity(row);
              const docStatus = getDocStatus(doc);
              return (
                <div className="flex items-center justify-center">
                  <button 
                    className={`${docStatus.color} text-[10px] hover:opacity-80 cursor-pointer bg-transparent`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onViewFile && doc) {
                        onViewFile(doc["File Link"] || "", doc["Documents Title"] || "Document", doc);
                      }
                    }}
                    title={doc ? (doc["Documents Title"] || "Deliverable Document") : "No deliverable submitted yet"}
                  >
                    {docStatus.text}
                  </button>
                </div>
              );
            }
            return undefined;
          }}
          FormPanel={EmptyPanel as any}
          entityName="Activity"
          title="Activity Feed (Workflow Assignments)"
          hideAddButton={true}
          customHeaderButton={
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "p-1.5 rounded transition-all active:scale-95 flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 shadow-sm cursor-pointer",
                isEditing 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "bg-teal-600 hover:bg-teal-700 text-white"
              )}
              title={isEditing ? "Finish Editing" : "Edit Deadlines"}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{isEditing ? "Finish" : "Edit"}</span>
            </button>
          }
        />
      </div>
      </div>

      <AnimatePresence>
        {selectedActivity && (
          <ActivityDetailView 
            selectedActivity={selectedActivity} 
            allActivities={activityData} 
            courseData={courseData}
            onClose={() => setSelectedActivity(null)}
            documents={documents}
            onSaveDocument={onSaveDocument}
            onViewFile={onViewFile}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
