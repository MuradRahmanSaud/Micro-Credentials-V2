import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Edit2, Globe, Clock, Calendar, Users, CheckCircle, Target, BookOpen, AlertCircle, Save, Loader2, TrendingUp, Briefcase, GripVertical, Tag, Percent, Banknote, CreditCard, Wallet, PieChart, Trash2, Minimize2, UserCheck, MessageSquare, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart as RechartsBarChart, Bar, XAxis, YAxis } from 'recharts';
import EmployeeMultiSelect from './EmployeeMultiSelect';
import SearchableSingleSelect from './SearchableSingleSelect';
import MCBatchPanel from './MCBatchPanel';
import BatchDetailsView from './BatchDetailsView';
import DocumentsPanel from './DocumentsPanel';
import MCCourseInfoContent from './MCCourseInfoContent';
import MCCourseFinancialsView from './MCCourseFinancialsView';
import { Plus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Eye, Upload, Search, ListFilter, Pencil, Check, Award, Maximize2, Info, Activity } from 'lucide-react';
import { resolveNamesOrIdsToIds, resolveIdsToNames, cn, formatToMmmDdYyyy, isBatchRunning, parseWorkflowAndStages, serializeWorkflowAndStages, getStageAssignment, parseWorkflowTitle, formatRoutineDisplay, getPhotoUrl } from '../lib/utils';
import axios from 'axios';
import WorkflowTimeline from './WorkflowTimeline';
import WorkflowMultiSelector from './WorkflowMultiSelector';
import { FOLDER_LOCATIONS } from '../FolderLocation';

const TakaIcon = ({ className }: { className?: string }) => (
  <span className={`${className} font-medium select-none text-[13px] flex items-center justify-center leading-none`} style={{ fontFamily: 'sans-serif' }}>
    ৳
  </span>
);

function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  prefix,
  placeholder = " ",
  className = "",
  disabled = false,
  ...props
}: {
  label: string;
  value: any;
  onChange: (e: any) => void;
  type?: string;
  prefix?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  [key: string]: any;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).trim() !== "";
  const isFloating = isFocused || hasValue || type === "date";

  return (
    <div className={`relative flex items-center ${className}`}>
      {prefix && (
        <span className="absolute left-3 text-xs font-semibold text-gray-500 pointer-events-none z-10">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value === undefined || value === "—" ? "" : value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "peer w-full pt-4 pb-1.5 text-xs border border-gray-200 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-white transition-all text-gray-800 font-medium disabled:bg-slate-50 disabled:text-slate-500",
          prefix ? "pl-7 pr-3" : "px-3"
        )}
        {...props}
      />
      <label
        className={cn(
          "absolute transition-all duration-200 pointer-events-none uppercase tracking-wider font-bold select-none",
          prefix ? "left-7" : "left-3",
          isFloating
            ? "top-1 text-[8.5px] text-teal-600 bg-white px-1 ml-[-4px] font-extrabold z-10"
            : "top-3 text-xs text-gray-400 font-normal"
        )}
      >
        {label}
      </label>
    </div>
  );
}



interface MCCourseDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onSave: (formData: any, editingRow: any | null) => Promise<void>;
  employees?: any[];
  batches?: any[];
  documents?: any[];
  workflowData?: any[];
  extraFormProps?: {
    employees?: any[];
    onSaveBatch?: (formData: any, editingRow: any | null) => Promise<void>;
    onSaveDocument?: (formData: any, editingRow: any | null) => Promise<void>;
    batchHeaders?: string[];
    documentHeaders?: string[];
    expensesData?: any[];
    onSaveExpense?: (formData: any, editingRow: any | null) => Promise<void>;
    expensesHeaders?: string[];
    programNameData?: any[];
    programNameHeaders?: string[];
    courseOfferData?: any[];
    courseOfferHeaders?: string[];
    departmentalCourseData?: any[];
    departmentalCourseHeaders?: string[];
    onViewFile?: (url: string, title: string, doc?: any) => void;
    allCourses?: any[];
    onSelectCourse?: (course: any) => void;
    onExpand?: (course: any) => void;
  };
  initialExpanded?: boolean;
  headers?: string[];
  allCourses?: any[];
  onSelectCourse?: (course: any) => void;
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

