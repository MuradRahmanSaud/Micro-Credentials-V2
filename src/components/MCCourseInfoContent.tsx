import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Users, Info, Target, Award, TrendingUp, BookOpen, Briefcase, UserCheck, GitMerge, FileText, Coins, Plus, X, Eye, Check, Trash2, Upload, Loader2, Pencil, Search, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { FOLDER_LOCATIONS, getFileLocationPrefix } from '../FolderLocation';
import EmployeeMultiSelect from './EmployeeMultiSelect';
import AlignedCourseTable from './AlignedCourseTable';
import MCCourseBatchContent from './MCCourseBatchContent';
import WorkflowTimeline from './WorkflowTimeline';
import WorkflowMultiSelector from './WorkflowMultiSelector';
import { cn, resolveNamesOrIdsToIds, parseWorkflowAndStages, serializeWorkflowAndStages, parseWorkflowTitle, getPublicationStatus } from '../lib/utils';

import TargetAudienceEditor from './TargetAudienceEditor';

interface MCCourseInfoContentProps {
  infoVerticalTab: string;
  setInfoVerticalTab: (tab: any) => void;
  isEditing: boolean;
  data: any;
  editedData: any;
  headers?: any[];
  handleInputChange: (field: string, value: any) => void;
  employees: any[];
  extraFormProps?: any;
  FloatingInput: React.ComponentType<any>;
  
  // Props for MCCourseBatchContent
  courseBatches: any[];
  batchPage: number;
  setBatchPage: React.Dispatch<React.SetStateAction<number>>;
  ITEMS_PER_PAGE: number;
  isAddBatchOpen: boolean;
  newBatchesData: any[];
  setNewBatchesData: React.Dispatch<React.SetStateAction<any[]>>;
  batchWarning: string | null;
  setBatchWarning: (val: string | null) => void;
  editedBatches: Record<string, any>;
  setEditedBatches: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  selectedBatchIndex: number | null;
  handleSelectBatchWithAutoSave: (index: number, batchKey: string) => void;
  isBatchRunning: (batch: any) => boolean;
  workflowData?: any;
  documents: any[];
  localNewDocs: any[];
  setEditedDocs: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setLocalNewDocs: React.Dispatch<React.SetStateAction<any[]>>;

  // Props for Course Workflow
  localStages?: any[];
  setEditedData?: React.Dispatch<React.SetStateAction<any>>;
  setActiveSidebarTab?: (tab: any) => void;
  setDocumentFilter?: (filter: string | null) => void;
  batchSearchTerm?: string;
  setBatchSearchTerm?: (val: string) => void;
  setIsAddBatchOpen?: (val: boolean) => void;
  handleAddBatch?: () => Promise<void>;
  getNextBatchNumber?: (currentNewBatches?: any[]) => string;

  renderDocuments?: () => React.ReactNode;
  renderFinancials?: () => React.ReactNode;
}

interface ModeMultiSelectProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
}

const DEFAULT_MODES = ["Online", "On-site", "Hybrid", "Self-paced", "Blended", "Offline"];