export default function MCCourseDetails({ 
  isOpen, 
  onClose, 
  data, 
  onSave, 
  employees = [], 
  batches = [], 
  documents = [], 
  workflowData = [],
  extraFormProps,
  initialExpanded = true,
  headers = [],
  allCourses,
  onSelectCourse
}: MCCourseDetailsProps) {
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [editedBatches, setEditedBatches] = useState<Record<string, any>>({});
  const [localNewBatches, setLocalNewBatches] = useState<any[]>([]);
  const [localNewDocs, setLocalNewDocs] = useState<any[]>([]);
  const [batchSavingKey, setBatchSavingKey] = useState<string | null>(null);
  const [activeDocKey, setActiveDocKey] = useState<string | null>(null);
  const [newBatchesData, setNewBatchesData] = useState<any[]>([]);
  const [batchWarning, setBatchWarning] = useState<string | null>(null);
  
  const [newRemarkDate, setNewRemarkDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newRemarkEmployee, setNewRemarkEmployee] = useState<string>("");
  const [newRemarkText, setNewRemarkText] = useState<string>("");
  const [isSavingRemark, setIsSavingRemark] = useState(false);
  const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    if (isEmployeeDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isEmployeeDropdownOpen]);
  
  const [newDocumentData, setNewDocumentData] = useState({
    "Documents Title": "",
    "Date": new Date().toISOString().split('T')[0],
    "File Link": ""
  });

  const handleAddRemark = async () => {
    if (!newRemarkDate || !newRemarkEmployee || !newRemarkText.trim()) {
      alert("Please fill all fields for the remark.");
      return;
    }
    setIsSavingRemark(true);
    
    const currentRemarks = parseRemarks(editedData?.['Remarks'] || data?.['Remarks']);
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

    if (!isEditing && onSave) {
       const updatedData = { ...data, 'Remarks': remarksStr };
       try {
         await onSave(updatedData, data);
       } catch (err) {
         console.error("Failed to save remark", err);
         alert("Failed to save remark");
       }
    }

    setIsSavingRemark(false);
  };

  const getNextBatchNumber = (currentNewBatches: any[] = []) => {
    const courseBatches = [
      ...batches.filter(b => b['Course Code'] === data?.['Course Code'] || b['Course Name'] === data?.['Course Title']),
      ...localNewBatches,
      ...currentNewBatches
    ];
    const maxBatchNum = courseBatches.reduce((max, b) => {
      const match = String(b['Batch Number'] || '').match(/Batch-(\d+)/);
      const num = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, num);
    }, 0);
    return `Batch-${String(maxBatchNum + 1).padStart(2, '0')}`;
  };
  
  useEffect(() => {
    if (isAddBatchOpen) {
      if (newBatchesData.length === 0) {
        const nextBatchNumber = getNextBatchNumber([]);
        setNewBatchesData([
          {
            "Batch Number": nextBatchNumber,
            "Start Date": "",
            "End Date": "",
            "Student": "",
            "Instractor": "",
            "Course Fee": editedData?.["Course Fee"] !== undefined ? editedData["Course Fee"] : (data?.["Course Fee"] ?? ""),
            "Discount": ""
          }
        ]);
      }
    } else {
      setNewBatchesData([]);
      setBatchWarning(null);
    }
  }, [isAddBatchOpen, batches, localNewBatches, data]);

  const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevInitialExpanded, setPrevInitialExpanded] = useState(initialExpanded);

  if (isOpen !== prevIsOpen || initialExpanded !== prevInitialExpanded) {
    setPrevIsOpen(isOpen);
    setPrevInitialExpanded(initialExpanded);
    setIsExpanded(initialExpanded);
  }

  const [activeSidebarTab, setActiveSidebarTab] = useState<'workflow' | 'documents' | 'financial_overview' | 'batches' | 'info'>('workflow');
  const [infoVerticalTab, setInfoVerticalTab] = useState<'basic' | 'workflow' | 'batch' | 'proposal' | 'objective' | 'outcome' | 'demand' | 'audience' | 'program' | 'aligned' | 'expert' | 'documents' | 'financial_overview'>('basic');

  useEffect(() => {
    if (isExpanded && activeSidebarTab === 'batches') {
      setActiveSidebarTab('workflow');
    }
  }, [isExpanded, activeSidebarTab]);
  const [documentFilter, setDocumentFilter] = useState<string | null>(null);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number | null>(null);
  const [collapsedExpandedBatchIdx, setCollapsedExpandedBatchIdx] = useState<number | null>(null);
  const [inlineEditingBatchKey, setInlineEditingBatchKey] = useState<string | null>(null);
  const [batchSearchTerm, setBatchSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingNewDoc, setIsUploadingNewDoc] = useState(false);
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});
  const [editedData, setEditedData] = useState(data);
  const [batchPage, setBatchPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentCourseData, setCurrentCourseData] = useState(data);

  useEffect(() => {
    setCurrentCourseData(data);
    setEditedData(data);
    setIsEditing(false);
  }, [data]);

  const currentCourse = currentCourseData || data;

  const coursesList = useMemo(() => {
    const list = allCourses || extraFormProps?.allCourses || extraFormProps?.courseOfferData || [];
    return Array.isArray(list) ? list : [];
  }, [allCourses, extraFormProps?.allCourses, extraFormProps?.courseOfferData]);

  const currentIndex = useMemo(() => {
    if (!coursesList.length) return -1;
    const activeObj = currentCourseData || data;
    const currentCode = (editedData?.['Course Code'] || activeObj?.['Course Code'] || '').trim().toLowerCase();
    const currentTitle = (editedData?.['Course Title'] || activeObj?.['Course Title'] || '').trim().toLowerCase();

    return coursesList.findIndex((c: any) => {
      if (c === activeObj || c === data) return true;
      const code = (c?.['Course Code'] || '').trim().toLowerCase();
      if (currentCode && code && code === currentCode) return true;
      const title = (c?.['Course Title'] || '').trim().toLowerCase();
      if (currentTitle && title && title === currentTitle) return true;
      return false;
    });
  }, [coursesList, editedData, currentCourseData, data]);

  const handleNavigateCourse = React.useCallback((direction: 'prev' | 'next') => {
    if (!coursesList || coursesList.length <= 1) return;

    const activeObj = currentCourseData || data;
    const currentCode = (editedData?.['Course Code'] || activeObj?.['Course Code'] || '').trim().toLowerCase();
    const currentTitle = (editedData?.['Course Title'] || activeObj?.['Course Title'] || '').trim().toLowerCase();

    let idx = coursesList.findIndex((c: any) => {
      if (c === activeObj || c === data) return true;
      const code = (c?.['Course Code'] || '').trim().toLowerCase();
      if (currentCode && code && code === currentCode) return true;
      const title = (c?.['Course Title'] || '').trim().toLowerCase();
      if (currentTitle && title && title === currentTitle) return true;
      return false;
    });

    if (idx === -1) idx = 0;

    let newIdx = idx;
    if (direction === 'prev') {
      if (idx <= 0) return;
      newIdx = idx - 1;
    } else {
      if (idx >= coursesList.length - 1) return;
      newIdx = idx + 1;
    }

    const targetCourse = coursesList[newIdx];
    if (!targetCourse) return;

    setCurrentCourseData(targetCourse);
    setEditedData(targetCourse);
    setIsEditing(false);
    setEditedBatches({});
    setEditedDocs({});
    setLocalNewBatches([]);
    setLocalNewDocs([]);
    setInlineEditingBatchKey(null);

    if (onSelectCourse) {
      onSelectCourse(targetCourse);
    }
    if (extraFormProps?.onSelectCourse) {
      extraFormProps.onSelectCourse(targetCourse);
    }
    if (extraFormProps?.onExpand) {
      extraFormProps.onExpand(targetCourse);
    }
  }, [coursesList, editedData, currentCourseData, data, onSelectCourse, extraFormProps]);

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
        handleNavigateCourse('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavigateCourse('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleNavigateCourse]);

  const handleAddBatch = async () => {
    const validBatches = newBatchesData.filter(b => b["Start Date"] && b["End Date"]);
    if (validBatches.length === 0) {
      setBatchWarning("invalid");
      return;
    }

    const batchesToSave = validBatches.map(b => ({
      ...b,
      "Course Code": data?.['Course Code'] || editedData?.['Course Code'],
      "Course Name": data?.['Course Title'] || editedData?.['Course Title']
    }));

    setLocalNewBatches(prev => [...batchesToSave, ...prev]);
    setIsAddBatchOpen(false);
    setNewBatchesData([]);
    setBatchWarning(null);
    setIsEditing(true);
  };

  const addBatchRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = async (event: MouseEvent) => {
      if (!isAddBatchOpen) return;

      const target = event.target as HTMLElement;
      if (
        target.closest('[data-add-batch-row="true"]') ||
        target.closest('[data-portal-dropdown="true"]') ||
        target.closest('#add-batch-btn')
      ) {
        return;
      }

      // Do not auto-save on click outside. Let the user explicitly click the Save Batch button or Cancel.
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isAddBatchOpen, newBatchesData]);

  const handleAddDocument = async () => {
    const errors: Record<string, string> = {};
    if (!newDocumentData["Documents Title"]) errors.title = "Title is required";
    if (!newDocumentData["Date"]) errors.date = "Date is required";
    if (!newDocumentData["File Link"]) errors.link = "File link or upload is required";

    if (Object.keys(errors).length > 0) {
      setDocErrors(errors);
      return;
    }
    setDocErrors({});
    
    const docToSave = {
      ...newDocumentData,
      "Course Code": data?.['Course Code'],
      "Course Name": data?.['Course Title'],
      "Tag": data?.['Course Code']
    };

    if (isEditing) {
      setLocalNewDocs(prev => [...prev, docToSave]);
      setIsAddDocumentOpen(false);
      setDocErrors({});
      setNewDocumentData({
        "Documents Title": "",
        "Date": new Date().toISOString().split('T')[0],
        "File Link": ""
      });
      return;
    }

    if (extraFormProps?.onSaveDocument) {
      setIsSubmitting(true);
      await extraFormProps.onSaveDocument(docToSave, null);
      setIsSubmitting(false);
      setIsAddDocumentOpen(false);
      setDocErrors({});
      setNewDocumentData({
        "Documents Title": "",
        "Date": new Date().toISOString().split('T')[0],
        "File Link": ""
      });
    }
  };

  const [localStages, setLocalStages] = useState<any[]>([]);
  const [draggedStageIndex, setDraggedStageIndex] = useState<number | null>(null);

  const handleStageUpdate = (index: number, field: string, value: string) => {
    setLocalStages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddLocalStage = () => {
    if (!jobTitle) return;
    const newStageNum = localStages.length + 1;
    const newStage = {
      "ID": `WS-${Date.now()}`,
      "Job Title": jobTitle,
      "Workflow Stage": `${newStageNum}. New Stage`,
      "Key Responsibilities": "",
      "Deliverables": ""
    };
    setLocalStages(prev => [...prev, newStage]);
  };

  const handleDeleteLocalStage = (index: number) => {
    setLocalStages(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Resequence
      return updated.map((stage, i) => ({
        ...stage,
        "Workflow Stage": `${i + 1}. ${stage["Workflow Stage"].replace(/^\d+\.\s*/, '')}`
      }));
    });
  };

  const [editedDocs, setEditedDocs] = useState<Record<string, any>>({});
  const [docUploadingKey, setDocUploadingKey] = useState<string | null>(null);
  const [docSavingKey, setDocSavingKey] = useState<string | null>(null);

  const courseBatches = useMemo(() => {
    return [
      ...localNewBatches,
      ...batches.filter(b => b['Course Code'] === data?.['Course Code'] || b['Course Name'] === data?.['Course Title'])
    ].map(b => {
      const key = b["Batch Number"] || b["id"] || b["ID"];
      return editedBatches[key] || b;
    });
  }, [batches, data, localNewBatches, editedBatches]);

  const totalBatchDiscountForDetails = useMemo(() => {
    return courseBatches.reduce((sum, b) => {
      const d = parseFloat(String(b["Discount"] || "0").replace(/[^0-9.]/g, ""));
      const enrolledVal = b["Student"] || b["Enrolled"] || b["Enrollments"] || "0";
      const enrolled = parseInt(String(enrolledVal).replace(/[^0-9.]/g, ""), 10) || 0;
      return sum + (isNaN(d) ? 0 : d * enrolled);
    }, 0);
  }, [courseBatches]);

  const courseFinancials = useMemo(() => {
    let totalCourseFee = 0;
    let totalEnrolled = 0;
    let totalGrossRevenue = 0;
    let totalDiscount = 0;
    let totalBatchDiscountSum = 0;
    let totalBatchExpensesSum = 0;

    courseBatches.forEach(b => {
      const feeVal = b["Course Fee"] !== undefined && b["Course Fee"] !== "" ? b["Course Fee"] : (data?.["Course Fee"] || "0");
      const fee = parseFloat(String(feeVal).replace(/[^0-9.]/g, "")) || 0;

      const enrolledVal = b["Student"] || b["Enrolled"] || b["Enrollments"] || "0";
      const enrolled = parseInt(String(enrolledVal).replace(/[^0-9.]/g, ""), 10) || 0;

      const discountVal = b["Discount"] || "0";
      const discount = parseFloat(String(discountVal).replace(/[^0-9.]/g, "")) || 0;

      const expensesVal = b["Expenses"] || "0";
      const expenses = parseFloat(String(expensesVal).replace(/[^0-9.]/g, "")) || 0;

      totalCourseFee += fee;
      totalEnrolled += enrolled;
      totalGrossRevenue += (fee * enrolled);
      totalBatchDiscountSum += discount;
      totalDiscount += (discount * enrolled);
      totalBatchExpensesSum += expenses;
    });

    // Calculate expense summation from extraFormProps?.expensesData matching course & batch tags
    const expensesList = extraFormProps?.expensesData || [];
    const courseCode = String(data?.['Course Code'] || "").trim().toLowerCase();
    const cleanCourseCode = courseCode.replace(/[^a-z0-9]/g, '');

    let tagExpensesSum = 0;
    let hasTagExpensesMatch = false;

    if (Array.isArray(expensesList) && expensesList.length > 0) {
      const validTags = new Set<string>();
      if (courseCode) validTags.add(courseCode);

      courseBatches.forEach(b => {
        const bCode = String(b['Course Code'] || data?.['Course Code'] || "").trim().toLowerCase();
        const bNum = String(b['Batch Number'] || b['Batch'] || "").trim().toLowerCase();
        if (bCode && bNum) {
          validTags.add(`${bCode}-${bNum}`);
          validTags.add(`${bCode} ${bNum}`);
        }
        const bTag = String(b['Tag'] || b['Tag Name'] || "").trim().toLowerCase();
        if (bTag) validTags.add(bTag);
      });

      expensesList.forEach(item => {
        const itemTag = String(item["Tag"] || item["Tag Name"] || "").trim().toLowerCase();
        if (!itemTag) return;

        const cleanItemTag = itemTag.replace(/[^a-z0-9]/g, '');
        let isMatch = false;

        if (validTags.has(itemTag)) {
          isMatch = true;
        } else if (cleanCourseCode.length >= 2 && cleanItemTag.startsWith(cleanCourseCode)) {
          isMatch = true;
        }

        if (isMatch) {
          const amt = parseFloat(String(item["Amount"] || "0").replace(/[^0-9.]/g, "")) || 0;
          tagExpensesSum += amt;
          hasTagExpensesMatch = true;
        }
      });
    }

    const totalExpenses = (hasTagExpensesMatch || tagExpensesSum > 0) ? tagExpensesSum : totalBatchExpensesSum;

    const netRevenue = totalGrossRevenue - totalDiscount;
    const netProfit = netRevenue - totalExpenses;
    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    return {
      courseFee: totalCourseFee,
      enrolled: totalEnrolled,
      grossRevenue: totalGrossRevenue,
      batchDiscountSum: totalBatchDiscountSum,
      discount: totalDiscount,
      netRevenue,
      expenses: totalExpenses,
      netProfit,
      profitMargin
    };
  }, [courseBatches, data, extraFormProps?.expensesData]);

  const handleSelectBatchWithAutoSave = async (clickedIndex: number, clickedBatchKey: string) => {
    const previousKey = inlineEditingBatchKey;
    setSelectedBatchIndex(clickedIndex);

    if (!isEditing) {
      return;
    }

    if (previousKey === clickedBatchKey) {
      return;
    }

    if (previousKey) {
      const prevOriginalBatch = [
        ...batches.filter(b => b['Course Code'] === data?.['Course Code'] || b['Course Name'] === data?.['Course Title']),
        ...localNewBatches
      ].find(b => (b["Batch Number"] || b["id"] || b["ID"]) === previousKey);

      const prevLocalBatch = editedBatches[previousKey];

      if (prevLocalBatch && prevOriginalBatch) {
        const isDirty = JSON.stringify(prevLocalBatch) !== JSON.stringify(prevOriginalBatch);
        if (isDirty) {
          if (extraFormProps?.onSaveBatch) {
            setBatchSavingKey(previousKey);
            try {
              await extraFormProps.onSaveBatch(prevLocalBatch, prevOriginalBatch);
              setEditedBatches(prev => {
                const copy = { ...prev };
                delete copy[previousKey];
                return copy;
              });
            } catch (err) {
              console.error("Failed to auto-save batch:", err);
            } finally {
              setBatchSavingKey(null);
            }
          }
        }
      }
    }

    setInlineEditingBatchKey(clickedBatchKey);
  };

  const toInputDateValue = (dateStr: any) => {
    if (!dateStr) return '';
    // If it's a date object, format it. If it's a string, try parsing.
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const courseWorkflow = editedData?.['Workflow'] || editedData?.['Publication Workflow'] || data?.['Workflow'] || data?.['Publication Workflow'] || "";
  const { jobTitle, stageAssignments } = parseWorkflowAndStages(courseWorkflow);

  const parsedWorkflows = useMemo(() => {
    if (!Array.isArray(workflowData)) return [];
    return workflowData.map(row => {
      const idKey = Object.keys(row).find(h => {
        const cleaned = h.trim().toLowerCase();
        return cleaned === "workflow title" || cleaned === "title";
      }) || Object.keys(row)[0] || "Workflow Title";
      
      const rawText = String(row[idKey] || "");
      const structured = parseWorkflowTitle(rawText);
      return {
        id: structured.id,
        title: structured.title || rawText || "",
        stages: structured.stages || [],
        rawText
      };
    }).filter(item => item.title.trim() !== "");
  }, [workflowData]);

  useEffect(() => {
    if (!courseWorkflow || !parsedWorkflows || parsedWorkflows.length === 0) {
      setLocalStages([]);
      return;
    }

    const { jobTitle, stageAssignments } = parseWorkflowAndStages(courseWorkflow);
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
  }, [courseWorkflow, parsedWorkflows]);

  const handleStageDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData("text/plain", index.toString());
    setDraggedStageIndex(index);
  };

  const handleStageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleStageDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const newStages = [...localStages];
    const [movedStage] = newStages.splice(sourceIndex, 1);
    newStages.splice(targetIndex, 0, movedStage);
    setLocalStages(newStages);
    setDraggedStageIndex(null);

    // Update course's serialized workflow with the new order of stages
    const updatedAssignments: Record<string, string[]> = {};
    newStages.forEach(stg => {
      const originalName = stg["Workflow Stage"] || "Unnamed Stage";
      const assignedIds = stageAssignments[stg["ID"]] || getStageAssignment(stageAssignments, originalName);
      updatedAssignments[stg["ID"]] = assignedIds;
    });

    const serialized = serializeWorkflowAndStages(jobTitle, updatedAssignments);
    setEditedData((prev: any) => ({
      ...prev,
      'Workflow': serialized,
      'Publication Workflow': serialized
    }));
  };

  useEffect(() => {
    setEditedData(data);
    setIsEditing(false);
  }, [data]);

  // Updated course info based on the provided screenshot structure
  const courseInfo = [
    { key: 'Date', icon: Calendar, label: 'Date', value: editedData?.['Date'] ? formatToMmmDdYyyy(editedData['Date']) : '—' },
    { key: 'Mode', icon: Globe, label: 'Mode', value: editedData?.['Mode'] || 'Hybrid' },
    { key: 'Duration', icon: Clock, label: 'Duration', value: editedData?.['Duration'] || '30' },
    { key: 'Class', icon: Calendar, label: 'Class', value: editedData?.['Class'] || editedData?.['No. of Class'] || '10' },
    { key: 'Credit', icon: Award, label: 'Credit', value: editedData?.['Credit'] || '—' },
    { key: 'Course Fee', icon: TakaIcon, label: 'Course Fee', value: editedData?.['Course Fee'] || '2000' },
    { key: 'Student Size', icon: Users, label: 'Student Size', value: editedData?.['Student Size'] || '20-25' },
    { key: 'Status', icon: CheckCircle, label: 'Status', value: editedData?.['Status'] || 'On Hold' },
    { key: 'Batches', icon: AlertCircle, label: 'Batches', value: editedData?.['Batches'] || '—' },
    { key: 'Enrolled', icon: Users, label: 'Enrolled', value: editedData?.['Enrolled'] || editedData?.['Enrollments'] || '—' },
    { key: 'Aligned Course name', icon: BookOpen, label: 'Aligned Course Name', value: editedData?.['Aligned Course name'] || '—' },
    { key: 'Objective', icon: Target, label: 'Objective', value: editedData?.['Objective'] || '—' },
    { key: 'Learning Outcome', icon: BookOpen, label: 'Learning Outcome', value: editedData?.['Learning Outcome'] || '—' },
    { key: 'Industry Demand', icon: TrendingUp, label: 'Industry Demand', value: editedData?.['Industry Demand'] || '—' },
    { key: 'Target Audience', icon: Users, label: 'Target Audience', value: editedData?.['Target Audience'] || '—' },
    { 
      key: 'Gross Revenue', 
      icon: TakaIcon, 
      label: 'Gross Revenue', 
      value: (() => {
        const fee = parseFloat(String(editedData?.['Course Fee'] || "0").replace(/[^0-9.]/g, ""));
        const enrolled = parseInt(String(editedData?.['Enrolled'] || editedData?.['Enrollments'] || "0").replace(/[^0-9.]/g, ""), 10);
        const gross = isNaN(fee) || isNaN(enrolled) ? 0 : fee * enrolled;
        return gross.toLocaleString();
      })()
    },
    { 
      key: 'Net Revenue', 
      icon: TakaIcon, 
      label: 'Net Revenue', 
      value: (() => {
        const fee = parseFloat(String(editedData?.['Course Fee'] || "0").replace(/[^0-9.]/g, ""));
        const enrolled = parseInt(String(editedData?.['Enrolled'] || editedData?.['Enrollments'] || "0").replace(/[^0-9.]/g, ""), 10);
        const discount = totalBatchDiscountForDetails;
        const gross = isNaN(fee) || isNaN(enrolled) ? 0 : fee * enrolled;
        const net = gross - (isNaN(discount) ? 0 : discount);
        return net.toLocaleString();
      })()
    },
    { key: 'Discount', icon: TrendingUp, label: 'Discount', value: totalBatchDiscountForDetails > 0 ? `৳ ${totalBatchDiscountForDetails.toLocaleString()}` : '0' },
    { key: 'Expenses', icon: TrendingUp, label: 'Expenses', value: editedData?.['Expenses'] || '0' },
    { 
      key: 'Net Profit', 
      icon: TrendingUp, 
      label: 'Net Profit', 
      value: (() => {
        const fee = parseFloat(String(editedData?.['Course Fee'] || "0").replace(/[^0-9.]/g, ""));
        const enrolled = parseInt(String(editedData?.['Enrolled'] || editedData?.['Enrollments'] || "0").replace(/[^0-9.]/g, ""), 10);
        const discount = totalBatchDiscountForDetails;
        const expenses = parseFloat(String(editedData?.['Expenses'] || "0").replace(/[^0-9.]/g, ""));
        const gross = isNaN(fee) || isNaN(enrolled) ? 0 : fee * enrolled;
        const net = gross - (isNaN(discount) ? 0 : discount);
        const profit = net - (isNaN(expenses) ? 0 : expenses);
        return profit.toLocaleString();
      })()
    },
    { 
      key: 'Profit %', 
      icon: TrendingUp, 
      label: 'Profit %', 
      value: (() => {
        const fee = parseFloat(String(editedData?.['Course Fee'] || "0").replace(/[^0-9.]/g, ""));
        const enrolled = parseInt(String(editedData?.['Enrolled'] || editedData?.['Enrollments'] || "0").replace(/[^0-9.]/g, ""), 10);
        const discount = totalBatchDiscountForDetails;
        const expenses = parseFloat(String(editedData?.['Expenses'] || "0").replace(/[^0-9.]/g, ""));
        const gross = isNaN(fee) || isNaN(enrolled) ? 0 : fee * enrolled;
        const net = gross - (isNaN(discount) ? 0 : discount);
        const profit = net - (isNaN(expenses) ? 0 : expenses);
        const margin = net > 0 ? (profit / net) * 100 : 0;
        return `${margin.toFixed(1)}%`;
      })()
    },
  ];

  const handleInputChange = (key: string, value: string) => {
    setEditedData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      let finalEditedData = { ...editedData };

      // Re-serialize the course workflow with all selected workflow titles and stages to keep everything fully synced!
      if (localStages && localStages.length > 0) {
        const { jobTitle: currentJobTitle, stageAssignments: currentStageAssignments } = parseWorkflowAndStages(
          finalEditedData?.['Workflow'] || finalEditedData?.['Publication Workflow'] || ""
        );

        const updatedAssignments: Record<string, string[]> = {};
        const jobTitlesSet = new Set<string>();

        localStages.forEach((stage) => {
          const originalStageName = stage["Workflow Stage"] || "Unnamed Stage";
          const stageId = stage["ID"];
          const wfId = stage["Job Title"] || stage["Workflow Title"];
          if (wfId) jobTitlesSet.add(wfId);

          const assignedIds = currentStageAssignments[stageId] || currentStageAssignments[stage["StageKey"]] || getStageAssignment(currentStageAssignments, originalStageName) || [];
          updatedAssignments[stageId] = assignedIds;
        });

        const combinedJobTitle = jobTitlesSet.size > 0 ? Array.from(jobTitlesSet).join(", ") : currentJobTitle;
        const serialized = serializeWorkflowAndStages(combinedJobTitle, updatedAssignments);

        finalEditedData = {
          ...finalEditedData,
          'Workflow': serialized,
          'Publication Workflow': serialized
        };
      }

      // Check if there are batches currently being added, and capture them before saving
      let batchesToSave = [...localNewBatches];
      if (isAddBatchOpen) {
        const validBatches = newBatchesData.filter(b => b["Start Date"] && b["End Date"]);
        
        // Only add if not already in localNewBatches
        const formattedNew = validBatches.filter(b => 
            !localNewBatches.some(lb => lb["Batch Number"] === b["Batch Number"])
        ).map(b => ({
          ...b,
          "Course Code": data?.['Course Code'],
          "Course Name": data?.['Course Title']
        }));
        
        batchesToSave = [...batchesToSave, ...formattedNew];
      }

      // Check if there is a document currently being added, and capture it before saving
      let docsToSave = [...localNewDocs];
      if (isAddDocumentOpen && newDocumentData["Documents Title"]?.trim()) {
        const docToSave = {
          ...newDocumentData,
          "Course Code": data?.['Course Code'],
          "Course Name": data?.['Course Title'],
          "Tag": data?.['Course Code']
        };
        docsToSave.push(docToSave);
      }

      // Clear local new states immediately so they don't duplicate with the optimistic parent updates
      setLocalNewBatches([]);
      setLocalNewDocs([]);

      // Turn off editing state and close dialogs/forms immediately so UI becomes static instantly
      setIsAddBatchOpen(false);
      setIsAddDocumentOpen(false);
      setInlineEditingBatchKey(null);
      setIsEditing(false);

      // 1. Create a list of promises to execute concurrently
      const savePromises: Promise<any>[] = [];

      // Save Course row with the updated serialized workflow
      savePromises.push(onSave(finalEditedData, data));

      // 2. Save modified and new batches concurrently to maximize saving speed
      const saveBatchesSequence = async () => {
        if (extraFormProps?.onSaveBatch) {
          const promises: Promise<any>[] = [];
          const batchEntries = Object.entries(editedBatches);
          for (const [key, batchData] of batchEntries) {
            const originalBatch = batches.find(b => (b["Batch Number"] || b["id"] || b["ID"]) === key);
            promises.push(extraFormProps.onSaveBatch(batchData, originalBatch || null));
          }
          if (batchesToSave.length > 0) {
            for (const batchData of batchesToSave) {
              const batchKey = batchData["Batch Number"] || batchData["id"] || batchData["ID"];
              if (editedBatches[batchKey]) {
                // If this batch has been edited/modified in the active session, it is already processed.
                // Skipping to prevent saving a duplicate unedited/stale row.
                continue;
              }
              promises.push(extraFormProps.onSaveBatch(batchData, null));
            }
          }
          if (promises.length > 0) {
            await Promise.all(promises);
          }
        }
      };

      // 3. Save modified and new docs concurrently to maximize saving speed
      const saveDocsSequence = async () => {
        if (extraFormProps?.onSaveDocument) {
          const promises: Promise<any>[] = [];
          const docEntries = Object.entries(editedDocs);
          for (const [key, docData] of docEntries) {
            const originalDoc = documents.find(d => (d["Documents Title"] || d["id"] || d["ID"]) === key);
            promises.push(extraFormProps.onSaveDocument(docData, originalDoc || null));
          }
          if (docsToSave.length > 0) {
            for (const docData of docsToSave) {
              promises.push(extraFormProps.onSaveDocument(docData, null));
            }
          }
          if (promises.length > 0) {
            await Promise.all(promises);
          }
        }
      };

      savePromises.push(saveBatchesSequence());
      savePromises.push(saveDocsSequence());

      // Await all save operations to maximize saving speed and keep sequential order where needed
      await Promise.all(savePromises);

      // Clear local states and reset editing states
      setEditedBatches({});
      setEditedDocs({});
      setLocalNewBatches([]);
      setLocalNewDocs([]);
      setNewBatchesData([]);
      setNewDocumentData({
        "Documents Title": "",
        "Date": new Date().toISOString().split('T')[0],
        "File Link": ""
      });
    } catch (error) {
      console.error('Failed to save data:', error);
      alert('Failed to save data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDocumentsContent = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between bg-teal-50/80 px-3 py-1.5 rounded-lg border-b border-teal-100 mb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-[11px] font-bold text-teal-800 uppercase tracking-[0.2em]">Document List</h4>
          {documentFilter && (
             <button
               onClick={() => setDocumentFilter(null)}
               className="text-[9px] font-bold text-teal-600 hover:text-teal-800 hover:underline cursor-pointer bg-teal-100 px-1.5 py-0.5 rounded"
             >
               Clear Filter
             </button>
          )}
        </div>
        {isEditing && (
          <button onClick={() => setIsAddDocumentOpen(true)} className="flex items-center gap-1 text-[11px] font-bold uppercase text-teal-600 hover:text-teal-700 tracking-wider transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add New
          </button>
        )}
      </div>
      
      <AnimatePresence>
        {isAddDocumentOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4"
          >
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-sm">
              <div className="flex justify-between items-center">
                <h5 className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">New Document</h5>
                <button onClick={() => setIsAddDocumentOpen(false)}><X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" /></button>
              </div>
              <div className="space-y-2">
                 <div className="space-y-1">
                   <input
                      type="text" 
                      placeholder="Document Title" 
                      value={newDocumentData["Documents Title"]} 
                      onChange={e => {
                        setNewDocumentData({...newDocumentData, "Documents Title": e.target.value});
                        if (docErrors.title) setDocErrors(prev => ({ ...prev, title: "" }));
                      }}
                      className={`w-full text-[13px] font-medium p-2 bg-white border ${docErrors.title ? 'border-red-400' : 'border-slate-200'} rounded-lg outline-none focus:border-teal-500`}
                  />
                  {docErrors.title && <span className="text-[10px] text-red-500 font-medium pl-1">{docErrors.title}</span>}
                 </div>

                 <div className="space-y-1">
                   <input 
                       type="date" 
                       value={newDocumentData["Date"]} 
                       onChange={e => {
                         setNewDocumentData({...newDocumentData, "Date": e.target.value});
                         if (docErrors.date) setDocErrors(prev => ({ ...prev, date: "" }));
                       }}
                       className={`w-full text-[13px] font-medium p-2 bg-white border ${docErrors.date ? 'border-red-400' : 'border-slate-200'} rounded-lg outline-none focus:border-teal-500`}
                       required
                   />
                   {docErrors.date && <span className="text-[10px] text-red-500 font-medium pl-1">{docErrors.date}</span>}
                 </div>

                 <div className="space-y-1">
                   <div className="relative">
                     <label className="absolute left-1 top-1 bottom-1 w-9 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-500 rounded border border-slate-200 cursor-pointer transition-colors z-10">
                       {isUploadingNewDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" /> : <Upload className="w-3.5 h-3.5" />}
                       <input
                         type="file"
                         className="hidden"
                         required
                         onChange={async (e) => {
                           const file = e.target.files?.[0];
                           if (!file) return;
                           setIsUploadingNewDoc(true);
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
                               setNewDocumentData(prev => ({ ...prev, "File Link": viewUrl }));
                               if (docErrors.link) setDocErrors(prev => ({ ...prev, link: "" }));
                             }
                           } catch (err) {
                             alert("Upload failed.");
                           } finally {
                             setIsUploadingNewDoc(false);
                           }
                         }}
                       />
                     </label>
                     <input 
                         type="text" 
                         placeholder="File Link (Required)" 
                         value={newDocumentData["File Link"]} 
                         onChange={e => {
                           setNewDocumentData({...newDocumentData, "File Link": e.target.value});
                           if (docErrors.link) setDocErrors(prev => ({ ...prev, link: "" }));
                         }}
                         className={`w-full text-[13px] font-medium py-2 pl-12 pr-2 bg-white border ${docErrors.link ? 'border-red-400' : 'border-slate-200'} rounded-lg outline-none focus:border-teal-500`}
                         required
                     />
                   </div>
                   {docErrors.link && <span className="text-[10px] text-red-500 font-medium pl-1">{docErrors.link}</span>}
                 </div>
              </div>
                <button 
                    onClick={handleAddDocument}
                    disabled={isSubmitting || isUploadingNewDoc}
                    className="w-full py-2 bg-teal-600 text-white rounded-lg text-[11px] font-medium uppercase tracking-[0.1em] shadow-sm hover:bg-teal-700 transition-colors disabled:opacity-50 mt-2"
                >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Save Document'}
                </button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
          {(() => {
            const courseDocs = [
              ...(documents || []).filter(d => {
                const cCode = String(data?.['Course Code'] || "").trim().toUpperCase();
                const cTitle = String(data?.['Course Title'] || "").trim().toUpperCase();

                const dCourseCode = String(d['Course Code'] || "").trim().toUpperCase();
                const dCourseName = String(d['Course Name'] || "").trim().toUpperCase();
                const tagStr = String(d['Tag'] || "").toUpperCase();
                const titleStr = String(d['Documents Title'] || d['Document Name'] || d['Title'] || "").toUpperCase();

                const matchCourseCode = Boolean(cCode && (dCourseCode === cCode || tagStr.includes(cCode) || titleStr.includes(cCode)));
                const matchCourseName = Boolean(cTitle && (dCourseName === cTitle || tagStr.includes(cTitle) || titleStr.includes(cTitle)));

                let isRelevant = matchCourseCode || matchCourseName;
                if (!cCode && !cTitle) isRelevant = true;
                
                if (documentFilter) {
                  const normFilter = String(documentFilter).trim().toUpperCase();
                  const cleanFilter = normFilter
                    .replace(/^[^-]+-[^-]+-/, '')
                    .replace(/^[^-]+-/, '')
                    .replace(/-$/, '')
                    .replace(/^\d+\.\s*/, '');

                  const tagStr = String(d['Tag'] || "").toUpperCase();
                  const titleStr = String(d['Documents Title'] || d['Document Name'] || d['Title'] || "").toUpperCase();

                  const matchFilterInTag = tagStr.includes(normFilter) || tagStr.startsWith(normFilter) || (cleanFilter.length > 0 && tagStr.includes(cleanFilter));
                  const matchFilterInTitle = titleStr.includes(normFilter) || (cleanFilter.length > 0 && titleStr.includes(cleanFilter));

                  const matchingStage = localStages.find(s => {
                    const sName = String(s["Workflow Stage"] || "").toUpperCase();
                    const sClean = sName.replace(/^\d+\.\s*/, '');
                    return (cleanFilter.length > 0 && (sName.includes(cleanFilter) || sClean.includes(cleanFilter) || normFilter.includes(sClean)));
                  });

                  let matchDeliverable = false;
                  if (matchingStage) {
                    const delivsStr = String(matchingStage["Deliverables"] || "");
                    const delivs = delivsStr.split(/[\n|;,]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
                    matchDeliverable = delivs.some(deliv => titleStr === deliv || titleStr.includes(deliv) || tagStr.includes(deliv));
                  }

                  isRelevant = isRelevant && (matchFilterInTag || matchFilterInTitle || matchDeliverable);
                }
                
                return isRelevant;
              }),
              ...localNewDocs
            ].map(d => {
              const key = d["Documents Title"] || d["id"] || d["ID"];
              return editedDocs[key] || d;
            });

            if (courseDocs.length === 0) {
              return (
                <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                  <BookOpen className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <span className="text-slate-400 text-[11px] font-medium uppercase tracking-[0.15em] block mb-1">No Documents</span>
                  <p className="text-slate-400/70 text-[11px] italic leading-relaxed px-4">No documents have been uploaded or tagged for this course yet.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-2.5">
                {courseDocs.map((doc, idx) => {
                  const docKey = doc["Documents Title"] || doc["id"] || doc["ID"] || `doc-${idx}`;
                  const localDoc = editedDocs[docKey] || doc;
                  const isDocDirty = Boolean(editedDocs[docKey]);

                  return (
                    <div 
                      key={docKey}
                      className={cn(
                        "p-3 rounded-xl border transition-all duration-200 bg-white shadow-2xs hover:border-teal-200/80 hover:shadow-xs",
                        activeDocKey === docKey ? "border-teal-500 ring-2 ring-teal-500/10" : "border-slate-200/80"
                      )}
                      onClick={() => setActiveDocKey(activeDocKey === docKey ? null : docKey)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-teal-600 shrink-0 mt-0.5">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <h5 className="text-[13px] font-bold text-slate-800 tracking-tight leading-snug line-clamp-2">
                              {localDoc["Documents Title"] || localDoc["Document Name"] || localDoc["Title"] || 'Untitled Document'}
                            </h5>
                            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                              <span>{localDoc["Date"] ? formatToMmmDdYyyy(localDoc["Date"]) : 'No Date'}</span>
                              {localDoc["Tag"] && (
                                <>
                                  <span>•</span>
                                  <span className="text-teal-600 font-semibold uppercase">{localDoc["Tag"]}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {(localDoc["File Link"] || localDoc["Link"]) && (
                            <a
                              href={localDoc["File Link"] || localDoc["Link"]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors cursor-pointer border border-teal-200/60"
                              title="View Document"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {isEditing && (
                            <button
                              onClick={() => setActiveDocKey(activeDocKey === docKey ? null : docKey)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer border border-slate-200"
                              title="Edit Document"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Editor for Document */}
                      {isEditing && activeDocKey === docKey && (
                        <div className="mt-3 pt-3 border-t border-teal-100/50 space-y-3" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1">
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Document Title</span>
                            <input
                              type="text"
                              value={localDoc["Documents Title"] || localDoc["Document Name"] || localDoc["Title"] || ''}
                              onChange={(e) => setEditedDocs(prev => ({ ...prev, [docKey]: { ...localDoc, "Documents Title": e.target.value } }))}
                              className="w-full text-[12px] font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:border-teal-500 outline-none uppercase"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Date</span>
                              <input
                                type="date"
                                value={localDoc["Date"] ? toInputDateValue(localDoc["Date"]) : ''}
                                onChange={(e) => setEditedDocs(prev => ({ ...prev, [docKey]: { ...localDoc, "Date": e.target.value } }))}
                                className="w-full text-[12px] font-medium text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:border-teal-500 outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Action</span>
                              <label className="w-full flex items-center justify-center gap-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors border border-slate-200 text-[11px] font-medium uppercase tracking-wider">
                                <Upload className="w-3 h-3" />
                                Update
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setDocUploadingKey(docKey);
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
                                        setEditedDocs(prev => ({ ...prev, [docKey]: { ...localDoc, "File Link": viewUrl } }));
                                      }
                                    } catch (err) {
                                      alert("Upload failed.");
                                    } finally {
                                      setDocUploadingKey(null);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          {docUploadingKey === docKey && (
                            <div className="text-[10px] font-medium text-amber-600 animate-pulse flex items-center gap-1.5 justify-center py-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              UPLOADING TO DRIVE...
                            </div>
                          )}

                          {isDocDirty && (
                            <button
                              onClick={async () => {
                                if (extraFormProps?.onSaveDocument) {
                                  setDocSavingKey(docKey);
                                  try {
                                    await extraFormProps.onSaveDocument(localDoc, doc);
                                    setEditedDocs(prev => {
                                      const copy = { ...prev };
                                      delete copy[docKey];
                                      return copy;
                                    });
                                  } catch (err) {
                                    alert("Failed to save document.");
                                  } finally {
                                    setDocSavingKey(null);
                                  }
                                }
                              }}
                              disabled={docSavingKey === docKey || docUploadingKey === docKey}
                              className="w-full flex items-center justify-center gap-2 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-[11px] font-medium uppercase tracking-[0.1em] transition-all shadow-sm disabled:opacity-50"
                            >
                              {docSavingKey === docKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              Save Changes
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
      </div>
    </div>
  );

  const renderFinancialsContent = () => (
    <div className="p-4">
      <MCCourseFinancialsView
        courseBatches={courseBatches}
        courseFinancials={courseFinancials}
        data={data}
      />
    </div>
  );

  const renderCourseInfoContent = () => {
    let courseBatches = [
      ...batches.filter(b => b['Course Code'] === data?.['Course Code'] || b['Course Name'] === data?.['Course Title']),
      ...localNewBatches
    ].map(b => {
      const key = b["Batch Number"] || b["id"] || b["ID"];
      return editedBatches[key] || b;
    });

    if (batchSearchTerm.trim() !== '') {
      const lowerSearch = batchSearchTerm.toLowerCase();
      courseBatches = courseBatches.filter(b => 
        String(b['Batch Number'] || '').toLowerCase().includes(lowerSearch) ||
        String(b['Start Date'] || '').toLowerCase().includes(lowerSearch) ||
        String(b['End Date'] || '').toLowerCase().includes(lowerSearch) ||
        String(b['Student'] || '').toLowerCase().includes(lowerSearch)
      );
    }

    return (
      <MCCourseInfoContent
        infoVerticalTab={infoVerticalTab}
        setInfoVerticalTab={setInfoVerticalTab}
        isEditing={isEditing}
        data={data}
        editedData={editedData}
        headers={headers}
        handleInputChange={handleInputChange}
        employees={employees}
        extraFormProps={extraFormProps}
        FloatingInput={FloatingInput}
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
        workflowData={workflowData}
        documents={documents}
        localNewDocs={localNewDocs}
        setEditedDocs={setEditedDocs}
        setLocalNewDocs={setLocalNewDocs}
        localStages={localStages}
        setEditedData={setEditedData}
        setActiveSidebarTab={setActiveSidebarTab}
        setDocumentFilter={setDocumentFilter}
        batchSearchTerm={batchSearchTerm}
        setBatchSearchTerm={setBatchSearchTerm}
        setIsAddBatchOpen={setIsAddBatchOpen}
        handleAddBatch={handleAddBatch}
        getNextBatchNumber={getNextBatchNumber}
        renderDocuments={renderDocumentsContent}
        renderFinancials={renderFinancialsContent}
      />
    );
  };



  return (
    <AnimatePresence>
      {isOpen && (
        <>
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
          {/* Left Main Area: Fixed Banner + Scrollable Info Grid */}
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
            {/* Banner Helper */}
            {(() => {
              const bannerUrl = editedData?.['Banner'] || data?.['Banner'];
              let displayUrl = bannerUrl;
              const fileIdMatch = bannerUrl?.match(/[-\w]{25,}/);
              if (fileIdMatch && bannerUrl?.includes('drive.google.com')) {
                displayUrl = `https://drive.google.com/thumbnail?id=${fileIdMatch[0]}&sz=w1000`;
              }
              
              const hasCourseInfo = !!(data?.['Course Code'] && data?.['Course Title']);

              const renderBannerContent = () => (
                <div className={cn("group/banner overflow-hidden", isExpanded ? "rounded-t-xl w-full" : "rounded-lg border border-slate-200/80 shadow-xs")}>
                  <div className={cn(
                    "w-full relative bg-teal-900 flex items-center justify-center overflow-hidden transition-all duration-200",
                    isExpanded ? "rounded-t-xl" : "rounded-lg",
                    "min-h-[110px] md:min-h-[120px]"
                  )}>
                    {displayUrl ? (
                      <img
                        src={displayUrl}
                        alt="Course Banner"
                        className={cn("absolute inset-0 w-full h-full object-cover", isExpanded ? "rounded-t-xl" : "rounded-lg")}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <BookOpen className="w-8 h-8 text-teal-800/60 z-0" />
                    )}
                    
                    <div className={cn(
                      "absolute inset-0 z-10 bg-black/30 backdrop-blur-md border border-white/10 flex flex-col justify-between transition-all duration-200 overflow-hidden",
                      isExpanded ? "rounded-t-xl" : "rounded-lg",
                      "p-3 md:p-3.5"
                    )}>
                      {/* Top Row: Left Expand/Collapse & Right Actions with Navigation */}
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
                          {!isEditing && hasCourseInfo && (
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => setIsEditing(true)} 
                                className="p-1.5 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-xs transition-all border border-white/20 cursor-pointer shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center"
                                title="Edit Course"
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
                          )}

                          {isEditing && (
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => {
                                  setIsEditing(false);
                                  setEditedData(data);
                                  setEditedBatches({});
                                  setEditedDocs({});
                                  setLocalNewBatches([]);
                                  setLocalNewDocs([]);
                                  setInlineEditingBatchKey(null);
                                  if (data && data["Workflow"]) {
                                      try {
                                          const parsed = JSON.parse(data["Workflow"]);
                                          if (Array.isArray(parsed)) setLocalStages(parsed);
                                      } catch(e) {}
                                  }
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

                      {/* Bottom Row: Course Info & Title */}
                      <div className="flex flex-col w-full mt-1 gap-2">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-1.5">
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              {(editedData?.['Mode'] || data?.['Mode']) && (
                                <span className="px-1.5 py-0.5 bg-teal-500 text-white text-[9px] font-bold uppercase tracking-wider rounded shadow-xs">
                                  {editedData?.['Mode'] || data?.['Mode']}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 bg-white/10 text-white/90 text-[9px] font-bold uppercase tracking-wider rounded border border-white/10">
                                {editedData?.['Course Code'] || data?.['Course Code'] || 'CODE'}
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5 w-full">
                              <h2 className="text-base md:text-lg font-medium text-white uppercase tracking-wider leading-snug drop-shadow-md break-words">
                                {editedData?.['Course Title'] || data?.['Course Title'] || 'Untitled Course'}
                              </h2>
                            </div>

                            {/* Info Row: Status, Duration, Classes, Link */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-white/80">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] font-medium uppercase tracking-widest opacity-60">Status</span>
                                <span className="text-[11px] font-medium uppercase">{editedData?.['Publication Status'] || data?.['Publication Status'] || '—'}</span>
                              </div>
                              {(editedData?.['Published Link'] || data?.['Published Link'] || data?.['Publication Link']) && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8px] font-medium uppercase tracking-widest opacity-60">Link</span>
                                  <a
                                    href={
                                      String(editedData?.['Published Link'] || data?.['Published Link'] || data?.['Publication Link']).startsWith("http")
                                        ? String(editedData?.['Published Link'] || data?.['Published Link'] || data?.['Publication Link'])
                                        : `https://${editedData?.['Published Link'] || data?.['Published Link'] || data?.['Publication Link']}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-medium text-teal-200 hover:text-white underline flex items-center gap-1 truncate max-w-[200px]"
                                  >
                                    <Globe className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{editedData?.['Published Link'] || data?.['Published Link'] || data?.['Publication Link']}</span>
                                  </a>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] font-medium uppercase tracking-widest opacity-60">Duration</span>
                                <span className="text-[11px] font-medium uppercase">
                                  {(() => {
                                    const raw = editedData?.['Duration'] || data?.['Duration'] || '—';
                                    if (raw === '—') return '—';
                                    const trimmed = String(raw).trim();
                                    if (/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed} hours`;
                                    if (/^\d+(\.\d+)?\s*(days|day|hrs|hr|hours|hour)$/i.test(trimmed)) {
                                      const num = trimmed.match(/^\d+(\.\d+)?/)?.[0];
                                      return `${num} hours`;
                                    }
                                    return trimmed;
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] font-medium uppercase tracking-widest opacity-60">Classes</span>
                                <span className="text-[11px] font-medium uppercase">{editedData?.['Class'] || editedData?.['No. of Class'] || data?.['Class'] || data?.['No. of Class'] || '—'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] font-medium uppercase tracking-widest opacity-60">Credit</span>
                                <span className="text-[11px] font-medium uppercase">{editedData?.['Credit'] ?? data?.['Credit'] ?? '—'}</span>
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
                <>
                  {!isExpanded && (
                    <div className="shrink-0 p-3 pb-0 z-40 bg-transparent">
                      {renderBannerContent()}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="flex-1 overflow-y-auto no-scrollbar p-3 flex flex-col">
                      {/* Course Information Card Panel with Banner flush at top */}
                      <div className="w-full min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
                        
                        {/* Banner inside Course Information Panel flush with top, left, right */}
                        <div className="w-full border-b border-slate-200 shrink-0 rounded-t-xl overflow-hidden">
                          {renderBannerContent()}
                        </div>

                        {/* Slim Course Information Header */}
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50/50 gap-2 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Course Information</span>
                            <span className="text-[10px] font-bold text-teal-700 font-mono bg-teal-50 border border-teal-200/80 px-1.5 py-0.5 rounded">
                              {editedData?.['Course Code'] || currentCourse?.['Course Code'] || '—'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {coursesList.length > 1 && (
                              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-600 shadow-2xs">
                                <button
                                  onClick={() => handleNavigateCourse('prev')}
                                  disabled={currentIndex <= 0}
                                  title={currentIndex <= 0 ? "First Course" : "Previous Course (Left Arrow Key)"}
                                  className={cn(
                                    "p-0.5 rounded transition-colors",
                                    currentIndex <= 0 ? "opacity-30 cursor-not-allowed" : "hover:text-teal-600 hover:bg-slate-100 cursor-pointer"
                                  )}
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[10px] font-bold font-mono px-1 text-slate-500 select-none">
                                  {currentIndex !== -1 ? `${currentIndex + 1}/${coursesList.length}` : ''}
                                </span>
                                <button
                                  onClick={() => handleNavigateCourse('next')}
                                  disabled={currentIndex >= coursesList.length - 1}
                                  title={currentIndex >= coursesList.length - 1 ? "Last Course" : "Next Course (Right Arrow Key)"}
                                  className={cn(
                                    "p-0.5 rounded transition-colors",
                                    currentIndex >= coursesList.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:text-teal-600 hover:bg-slate-100 cursor-pointer"
                                  )}
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="w-full flex-1 bg-white flex flex-col min-h-0 overflow-hidden">
                          {renderCourseInfoContent()}
                        </div>
                      </div>
                    </div>
                  )}
            </>
          );
        })()}
      </motion.div>

          {/* Right Sidebar: Workflow Stages & Course Activity */}
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
                ? "w-full lg:w-[310px] xl:w-[350px] shrink-0 border-l border-slate-100 h-full" 
                : "flex-1 border-t border-slate-100"
            )}
          >
            {/* Header: Remarks */}
            <div className="bg-slate-50/80 border-b border-slate-200 shrink-0 px-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Remarks
                </h3>
              </div>
              <button
                onClick={() => setIsAddRemarkOpen(!isAddRemarkOpen)}
                className="p-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-teal-600 hover:bg-teal-50 transition-colors shadow-2xs flex items-center justify-center cursor-pointer"
                title="Add Remark"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sidebar Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-4">
              {/* Add Remark Form */}
              <AnimatePresence>
                {isAddRemarkOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-col gap-3 mb-1">
                      <div className="flex items-center gap-2">
                        <input 
                          type="date" 
                          value={newRemarkDate} 
                          onChange={(e) => setNewRemarkDate(e.target.value)} 
                          className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none focus:border-teal-500 w-28 shrink-0"
                        />
                        <div className="relative flex-1 min-w-0" ref={employeeDropdownRef}>
                          <div 
                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none cursor-pointer flex items-center justify-between min-h-[30px]"
                            onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                          >
                            {newRemarkEmployee ? (
                              <div className="flex items-center gap-1.5 min-w-0">
                                {(() => {
                                  const emp = employees.find(e => (e['Employee Name'] || e['Full Name']) === newRemarkEmployee);
                                  const photoUrl = emp ? getPhotoUrl(emp) : null;
                                  return photoUrl ? (
                                    <img src={photoUrl} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                                      <User className="w-2.5 h-2.5" />
                                    </div>
                                  );
                                })()}
                                <span className="truncate">{newRemarkEmployee}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 truncate">Select Employee</span>
                            )}
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </div>
                          
                          <AnimatePresence>
                            {isEmployeeDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
                              >
                                {employees.map((emp) => {
                                  const photoUrl = getPhotoUrl(emp);
                                  const empName = emp['Employee Name'] || emp['Full Name'];
                                  const isSelected = newRemarkEmployee === empName;
                                  return (
                                    <div 
                                      key={emp['Employee ID'] || empName}
                                      onClick={() => {
                                        setNewRemarkEmployee(empName);
                                        setIsEmployeeDropdownOpen(false);
                                      }}
                                      className={cn(
                                        "px-2 py-1.5 flex items-center gap-2 cursor-pointer transition-colors border-b border-slate-50 last:border-0",
                                        isSelected ? "bg-teal-50" : "hover:bg-slate-50"
                                      )}
                                    >
                                      {photoUrl ? (
                                        <img src={photoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                                          <User className="w-3.5 h-3.5" />
                                        </div>
                                      )}
                                      <div className="flex flex-col min-w-0">
                                        <span className={cn("text-[11px] truncate", isSelected ? "font-bold text-teal-800" : "font-medium text-slate-700")}>
                                          {empName}
                                        </span>
                                        {(emp['Designation'] || emp['Job Title']) && (
                                          <span className="text-[9px] text-slate-500 truncate uppercase tracking-wider">
                                            {emp['Designation'] || emp['Job Title']}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <textarea 
                        value={newRemarkText} 
                        onChange={(e) => setNewRemarkText(e.target.value)} 
                        placeholder="Type your remark here..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-700 outline-none focus:border-teal-500 resize-none"
                        rows={3}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setIsAddRemarkOpen(false)}
                          className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleAddRemark} 
                          disabled={isSavingRemark}
                          className={cn(
                            "px-3 py-1.5 bg-teal-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors flex items-center gap-1.5",
                            isSavingRemark ? "opacity-70 cursor-not-allowed" : "hover:bg-teal-700 cursor-pointer"
                          )}
                        >
                          {isSavingRemark ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Save
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Remarks List */}
              <div className="space-y-2.5">
                 {(() => {
                   const parsedRemarks = parseRemarks(editedData?.['Remarks'] || data?.['Remarks']);
                   if (parsedRemarks.length === 0) {
                     return (
                       <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                         <MessageSquare className="w-6 h-6 text-slate-300 mb-2" />
                         <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">No Remarks Yet</span>
                         <p className="text-[10px] text-slate-400 mt-1">Add the first remark above.</p>
                       </div>
                     );
                   }

                   return parsedRemarks.map((remark, idx) => {
                     const emp = employees.find(e => (e['Employee Name'] || e['Full Name']) === remark.employeeName);
                     const photoUrl = emp ? getPhotoUrl(emp) : null;
                     const designation = emp ? (emp['Designation'] || emp['Job Title'] || '') : '';

                     return (
                       <div key={remark.id || idx} className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 space-y-2 relative group overflow-hidden">
                         <div className="flex items-start justify-between gap-2">
                           <div className="flex items-center gap-2 min-w-0">
                             {photoUrl ? (
                               <img src={photoUrl} alt={remark.employeeName} className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200" referrerPolicy="no-referrer" />
                             ) : (
                               <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/60 font-bold text-xs">
                                 {remark.employeeName ? remark.employeeName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                               </div>
                             )}
                             <div className="flex flex-col min-w-0">
                               <span className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                                 {remark.employeeName}
                               </span>
                               {designation ? (
                                 <span className="text-[9.5px] font-medium text-slate-500 truncate leading-tight">
                                   {designation}
                                 </span>
                               ) : (
                                 <span className="text-[9.5px] font-medium text-slate-400 italic truncate leading-tight">
                                   Staff
                                 </span>
                               )}
                             </div>
                           </div>

                           <span className="text-[9px] text-slate-500 font-medium flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 shrink-0">
                             <Calendar className="w-2.5 h-2.5 text-slate-400" />
                             {formatToMmmDdYyyy(remark.date) || remark.date}
                           </span>
                         </div>

                         <p className="text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed pl-0.5">
                           {remark.text}
                         </p>
                       </div>
                     );
                   });
                 })()}
              </div>
            </div>
          </motion.div>
        </motion.div>
  

        {/* Add Modals */}
        {extraFormProps && (
          <>
            <DocumentsPanel 
              isOpen={isAddDocumentOpen}
              onClose={() => setIsAddDocumentOpen(false)}
              onSave={async (formData) => {
                 if (isEditing) {
                   setLocalNewDocs(prev => [...prev, formData]);
                   setIsAddDocumentOpen(false);
                 } else if (extraFormProps.onSaveDocument) {
                   await extraFormProps.onSaveDocument(formData, null);
                   setIsAddDocumentOpen(false);
                 }
              }}
              onDelete={async () => {}}
              headers={extraFormProps.documentHeaders || []}
              initialData={{
                'Course Code': data?.['Course Code'],
                'Course Name': data?.['Course Title'],
                'Tag Name': data?.['Course Code'],
                'Tag': data?.['Course Code']
              }}
            />
          </>
        )}
        </>
      )}
    </AnimatePresence>
  );
}