function ModeMultiSelect({ label, value, onChange }: ModeMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedModes = useMemo(() => {
    if (!value) return [];
    return String(value)
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
  }, [value]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => {
        document.removeEventListener("mousedown", handleOutsideClick);
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  const allModes = useMemo(() => {
    const list = [...DEFAULT_MODES];
    selectedModes.forEach((m) => {
      if (!list.some((existing) => existing.toLowerCase() === m.toLowerCase())) {
        list.push(m);
      }
    });
    return list;
  }, [selectedModes]);

  const filteredModes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allModes;
    return allModes.filter((m) => m.toLowerCase().includes(query));
  }, [allModes, search]);

  const hasExactSearchMatch = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return allModes.some((m) => m.toLowerCase() === query);
  }, [allModes, search]);

  const toggleMode = (mode: string) => {
    let newModes: string[];
    const isSelected = selectedModes.some((m) => m.toLowerCase() === mode.toLowerCase());
    
    if (isSelected) {
      newModes = selectedModes.filter((m) => m.toLowerCase() !== mode.toLowerCase());
    } else {
      const existing = allModes.find((m) => m.toLowerCase() === mode.toLowerCase()) || mode;
      newModes = [...selectedModes, existing];
    }
    onChange(newModes.join(", "));
  };

  const addCustomMode = () => {
    const newMode = search.trim();
    if (newMode && !hasExactSearchMatch) {
      const isAlreadySelected = selectedModes.some((m) => m.toLowerCase() === newMode.toLowerCase());
      if (!isAlreadySelected) {
        const newModes = [...selectedModes, newMode];
        onChange(newModes.join(", "));
      }
      setSearch("");
    }
  };

  return (
    <div ref={containerRef} className="relative w-full z-10">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center w-full min-h-[42px] pt-4 pb-1.5 px-3 border border-gray-200 rounded-lg hover:border-teal-500/50 bg-white transition-all cursor-pointer select-none",
          isOpen ? "border-teal-500 ring-1 ring-teal-500" : ""
        )}
      >
        <div className="flex flex-wrap gap-1 pr-6 w-full">
          {selectedModes.length > 0 ? (
            selectedModes.map((mode, index) => (
              <span 
                key={`${mode}-${index}`} 
                className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-100/60 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
              >
                <span>{mode}</span>
                <X 
                  className="w-3 h-3 hover:text-teal-950 cursor-pointer text-teal-600/70" 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMode(mode);
                  }}
                />
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs font-normal"></span>
          )}
        </div>
        
        <label
          className={cn(
            "absolute transition-all duration-200 pointer-events-none uppercase tracking-wider font-bold select-none left-3",
            isOpen || selectedModes.length > 0
              ? "top-1 text-[8.5px] text-teal-600 bg-white px-1 ml-[-4px] font-extrabold z-10"
              : "top-3 text-xs text-gray-400 font-normal"
          )}
        >
          {label}
        </label>

        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
        </span>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-64 animate-in fade-in duration-100">
          <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2 shrink-0">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search or add Mode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs outline-none bg-transparent py-0.5 text-gray-800"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (search.trim() && !hasExactSearchMatch) {
                    addCustomMode();
                  }
                }
              }}
            />
            {search && (
              <button 
                type="button" 
                onClick={() => setSearch("")} 
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {filteredModes.map((mode, index) => {
              const isSelected = selectedModes.some((m) => m.toLowerCase() === mode.toLowerCase());
              return (
                <div
                  key={`${mode}-${index}`}
                  onClick={() => toggleMode(mode)}
                  className={cn(
                    "px-3 py-1.5 flex items-center justify-between text-xs text-gray-700 hover:bg-teal-50/50 cursor-pointer transition-colors font-medium",
                    isSelected ? "bg-teal-50/30 text-teal-900 font-semibold" : ""
                  )}
                >
                  <span className="capitalize">{mode}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                </div>
              );
            })}

            {search.trim() !== "" && !hasExactSearchMatch && (
              <div
                onClick={addCustomMode}
                className="px-3 py-1.5 border-t border-dashed border-gray-100 flex items-center gap-1.5 text-xs text-teal-600 hover:bg-teal-50/50 cursor-pointer font-semibold shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-teal-600" />
                <span>Add "{search.trim()}"</span>
              </div>
            )}

            {filteredModes.length === 0 && search.trim() === "" && (
              <div className="px-3 py-4 text-xs text-center text-gray-400 shrink-0">
                No modes available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const MCCourseInfoContent: React.FC<MCCourseInfoContentProps> = ({
  infoVerticalTab,
  setInfoVerticalTab,
  isEditing,
  data,
  editedData,
  headers,
  handleInputChange,
  employees,
  extraFormProps,
  FloatingInput,
  courseBatches,
  batchPage,
  setBatchPage,
  ITEMS_PER_PAGE,
  isAddBatchOpen,
  newBatchesData,
  setNewBatchesData,
  batchWarning,
  setBatchWarning,
  editedBatches,
  setEditedBatches,
  selectedBatchIndex,
  handleSelectBatchWithAutoSave,
  isBatchRunning,
  workflowData,
  documents,
  localNewDocs,
  setEditedDocs,
  setLocalNewDocs,
  localStages = [],
  setEditedData,
  setActiveSidebarTab,
  setDocumentFilter,
  batchSearchTerm,
  setBatchSearchTerm,
  setIsAddBatchOpen,
  handleAddBatch,
  getNextBatchNumber,
  renderDocuments,
  renderFinancials
}) => {
  const [isAddSyllabusOpen, setIsAddSyllabusOpen] = useState(false);
  const [newSyllabusData, setNewSyllabusData] = useState<Array<{ version: string; startDate: string; endDate: string; url: string }>>([]);
  const [uploadingSyllabusIndex, setUploadingSyllabusIndex] = useState<number | null>(null);
  const [editingSyllabusIndex, setEditingSyllabusIndex] = useState<number | null>(null);
  const [editingSyllabusRow, setEditingSyllabusRow] = useState<{ version: string; startDate: string; endDate: string; url: string } | null>(null);
  const [uploadingEditSyllabus, setUploadingEditSyllabus] = useState<boolean>(false);

  const [isAddLearningMaterialOpen, setIsAddLearningMaterialOpen] = useState(false);
  const [newLearningMaterialData, setNewLearningMaterialData] = useState<Array<{ title: string; startDate: string; endDate: string; url: string }>>([]);
  const [uploadingLearningMaterialIndex, setUploadingLearningMaterialIndex] = useState<number | null>(null);
  const [editingLearningMaterialIndex, setEditingLearningMaterialIndex] = useState<number | null>(null);
  const [editingLearningMaterialRow, setEditingLearningMaterialRow] = useState<{ title: string; startDate: string; endDate: string; url: string } | null>(null);
  const [uploadingEditLearningMaterial, setUploadingEditLearningMaterial] = useState<boolean>(false);

  const [isUploadingBanner, setIsUploadingBanner] = useState<boolean>(false);
  const [isUploadingProposal, setIsUploadingProposal] = useState<boolean>(false);

  const allTargetAudiences = React.useMemo(() => {
    const audienceMap = new Map<string, string>();
    let allCourses = extraFormProps?.allCourses;
    
    if (!allCourses || !Array.isArray(allCourses) || allCourses.length === 0) {
      try {
        const saved = localStorage.getItem("course_data");
        if (saved) {
          allCourses = JSON.parse(saved);
        }
      } catch (e) {
        console.error("Failed to load course_data fallback from localStorage", e);
      }
    }

    if (!allCourses || !Array.isArray(allCourses)) {
      allCourses = [];
    }

    allCourses.forEach((c: any) => {
      if (!c || typeof c !== "object") return;
      const targetKey = Object.keys(c).find(k => k.trim().toLowerCase() === "target audience");
      const audStr = targetKey ? c[targetKey] : undefined;
      if (audStr && typeof audStr === 'string') {
        audStr.split(',').forEach((item: string) => {
          const trimmed = item.trim();
          if (trimmed) {
            const lower = trimmed.toLowerCase();
            if (!audienceMap.has(lower)) {
              audienceMap.set(lower, trimmed);
            }
          }
        });
      }
    });
    return Array.from(audienceMap.values()).sort((a, b) => a.localeCompare(b));
  }, [extraFormProps?.allCourses]);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    try {
      const extension = file.name.split('.').pop() || "jpg";
      const courseCode = (editedData?.["Course Code"] || data?.["Course Code"] || "course").trim();
      const customName = `${courseCode}_banner_${Date.now()}.${extension}`;
      const folderPath = `${getFileLocationPrefix()}/MC Course/${courseCode}/Banner`;

      const formDataUpload = new FormData();
      formDataUpload.append("file", file, customName);
      formDataUpload.append("folderPath", folderPath);

      const response = await axios.post("/api/upload", formDataUpload, { timeout: 60000 });
      let uploadedUrl = response.data?.url || response.data?.fileLink;

      if (uploadedUrl && (uploadedUrl.includes("drive.google.com/uc") || uploadedUrl.includes("export=download"))) {
        const fileIdMatch = uploadedUrl.match(/[?&]id=([^&]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          uploadedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
        }
      }
      if (uploadedUrl) {
        handleInputChange("Banner", uploadedUrl);
      }
    } catch (error) {
      console.error("Banner upload failed:", error);
      alert("Banner upload failed.");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleProposalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProposal(true);
    try {
      const courseCode = (editedData?.["Course Code"] || data?.["Course Code"] || "course").trim();
      const batchNoStr = courseBatches && courseBatches.length > 0 && selectedBatchIndex !== null && courseBatches[selectedBatchIndex] 
        ? String(courseBatches[selectedBatchIndex]['Batch Number'] || '').trim() 
        : "";
      
      const folderPath = batchNoStr 
        ? `${getFileLocationPrefix()}/MC Course/${courseCode}/${batchNoStr}/Proposal`
        : `${getFileLocationPrefix()}/MC Course/${courseCode}/Proposal`;

      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("folderPath", folderPath);
      
      const response = await axios.post("/api/upload", formDataUpload, { timeout: 60000 });
      let uploadedUrl = response.data?.url || response.data?.fileLink;

      if (uploadedUrl && (uploadedUrl.includes("drive.google.com/uc") || uploadedUrl.includes("export=download"))) {
        const fileIdMatch = uploadedUrl.match(/[?&]id=([^&]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          uploadedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
        }
      }
      
      if (uploadedUrl) {
         handleInputChange("Proposal", uploadedUrl);
      } else {
         alert("Upload failed: No URL returned.");
      }
    } catch (error) {
      console.error("Error uploading proposal:", error);
      alert("Upload failed.");
    } finally {
      setIsUploadingProposal(false);
    }
  };

  const handleSyllabusFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, rowIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSyllabusIndex(rowIndex);
    try {
      const courseCode = (editedData?.["Course Code"] || data?.["Course Code"] || "course").trim();
      const folderPath = `${getFileLocationPrefix()}/MC Course/${courseCode}/Syllabus`;

      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("folderPath", folderPath);
      formDataUpload.append("departmentName", file.name.replace(/\.[^/.]+$/, ""));

      const response = await axios.post("/api/upload", formDataUpload, { timeout: 60000 });
      let uploadedUrl = response.data?.url || response.data?.fileLink;

      if (uploadedUrl && (uploadedUrl.includes("drive.google.com/uc") || uploadedUrl.includes("export=download"))) {
        const fileIdMatch = uploadedUrl.match(/[?&]id=([^&]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          uploadedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
        }
      }
      if (uploadedUrl) {
        setNewSyllabusData(prev => {
          const updated = [...prev];
          updated[rowIndex] = { ...updated[rowIndex], url: uploadedUrl };
          return updated;
        });
      }
    } catch (error) {
      console.error("Syllabus file upload failed:", error);
      alert("Upload failed.");
    } finally {
      setUploadingSyllabusIndex(null);
    }
  };

  const handleEditSyllabusFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEditSyllabus(true);
    try {
      const courseCode = (editedData?.["Course Code"] || data?.["Course Code"] || "course").trim();
      const folderPath = `${getFileLocationPrefix()}/MC Course/${courseCode}/Syllabus`;

      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("folderPath", folderPath);
      formDataUpload.append("departmentName", file.name.replace(/\.[^/.]+$/, ""));

      const response = await axios.post("/api/upload", formDataUpload, { timeout: 60000 });
      let uploadedUrl = response.data?.url || response.data?.fileLink;

      if (uploadedUrl && (uploadedUrl.includes("drive.google.com/uc") || uploadedUrl.includes("export=download"))) {
        const fileIdMatch = uploadedUrl.match(/[?&]id=([^&]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          uploadedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
        }
      }
      if (uploadedUrl) {
        setEditingSyllabusRow(prev => prev ? { ...prev, url: uploadedUrl } : null);
      }
    } catch (error) {
      console.error("Syllabus edit file upload failed:", error);
      alert("Upload failed.");
    } finally {
      setUploadingEditSyllabus(false);
    }
  };

  const handleLearningMaterialFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, rowIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLearningMaterialIndex(rowIndex);
    try {
      const courseCode = (editedData?.["Course Code"] || data?.["Course Code"] || "course").trim();
      const folderPath = `${getFileLocationPrefix()}/MC Course/${courseCode}/Learning Material`;

      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("folderPath", folderPath);
      formDataUpload.append("departmentName", file.name.replace(/\.[^/.]+$/, ""));

      const response = await axios.post("/api/upload", formDataUpload, { timeout: 60000 });
      let uploadedUrl = response.data?.url || response.data?.fileLink;

      if (uploadedUrl && (uploadedUrl.includes("drive.google.com/uc") || uploadedUrl.includes("export=download"))) {
        const fileIdMatch = uploadedUrl.match(/[?&]id=([^&]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          uploadedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
        }
      }
      if (uploadedUrl) {
        setNewLearningMaterialData(prev => {
          const updated = [...prev];
          updated[rowIndex] = { ...updated[rowIndex], url: uploadedUrl };
          return updated;
        });
      }
    } catch (error) {
      console.error("Learning Material file upload failed:", error);
      alert("Upload failed.");
    } finally {
      setUploadingLearningMaterialIndex(null);
    }
  };

  const handleEditLearningMaterialFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEditLearningMaterial(true);
    try {
      const courseCode = (editedData?.["Course Code"] || data?.["Course Code"] || "course").trim();
      const folderPath = `${getFileLocationPrefix()}/MC Course/${courseCode}/Learning Material`;

      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("folderPath", folderPath);
      formDataUpload.append("departmentName", file.name.replace(/\.[^/.]+$/, ""));

      const response = await axios.post("/api/upload", formDataUpload, { timeout: 60000 });
      let uploadedUrl = response.data?.url || response.data?.fileLink;

      if (uploadedUrl && (uploadedUrl.includes("drive.google.com/uc") || uploadedUrl.includes("export=download"))) {
        const fileIdMatch = uploadedUrl.match(/[?&]id=([^&]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          uploadedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
        }
      }
      if (uploadedUrl) {
        setEditingLearningMaterialRow(prev => prev ? { ...prev, url: uploadedUrl } : null);
      }
    } catch (error) {
      console.error("Learning Material edit file upload failed:", error);
      alert("Upload failed.");
    } finally {
      setUploadingEditLearningMaterial(false);
    }
  };
  const parsedWorkflows = React.useMemo(() => {
    if (!workflowData || !Array.isArray(workflowData)) return [];
    return workflowData.map((row, idx) => {
      const rawText = [
        row["Job Title"], row["Designation"], row["Workflow"], row["Workflow Title"], row["Stages"]
      ].find(val => val && typeof val === 'string' && val.trim().length > 0) || Object.keys(row)[0] || "Workflow Title";
      const rowId = row["ID"] || row["id"] || row["Workflow ID"] || `row-${idx}`;
      const structured = parseWorkflowTitle(rawText, String(rowId));
      return {
        id: structured.id,
        title: structured.title,
        stages: structured.stages,
        rawText
      };
    }).filter(item => item.title.trim() !== "");
  }, [workflowData]);

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Info },
    { id: 'batch', label: 'Batch', icon: Users },
    { id: 'workflow', label: 'Course Workflow', icon: GitMerge },
    { id: 'proposal', label: 'Proposal', icon: FileText },
    { id: 'objective', label: 'Objective', icon: Target },
    { id: 'outcome', label: 'Learning Outcome', icon: Award },
    { id: 'demand', label: 'Industry Demand', icon: TrendingUp },
    { id: 'audience', label: 'Target Audience', icon: Users },
    { id: 'aligned', label: 'Aligned Course', icon: Briefcase },
    { id: 'expert', label: 'Industry Expert', icon: UserCheck },
    { id: 'syllabus', label: 'Syllabus', icon: FileText },
    { id: 'learning_material', label: 'Learning Material', icon: FileText },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'financial_overview', label: 'Finance', icon: Coins },
  ] as const;

  return (
    <div className="flex flex-col sm:flex-row h-full min-h-0 bg-white divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
      {/* Vertical Tab Navigation */}
      <div className="w-full sm:w-52 shrink-0 bg-slate-50/70 p-2 space-y-1 overflow-y-auto no-scrollbar border-b sm:border-b-0 border-slate-200">
        <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
          Course Information
        </div>
        <div className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible gap-1 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = infoVerticalTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInfoVerticalTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer select-none shrink-0 sm:shrink sm:w-full",
                  isActive
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Panel */}
      <div className={cn("flex-1 overflow-y-auto no-scrollbar min-h-0 bg-white", (infoVerticalTab === 'batch' || infoVerticalTab === 'workflow' || infoVerticalTab === 'documents' || infoVerticalTab === 'financial_overview' || infoVerticalTab === 'aligned') ? "p-0 h-full flex flex-col" : "p-4")}>
        {infoVerticalTab === 'workflow' ? (
          (() => {
            const courseWorkflow = editedData?.['Workflow'] || editedData?.['Publication Workflow'] || data?.['Workflow'] || data?.['Publication Workflow'] || "";
            const { jobTitle, stageAssignments } = parseWorkflowAndStages(courseWorkflow);

            return (
              <div className="flex flex-col h-full min-h-0 flex-1">
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-0 h-full flex flex-col min-h-0">
                  {isEditing && (
                    <div className="p-3 border-b border-slate-200">
                      <WorkflowMultiSelector
                        parsedWorkflows={parsedWorkflows}
                        courseWorkflow={editedData?.['Workflow'] || editedData?.['Publication Workflow'] || data?.['Workflow'] || data?.['Publication Workflow'] || ""}
                        onWorkflowChange={(serialized, _newStages) => {
                          if (setEditedData) {
                            setEditedData((prev: any) => ({
                              ...prev,
                              'Workflow': serialized,
                              'Publication Workflow': serialized
                            }));
                          }
                        }}
                      />
                    </div>
                  )}

                  {!jobTitle ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                      <Briefcase className="w-7 h-7 text-slate-300 mb-2" />
                      <span className="text-[13px] font-medium text-slate-400 uppercase tracking-wider">No Workflow Assigned</span>
                      <p className="text-[13px] text-slate-400 mt-1 leading-relaxed">Please edit this course to assign a Publication Workflow / Job Title.</p>
                    </div>
                  ) : !localStages || localStages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                      <Briefcase className="w-7 h-7 text-slate-300 mb-2" />
                      <span className="text-[13px] font-medium text-slate-400 uppercase tracking-wider">No Stages Found</span>
                      <p className="text-[13px] text-slate-400 mt-1 leading-relaxed">No stages defined for "{jobTitle}" in Job Description list.</p>
                    </div>
                  ) : (
                    <WorkflowTimeline
                      stages={localStages}
                      stageAssignments={stageAssignments}
                      isEditing={isEditing}
                      employees={employees || []}
                      onStageAssignmentChange={(stageId, ids) => {
                        const updatedAssignments = {
                          ...stageAssignments,
                          [stageId]: ids
                        };
                        const serialized = serializeWorkflowAndStages(jobTitle, updatedAssignments);
                        if (setEditedData) {
                          setEditedData((prev: any) => ({
                            ...prev,
                            'Workflow': serialized,
                            'Publication Workflow': serialized
                          }));
                        }
                      }}
                      placement="bottom"
                      jobTitle={jobTitle}
                      batch={courseBatches[selectedBatchIndex ?? 0]}
                      courseCode={data?.['Course Code']}
                      documents={[...documents, ...localNewDocs]}
                      onSaveDocument={async (docData, originalRow) => {
                        if (isEditing) {
                          const docKey = docData["Documents Title"] || docData["id"] || docData["ID"];
                          setEditedDocs(prev => ({ ...prev, [docKey]: docData }));
                          setLocalNewDocs(prev => [...prev, docData]);
                        } else if (extraFormProps?.onSaveDocument) {
                          await extraFormProps.onSaveDocument(docData, originalRow);
                        }
                      }}
                      onViewDocuments={(filter) => {
                        if (setActiveSidebarTab) setActiveSidebarTab('documents');
                        if (setDocumentFilter) setDocumentFilter(filter);
                      }}
                      viewType="course"
                      displayMode="vertical-tabs"
                      borderless={true}
                      onViewFile={extraFormProps?.onViewFile}
                    />
                  )}
                </div>
              </div>
            );
          })()
        ) : infoVerticalTab === 'batch' ? (
          <MCCourseBatchContent
            courseBatches={courseBatches}
            batchPage={batchPage}
            setBatchPage={setBatchPage}
            ITEMS_PER_PAGE={ITEMS_PER_PAGE}
            isAddBatchOpen={isAddBatchOpen}
            newBatchesData={newBatchesData}
            setNewBatchesData={setNewBatchesData}
            batchWarning={batchWarning}
            setBatchWarning={setBatchWarning}
            editedBatches={editedBatches}
            setEditedBatches={setEditedBatches}
            selectedBatchIndex={selectedBatchIndex}
            handleSelectBatchWithAutoSave={handleSelectBatchWithAutoSave}
            isBatchRunning={isBatchRunning}
            employees={employees}
            isEditing={isEditing}
            data={data}
            editedData={editedData}
            workflowData={workflowData}
            documents={documents}
            localNewDocs={localNewDocs}
            setEditedDocs={setEditedDocs}
            setLocalNewDocs={setLocalNewDocs}
            extraFormProps={extraFormProps}
            batchSearchTerm={batchSearchTerm}
            setBatchSearchTerm={setBatchSearchTerm}
            setIsAddBatchOpen={setIsAddBatchOpen}
            handleAddBatch={handleAddBatch}
            getNextBatchNumber={getNextBatchNumber}
          />
        ) : infoVerticalTab === 'documents' ? (
          renderDocuments ? renderDocuments() : null
        ) : infoVerticalTab === 'financial_overview' ? (
          renderFinancials ? renderFinancials() : null
        ) : !isEditing ? (
          /* VIEW MODE */
          <div className="space-y-4">
            {infoVerticalTab === 'basic' && (
              <div className="space-y-3">
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
                  {/* Banner Image Preview */}
                  {(() => {
                    const bannerUrl = editedData?.["Banner"] || data?.["Banner"];
                    let displayUrl = bannerUrl;
                    const fileIdMatch = bannerUrl?.match(/[-\w]{25,}/);
                    if (fileIdMatch && bannerUrl?.includes('drive.google.com')) {
                      displayUrl = `https://drive.google.com/thumbnail?id=${fileIdMatch[0]}&sz=w1000`;
                    }
                    if (!displayUrl) return null;
                    return (
                      <div className="w-full h-32 md:h-40 rounded-lg overflow-hidden border border-slate-200/80 relative mb-3 bg-slate-100">
                        <img src={displayUrl} alt="Course Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    );
                  })()}

                  {/* Title, Code & Date */}
                  <div>
                    <h3 className="text-sm md:text-base font-semibold text-slate-800 leading-snug">
                      {editedData?.["Course Title"] || data?.["Course Title"] || "—"}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs font-bold text-teal-700 uppercase font-mono tracking-wider">
                        {editedData?.["Course Code"] || data?.["Course Code"] || "—"}
                      </p>
                      {(editedData?.["Date"] || data?.["Date"]) && (
                        <span className="text-xs text-slate-500 font-mono font-medium">
                          • {editedData?.["Date"] || data?.["Date"]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Duration</span>
                      <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">
                        {editedData?.["Duration"] || data?.["Duration"] || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Class</span>
                      <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">
                        {editedData?.["Class"] ?? editedData?.["No. of Class"] ?? data?.["Class"] ?? data?.["No. of Class"] ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Student</span>
                      <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">
                        {editedData?.["Student Size"] ?? editedData?.["Student"] ?? data?.["Student Size"] ?? data?.["Student"] ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Course Fee</span>
                      <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">
                        ৳{editedData?.["Course Fee"] || data?.["Course Fee"] || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Mode</span>
                      <span className="text-xs font-bold text-teal-700 font-mono block mt-0.5">
                        {editedData?.["Mode"] || data?.["Mode"] || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Publication Status Block */}
                {(() => {
                  const courseObj = editedData && Object.keys(editedData).length > 0 ? editedData : data;
                  const courseOfferList = extraFormProps?.courseOfferData || [];
                  const explicitPubStatus = editedData?.["Publication Status"] !== undefined 
                    ? editedData["Publication Status"] 
                    : (data?.["Publication Status"] || data?.["Published Status"]);

                  let currentPubStatus = "";
                  if (explicitPubStatus && String(explicitPubStatus).trim().toLowerCase() === "published") {
                    currentPubStatus = "Published";
                  } else {
                    currentPubStatus = getPublicationStatus(courseObj, courseOfferList);
                  }

                  return (
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Publication Status
                      </span>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className={cn(
                            "w-3.5 h-3.5 rounded-full shrink-0",
                            currentPubStatus === "Published" ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" :
                            currentPubStatus === "Ready to Publish" ? "bg-teal-500 animate-pulse shadow-sm shadow-teal-500/50" :
                            "bg-amber-500 shadow-sm shadow-amber-500/50"
                          )} />
                          <span className={cn(
                            "text-base md:text-lg font-extrabold uppercase tracking-wide",
                            currentPubStatus === "Published" ? "text-emerald-700" :
                            currentPubStatus === "Ready to Publish" ? "text-teal-700" :
                            "text-amber-700"
                          )}>
                            {currentPubStatus}
                          </span>
                        </div>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                          currentPubStatus === "Published" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                          currentPubStatus === "Ready to Publish" ? "bg-teal-50 text-teal-800 border-teal-200" :
                          "bg-amber-50 text-amber-800 border-amber-200"
                        )}>
                          {currentPubStatus}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Remarks removed */}
              </div>
            )}

            {infoVerticalTab === 'proposal' && (
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Proposal Document</span>
                
                {editedData?.["Proposal"] || data?.["Proposal"] ? (
                  <div className="flex items-center gap-2">
                    <a href={editedData?.["Proposal"] || data?.["Proposal"]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg border border-teal-200 text-xs font-semibold transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                      View Proposal
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No proposal document uploaded.</p>
                )}
              </div>
            )}

            {infoVerticalTab === 'objective' && (
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Objective</span>
                <p className="text-xs font-medium text-slate-700 uppercase leading-relaxed whitespace-pre-wrap">
                  {editedData?.["Objective"] || data?.["Objective"] || "—"}
                </p>
              </div>
            )}

            {infoVerticalTab === 'outcome' && (
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Learning Outcome</span>
                <p className="text-xs font-medium text-slate-700 uppercase leading-relaxed whitespace-pre-wrap">
                  {editedData?.["Learning Outcome"] || data?.["Learning Outcome"] || "—"}
                </p>
              </div>
            )}

            {infoVerticalTab === 'demand' && (
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Industry Demand</span>
                <p className="text-xs font-medium text-slate-700 uppercase leading-relaxed whitespace-pre-wrap">
                  {editedData?.["Industry Demand"] || data?.["Industry Demand"] || "—"}
                </p>
              </div>
            )}

            {infoVerticalTab === 'audience' && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Target Audience</span>
                <div className="grid grid-cols-2 gap-2.5">
                  {(() => {
                    const k = Object.keys(editedData || {}).find(key => key.trim().toLowerCase() === "target audience");
                    const dataK = Object.keys(data || {}).find(key => key.trim().toLowerCase() === "target audience");
                    const audienceStr = (k ? editedData[k] : (dataK ? data[dataK] : "")) || "";
                    if (!audienceStr.trim()) return <p className="text-xs font-medium text-slate-500 col-span-full">No target audience specified</p>;
                    const items = audienceStr.split(',').map((s: string) => s.trim()).filter(Boolean);
                    return items.map((item: string, i: number) => (
                      <div key={i} className="bg-teal-50/50 border border-teal-100 rounded-xl py-2.5 px-3.5 flex items-center gap-2.5 transition-all hover:bg-teal-100/40 w-full min-h-[44px]">
                        <Users className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="text-[11px] font-bold text-teal-900 uppercase leading-snug line-clamp-2">{item}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {infoVerticalTab === 'aligned' && (
              <AlignedCourseTable
                value={editedData?.["Aligned Course name"] || data?.["Aligned Course name"] || editedData?.["Aligned Course"] || data?.["Aligned Course"] || ""}
                onChange={(val: string) => {
                  handleInputChange("Aligned Course name", val);
                  handleInputChange("Aligned Course", val);
                }}
                isEditing={false}
                courseOfferData={extraFormProps?.courseOfferData || []}
                programData={extraFormProps?.programNameData || []}
                employees={(employees && employees.length > 0) ? employees : (extraFormProps?.employees || [])}
              />
            )}

            {infoVerticalTab === 'expert' && (
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Industry Expert</span>
                <p className="text-xs font-semibold text-slate-800 uppercase">
                  {(() => {
                    const val = editedData?.["Industry Expert"] || data?.["Industry Expert"] || editedData?.["Industry Expart"] || data?.["Industry Expart"];
                    if (!val) return "—";
                    const empList = (employees && employees.length > 0) ? employees : (extraFormProps?.employees || []);
                    const empIds = resolveNamesOrIdsToIds(String(val), empList);
                    if (empIds.length > 0) {
                      const names = empIds.map(id => {
                        const emp = empList.find(e => String(e['Employee ID'] || '').trim() === String(id).split('|')[0].trim());
                        return emp ? emp['Employee Name'] : id;
                      });
                      return names.join(", ");
                    }
                    return String(val);
                  })()}
                </p>
              </div>
            )}

            {infoVerticalTab === 'syllabus' && (
              <div className="w-full border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-[11px]">Version Name</th>
                        <th className="px-3 py-2 text-[11px] text-center">Start Date</th>
                        <th className="px-3 py-2 text-[11px] text-center">End Date</th>
                        <th className="px-3 py-2 text-[11px]">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const val = editedData?.["Syllabus"] || data?.["Syllabus"];
                        const entries = val ? String(val).split(',').map(s => s.trim()).filter(Boolean).map(s => {
                          if (s.includes('|')) {
                            const [version, startDate, endDate, ...urlParts] = s.split('|');
                            return {
                              version: version || '—',
                              startDate: startDate || '—',
                              endDate: endDate || '—',
                              url: urlParts.join('|')
                            };
                          }
                          if (s.includes(':') && !s.startsWith('http://') && !s.startsWith('https://')) {
                            const colonIdx = s.indexOf(':');
                            return {
                              version: s.substring(0, colonIdx) || '—',
                              startDate: '—',
                              endDate: '—',
                              url: s.substring(colonIdx + 1)
                            };
                          }
                          return {
                            version: s.startsWith('http') ? 'Syllabus' : s,
                            startDate: '—',
                            endDate: '—',
                            url: s.startsWith('http') ? s : ''
                          };
                        }) : [];

                        return entries.length > 0 ? entries.map((entry, idx) => (
                          <tr key={`syllabus-view-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-2 font-semibold text-slate-800">{entry.version}</td>
                            <td className="px-3 py-2 text-center text-slate-600">{entry.startDate}</td>
                            <td className="px-3 py-2 text-center text-slate-600">{entry.endDate}</td>
                            <td className="px-3 py-2">
                              {entry.url ? (
                                <a
                                  href={entry.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-800 font-bold uppercase tracking-wider text-[11px]"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </a>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="px-3 py-8 text-center text-slate-400 font-medium uppercase">
                              NO SYLLABUS FOUND
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {infoVerticalTab === 'learning_material' && (
              <div className="w-full border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-[11px]">Material Title</th>
                        <th className="px-3 py-2 text-[11px] text-center">Start Date</th>
                        <th className="px-3 py-2 text-[11px] text-center">End Date</th>
                        <th className="px-3 py-2 text-[11px]">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const val = editedData?.["Learning Material"] || data?.["Learning Material"];
                        const entries = val ? String(val).split(',').map(s => s.trim()).filter(Boolean).map(s => {
                          if (s.includes('|')) {
                            const [title, startDate, endDate, ...urlParts] = s.split('|');
                            return {
                              title: title || '—',
                              startDate: startDate || '—',
                              endDate: endDate || '—',
                              url: urlParts.join('|')
                            };
                          }
                          if (s.includes(':') && !s.startsWith('http://') && !s.startsWith('https://')) {
                            const colonIdx = s.indexOf(':');
                            return {
                              title: s.substring(0, colonIdx) || '—',
                              startDate: '—',
                              endDate: '—',
                              url: s.substring(colonIdx + 1)
                            };
                          }
                          return {
                            title: s.startsWith('http') ? 'Learning Material' : s,
                            startDate: '—',
                            endDate: '—',
                            url: s.startsWith('http') ? s : ''
                          };
                        }) : [];

                        return entries.length > 0 ? entries.map((entry, idx) => (
                          <tr key={`lm-view-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-2 font-semibold text-slate-800">{entry.title}</td>
                            <td className="px-3 py-2 text-center text-slate-600">{entry.startDate}</td>
                            <td className="px-3 py-2 text-center text-slate-600">{entry.endDate}</td>
                            <td className="px-3 py-2">
                              {entry.url ? (
                                <a
                                  href={entry.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-800 font-bold uppercase tracking-wider text-[11px]"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </a>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="px-3 py-8 text-center text-slate-400 font-medium uppercase">
                              NO LEARNING MATERIAL FOUND
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : infoVerticalTab === 'aligned' ? (
          <AlignedCourseTable
            value={editedData?.["Aligned Course name"] !== undefined ? String(editedData["Aligned Course name"] || "") : (data?.["Aligned Course name"] ?? data?.["Aligned Course"] ?? "")}
            onChange={(val: string) => {
              handleInputChange("Aligned Course name", val);
              handleInputChange("Aligned Course", val);
            }}
            isEditing={true}
            courseOfferData={extraFormProps?.courseOfferData || []}
            programData={extraFormProps?.programNameData || []}
            employees={(employees && employees.length > 0) ? employees : (extraFormProps?.employees || [])}
          />
        ) : (
          /* EDIT MODE */
          <div className={cn(
            "space-y-4",
            infoVerticalTab === 'audience' 
              ? "" 
              : "bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
          )}>
            {infoVerticalTab !== 'audience' && (
              <div className="flex items-center gap-1.5 pb-2 border-b border-gray-100">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                  Edit {tabs.find(t => t.id === infoVerticalTab)?.label}
                </span>
              </div>
            )}

            {infoVerticalTab === 'basic' && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <FloatingInput
                        label="Banner Image URL"
                        type="text"
                        value={editedData?.["Banner"] !== undefined ? editedData["Banner"] : (data?.["Banner"] || "")}
                        onChange={(e: any) => handleInputChange("Banner", e.target.value)}
                      />
                    </div>
                    <label
                      className={`flex items-center gap-1.5 px-3 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg border border-teal-200 cursor-pointer transition-colors shrink-0 shadow-xs ${isUploadingBanner ? 'opacity-60 cursor-not-allowed' : ''}`}
                      title="Upload Banner Image"
                    >
                      {isUploadingBanner ? (
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                      ) : (
                        <Upload className="w-4 h-4 text-teal-600" />
                      )}
                      <span className="hidden sm:inline">{isUploadingBanner ? "Uploading..." : "Upload Banner"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingBanner}
                        onChange={handleBannerUpload}
                      />
                    </label>
                  </div>
                  {(editedData?.["Banner"] || data?.["Banner"]) && (
                    <div className="flex items-center gap-2 px-1 text-slate-500 text-[11px]">
                      <span className="font-medium">Current Banner:</span>
                      <a
                        href={editedData?.["Banner"] !== undefined ? editedData["Banner"] : data?.["Banner"]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-800 font-semibold inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View Image
                      </a>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FloatingInput
                    label="Date"
                    type="date"
                    value={editedData?.["Date"] !== undefined ? editedData["Date"] : (data?.["Date"] || "")}
                    onChange={(e: any) => handleInputChange("Date", e.target.value)}
                  />

                  <FloatingInput
                    label="Course Code"
                    type="text"
                    value={editedData?.["Course Code"] !== undefined ? editedData["Course Code"] : (data?.["Course Code"] || "")}
                    onChange={(e: any) => handleInputChange("Course Code", e.target.value)}
                    className="font-bold uppercase"
                  />

                  <FloatingInput
                    label="Course Title"
                    type="text"
                    value={editedData?.["Course Title"] !== undefined ? editedData["Course Title"] : (data?.["Course Title"] || "")}
                    onChange={(e: any) => handleInputChange("Course Title", e.target.value)}
                  />
                </div>

                {(() => {
                  const clsHead = headers?.find(h => h === "Class" || h === "No. of Class") || ("No. of Class" in (data || {}) ? "No. of Class" : "Class");
                  const stdHead = headers?.find(h => h === "Student Size" || h === "Student" || h.toLowerCase().includes("student") || h.toLowerCase().includes("size")) || ("Student" in (data || {}) ? "Student" : "Student Size");
                  
                  return (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Duration / Class / Student / Fee / Mode</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <FloatingInput
                          label="Duration"
                          type="number"
                          value={editedData?.["Duration"] !== undefined ? editedData["Duration"] : (data?.["Duration"] ?? "")}
                          onChange={(e: any) => handleInputChange("Duration", e.target.value)}
                        />
                        <FloatingInput
                          label={clsHead}
                          type="number"
                          value={editedData?.[clsHead] !== undefined ? editedData[clsHead] : (editedData?.["Class"] !== undefined ? editedData["Class"] : (data?.[clsHead] ?? data?.["Class"] ?? ""))}
                          onChange={(e: any) => handleInputChange(clsHead, e.target.value)}
                        />
                        <FloatingInput
                          label={stdHead}
                          type="number"
                          value={editedData?.[stdHead] !== undefined ? editedData[stdHead] : (editedData?.["Student Size"] !== undefined ? editedData["Student Size"] : (data?.[stdHead] ?? data?.["Student Size"] ?? ""))}
                          onChange={(e: any) => handleInputChange(stdHead, e.target.value)}
                        />
                        <FloatingInput
                          label="Course Fee"
                          type="number"
                          prefix="৳"
                          value={editedData?.["Course Fee"] !== undefined ? editedData["Course Fee"] : (data?.["Course Fee"] ?? "")}
                          onChange={(e: any) => handleInputChange("Course Fee", e.target.value)}
                        />
                        <ModeMultiSelect
                          label="Mode"
                          value={editedData?.["Mode"] !== undefined ? editedData["Mode"] : (data?.["Mode"] ?? "")}
                          onChange={(val: string) => handleInputChange("Mode", val)}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Publication Status Edit Control */}
                {(() => {
                  const courseObj = editedData && Object.keys(editedData).length > 0 ? editedData : data;
                  const courseOfferList = extraFormProps?.courseOfferData || [];
                  const evaluatedStatus = getPublicationStatus(courseObj, courseOfferList);
                  const selectedPubStatus = editedData?.["Publication Status"] !== undefined
                    ? editedData["Publication Status"]
                    : (data?.["Publication Status"] || data?.["Published Status"] || evaluatedStatus);

                  const canBePublished = evaluatedStatus === "Ready to Publish" || String(selectedPubStatus).toLowerCase() === "published";

                  return (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                        Publication Status
                      </label>
                      {canBePublished ? (
                        <select
                          value={String(selectedPubStatus).toLowerCase() === "published" ? "Published" : "Ready to Publish"}
                          onChange={(e) => {
                            handleInputChange("Publication Status", e.target.value);
                            handleInputChange("Published Status", e.target.value);
                          }}
                          className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:border-teal-500 outline-none uppercase cursor-pointer"
                        >
                          <option value="Ready to Publish">Ready to Publish</option>
                          <option value="Published">Published</option>
                        </select>
                      ) : (
                        <div className="w-full text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between">
                          <span>UNDER REVIEW</span>
                          <span className="text-[10px] font-normal text-amber-600">Complete required fields to reach "Ready to Publish"</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Remarks removed */}
              </>
            )}

            {infoVerticalTab === 'proposal' && (
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Proposal Document</span>
                
                <div className="flex flex-col gap-3">
                  <label className={`flex items-center justify-center gap-1.5 w-full max-w-[250px] px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer transition-colors shadow-xs ${isUploadingProposal ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    {isUploadingProposal ? (
                      <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-slate-600" />
                    )}
                    <span>{isUploadingProposal ? "Uploading..." : "Upload Proposal"}</span>
                    <input type="file" className="hidden" disabled={isUploadingProposal} onChange={handleProposalUpload} />
                  </label>

                  <div className="w-full">
                    <FloatingInput
                      label="Or Enter URL manually"
                      type="text"
                      value={editedData?.["Proposal"] !== undefined ? editedData["Proposal"] : (data?.["Proposal"] ?? "")}
                      onChange={(e: any) => handleInputChange("Proposal", e.target.value)}
                    />
                  </div>
                </div>

                {(editedData?.["Proposal"] || data?.["Proposal"]) && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Current Proposal:</span>
                    <a href={editedData?.["Proposal"] || data?.["Proposal"]} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-800 text-xs font-semibold flex items-center gap-1">
                      <Eye className="w-3 h-3" /> View Document
                    </a>
                  </div>
                )}
              </div>
            )}

            {infoVerticalTab === 'objective' && (
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Objective</span>
                <textarea
                  value={editedData?.["Objective"] !== undefined ? editedData["Objective"] : (data?.["Objective"] || '')}
                  onChange={(e) => handleInputChange('Objective', e.target.value)}
                  className="w-full text-[12px] font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:border-teal-500 outline-none uppercase"
                  rows={6}
                />
              </div>
            )}

            {infoVerticalTab === 'outcome' && (
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Learning Outcome</span>
                <textarea
                  value={editedData?.["Learning Outcome"] !== undefined ? editedData["Learning Outcome"] : (data?.["Learning Outcome"] || '')}
                  onChange={(e) => handleInputChange('Learning Outcome', e.target.value)}
                  className="w-full text-[12px] font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:border-teal-500 outline-none uppercase"
                  rows={6}
                />
              </div>
            )}

            {infoVerticalTab === 'demand' && (
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Industry Demand</span>
                <textarea
                  value={editedData?.["Industry Demand"] !== undefined ? editedData["Industry Demand"] : (data?.["Industry Demand"] || '')}
                  onChange={(e) => handleInputChange('Industry Demand', e.target.value)}
                  className="w-full text-[12px] font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:border-teal-500 outline-none uppercase"
                  rows={6}
                />
              </div>
            )}

            {infoVerticalTab === 'audience' && (
              <TargetAudienceEditor
                value={(function() {
                  const k = Object.keys(editedData || {}).find(key => key.trim().toLowerCase() === "target audience");
                  const dataK = Object.keys(data || {}).find(key => key.trim().toLowerCase() === "target audience");
                  return (k ? editedData[k] : (dataK ? data[dataK] : "")) || "";
                })()}
                onChange={(val) => handleInputChange('Target Audience', val)}
                options={allTargetAudiences}
              />
            )}

            {infoVerticalTab === 'expert' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Industry Expert</label>
                <EmployeeMultiSelect
                  label="Industry Expert"
                  selectedIds={resolveNamesOrIdsToIds(
                    editedData?.["Industry Expert"] !== undefined
                      ? String(editedData["Industry Expert"] || "")
                      : (editedData?.["Industry Expart"] !== undefined
                          ? String(editedData["Industry Expart"] || "")
                          : String(data?.["Industry Expert"] || data?.["Industry Expart"] || "")),
                    (employees && employees.length > 0) ? employees : (extraFormProps?.employees || [])
                  )}
                  onChange={(ids) => {
                    handleInputChange("Industry Expert", ids.join(','));
                    handleInputChange("Industry Expart", ids.join(','));
                  }}
                  employees={(employees && employees.length > 0) ? employees : (extraFormProps?.employees || [])}
                />
              </div>
            )}

            {infoVerticalTab === 'syllabus' && (
              <div className="flex flex-col w-full h-full min-h-[320px] relative pb-12">
                <div className="w-full border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-[11px]">Version Name</th>
                          <th className="px-3 py-2 text-[11px] text-center">Start Date</th>
                          <th className="px-3 py-2 text-[11px] text-center">End Date</th>
                          <th className="px-3 py-2 text-[11px]">View / Upload</th>
                          <th className="px-3 py-2 text-[11px] text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const val = editedData?.["Syllabus"] !== undefined ? editedData["Syllabus"] : (data?.["Syllabus"] || "");
                          const entries = val ? String(val).split(',').map(s => s.trim()).filter(Boolean).map(s => {
                            if (s.includes('|')) {
                              const [version, startDate, endDate, ...urlParts] = s.split('|');
                              return {
                                version: version || '—',
                                startDate: startDate || '—',
                                endDate: endDate || '—',
                                url: urlParts.join('|')
                              };
                            }
                            if (s.includes(':') && !s.startsWith('http://') && !s.startsWith('https://')) {
                              const colonIdx = s.indexOf(':');
                              return {
                                version: s.substring(0, colonIdx) || '—',
                                startDate: '—',
                                endDate: '—',
                                url: s.substring(colonIdx + 1)
                              };
                            }
                            return {
                              version: s.startsWith('http') ? 'Syllabus' : s,
                              startDate: '—',
                              endDate: '—',
                              url: s.startsWith('http') ? s : ''
                            };
                          }) : [];

                          return (
                            <>
                              {entries.map((entry, idx) => {
                                const isRowEditing = editingSyllabusIndex === idx && editingSyllabusRow !== null;
                                if (isRowEditing && editingSyllabusRow) {
                                  return (
                                    <tr key={`syllabus-existing-${idx}`} className="bg-teal-50/40">
                                      <td className="px-2 py-1.5 border-r border-teal-100">
                                        <input
                                          type="text"
                                          placeholder="Version Name (e.g. V1)"
                                          value={editingSyllabusRow.version}
                                          onChange={e => setEditingSyllabusRow({ ...editingSyllabusRow, version: e.target.value })}
                                          className="w-full min-w-[110px] text-xs font-medium bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 border-r border-teal-100 text-center">
                                        <input
                                          type="date"
                                          value={editingSyllabusRow.startDate === '—' ? '' : editingSyllabusRow.startDate}
                                          onChange={e => setEditingSyllabusRow({ ...editingSyllabusRow, startDate: e.target.value })}
                                          className="w-full min-w-[110px] text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 border-r border-teal-100 text-center">
                                        <input
                                          type="date"
                                          value={editingSyllabusRow.endDate === '—' ? '' : editingSyllabusRow.endDate}
                                          onChange={e => setEditingSyllabusRow({ ...editingSyllabusRow, endDate: e.target.value })}
                                          className="w-full min-w-[110px] text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 border-r border-teal-100">
                                        <div className="flex items-center gap-1.5 min-w-[180px]">
                                          <label className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-200 cursor-pointer transition-colors shrink-0" title="Upload Document File">
                                            {uploadingEditSyllabus ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                                            ) : (
                                              <Upload className="w-3.5 h-3.5" />
                                            )}
                                            <input type="file" className="hidden" onChange={handleEditSyllabusFileUpload} />
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="URL or upload file"
                                            value={editingSyllabusRow.url}
                                            onChange={e => setEditingSyllabusRow({ ...editingSyllabusRow, url: e.target.value })}
                                            className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                          />
                                          {editingSyllabusRow.url && (
                                            <a href={editingSyllabusRow.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-800 p-1 shrink-0" title="View Document">
                                              <Eye className="w-3.5 h-3.5" />
                                            </a>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-2 py-1.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [...entries];
                                              updated[idx] = editingSyllabusRow;
                                              handleInputChange("Syllabus", updated.map(e => `${e.version || 'Syllabus'}|${e.startDate || ''}|${e.endDate || ''}|${e.url || ''}`).join(', '));
                                              setEditingSyllabusIndex(null);
                                              setEditingSyllabusRow(null);
                                            }}
                                            className="text-teal-600 hover:text-teal-800 p-1 transition-colors"
                                            title="Save Changes"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingSyllabusIndex(null);
                                              setEditingSyllabusRow(null);
                                            }}
                                            className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
                                            title="Cancel Edit"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                }

                                return (
                                  <tr key={`syllabus-existing-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-3 py-2 font-semibold text-slate-800">{entry.version}</td>
                                    <td className="px-3 py-2 text-center text-slate-600">{entry.startDate}</td>
                                    <td className="px-3 py-2 text-center text-slate-600">{entry.endDate}</td>
                                    <td className="px-3 py-2">
                                      {entry.url ? (
                                        <a
                                          href={entry.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-800 font-bold uppercase tracking-wider text-[11px]"
                                        >
                                          <Eye className="w-3.5 h-3.5" /> View
                                        </a>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingSyllabusIndex(idx);
                                            setEditingSyllabusRow({
                                              version: entry.version === '—' ? '' : entry.version,
                                              startDate: entry.startDate === '—' ? '' : entry.startDate,
                                              endDate: entry.endDate === '—' ? '' : entry.endDate,
                                              url: entry.url
                                            });
                                          }}
                                          className="text-slate-400 hover:text-teal-600 transition-colors p-1"
                                          title="Edit Syllabus"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = entries.filter((_, i) => i !== idx);
                                            handleInputChange("Syllabus", updated.map(e => `${e.version}|${e.startDate}|${e.endDate}|${e.url}`).join(', '));
                                          }}
                                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                          title="Delete Syllabus"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* New syllabus rows being added inline */}
                              {isAddSyllabusOpen && newSyllabusData.map((newRow, rowIndex) => (
                                <tr key={`new-syllabus-${rowIndex}`} className="bg-amber-50/40">
                                  <td className="px-2 py-1.5 border-r border-amber-100">
                                    <input
                                      type="text"
                                      placeholder="Version Name (e.g. V1)"
                                      value={newRow.version}
                                      onChange={e => {
                                        const updated = [...newSyllabusData];
                                        updated[rowIndex] = { ...newRow, version: e.target.value };
                                        setNewSyllabusData(updated);
                                      }}
                                      className="w-full min-w-[110px] text-xs font-medium bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 border-r border-amber-100 text-center">
                                    <input
                                      type="date"
                                      value={newRow.startDate}
                                      onChange={e => {
                                        const updated = [...newSyllabusData];
                                        updated[rowIndex] = { ...newRow, startDate: e.target.value };
                                        setNewSyllabusData(updated);
                                      }}
                                      className="w-full min-w-[110px] text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 border-r border-amber-100 text-center">
                                    <input
                                      type="date"
                                      value={newRow.endDate}
                                      onChange={e => {
                                        const updated = [...newSyllabusData];
                                        updated[rowIndex] = { ...newRow, endDate: e.target.value };
                                        setNewSyllabusData(updated);
                                      }}
                                      className="w-full min-w-[110px] text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 border-r border-amber-100">
                                    <div className="flex items-center gap-1.5 min-w-[180px]">
                                      <label className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-200 cursor-pointer transition-colors shrink-0" title="Upload Document File">
                                        {uploadingSyllabusIndex === rowIndex ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                                        ) : (
                                          <Upload className="w-3.5 h-3.5" />
                                        )}
                                        <input type="file" className="hidden" onChange={(e) => handleSyllabusFileUpload(e, rowIndex)} />
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="URL or upload file"
                                        value={newRow.url}
                                        onChange={e => {
                                          const updated = [...newSyllabusData];
                                          updated[rowIndex] = { ...newRow, url: e.target.value };
                                          setNewSyllabusData(updated);
                                        }}
                                        className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                      />
                                      {newRow.url && (
                                        <a href={newRow.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-800 p-1 shrink-0" title="View Document">
                                          <Eye className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    {newSyllabusData.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewSyllabusData(prev => prev.filter((_, i) => i !== rowIndex));
                                        }}
                                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                                        title="Remove Row"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}

                              {entries.length === 0 && !isAddSyllabusOpen && (
                                <tr>
                                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400 font-medium">
                                    NO SYLLABUS FOUND
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Floating action controls matching Batch add UX */}
                <div className="absolute bottom-1 right-3 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-full shadow-lg border border-slate-200">
                  {isAddSyllabusOpen && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (newSyllabusData.length === 0) return;
                          const val = editedData?.["Syllabus"] !== undefined ? editedData["Syllabus"] : (data?.["Syllabus"] || "");
                          const existingEntries = val ? String(val).split(',').map(s => s.trim()).filter(Boolean) : [];
                          const newEntries = newSyllabusData.map(d => `${d.version || 'Syllabus'}|${d.startDate || ''}|${d.endDate || ''}|${d.url || ''}`);
                          const combined = [...existingEntries, ...newEntries].join(', ');
                          handleInputChange("Syllabus", combined);
                          setNewSyllabusData([]);
                          setIsAddSyllabusOpen(false);
                        }}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        title="Save Syllabus"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewSyllabusData([]);
                          setIsAddSyllabusOpen(false);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const val = editedData?.["Syllabus"] !== undefined ? editedData["Syllabus"] : (data?.["Syllabus"] || "");
                      const existingCount = val ? String(val).split(',').map(s => s.trim()).filter(Boolean).length : 0;
                      if (isAddSyllabusOpen) {
                        setNewSyllabusData(prev => [
                          ...prev,
                          {
                            version: `V${existingCount + prev.length + 1}`,
                            startDate: '',
                            endDate: '',
                            url: ''
                          }
                        ]);
                      } else {
                        setIsAddSyllabusOpen(true);
                        setNewSyllabusData([{
                          version: `V${existingCount + 1}`,
                          startDate: '',
                          endDate: '',
                          url: ''
                        }]);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-full shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                    title={isAddSyllabusOpen ? "Add Another Syllabus Row" : "Add Syllabus"}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddSyllabusOpen ? "Add Row" : "Add Syllabus"}</span>
                  </button>
                </div>
              </div>
            )}

            {infoVerticalTab === 'learning_material' && (
              <div className="flex flex-col w-full h-full min-h-[320px] relative pb-12">
                <div className="w-full border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-[11px]">Material Title</th>
                          <th className="px-3 py-2 text-[11px] text-center">Start Date</th>
                          <th className="px-3 py-2 text-[11px] text-center">End Date</th>
                          <th className="px-3 py-2 text-[11px]">View / Upload</th>
                          <th className="px-3 py-2 text-[11px] text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const val = editedData?.["Learning Material"] !== undefined ? editedData["Learning Material"] : (data?.["Learning Material"] || "");
                          const entries = val ? String(val).split(',').map(s => s.trim()).filter(Boolean).map(s => {
                            if (s.includes('|')) {
                              const [title, startDate, endDate, ...urlParts] = s.split('|');
                              return {
                                title: title || '—',
                                startDate: startDate || '—',
                                endDate: endDate || '—',
                                url: urlParts.join('|')
                              };
                            }
                            if (s.includes(':') && !s.startsWith('http://') && !s.startsWith('https://')) {
                              const colonIdx = s.indexOf(':');
                              return {
                                title: s.substring(0, colonIdx) || '—',
                                startDate: '—',
                                endDate: '—',
                                url: s.substring(colonIdx + 1)
                              };
                            }
                            return {
                              title: s.startsWith('http') ? 'Learning Material' : s,
                              startDate: '—',
                              endDate: '—',
                              url: s.startsWith('http') ? s : ''
                            };
                          }) : [];

                          return (
                            <>
                              {entries.map((entry, idx) => {
                                const isRowEditing = editingLearningMaterialIndex === idx && editingLearningMaterialRow !== null;
                                if (isRowEditing && editingLearningMaterialRow) {
                                  return (
                                    <tr key={`lm-existing-${idx}`} className="bg-teal-50/40">
                                      <td className="px-2 py-1.5 border-r border-teal-100">
                                        <input
                                          type="text"
                                          placeholder="Material Title"
                                          value={editingLearningMaterialRow.title}
                                          onChange={e => setEditingLearningMaterialRow({ ...editingLearningMaterialRow, title: e.target.value })}
                                          className="w-full min-w-[110px] text-xs font-medium bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 border-r border-teal-100 text-center">
                                        <input
                                          type="date"
                                          value={editingLearningMaterialRow.startDate === '—' ? '' : editingLearningMaterialRow.startDate}
                                          onChange={e => setEditingLearningMaterialRow({ ...editingLearningMaterialRow, startDate: e.target.value })}
                                          className="w-full min-w-[110px] text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 border-r border-teal-100 text-center">
                                        <input
                                          type="date"
                                          value={editingLearningMaterialRow.endDate === '—' ? '' : editingLearningMaterialRow.endDate}
                                          onChange={e => setEditingLearningMaterialRow({ ...editingLearningMaterialRow, endDate: e.target.value })}
                                          className="w-full min-w-[110px] text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 border-r border-teal-100">
                                        <div className="flex items-center gap-1.5 min-w-[180px]">
                                          <label className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-200 cursor-pointer transition-colors shrink-0" title="Upload Document File">
                                            {uploadingEditLearningMaterial ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                                            ) : (
                                              <Upload className="w-3.5 h-3.5" />
                                            )}
                                            <input type="file" className="hidden" onChange={handleEditLearningMaterialFileUpload} />
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="URL or upload file"
                                            value={editingLearningMaterialRow.url}
                                            onChange={e => setEditingLearningMaterialRow({ ...editingLearningMaterialRow, url: e.target.value })}
                                            className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                          />
                                          {editingLearningMaterialRow.url && (
                                            <a href={editingLearningMaterialRow.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-800 p-1 shrink-0" title="View Document">
                                              <Eye className="w-3.5 h-3.5" />
                                            </a>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-2 py-1.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [...entries];
                                              updated[idx] = editingLearningMaterialRow;
                                              handleInputChange("Learning Material", updated.map(e => `${e.title || 'Material'}|${e.startDate || ''}|${e.endDate || ''}|${e.url || ''}`).join(', '));
                                              setEditingLearningMaterialIndex(null);
                                              setEditingLearningMaterialRow(null);
                                            }}
                                            className="text-teal-600 hover:text-teal-800 p-1 transition-colors"
                                            title="Save Changes"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingLearningMaterialIndex(null);
                                              setEditingLearningMaterialRow(null);
                                            }}
                                            className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
                                            title="Cancel Edit"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                }

                                return (
                                  <tr key={`lm-existing-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-3 py-2 font-semibold text-slate-800">{entry.title}</td>
                                    <td className="px-3 py-2 text-center text-slate-600">{entry.startDate}</td>
                                    <td className="px-3 py-2 text-center text-slate-600">{entry.endDate}</td>
                                    <td className="px-3 py-2">
                                      {entry.url ? (
                                        <a
                                          href={entry.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-800 font-bold uppercase tracking-wider text-[11px]"
                                        >
                                          <Eye className="w-3.5 h-3.5" /> View
                                        </a>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingLearningMaterialIndex(idx);
                                            setEditingLearningMaterialRow({
                                              title: entry.title === '—' ? '' : entry.title,
                                              startDate: entry.startDate === '—' ? '' : entry.startDate,
                                              endDate: entry.endDate === '—' ? '' : entry.endDate,
                                              url: entry.url
                                            });
                                          }}
                                          className="text-slate-400 hover:text-teal-600 transition-colors p-1"
                                          title="Edit Learning Material"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = entries.filter((_, i) => i !== idx);
                                            handleInputChange("Learning Material", updated.map(e => `${e.title}|${e.startDate}|${e.endDate}|${e.url}`).join(', '));
                                          }}
                                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                          title="Delete Learning Material"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* New learning material rows being added inline */}
                              {isAddLearningMaterialOpen && newLearningMaterialData.map((newRow, rowIndex) => (
                                <tr key={`new-lm-${rowIndex}`} className="bg-amber-50/40">
                                  <td className="px-2 py-1.5 border-r border-amber-100">
                                    <input
                                      type="text"
                                      placeholder="Material Title (e.g. Module 1)"
                                      value={newRow.title}
                                      onChange={e => {
                                        const updated = [...newLearningMaterialData];
                                        updated[rowIndex] = { ...newRow, title: e.target.value };
                                        setNewLearningMaterialData(updated);
                                      }}
                                      className="w-full min-w-[110px] text-xs font-medium bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 border-r border-amber-100 text-center">
                                    <input
                                      type="date"
                                      value={newRow.startDate}
                                      onChange={e => {
                                        const updated = [...newLearningMaterialData];
                                        updated[rowIndex] = { ...newRow, startDate: e.target.value };
                                        setNewLearningMaterialData(updated);
                                      }}
                                      className="w-full min-w-[110px] text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 border-r border-amber-100 text-center">
                                    <input
                                      type="date"
                                      value={newRow.endDate}
                                      onChange={e => {
                                        const updated = [...newLearningMaterialData];
                                        updated[rowIndex] = { ...newRow, endDate: e.target.value };
                                        setNewLearningMaterialData(updated);
                                      }}
                                      className="w-full min-w-[110px] text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 border-r border-amber-100">
                                    <div className="flex items-center gap-1.5 min-w-[180px]">
                                      <label className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-200 cursor-pointer transition-colors shrink-0" title="Upload Document File">
                                        {uploadingLearningMaterialIndex === rowIndex ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                                        ) : (
                                          <Upload className="w-3.5 h-3.5" />
                                        )}
                                        <input type="file" className="hidden" onChange={(e) => handleLearningMaterialFileUpload(e, rowIndex)} />
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="URL or upload file"
                                        value={newRow.url}
                                        onChange={e => {
                                          const updated = [...newLearningMaterialData];
                                          updated[rowIndex] = { ...newRow, url: e.target.value };
                                          setNewLearningMaterialData(updated);
                                        }}
                                        className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-teal-500"
                                      />
                                      {newRow.url && (
                                        <a href={newRow.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-800 p-1 shrink-0" title="View Document">
                                          <Eye className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    {newLearningMaterialData.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewLearningMaterialData(prev => prev.filter((_, i) => i !== rowIndex));
                                        }}
                                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                                        title="Remove Row"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}

                              {entries.length === 0 && !isAddLearningMaterialOpen && (
                                <tr>
                                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400 font-medium">
                                    NO LEARNING MATERIAL FOUND
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Floating action controls */}
                <div className="absolute bottom-1 right-3 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-full shadow-lg border border-slate-200">
                  {isAddLearningMaterialOpen && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (newLearningMaterialData.length === 0) return;
                          const val = editedData?.["Learning Material"] !== undefined ? editedData["Learning Material"] : (data?.["Learning Material"] || "");
                          const existingEntries = val ? String(val).split(',').map(s => s.trim()).filter(Boolean) : [];
                          const newEntries = newLearningMaterialData.map(d => `${d.title || 'Learning Material'}|${d.startDate || ''}|${d.endDate || ''}|${d.url || ''}`);
                          const combined = [...existingEntries, ...newEntries].join(', ');
                          handleInputChange("Learning Material", combined);
                          setNewLearningMaterialData([]);
                          setIsAddLearningMaterialOpen(false);
                        }}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        title="Save Learning Material"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewLearningMaterialData([]);
                          setIsAddLearningMaterialOpen(false);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const val = editedData?.["Learning Material"] !== undefined ? editedData["Learning Material"] : (data?.["Learning Material"] || "");
                      const existingCount = val ? String(val).split(',').map(s => s.trim()).filter(Boolean).length : 0;
                      if (isAddLearningMaterialOpen) {
                        setNewLearningMaterialData(prev => [
                          ...prev,
                          {
                            title: `Material ${existingCount + prev.length + 1}`,
                            startDate: '',
                            endDate: '',
                            url: ''
                          }
                        ]);
                      } else {
                        setIsAddLearningMaterialOpen(true);
                        setNewLearningMaterialData([{
                          title: `Material ${existingCount + 1}`,
                          startDate: '',
                          endDate: '',
                          url: ''
                        }]);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-full shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                    title={isAddLearningMaterialOpen ? "Add Another Material Row" : "Add Material"}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddLearningMaterialOpen ? "Add Row" : "Add Material"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MCCourseInfoContent;
