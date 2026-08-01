/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, useMemo, ChangeEvent } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Table from "./components/Table";
import EmployeePanel from "./components/EmployeePanel";
import MCCoursePanel from "./components/MCCoursePanel";
import MCBatchPanel from "./components/MCBatchPanel";
import MCCourseDetails from "./components/MCCourseDetails";
import MCBatchDetails from "./components/MCBatchDetails";
import EmployeePicker from "./components/EmployeePicker";
import SettingsPanel from "./components/SettingsPanel";
import SettingsTab from "./components/SettingsTab";
import DocumentsPanel from "./components/DocumentsPanel";
import ExpensesPanel from "./components/ExpensesPanel";
import WorkflowView from "./components/WorkflowView";
import ProgramNamePanel from "./components/ProgramNamePanel";
import CourseOfferPanel from "./components/CourseOfferPanel";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";
import { UserCheck, Eye, BookOpen, Layers, X, Briefcase, FileText, GitMerge, Activity, Users, Coins, CalendarDays, GraduationCap, Upload, Loader2, BookOpenCheck, LayoutDashboard, Search, TrendingUp, Percent } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { FOLDER_LOCATIONS } from "./FolderLocation";
import { useGoogleSheet } from "./hooks/useGoogleSheet";
import { getCourseStatusName, getPublicationStatus, cn } from "./lib/utils";
import ActivityPanel from "./components/ActivityPanel";
import CalendarClassRoutine from "./components/CalendarClassRoutine";
import FinancialDashboard from "./components/FinancialDashboard";
import CourseInsightsDashboard from "./components/CourseInsightsDashboard";
import BatchInsightsDashboard from "./components/BatchInsightsDashboard";

function getMonthYearFromDate(dateVal: any): { month: number; year: number; label: string } | null {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (!str) return null;

  // Try to parse standard formats
  // 1. YYYY-MM-DD or YYYY/MM/DD
  const matchYmd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (matchYmd) {
    const year = parseInt(matchYmd[1], 10);
    const month = parseInt(matchYmd[2], 10) - 1; // 0-indexed
    if (year >= 1970 && year <= 2100 && month >= 0 && month < 12) {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return { month, year, label: `${months[month]} ${year}` };
    }
  }

  // 2. DD-MM-YYYY or DD/MM/YYYY
  const matchDmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (matchDmy) {
    const year = parseInt(matchDmy[3], 10);
    const month = parseInt(matchDmy[2], 10) - 1; // 0-indexed
    if (year >= 1970 && year <= 2100 && month >= 0 && month < 12) {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return { month, year, label: `${months[month]} ${year}` };
    }
  }

  // 3. Fallback: try JS Date parsing
  const ts = Date.parse(str);
  if (!isNaN(ts)) {
    const d = new Date(ts);
    const year = d.getFullYear();
    if (year >= 1970 && year <= 2100) {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return { month: d.getMonth(), year, label: `${months[d.getMonth()]} ${year}` };
    }
  }

  // 4. Try matching named month and year in text
  const monthsRegex = /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;
  const yearRegex = /\b(20\d{2}|\d{2})\b/;
  const monthMatch = str.match(monthsRegex);
  const yearMatch = str.match(yearRegex);
  if (monthMatch && yearMatch) {
    let year = parseInt(yearMatch[1], 10);
    if (year < 100) {
      year += 2000;
    }
    const monthStr = monthMatch[1].toLowerCase();
    const monthsFull = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const monthsShort = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    let monthIdx = monthsFull.indexOf(monthStr);
    if (monthIdx === -1) {
      monthIdx = monthsShort.indexOf(monthStr);
    }
    if (monthIdx !== -1) {
      const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return { month: monthIdx, year, label: `${monthsNames[monthIdx]} ${year}` };
    }
  }

  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("micro-credentials");
  const [mcSubTab, setMcSubTab] = useState("dashboard");
  const [previousMcSubTab, setPreviousMcSubTab] = useState<string | null>(null);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isCourseDetailsOpen, setIsCourseDetailsOpen] = useState(false);
  const [isCourseDetailsExpanded, setIsCourseDetailsExpanded] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [isBatchDetailsOpen, setIsBatchDetailsOpen] = useState(false);
  const [isBatchDetailsExpanded, setIsBatchDetailsExpanded] = useState(false);
  const [batchStatusFilter, setBatchStatusFilter] = useState<'all' | 'running' | 'completed' | 'upcoming'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ url: string; title: string; doc?: any } | null>(null);
  const [docStatus, setDocStatus] = useState<string>("");
  const [previewNote, setPreviewNote] = useState<string>("");
  const [previewFileLink, setPreviewFileLink] = useState<string>("");
  const [isUploadingNewFile, setIsUploadingNewFile] = useState<boolean>(false);

  useEffect(() => {
    if (viewingFile?.doc) {
        const tag = String(viewingFile.doc["Tag"] || "");
        if (tag.includes("Revision Required") || tag.includes("Revision")) setDocStatus("Revision");
        else if (tag.includes("Verified") || tag.includes("Job Done") || tag.includes("Approved")) setDocStatus("Verified");
        else setDocStatus("");

        setPreviewFileLink(viewingFile.doc["File Link"] || viewingFile.url || "");

        if (viewingFile.doc["Note"]) {
          setPreviewNote(viewingFile.doc["Note"]);
        } else {
          const noteMarker = ", Note: ";
          const index = tag.indexOf(noteMarker);
          if (index !== -1) {
            setPreviewNote(tag.substring(index + noteMarker.length));
          } else {
            setPreviewNote("");
          }
        }
    } else {
        setDocStatus("");
        setPreviewNote("");
        setPreviewFileLink("");
    }
  }, [viewingFile]);

  const handleNewFileReupload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingNewFile(true);
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
        setPreviewFileLink(viewUrl);
      } else {
        alert("Failed to upload file. Please try again.");
      }
    } catch (err) {
      alert("Failed to upload file.");
    } finally {
      setIsUploadingNewFile(false);
    }
  };

  const handleSaveDocStatus = async () => {
    if (!viewingFile || !viewingFile.doc) return;
    
    let tag = String(viewingFile.doc["Tag"] || "");
    // Remove previous status
    tag = tag.replace(/, Revision Required|Revision Required|, Revision|Revision|Verified|, Verified|Job Done|, Job Done|Approved|, Approved/g, "").trim();
    
    // Remove previous Note marker if present to avoid duplicating/appending
    const noteMarkerIndex = tag.indexOf(", Note: ");
    if (noteMarkerIndex !== -1) {
      tag = tag.substring(0, noteMarkerIndex);
    }

    // Add new status
    if (docStatus) {
        tag = tag ? `${tag}, ${docStatus}` : docStatus;
    }
    
    // Append the updated note if present
    if (previewNote.trim()) {
        tag = tag ? `${tag}, Note: ${previewNote.trim()}` : `Note: ${previewNote.trim()}`;
    }
    
    const updatedDoc = { 
      ...viewingFile.doc, 
      Tag: tag,
      Note: previewNote.trim(),
      "File Link": previewFileLink.trim()
    };
    
    // Close immediately
    setViewingFile(null);
    
    // Save in background
    handleDocumentSave(updatedDoc, viewingFile.doc).catch(console.error);
  };

  const renderCourseActions = (row: any) => (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        setSelectedCourse(row);
        setIsCourseDetailsExpanded(false);
        setIsCourseDetailsOpen(true);
      }}
      className="p-1 hover:bg-teal-100 rounded text-teal-600"
    >
      <Eye className="w-4 h-4" />
    </button>
  );

  // Helper to read initial setting value from localStorage
  const getSavedSetting = (key: string, fallback: string) => {
    try {
      const saved = localStorage.getItem("settings_data");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const found = parsed.find(r => r.Title === key);
          if (found && found.Content) return found.Content;
        }
      }
    } catch (e) {}
    return fallback;
  };

  const [employeeGid, setEmployeeGid] = useState(() => getSavedSetting("Employee GID", "0"));
  const [settingsGid, setSettingsGid] = useState(() => getSavedSetting("Settings GID", getSavedSetting("GID", "1972051572")));
  const [mcBatchGid, setMcBatchGid] = useState(() => getSavedSetting("MC Batch GID", "1111164355"));
  const [expensesGid, setExpensesGid] = useState(() => getSavedSetting("Expenses GID", "1007542549"));
  const [courseOfferGid, setCourseOfferGid] = useState(() => getSavedSetting("Course Offer GID", "1221523398"));

  // Workforce Sheet (GID = employeeGid)
  const {
    data,
    setData,
    headers,
    isLoading,
    fetchData,
    saveRow: saveEmployee,
    deleteRow: deleteEmployeeRaw
  } = useGoogleSheet({
    gid: employeeGid,
    localStorageKey: "workforce_data",
    fallbackHeaders: [
      "Employee ID", "Employee Name", "Designation", 
      "Mobile", "IP-Ext", "E-mail", 
      "Status", "Group Name", "Department", "Tag"
    ]
  });

  // Settings Sheet (GID = settingsGid)
  const {
    data: settingsData,
    setData: setSettingsData,
    headers: settingsHeaders,
    isLoading: isSettingsLoading,
    fetchData: fetchSettingsData,
    saveRow: saveSettingRaw,
    deleteRow: deleteSetting
  } = useGoogleSheet({
    gid: settingsGid,
    localStorageKey: "settings_data",
    fallbackHeaders: ["Title", "Content"]
  });

  // Course Sheet
  const {
    data: courseData,
    setData: setCourseData,
    headers: courseHeaders,
    isLoading: isCourseLoading,
    fetchData: fetchCourseData,
    saveRow: saveCourse,
    deleteRow: deleteCourseRaw
  } = useGoogleSheet({
    gid: "1120624852",
    localStorageKey: "course_data",
    fallbackHeaders: [
      "Course Code", "Course Title", "Banner", "Mode", "Duration", "Class",
      "Course Fee", "Student Size", "Status", "Publication Status", "Published Status", "Workflow",
      "Industry Expert", "Discount",
      "Remarks", "Date", "Learning Outcome", "Industry Demand", "Target Audience", "Aligned Course name", "Proposal", "Objective"
    ]
  });

  // MC Batch Sheet
  const {
    data: mcBatchData,
    setData: setMcBatchData,
    headers: mcBatchHeaders,
    isLoading: isMcBatchLoading,
    fetchData: fetchMcBatchData,
    saveRow: saveMcBatch,
    deleteRow: deleteMcBatchRaw
  } = useGoogleSheet({
    gid: mcBatchGid,
    localStorageKey: "mc_batch_data",
    fallbackHeaders: [
      "Course Code", "Batch Number", "Start Date", "End Date", "Student", "Instractor", "Routine", "Course Fee", "Discount"
    ]
  });

  // Class Routine Slots Sheet (GID = "880522927")
  const {
    data: routineSlotsData,
    setData: setRoutineSlotsData,
    headers: routineSlotsHeaders,
    isLoading: isRoutineSlotsLoading,
    fetchData: fetchRoutineSlotsData,
    saveRow: saveRoutineSlot,
    deleteRow: deleteRoutineSlotRaw
  } = useGoogleSheet({
    gid: "880522927",
    localStorageKey: "routine_slots_data",
    fallbackHeaders: [
      "Slot ID", "Course Code", "Batch Number", "Date", "Start Time", "End Time", "Class Mode", "Room No / Class Link", "Attendance"
    ]
  });

  const enrichedMcBatchData = useMemo(() => {
    if (!mcBatchData || !Array.isArray(mcBatchData)) return [];
    return mcBatchData.map(batch => {
      const courseCode = batch["Course Code"] || batch["courseCode"] || "";
      const batchNo = batch["Batch Number"] || batch["batchNumber"] || "";

      const matchedCourse = (courseData || []).find(c => {
        const cCode = c["Course Code"] || c["courseCode"] || "";
        return cCode && courseCode && String(cCode).trim().toLowerCase() === String(courseCode).trim().toLowerCase();
      });

      const courseTitle = batch["Course Title"] || batch["courseTitle"] || matchedCourse?.["Course Title"] || matchedCourse?.["Course Name"] || batch["Course Name"] || "";
      
      const slots = routineSlotsData ? routineSlotsData.filter(slot => {
        const slotCourseCode = slot["Course Code"] || slot["courseCode"] || "";
        const slotBatchNo = slot["Batch Number"] || slot["batchNumber"] || "";
        return String(slotCourseCode).trim().toLowerCase() === String(courseCode).trim().toLowerCase() &&
               String(slotBatchNo).trim().toLowerCase() === String(batchNo).trim().toLowerCase();
      }) : [];
      
      const routineItems = slots.map((slot, idx) => ({
        id: slot["Slot ID"] || slot["ID"] || slot["id"] || `slot-${idx}-${Date.now()}`,
        date: slot["Date"] || slot["date"] || "",
        startTime: slot["Start Time"] || slot["startTime"] || "",
        endTime: slot["End Time"] || slot["endTime"] || "",
        note: slot["Room No / Class Link"] || slot["roomNoClassLink"] || slot["note"] || "",
        classMode: slot["Class Mode"] || slot["classMode"] || "offline",
        attendanceUrl: slot["Attendance"] || slot["attendance"] || slot["attendanceUrl"] || ""
      }));
      
      const serialized = JSON.stringify(routineItems);
      
      return {
        ...batch,
        "Course Title": courseTitle,
        "Routine": serialized,
        "Class Routine": serialized
      };
    });
  }, [mcBatchData, routineSlotsData, courseData]);

  const filteredMcBatchTableHeaders = useMemo(() => {
    const instHeader = (mcBatchHeaders || []).find(h => String(h).trim().toLowerCase() === "instructor") ? "Instructor" : "Instractor";
    return [
      "Batch Number",
      "Course Code",
      "Course Title",
      "Start Date",
      "End Date",
      "Student",
      "Course Fee",
      "Discount",
      instHeader
    ];
  }, [mcBatchHeaders]);

  // Documents Sheet
  const {
    data: documentsData,
    setData: setDocumentsData,
    headers: documentsHeaders,
    isLoading: isDocumentsLoading,
    fetchData: fetchDocumentsData,
    saveRow: saveDocument,
    deleteRow: deleteDocumentRaw
  } = useGoogleSheet({
    gid: "732376789",
    localStorageKey: "documents_data",
    fallbackHeaders: ["Date", "Documents Title", "File Link", "Tag"]
  });

  // Expenses Sheet
  const {
    data: expensesData,
    setData: setExpensesData,
    headers: expensesHeaders,
    isLoading: isExpensesLoading,
    fetchData: fetchExpensesData,
    saveRow: saveExpense,
    deleteRow: deleteExpenseRaw
  } = useGoogleSheet({
    gid: expensesGid,
    localStorageKey: "expenses_data",
    fallbackHeaders: ["Date", "Expenses Title", "Amount", "Voucher", "Tag", "Ref"]
  });

  // Workflow Sheet
  const {
    data: workflowData,
    setData: setWorkflowData,
    headers: workflowHeaders,
    isLoading: isWorkflowLoading,
    fetchData: fetchWorkflowData,
    saveRow: saveWorkflow,
    deleteRow: deleteWorkflow
  } = useGoogleSheet({
    gid: "1686458334",
    localStorageKey: "workflow_data",
    fallbackHeaders: ["Workflow Title"]
  });

  // Program Name Sheet
  const {
    data: programNameData,
    setData: setProgramNameData,
    headers: programNameHeaders,
    isLoading: isProgramNameLoading,
    fetchData: fetchProgramNameData,
    saveRow: saveProgramName,
    deleteRow: deleteProgramNameRaw
  } = useGoogleSheet({
    gid: "84557637",
    localStorageKey: "program_name_data",
    fallbackHeaders: [
      "PID",
      "Faculty",
      "Program Short Name",
      "Program Full Name",
      "Department Name",
      "Program Type",
      "Semester Type",
      "Semester Duration"
    ]
  });

  // Course Offer Sheet
  const {
    data: courseOfferData,
    setData: setCourseOfferData,
    headers: courseOfferHeaders,
    isLoading: isCourseOfferLoading,
    fetchData: fetchCourseOfferData,
    saveRow: saveCourseOffer,
    deleteRow: deleteCourseOfferRaw
  } = useGoogleSheet({
    gid: courseOfferGid,
    localStorageKey: "course_offer_data",
    fallbackHeaders: [
      "Sl",
      "P-ID",
      "Course ID",
      "Course Code",
      "Section ID",
      "Course Title",
      "Section",
      "Credit",
      "Course Type",
      "Employee ID",
      "Employee Name",
      "Designation",
      "Email",
      "Mobile",
      "Student",
      "Class"
    ]
  });

  // Keep state GIDs in sync when settingsData updates
  useEffect(() => {
    if (settingsData && Array.isArray(settingsData)) {
      const savedEmployeeGid = settingsData.find(r => r.Title === "Employee GID")?.Content;
      const savedSettingsGid = settingsData.find(r => r.Title === "Settings GID")?.Content || settingsData.find(r => r.Title === "GID")?.Content;
      const savedMCBatchGid = settingsData.find(r => r.Title === "MC Batch GID")?.Content;
      const savedExpensesGid = settingsData.find(r => r.Title === "Expenses GID")?.Content;
      const savedCourseOfferGid = settingsData.find(r => r.Title === "Course Offer GID")?.Content;
      
      if (savedEmployeeGid && savedEmployeeGid !== employeeGid) {
        setEmployeeGid(savedEmployeeGid);
      }
      if (savedSettingsGid && savedSettingsGid !== settingsGid) {
        setSettingsGid(savedSettingsGid);
      }
      if (savedMCBatchGid && savedMCBatchGid !== mcBatchGid) {
        setMcBatchGid(savedMCBatchGid);
      }
      if (savedExpensesGid && savedExpensesGid !== expensesGid) {
        setExpensesGid(savedExpensesGid);
      }
      if (savedCourseOfferGid && savedCourseOfferGid !== courseOfferGid) {
        setCourseOfferGid(savedCourseOfferGid);
      }
    }
  }, [settingsData, employeeGid, settingsGid, mcBatchGid, expensesGid, courseOfferGid]);

  const courseTableHeaders = useMemo(() => {
    const hiddenHeaders = [
      "Banner", "Received By", "Gross Revenue", "Net Revenue", "Remarks", 
      "Proposed By", "Developed By", "Reviewed By", "Approved By", "Published By",
      "Workflow", "Expenses", "Net Profit", "Profit %", "Industry Expert", "Industry Expart",
      "Enrolled", "Enrollments", "Expenses", "Batches",
      "Objective", "Industry Demand", "Target Audience", "Learning Outcome", 
      "Aligned Course", "Aligned Course name", "Proposal",
      "Syllabus", "Learning Material", "Learning Materials"
    ];
    const hiddenLower = hiddenHeaders.map(h => h.trim().toLowerCase());
    
    // Explicitly filter out hidden headers and special calculated columns to avoid duplicates
    const baseHeaders = courseHeaders.filter(h => {
      const norm = String(h || '').trim().toLowerCase();
      return !hiddenLower.includes(norm) && 
        norm !== "status" && 
        norm !== "activity status" &&
        norm !== "publication status" &&
        norm !== "published status" &&
        norm !== "batches" && 
        norm !== "gross revenue" && 
        norm !== "net revenue" && 
        norm !== "net profit" && 
        norm !== "profit %" &&
        norm !== "enrolled" &&
        norm !== "enrollments" &&
        norm !== "expenses";
    });
    
    const pubHeaderName = courseHeaders.find(h => h.toLowerCase() === "publication status" || h.toLowerCase() === "published status") || "Publication Status";

    // Find Mode or Class index to insert Activity Status and Publication Status
    const modeIdx = baseHeaders.findIndex(h => h.toLowerCase() === "mode");
    const classIdx = baseHeaders.findIndex(h => h.toLowerCase() === "class");
    const insertIdx = modeIdx !== -1 ? modeIdx + 1 : (classIdx !== -1 ? classIdx + 1 : Math.min(baseHeaders.length, 4));

    const updatedHeaders = [...baseHeaders];
    updatedHeaders.splice(insertIdx, 0, "Activity Status", pubHeaderName);

    return updatedHeaders;
  }, [courseHeaders]);

  const enrichedCourseData = useMemo(() => {
    return courseData.map(course => {
      const fee = parseFloat(String(course["Course Fee"] || "0").replace(/[^0-9.]/g, ""));
      const courseBatches = enrichedMcBatchData.filter(b => 
        String(b['Course Code'] || '').trim().toLowerCase() === String(course['Course Code'] || '').trim().toLowerCase() ||
        String(b['Course Name'] || '').trim().toLowerCase() === String(course['Course Title'] || '').trim().toLowerCase()
      );

      const totalBatchStudents = courseBatches.reduce((sum, b) => {
        const s = parseInt(String(b["Student"] || b["Students"] || "0").replace(/[^0-9.]/g, ""), 10);
        return sum + (isNaN(s) ? 0 : s);
      }, 0);

      const enrolled = parseInt(String(course["Enrolled"] || course["Enrollments"] || totalBatchStudents || "0").replace(/[^0-9.]/g, ""), 10);

      const totalDiscount = courseBatches.reduce((sum, b) => {
        const d = parseFloat(String(b["Discount"] || "0").replace(/[^0-9.]/g, ""));
        return sum + (isNaN(d) ? 0 : d);
      }, 0);

      const discount = totalDiscount;

      const totalBatchExpenses = courseBatches.reduce((sum, b) => {
        const x = parseFloat(String(b["Expenses"] || b["Total Expense"] || b["Expense"] || "0").replace(/[^0-9.]/g, ""));
        return sum + (isNaN(x) ? 0 : x);
      }, 0);

      const rawCourseExp = parseFloat(String(course["Expenses"] || course["Total Expense"] || "0").replace(/[^0-9.]/g, ""));
      const expenses = rawCourseExp > 0 ? rawCourseExp : totalBatchExpenses;
      
      const grossRevenue = isNaN(fee) || isNaN(enrolled) ? 0 : fee * enrolled;
      const netRevenue = grossRevenue - (isNaN(discount) ? 0 : discount);
      const netProfit = netRevenue - (isNaN(expenses) ? 0 : expenses);
      const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
      
      const courseBatchesCount = courseBatches.length;
      const publicationStatus = getPublicationStatus(course, courseOfferData);

      return {
        ...course,
        "Publication Status": publicationStatus,
        "Published Status": publicationStatus,
        "Enrolled": enrolled.toString(),
        "Expenses": expenses > 0 ? `৳ ${expenses.toLocaleString()}` : (course["Expenses"] || '0'),
        "Discount": totalDiscount > 0 ? `৳ ${totalDiscount.toLocaleString()}` : '0',
        "Activity Status": getCourseStatusName(course, documentsData, workflowData),
        "Status": getCourseStatusName(course, documentsData, workflowData),
        "Batches": courseBatchesCount.toString(),
        "Gross Revenue": `৳ ${grossRevenue.toLocaleString()}`,
        "Net Revenue": `৳ ${netRevenue.toLocaleString()}`,
        "Net Profit": `৳ ${netProfit.toLocaleString()}`,
        "Profit %": `${profitMargin.toFixed(1)}%`
      };
    });
  }, [courseData, enrichedMcBatchData, documentsData, workflowData, courseOfferData]);

  const [activeMonthYear, setActiveMonthYear] = useState<string>("");
  const [monthYearSearchQuery, setMonthYearSearchQuery] = useState<string>("");
  const [dashboardActiveTab, setDashboardActiveTab] = useState<string>("financial-overview");

  const allCoursesFinancials = useMemo(() => {
    let grossRevenue = 0;
    let netRevenue = 0;
    let netProfit = 0;
    let courseFee = 0;
    let enrolled = 0;
    let batchDiscountSum = 0;
    let expenses = 0;
    let discount = 0;

    const list = enrichedCourseData.map(course => {
      const feeRaw = parseFloat(String(course["Course Fee"] || "0").replace(/[^0-9.]/g, ""));
      const fee = isNaN(feeRaw) ? 0 : feeRaw;
      
      const courseBatches = enrichedMcBatchData.filter(b => 
        String(b['Course Code'] || '').trim().toLowerCase() === String(course['Course Code'] || '').trim().toLowerCase() ||
        String(b['Course Name'] || '').trim().toLowerCase() === String(course['Course Title'] || '').trim().toLowerCase()
      );

      const totalBatchStudents = courseBatches.reduce((sum, b) => {
        const s = parseInt(String(b["Student"] || b["Students"] || "0").replace(/[^0-9.]/g, ""), 10);
        return sum + (isNaN(s) ? 0 : s);
      }, 0);

      const enr = parseInt(String(course["Enrolled"] || course["Enrollments"] || totalBatchStudents || "0").replace(/[^0-9.]/g, ""), 10);
      const enrolledVal = isNaN(enr) ? 0 : enr;

      const totalDiscount = courseBatches.reduce((sum, b) => {
        const d = parseFloat(String(b["Discount"] || "0").replace(/[^0-9.]/g, ""));
        return sum + (isNaN(d) ? 0 : d);
      }, 0);

      const totalBatchExpenses = courseBatches.reduce((sum, b) => {
        const x = parseFloat(String(b["Expenses"] || b["Total Expense"] || b["Expense"] || "0").replace(/[^0-9.]/g, ""));
        return sum + (isNaN(x) ? 0 : x);
      }, 0);

      const rawCourseExp = parseFloat(String(course["Expenses"] || course["Total Expense"] || "0").replace(/[^0-9.]/g, ""));
      const exp = rawCourseExp > 0 ? rawCourseExp : totalBatchExpenses;
      const expensesVal = isNaN(exp) ? 0 : exp;

      const gross = fee * enrolledVal;
      const net = gross - totalDiscount;
      const profit = net - expensesVal;
      const margin = net > 0 ? (profit / net) * 100 : 0;

      grossRevenue += gross;
      netRevenue += net;
      netProfit += profit;
      courseFee += fee;
      enrolled += enrolledVal;
      batchDiscountSum += totalDiscount;
      expenses += expensesVal;
      discount += totalDiscount;

      return {
        id: course["id"] || course["Course Code"],
        title: course["Course Title"] || course["Course Name"] || "Unnamed Course",
        code: course["Course Code"] || "-",
        gross,
        discount: totalDiscount,
        expenses: expensesVal,
        net,
        profit,
        margin
      };
    });

    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    return {
      totals: {
        grossRevenue,
        netRevenue,
        netProfit,
        profitMargin,
        courseFee,
        enrolled,
        batchDiscountSum,
        expenses,
        discount
      },
      list
    };
  }, [enrichedCourseData, enrichedMcBatchData]);

  const monthYearTabs = useMemo(() => {
    const courseCounts: Record<string, number> = {};
    
    enrichedCourseData.forEach(course => {
      const dateVal = course["Date"];
      if (!dateVal) return;
      
      const parsed = getMonthYearFromDate(dateVal);
      if (parsed) {
        courseCounts[parsed.label] = (courseCounts[parsed.label] || 0) + 1;
      }
    });

    const tabs = [];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    const currentDate = new Date();
    // Start from the month after the current month and go backwards 36 months
    for (let i = 0; i < 36; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1 - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = `${months[m]} ${y}`;
      const count = courseCounts[label] || 0;
      
      tabs.push({
        label,
        count,
        month: m,
        year: y
      });
    }
    
    return tabs;
  }, [enrichedCourseData]);

  const filteredMonthYearTabs = useMemo(() => {
    if (!monthYearSearchQuery.trim()) return monthYearTabs;
    const query = monthYearSearchQuery.toLowerCase().trim();
    return monthYearTabs.filter(tab => tab.label.toLowerCase().includes(query));
  }, [monthYearTabs, monthYearSearchQuery]);

  // Set the first tab as active by default if none is set
  useEffect(() => {
    if (monthYearTabs.length > 0 && !activeMonthYear) {
      setActiveMonthYear(monthYearTabs[0].label);
    }
  }, [monthYearTabs, activeMonthYear]);

  // Keep selectedCourse in sync with data updates
  useEffect(() => {
    if (selectedCourse && enrichedCourseData.length > 0) {
      const courseCode = selectedCourse["Course Code"] || selectedCourse["id"];
      if (courseCode) {
        const updatedCourse = enrichedCourseData.find(c => (c["Course Code"] || c["id"]) === courseCode);
        if (updatedCourse && JSON.stringify(updatedCourse) !== JSON.stringify(selectedCourse)) {
          setSelectedCourse(updatedCourse);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichedCourseData]);

  const getDbOverridesHeaders = () => {
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
          
          const headers: Record<string, string> = {};
          if (spreadsheetId) headers["x-spreadsheet-id"] = spreadsheetId;
          if (api) headers["x-apps-script-url"] = api;
          return headers;
        }
      }
    } catch (e) {}
    return {};
  };

  const availableEmployeesForPicker = useMemo(() => {
    return data;
  }, [data]);

  const handleSaveMultipleSettings = async (updates: { Title: string; Content: string }[]) => {
    const previousSettings = [...settingsData];
    
    // Optimistically update local settings state
    let updatedSettings = [...settingsData];
    for (const update of updates) {
      const idx = updatedSettings.findIndex(r => r.Title === update.Title);
      if (idx !== -1) {
        updatedSettings[idx] = { ...updatedSettings[idx], ...update };
      } else {
        updatedSettings = [update, ...updatedSettings];
      }
    }
    setSettingsData(updatedSettings);
    localStorage.setItem("settings_data", JSON.stringify(updatedSettings));

    try {
      const headers = getDbOverridesHeaders();
      // Post all updates in parallel to Google Sheet
      await Promise.all(updates.map(async (update) => {
        const exists = previousSettings.some(r => r.Title === update.Title);
        await axios.post("/api/proxy", {
          action: exists ? "UPDATE" : "ADD",
          data: update,
          gid: settingsGid,
          ...(exists && { idKey: "Title", idValue: update.Title })
        }, {
          headers
        });
      }));
    } catch (error) {
      console.warn("Settings proxy sync warning (local settings retained):", error);
    }
  };

  const handleSave = async (formData: any, editingRow: any | null) => {
    const idKey = formData["Employee ID"] ? "Employee ID" : (formData["ID"] ? "ID" : Object.keys(formData)[0]);
    await saveEmployee(formData, editingRow, idKey);
  };

  const handlePickerSave = async (selectedEmployees: any[]) => {
    const idKey = headers.find(h => h.toLowerCase() === "id" || h.toLowerCase() === "employee id") || "Employee ID";
    
    // The picker now returns the COMPLETE list of who SHOULD be MC Representatives
    const selectedIds = new Set(selectedEmployees.map(emp => String(emp[idKey])));
    
    const updatedEmployees: any[] = [];
    const newData = data.map(emp => {
      const id = String(emp[idKey]);
      const shouldHaveTag = selectedIds.has(id);
      
      const currentTagsStr = emp["Tag"] || "";
      let tags: string[] = [];
      if (Array.isArray(currentTagsStr)) {
        tags = [...currentTagsStr];
      } else if (typeof currentTagsStr === 'string') {
        tags = currentTagsStr.split(',').map(s => s.trim()).filter(Boolean);
      }
      
      const hasTag = tags.includes("MC Representatives");
      
      let updatedEmp = null;
      if (shouldHaveTag && !hasTag) {
        // Add tag
        tags.push("MC Representatives");
        updatedEmp = { ...emp, Tag: tags.join(", ") };
      } else if (!shouldHaveTag && hasTag) {
        // Remove tag
        tags = tags.filter(t => t !== "MC Representatives");
        updatedEmp = { ...emp, Tag: tags.join(", ") };
      }
      
      if (updatedEmp) {
        updatedEmployees.push({ id, data: updatedEmp });
        return updatedEmp;
      }
      return emp;
    });

    // Optimistic update locally (all at once)
    setData(newData);

    // Update on server in background (Parallelized)
    Promise.all(updatedEmployees.map(update => 
      axios.post("/api/proxy", {
        action: "UPDATE",
        data: update.data,
        idKey,
        idValue: update.id,
        gid: "0"
      }).catch(error => {
        console.error(`Error updating employee ${update.id}:`, error);
      })
    ));
  };

  const handleDelete = async (row: any) => {
    const rowHeaders = Object.keys(row);
    const idKey = rowHeaders.find(h => {
      const cleaned = h.trim().toLowerCase();
      return cleaned === "id" || cleaned === "employee id" || cleaned === "employee-id" || cleaned === "emp id";
    }) || rowHeaders[0];
    
    const photoKey = rowHeaders.find(h => h.trim().toLowerCase().includes("photo"));
    
    if (!idKey || row[idKey] === undefined) {
      console.warn("Delete failed: No ID found for row", row);
      return;
    }

    try {
      await deleteEmployeeRaw(row, idKey);

      // Try to delete photo (handles both local uploads and Google Drive)
      if (photoKey && row[photoKey]) {
        const photoUrl = row[photoKey];
        if (typeof photoUrl === "string" && photoUrl.trim() !== "") {
          try {
            await axios.post("/api/delete-file", { url: photoUrl });
          } catch (e) {
            console.error("Failed to delete photo:", e);
          }
        }
      }
      
      // We don't call fetchData(true) here immediately because Google Sheet CSV export
      // can be stale for a few seconds. The hook already updated the local state.
    } catch (e: any) {
      alert("Error during deletion: " + e.message);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const courseTableRef = useRef<any>(null);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const gids = [
        employeeGid, 
        settingsGid, 
        "1120624852", 
        mcBatchGid, 
        "880522927", 
        "732376789", 
        expensesGid, 
        "1686458334",
        "84557637",
        courseOfferGid
      ];
      const headers = getDbOverridesHeaders();
      const response = await axios.post("/api/sync-all", { gids }, { headers });
      const results = response.data?.results;
      if (results) {
        if (results[employeeGid]) {
          setData(results[employeeGid]);
          localStorage.setItem("workforce_data", JSON.stringify(results[employeeGid]));
        }
        if (results[settingsGid]) {
          setSettingsData(results[settingsGid]);
          localStorage.setItem("settings_data", JSON.stringify(results[settingsGid]));
        }
        if (results["1120624852"]) {
          setCourseData(results["1120624852"]);
          localStorage.setItem("course_data", JSON.stringify(results["1120624852"]));
        }
        if (results[mcBatchGid]) {
          setMcBatchData(results[mcBatchGid]);
          localStorage.setItem("mc_batch_data", JSON.stringify(results[mcBatchGid]));
        }
        if (results["880522927"]) {
          setRoutineSlotsData(results["880522927"]);
          localStorage.setItem("routine_slots_data", JSON.stringify(results["880522927"]));
        }
        if (results["732376789"]) {
          setDocumentsData(results["732376789"]);
          localStorage.setItem("documents_data", JSON.stringify(results["732376789"]));
        }
        if (results[expensesGid]) {
          setExpensesData(results[expensesGid]);
          localStorage.setItem("expenses_data", JSON.stringify(results[expensesGid]));
        }
        if (results["1686458334"]) {
          setWorkflowData(results["1686458334"]);
          localStorage.setItem("workflow_data", JSON.stringify(results["1686458334"]));
        }
        if (results["84557637"]) {
          setProgramNameData(results["84557637"]);
          localStorage.setItem("program_name_data", JSON.stringify(results["84557637"]));
        }
        if (results[courseOfferGid]) {
          setCourseOfferData(results[courseOfferGid]);
          localStorage.setItem("course_offer_data", JSON.stringify(results[courseOfferGid]));
        }
      }
    } catch (error) {
      console.error("Sync all failed, falling back to individual fetch:", error);
      await Promise.all([
        fetchData(true),
        fetchSettingsData(true),
        fetchCourseData(true),
        fetchMcBatchData(true),
        fetchDocumentsData(true),
        fetchExpensesData(true),
        fetchWorkflowData(true),
        fetchProgramNameData(true),
        fetchCourseOfferData(true)
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSettingsSave = async (formData: any, editingRow: any | null) => {
    await saveSettingRaw(formData, editingRow, "Title");
  };

  const handleSettingsDelete = async (row: any) => {
    await deleteSetting(row, "Title");
  };

  const handleCourseSave = async (formData: any, editingRow: any | null) => {
    // Strip calculated/virtual columns before saving to sheet
    const { 
      "Status": _s, 
      "Gross Revenue": _gr, 
      "Net Revenue": _nr, 
      "Net Profit": _np, 
      "Profit %": _pp,
      ...dataToSave 
    } = formData;

    if (dataToSave["Publication Workflow"] !== undefined) {
      dataToSave["Workflow"] = dataToSave["Publication Workflow"];
    }

    await saveCourse(dataToSave, editingRow, "Course Code");
    setSelectedCourse(formData);
  };

  const handleCourseDelete = async (row: any) => {
    await deleteCourseRaw(row, "Course Code");
  };

  const syncRoutineSlotsForBatch = async (batch: any, rawRoutineString: string) => {
    const courseCode = batch["Course Code"] || batch["courseCode"] || "";
    const batchNo = batch["Batch Number"] || batch["batchNumber"] || "";
    if (!courseCode || !batchNo) return;

    let newSlots: any[] = [];
    try {
      newSlots = typeof rawRoutineString === "string" ? JSON.parse(rawRoutineString) : rawRoutineString;
    } catch (e) {
      console.warn("Could not parse routine slots:", e);
      return;
    }
    if (!Array.isArray(newSlots)) return;

    // Get current slots for this batch from routineSlotsData
    const currentSlots = routineSlotsData.filter(slot => {
      const slotCourseCode = slot["Course Code"] || slot["courseCode"] || "";
      const slotBatchNo = slot["Batch Number"] || slot["batchNumber"] || "";
      return String(slotCourseCode).trim().toLowerCase() === String(courseCode).trim().toLowerCase() &&
             String(slotBatchNo).trim().toLowerCase() === String(batchNo).trim().toLowerCase();
    });

    const currentMap = new Map<string, any>(currentSlots.map(s => [String(s["Slot ID"] || s["ID"] || s["id"]), s]));
    const newMap = new Map<string, any>(newSlots.map(s => [String(s.id), s]));

    // 1. DELETE slots that are not in the new list
    for (const [id, slot] of currentMap.entries()) {
      if (!newMap.has(id)) {
        const slotForDelete = { ...slot, "Slot ID": id };
        let effectiveIdKey = "Slot ID";
        if (!slot["Slot ID"] && slot["ID"]) {
          effectiveIdKey = "ID";
        }
        await deleteRoutineSlotRaw(slotForDelete, effectiveIdKey);
      }
    }

    // 2. ADD or UPDATE slots
    for (const [id, item] of newMap.entries()) {
      const existing = currentMap.get(id);
      const rowData = {
        "Slot ID": id,
        "Course Code": courseCode,
        "Batch Number": batchNo,
        "Date": item.date,
        "Start Time": item.startTime,
        "End Time": item.endTime,
        "Class Mode": item.classMode || "offline",
        "Room No / Class Link": item.note || "",
        "Attendance": item.attendanceUrl || ""
      };

      if (!existing) {
        // ADD new row
        await saveRoutineSlot(rowData, null, "Slot ID");
      } else {
        // Check if any field changed
        const isChanged = 
          existing["Date"] !== item.date ||
          existing["Start Time"] !== item.startTime ||
          existing["End Time"] !== item.endTime ||
          existing["Class Mode"] !== item.classMode ||
          existing["Room No / Class Link"] !== item.note ||
          existing["Attendance"] !== item.attendanceUrl;
          
        if (isChanged) {
          const existingForUpdate = { ...existing, "Slot ID": id };
          let effectiveIdKey = "Slot ID";
          if (!existing["Slot ID"] && existing["ID"]) {
            effectiveIdKey = "ID";
          }
          await saveRoutineSlot(rowData, existingForUpdate, effectiveIdKey);
        }
      }
    }
  };

  const handleMCBatchSave = async (formData: any, editingRow: any | null) => {
    // 1. Sync routine slots to GID 880522927
    const rawRoutine = formData["Routine"] || formData["Class Routine"] || "";
    if (rawRoutine) {
      await syncRoutineSlotsForBatch(formData, rawRoutine);
    }

    // 2. Clear out routine keys before saving to main Batch sheet
    const batchToSave = { ...formData };
    delete batchToSave["Routine"];
    delete batchToSave["Class Routine"];

    const editingRowClean = editingRow ? { ...editingRow } : null;
    if (editingRowClean) {
      delete editingRowClean["Routine"];
      delete editingRowClean["Class Routine"];
    }

    await saveMcBatch(batchToSave, editingRowClean, "Batch Number");
    
    // 3. Force re-fetch of routine slots so local state matches
    await fetchRoutineSlotsData(true);
  };

  const handleMCBatchDelete = async (row: any) => {
    await deleteMcBatchRaw(row, "Batch Number");
  };

  const handleDocumentSave = async (formData: any, editingRow: any | null) => {
    const idKey = documentsHeaders.find(h => {
      const cleaned = h.toLowerCase().trim();
      return cleaned === "documents title" || cleaned === "document title" || cleaned === "title";
    }) || "Documents Title";
    await saveDocument(formData, editingRow, idKey);
  };

  const handleDocumentDelete = async (row: any) => {
    const idKey = documentsHeaders.find(h => {
      const cleaned = h.toLowerCase().trim();
      return cleaned === "documents title" || cleaned === "document title" || cleaned === "title";
    }) || "Documents Title";
    await deleteDocumentRaw(row, idKey);
  };

  const handleExpenseSave = async (formData: any, editingRow: any | null) => {
    const idKey = expensesHeaders.find(h => {
      const cleaned = h.toLowerCase().trim();
      return cleaned === "expenses title" || cleaned === "title" || cleaned === "expense title";
    }) || "Expenses Title";

    const refHeader = expensesHeaders.find(h => {
      const cleaned = h.toLowerCase().trim();
      return cleaned === "ref" || cleaned === "ref name";
    }) || "Ref";

    let finalFormData = { ...formData };
    if (!finalFormData[refHeader]) {
      const tag = String(finalFormData["Tag"] || "").trim();
      if (tag) {
        let courseCode = "";
        let batchNo = "";
        if (tag.includes("-")) {
          const parts = tag.split("-");
          if (parts.length > 1) {
            batchNo = parts[parts.length - 1]?.trim() || "";
            courseCode = parts.slice(0, parts.length - 1).join("-")?.trim() || "";
          } else {
            courseCode = tag;
            batchNo = "01";
          }
        } else {
          courseCode = tag;
          batchNo = "01";
        }

        const targetTag = tag.toLowerCase();
        const sameTagExpenses = expensesData.filter(item => {
          const itemTag = String(item["Tag"] || "").trim().toLowerCase();
          return itemTag === targetTag;
        });

        let maxSerial = 0;
        sameTagExpenses.forEach(item => {
          const refVal = String(item[refHeader] || "");
          if (refVal.includes("/")) {
            const parts = refVal.split("/");
            const lastPart = parts[parts.length - 1];
            const serial = parseInt(lastPart, 10);
            if (!isNaN(serial) && serial > maxSerial) {
              maxSerial = serial;
            }
          }
        });

        const nextSerial = maxSerial + 1;
        finalFormData[refHeader] = `${courseCode}/${batchNo}/${nextSerial}`;
      }
    }

    await saveExpense(finalFormData, editingRow, idKey);
  };

  const handleExpenseDelete = async (row: any) => {
    const idKey = expensesHeaders.find(h => {
      const cleaned = h.toLowerCase().trim();
      return cleaned === "expenses title" || cleaned === "title" || cleaned === "expense title";
    }) || "Expenses Title";
    await deleteExpenseRaw(row, idKey);
  };

  const handleWorkflowSave = async (formData: any, editingRow: any | null) => {
    const idKey = workflowHeaders.find(h => {
      const cleaned = h.trim().toLowerCase();
      return cleaned === "workflow title" || cleaned === "title";
    }) || "Workflow Title";
    
    await saveWorkflow(formData, editingRow, idKey);
  };

  const handleWorkflowDelete = async (row: any) => {
    const idKey = workflowHeaders.find(h => {
      const cleaned = h.trim().toLowerCase();
      return cleaned === "workflow title" || cleaned === "title";
    }) || "Workflow Title";
    
    await deleteWorkflow(row, idKey);
  };

  const handleProgramNameSave = async (formData: any, editingRow: any | null) => {
    const idKey = programNameHeaders.find(h => {
      const cleaned = h.toLowerCase().trim();
      return cleaned === "pid" || cleaned === "program short name" || cleaned === "program full name";
    }) || "PID";
    await saveProgramName(formData, editingRow, idKey);
  };

  const handleProgramNameDelete = async (row: any) => {
    const idKey = programNameHeaders.find(h => {
      const cleaned = h.toLowerCase().trim();
      return cleaned === "pid" || cleaned === "program short name" || cleaned === "program full name";
    }) || "PID";
    await deleteProgramNameRaw(row, idKey);
  };

  const handleCourseOfferSave = async (formData: any, editingRow: any | null) => {
    const idKey = courseOfferHeaders.find(h => {
      const cleaned = h.toLowerCase().trim();
      return cleaned === "sl" || cleaned === "section id" || cleaned === "course code" || cleaned === "p-id";
    }) || "Sl";
    await saveCourseOffer(formData, editingRow, idKey);
  };

  const handleCourseOfferDelete = async (row: any) => {
    const idKey = courseOfferHeaders.find(h => {
      const cleaned = h.toLowerCase().trim();
      return cleaned === "sl" || cleaned === "section id" || cleaned === "course code" || cleaned === "p-id";
    }) || "Sl";
    await deleteCourseOfferRaw(row, idKey);
  };

  const renderDocumentActions = (row: any) => {
    const fileLink = row["File Link"] || "";
    
    let viewUrl = fileLink;
    // Transform Google Drive download link to view link
    if (viewUrl && (viewUrl.includes("drive.google.com/uc") || viewUrl.includes("export=download"))) {
      const fileIdMatch = viewUrl.match(/[?&]id=([^&]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        viewUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
      }
    }

    return (
      <div className="flex justify-center">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setViewingFile({ url: viewUrl, title: row["Documents Title"] || "Document Preview", doc: row });
          }}
          className="flex items-center gap-1 px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded border border-teal-200 transition-colors"
          title="View Document"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">View</span>
        </button>
      </div>
    );
  };

  const renderExpenseActions = (row: any) => {
    const voucherLink = row["Voucher"];
    if (!voucherLink) return null;
    
    let viewUrl = voucherLink;
    if (viewUrl.includes("drive.google.com/uc") || viewUrl.includes("export=download")) {
      const fileIdMatch = viewUrl.match(/[?&]id=([^&]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        viewUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
      }
    }

    return (
      <div className="flex justify-center">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setViewingFile({ url: viewUrl, title: row["Expenses Title"] || "Voucher Preview" });
          }}
          className="flex items-center gap-1 px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded border border-teal-200 transition-colors"
          title="View Voucher"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Voucher</span>
        </button>
      </div>
    );
  };



  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans antialiased text-gray-800">
      <Header 
        activeTab={activeTab} 
        settingsData={settingsData} 
        onSaveMultipleSettings={handleSaveMultipleSettings} 
        onSyncAll={handleSyncAll}
        isSyncing={isSyncing}
        onLogoClick={() => setIsSidebarOpen(prev => !prev)}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 224, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full overflow-hidden shrink-0"
            >
              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            </motion.div>
          )}
        </AnimatePresence>
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden border-t border-gray-200">
          <div className="flex-1 overflow-hidden p-3 flex flex-col gap-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-h-0"
              >
                {activeTab === "micro-credentials" ? (
                  <div className="flex flex-col w-full h-full bg-white rounded border border-gray-200 overflow-hidden relative">
                    {/* Sub-tabs bar */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-gray-50/50 border-b border-gray-100 shrink-0 gap-4 overflow-hidden w-full">
                      <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1 bg-gray-200/40 p-1 rounded-lg border border-gray-200/40 relative isolate">
                        <button
                          onClick={() => {
                            setMcSubTab("dashboard");
                            setIsCourseDetailsOpen(false);
                          }}
                          className="relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer text-gray-500 hover:text-gray-800 transition-colors duration-200 select-none"
                        >
                          {mcSubTab === "dashboard" && (
                            <motion.span
                              layoutId="activeSubTab"
                              className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-100 -z-10"
                              transition={{ type: "spring", stiffness: 220, damping: 26 }}
                            />
                          )}
                          <LayoutDashboard className="w-3.5 h-3.5" />
                          <span className={mcSubTab === "dashboard" ? "text-teal-800" : ""}>Dashboard</span>
                        </button>
                        <button
                          onClick={() => {
                            setMcSubTab("course");
                            setIsCourseDetailsOpen(false);
                          }}
                          className="relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer text-gray-500 hover:text-gray-800 transition-colors duration-200 select-none"
                        >
                          {mcSubTab === "course" && (
                            <motion.span
                              layoutId="activeSubTab"
                              className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-100 -z-10"
                              transition={{ type: "spring", stiffness: 220, damping: 26 }}
                            />
                          )}
                          <BookOpen className="w-3.5 h-3.5" />
                          <span className={mcSubTab === "course" ? "text-teal-800" : ""}>Course</span>
                        </button>
                        <button
                          onClick={() => {
                            setMcSubTab("batch");
                            setIsCourseDetailsOpen(false);
                          }}
                          className="relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer text-gray-500 hover:text-gray-800 transition-colors duration-200 select-none"
                        >
                          {mcSubTab === "batch" && (
                            <motion.span
                              layoutId="activeSubTab"
                              className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-100 -z-10"
                              transition={{ type: "spring", stiffness: 220, damping: 26 }}
                            />
                          )}
                          <Layers className="w-3.5 h-3.5" />
                          <span className={mcSubTab === "batch" ? "text-teal-800" : ""}>Batch</span>
                        </button>
                        <button
                          onClick={() => {
                            setMcSubTab("class_routine");
                            setIsCourseDetailsOpen(false);
                          }}
                          className="relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer text-gray-500 hover:text-gray-800 transition-colors duration-200 select-none"
                        >
                          {mcSubTab === "class_routine" && (
                            <motion.span
                              layoutId="activeSubTab"
                              className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-100 -z-10"
                              transition={{ type: "spring", stiffness: 220, damping: 26 }}
                            />
                          )}
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span className={mcSubTab === "class_routine" ? "text-teal-800" : ""}>Class Routine</span>
                        </button>
                        <button
                          onClick={() => {
                            setMcSubTab("employees");
                            setIsCourseDetailsOpen(false);
                          }}
                          className="relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer text-gray-500 hover:text-gray-800 transition-colors duration-200 select-none"
                        >
                          {mcSubTab === "employees" && (
                            <motion.span
                              layoutId="activeSubTab"
                              className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-100 -z-10"
                              transition={{ type: "spring", stiffness: 220, damping: 26 }}
                            />
                          )}
                          <Users className="w-3.5 h-3.5" />
                          <span className={mcSubTab === "employees" ? "text-teal-800" : ""}>Employee</span>
                        </button>
                        <button
                          onClick={() => {
                            setMcSubTab("representatives");
                            setIsCourseDetailsOpen(false);
                          }}
                          className="relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer text-gray-500 hover:text-gray-800 transition-colors duration-200 select-none"
                        >
                          {mcSubTab === "representatives" && (
                            <motion.span
                              layoutId="activeSubTab"
                              className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-100 -z-10"
                              transition={{ type: "spring", stiffness: 220, damping: 26 }}
                            />
                          )}
                          <UserCheck className="w-3.5 h-3.5" />
                          <span className={mcSubTab === "representatives" ? "text-teal-800" : ""}>Representatives</span>
                        </button>
                        <button
                          onClick={() => {
                            setMcSubTab("workflow");
                            setIsCourseDetailsOpen(false);
                          }}
                          className="relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer text-gray-500 hover:text-gray-800 transition-colors duration-200 select-none"
                        >
                          {mcSubTab === "workflow" && (
                            <motion.span
                              layoutId="activeSubTab"
                              className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-100 -z-10"
                              transition={{ type: "spring", stiffness: 220, damping: 26 }}
                            />
                          )}
                          <GitMerge className="w-3.5 h-3.5" />
                          <span className={mcSubTab === "workflow" ? "text-teal-800" : ""}>Workflow</span>
                        </button>
                        <button
                          onClick={() => {
                            setMcSubTab("activity");
                            setIsCourseDetailsOpen(false);
                          }}
                          className="relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer text-gray-500 hover:text-gray-800 transition-colors duration-200 select-none"
                        >
                          {mcSubTab === "activity" && (
                            <motion.span
                              layoutId="activeSubTab"
                              className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-100 -z-10"
                              transition={{ type: "spring", stiffness: 220, damping: 26 }}
                            />
                          )}
                          <Activity className="w-3.5 h-3.5" />
                          <span className={mcSubTab === "activity" ? "text-teal-800" : ""}>Activity</span>
                        </button>
                        <button
                          onClick={() => {
                            setMcSubTab("documents");
                            setIsCourseDetailsOpen(false);
                          }}
                          className="relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer text-gray-500 hover:text-gray-800 transition-colors duration-200 select-none"
                        >
                          {mcSubTab === "documents" && (
                            <motion.span
                              layoutId="activeSubTab"
                              className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-100 -z-10"
                              transition={{ type: "spring", stiffness: 220, damping: 26 }}
                            />
                          )}
                          <FileText className="w-3.5 h-3.5" />
                          <span className={mcSubTab === "documents" ? "text-teal-800" : ""}>Documents</span>
                        </button>
                        <button
                          onClick={() => {
                            setMcSubTab("expenses");
                            setIsCourseDetailsOpen(false);
                          }}
                          className="relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer text-gray-500 hover:text-gray-800 transition-colors duration-200 select-none"
                        >
                          {mcSubTab === "expenses" && (
                            <motion.span
                              layoutId="activeSubTab"
                              className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-100 -z-10"
                              transition={{ type: "spring", stiffness: 220, damping: 26 }}
                            />
                          )}
                          <Coins className="w-3.5 h-3.5" />
                          <span className={mcSubTab === "expenses" ? "text-teal-800" : ""}>Expenses</span>
                        </button>
                        <button
                          onClick={() => {
                            setMcSubTab("program_name");
                            setIsCourseDetailsOpen(false);
                          }}
                          className="relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer text-gray-500 hover:text-gray-800 transition-colors duration-200 select-none"
                        >
                          {mcSubTab === "program_name" && (
                            <motion.span
                              layoutId="activeSubTab"
                              className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-100 -z-10"
                              transition={{ type: "spring", stiffness: 220, damping: 26 }}
                            />
                          )}
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span className={mcSubTab === "program_name" ? "text-teal-800" : ""}>Program Name</span>
                        </button>
                        <button
                          onClick={() => {
                            setMcSubTab("course_offer");
                            setIsCourseDetailsOpen(false);
                          }}
                          className="relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer text-gray-500 hover:text-gray-800 transition-colors duration-200 select-none"
                        >
                          {mcSubTab === "course_offer" && (
                            <motion.span
                              layoutId="activeSubTab"
                              className="absolute inset-0 bg-white rounded-md shadow-sm border border-gray-100 -z-10"
                              transition={{ type: "spring", stiffness: 220, damping: 26 }}
                            />
                          )}
                          <BookOpenCheck className="w-3.5 h-3.5" />
                          <span className={mcSubTab === "course_offer" ? "text-teal-800" : ""}>Course Offer</span>
                        </button>
                      </div>
                    </div>

                    {/* Sub-tab contents */}
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={mcSubTab}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15, ease: "easeInOut" }}
                          className="flex-1 overflow-hidden flex flex-col min-h-0 transform-gpu"
                        >
                          {mcSubTab === "dashboard" ? (
                            <div className="flex-1 overflow-hidden flex h-full">
                              {/* Dashboard Sidebar */}
                              <div className="w-52 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
                                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
                                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Dashboard Menu
                                  </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                  <button
                                    onClick={() => setDashboardActiveTab("financial-overview")}
                                    className={cn(
                                      "w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2.5 group cursor-pointer",
                                      dashboardActiveTab === "financial-overview"
                                        ? "bg-teal-50 text-teal-800 font-semibold shadow-xs"
                                        : "text-gray-600 hover:bg-gray-100/70 hover:text-gray-900"
                                    )}
                                  >
                                    <Coins className={cn("w-4 h-4", dashboardActiveTab === "financial-overview" ? "text-teal-600" : "text-gray-400 group-hover:text-gray-500")} />
                                    <span>Financial Overview</span>
                                  </button>
                                  
                                  <button
                                    onClick={() => setDashboardActiveTab("course-insights")}
                                    className={cn(
                                      "w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2.5 group cursor-pointer",
                                      dashboardActiveTab === "course-insights"
                                        ? "bg-teal-50 text-teal-800 font-semibold shadow-xs"
                                        : "text-gray-600 hover:bg-gray-100/70 hover:text-gray-900"
                                    )}
                                  >
                                    <BookOpen className={cn("w-4 h-4", dashboardActiveTab === "course-insights" ? "text-teal-600" : "text-gray-400 group-hover:text-gray-500")} />
                                    <span>Course Insights</span>
                                  </button>

                                  <button
                                    onClick={() => setDashboardActiveTab("batch-insights")}
                                    className={cn(
                                      "w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2.5 group cursor-pointer",
                                      dashboardActiveTab === "batch-insights"
                                        ? "bg-teal-50 text-teal-800 font-semibold shadow-xs"
                                        : "text-gray-600 hover:bg-gray-100/70 hover:text-gray-900"
                                    )}
                                  >
                                    <Layers className={cn("w-4 h-4", dashboardActiveTab === "batch-insights" ? "text-teal-600" : "text-gray-400 group-hover:text-gray-500")} />
                                    <span>Batch Insights</span>
                                  </button>
                                </div>
                              </div>

                              {/* Dashboard Content Area */}
                              <div className="flex-1 overflow-y-auto bg-slate-50/30 p-6">
                                {dashboardActiveTab === "financial-overview" ? (
                                  <FinancialDashboard
                                    courseData={enrichedCourseData}
                                    mcBatchData={enrichedMcBatchData}
                                    expensesData={expensesData}
                                    programNameData={programNameData}
                                    courseOfferData={courseOfferData}
                                  />
                                ) : dashboardActiveTab === "course-insights" ? (
                                  <CourseInsightsDashboard
                                    courseData={enrichedCourseData}
                                    mcBatchData={enrichedMcBatchData}
                                    expensesData={expensesData}
                                    programNameData={programNameData}
                                    courseOfferData={courseOfferData}
                                    documentsData={documentsData}
                                    workflowData={workflowData}
                                    employeesData={data}
                                    onCourseSave={handleCourseSave}
                                    onSaveBatch={handleMCBatchSave}
                                    onSaveDocument={handleDocumentSave}
                                    onSaveExpense={handleExpenseSave}
                                    onViewFile={(url, title, doc) => setViewingFile({ url, title, doc })}
                                    batchHeaders={mcBatchHeaders}
                                    documentHeaders={documentsHeaders}
                                    expensesHeaders={expensesHeaders}
                                    courseOfferHeaders={courseOfferHeaders}
                                    programNameHeaders={programNameHeaders}
                                    onSelectBatch={(batch) => {
                                      setSelectedBatch(batch);
                                      setIsBatchDetailsExpanded(true);
                                      setIsBatchDetailsOpen(true);
                                    }}
                                  />
                                ) : dashboardActiveTab === "batch-insights" ? (
                                  <BatchInsightsDashboard
                                    courseData={enrichedCourseData}
                                    mcBatchData={enrichedMcBatchData}
                                    expensesData={expensesData}
                                    programNameData={programNameData}
                                    courseOfferData={courseOfferData}
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-center p-12 h-full">
                                    <LayoutDashboard className="w-12 h-12 text-gray-300 mb-4" />
                                    <h3 className="text-sm font-semibold text-gray-900">No View Selected</h3>
                                    <p className="text-xs text-gray-400 mt-1">Please select an item from the dashboard sidebar.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : mcSubTab === "course" ? (
                            <div className="flex-1 overflow-hidden relative">
                              <Table 
                                ref={courseTableRef}
                                data={enrichedCourseData}
                                headers={courseTableHeaders}
                                formHeaders={courseHeaders.filter(h => !["Proposed By", "Developed By", "Reviewed By", "Approved By", "Published By"].includes(h))}
                                isLoading={isCourseLoading}
                                onSave={handleCourseSave}
                                onDelete={handleCourseDelete}
                                onRefresh={() => fetchCourseData(true)}
                                FormPanel={MCCoursePanel}
                                entityName="Course"
                                title="Course List"
                                hideFooter={isCourseDetailsOpen}
                                renderActions={renderCourseActions}
                                onRowClick={(row) => {
                                  setSelectedCourse(row);
                                  setIsCourseDetailsExpanded(true);
                                  setIsCourseDetailsOpen(true);
                                }}
                                employees={data}
                                extraFormProps={{ 
                                  onViewFile: (url, title, doc) => setViewingFile({ url, title, doc }),
                                  allBatches: enrichedMcBatchData, 
                                  onSaveBatch: handleMCBatchSave,
                                  allDocuments: documentsData,
                                  onSaveDocument: handleDocumentSave,
                                  workflowData: workflowData,
                                  programNameData: programNameData,
                                  programNameHeaders: programNameHeaders,
                                  courseOfferData: courseOfferData,
                                  allCourses: courseData,
                                  courseOfferHeaders: courseOfferHeaders,
                                  onExpand: (course: any) => {
                                    setSelectedCourse(course);
                                    setIsCourseDetailsExpanded(true);
                                     setIsCourseDetailsOpen(true);
                                   }
                                 }}
                              >
                                <MCCourseDetails 
                                  isOpen={isCourseDetailsOpen}
                                  onClose={() => {
                                    setIsCourseDetailsOpen(false);
                                  }}
                                  data={selectedCourse}
                                  onSelectCourse={(course) => setSelectedCourse(course)}
                                  allCourses={courseData}
                                  onSave={handleCourseSave}
                                  employees={data}
                                  batches={enrichedMcBatchData}
                                  documents={documentsData}
                                  workflowData={workflowData}
                                  extraFormProps={{
                                    onViewFile: (url, title, doc) => setViewingFile({ url, title, doc }),
                                    employees: data,
                                    onSaveBatch: handleMCBatchSave,
                                    onSaveDocument: handleDocumentSave,
                                    batchHeaders: mcBatchHeaders,
                                    documentHeaders: documentsHeaders,
                                    expensesData: expensesData,
                                    onSaveExpense: handleExpenseSave,
                                    expensesHeaders: expensesHeaders,
                                    programNameData: programNameData,
                                    programNameHeaders: programNameHeaders,
                                    courseOfferData: courseOfferData,
                                    courseOfferHeaders: courseOfferHeaders,
                                    allCourses: courseData,
                                    onSelectCourse: (course) => setSelectedCourse(course)
                                  }}
                                  initialExpanded={isCourseDetailsExpanded}
                                />
                              </Table>
                            </div>
                          ) : mcSubTab === "batch" ? (
                            <div className="flex-1 overflow-hidden relative">
                              <Table 
                                data={enrichedMcBatchData}
                                headers={filteredMcBatchTableHeaders}
                                isLoading={isMcBatchLoading}
                                onSave={handleMCBatchSave}
                                onDelete={handleMCBatchDelete}
                                onRefresh={() => fetchMcBatchData(true)}
                                FormPanel={MCBatchPanel}
                                entityName="Batch"
                                title="Batch List"
                                hideFooter={isBatchDetailsOpen}
                                onRowClick={(row) => {
                                  setSelectedBatch(row);
                                  setIsBatchDetailsExpanded(true);
                                  setIsBatchDetailsOpen(true);
                                }}
                                employees={data}
                                extraFormProps={{
                                  workflowData: workflowData,
                                  onViewFile: (url, title, doc) => setViewingFile({ url, title, doc }),
                                  employees: data,
                                  onSaveBatch: handleMCBatchSave,
                                  onSaveDocument: handleDocumentSave,
                                  batchHeaders: mcBatchHeaders,
                                  documentHeaders: documentsHeaders,
                                  expensesData: expensesData,
                                  onSaveExpense: handleExpenseSave,
                                  expensesHeaders: expensesHeaders,
                                  programNameData: programNameData,
                                  programNameHeaders: programNameHeaders,
                                  courseOfferData: courseOfferData,
                                  courseOfferHeaders: courseOfferHeaders,
                                  allCourses: courseData,
                                  allDocuments: documentsData,
                                  onSelectBatch: (batch: any) => setSelectedBatch(batch)
                                }}
                              />
                            </div>
                          ) : mcSubTab === "class_routine" ? (
                            <div className="flex-1 overflow-hidden relative flex flex-col">
                              <CalendarClassRoutine
                                allBatches={enrichedMcBatchData}
                                allCourses={enrichedCourseData}
                                employees={data}
                                onSaveBatch={handleMCBatchSave}
                                 fileLocation={settingsData.find(r => r.Title === "File Location")?.Content || "Main Folder"}
                              />
                            </div>
                          ) : mcSubTab === "employees" ? (
                            <div className="flex-1 overflow-hidden relative">
                              <Table 
                                data={data}
                                headers={headers}
                                isLoading={isLoading}
                                onSave={handleSave}
                                onDelete={handleDelete}
                                onRefresh={() => fetchData(true)}
                                FormPanel={EmployeePanel}
                                entityName="Employee"
                              />
                            </div>
                          ) : mcSubTab === "representatives" ? (
                            <div className="flex-1 overflow-hidden relative">
                              <Table 
                                data={data}
                                headers={headers}
                                isLoading={isLoading}
                                onSave={handleSave}
                                onDelete={handleDelete}
                                onRefresh={() => fetchData(true)}
                                FormPanel={EmployeePanel}
                                entityName="MC Representative"
                                title="Representatives List"
                                initialFilter={{ Tag: "MC Representatives" }}
                                defaultNewValues={{ Tag: ["MC Representatives"] }}
                                onAddClick={() => setShowEmployeePicker(true)}
                              >
                                <EmployeePicker
                                  isOpen={showEmployeePicker}
                                  onClose={() => setShowEmployeePicker(false)}
                                  onSave={handlePickerSave}
                                  employees={availableEmployeesForPicker}
                                  headers={headers}
                                />
                              </Table>
                            </div>
                          ) : mcSubTab === "workflow" ? (
                            <div className="flex-1 overflow-hidden relative">
                              <WorkflowView 
                                data={workflowData}
                                headers={workflowHeaders}
                                isLoading={isWorkflowLoading}
                                onSave={handleWorkflowSave}
                                onDelete={handleWorkflowDelete}
                                onRefresh={() => fetchWorkflowData(true)}
                                employees={data}
                              />
                            </div>
                          ) : mcSubTab === "activity" ? (
                            <div className="flex-1 overflow-hidden relative">
                              <ActivityPanel
                                courseData={enrichedCourseData}
                                mcBatchData={enrichedMcBatchData}
                                employees={data}
                                workflowData={workflowData}
                                onSaveCourse={handleCourseSave}
                                onSaveBatch={handleMCBatchSave}
                                 fileLocation={settingsData.find(r => r.Title === "File Location")?.Content || "Main Folder"}
                                documents={documentsData}
                                onSaveDocument={handleDocumentSave}
                                onViewFile={(url, title, doc) => setViewingFile({ url, title, doc })}
                              />
                            </div>
                          ) : mcSubTab === "documents" ? (
                            <div className="flex-1 overflow-hidden relative">
                              <Table 
                                data={documentsData}
                                headers={documentsHeaders}
                                isLoading={isDocumentsLoading}
                                onSave={handleDocumentSave}
                                onDelete={handleDocumentDelete}
                                onRefresh={() => fetchDocumentsData(true)}
                                FormPanel={DocumentsPanel}
                                entityName="Document"
                                title="Documents List"
                                renderActions={renderDocumentActions}
                              />
                            </div>
                          ) : mcSubTab === "expenses" ? (
                            <div className="flex-1 overflow-hidden relative">
                              <Table 
                                data={expensesData}
                                headers={expensesHeaders}
                                isLoading={isExpensesLoading}
                                onSave={handleExpenseSave}
                                onDelete={handleExpenseDelete}
                                onRefresh={() => fetchExpensesData(true)}
                                FormPanel={ExpensesPanel}
                                entityName="Expense"
                                title="Expenses List"
                                renderActions={renderExpenseActions}
                              />
                            </div>
                          ) : mcSubTab === "program_name" ? (
                            <div className="flex-1 overflow-hidden relative">
                              <Table 
                                data={programNameData}
                                headers={programNameHeaders}
                                isLoading={isProgramNameLoading}
                                onSave={handleProgramNameSave}
                                onDelete={handleProgramNameDelete}
                                onRefresh={() => fetchProgramNameData(true)}
                                FormPanel={ProgramNamePanel}
                                entityName="Program"
                                title="Program Name List"
                              />
                            </div>
                          ) : mcSubTab === "course_offer" ? (
                            <div className="flex-1 overflow-hidden relative">
                              <Table 
                                data={courseOfferData}
                                headers={courseOfferHeaders}
                                isLoading={isCourseOfferLoading}
                                onSave={handleCourseOfferSave}
                                onDelete={handleCourseOfferDelete}
                                onRefresh={() => fetchCourseOfferData(true)}
                                FormPanel={CourseOfferPanel}
                                entityName="Course Offer"
                                title="Course Offer List"
                              />
                            </div>
                          ) : null}
                        </motion.div>
                      </AnimatePresence>

                      <MCBatchDetails 
                        isOpen={isBatchDetailsOpen}
                        onClose={() => {
                          setIsBatchDetailsOpen(false);
                          if (previousMcSubTab) {
                            setMcSubTab(previousMcSubTab);
                            setPreviousMcSubTab(null);
                          }
                        }}
                        data={selectedBatch}
                        onSelectBatch={(batch) => setSelectedBatch(batch)}
                        allBatches={enrichedMcBatchData}
                        onSave={handleMCBatchSave}
                        employees={data}
                        courses={courseData}
                        documents={documentsData}
                        workflowData={workflowData}
                        extraFormProps={{
                          onViewFile: (url, title, doc) => setViewingFile({ url, title, doc }),
                          employees: data,
                          onSaveBatch: handleMCBatchSave,
                          onSaveDocument: handleDocumentSave,
                          batchHeaders: mcBatchHeaders,
                          documentHeaders: documentsHeaders,
                          expensesData: expensesData,
                          onSaveExpense: handleExpenseSave,
                          expensesHeaders: expensesHeaders,
                          programNameData: programNameData,
                          programNameHeaders: programNameHeaders,
                          courseOfferData: courseOfferData,
                          courseOfferHeaders: courseOfferHeaders,
                          allCourses: courseData,
                          allDocuments: documentsData,
                          onSelectBatch: (batch: any) => setSelectedBatch(batch)
                        }}
                        initialExpanded={isBatchDetailsExpanded}
                      />
                    </div>
                  </div>
                ) : activeTab === "settings" ? (
                  <div className="flex w-full h-full bg-white rounded border border-gray-200 overflow-hidden">
                    <SettingsTab 
                      settingsData={settingsData}
                      isLoading={isSettingsLoading}
                      onSaveMultipleSettings={handleSaveMultipleSettings}
                      onRefresh={() => fetchSettingsData(true)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full bg-white rounded border border-gray-200">
                    <p className="text-gray-400 text-xs font-mono uppercase tracking-widest">
                      Module Offline / {activeTab}
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <AnimatePresence>
        {viewingFile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-3 bg-teal-600 text-white shadow-xs">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold truncate max-w-md">{viewingFile.title}</h3>
                  {viewingFile.doc && (
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">
                      {viewingFile.doc["Course Code"] || "Document"}
                    </span>
                  )}
                </div>
                
                <button 
                  onClick={() => setViewingFile(null)}
                  className="p-1 hover:bg-teal-700 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Workspace Split */}
              <div className="flex-1 flex bg-gray-100 overflow-hidden">
                {/* Left Pane: Note & Review Workspace (Document Details) */}
                <div className="w-full sm:w-80 sm:shrink-0 border-r border-slate-200 bg-white flex flex-col h-full overflow-hidden">
                  <div className="flex-1 p-5 overflow-y-auto space-y-4">
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Document Details
                      </h4>
                      <div className="mt-2 space-y-1.5">
                        {viewingFile.doc && viewingFile.doc["Date"] && (
                          <p className="text-xs text-slate-600 font-medium">
                            <span className="font-bold text-slate-800">Date:</span> {viewingFile.doc["Date"]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Deliverable Note
                      </label>
                      <textarea
                        value={previewNote}
                        onChange={(e) => setPreviewNote(e.target.value)}
                        placeholder="Write or edit notes about this deliverable here..."
                        className="w-full h-20 p-3 text-xs font-medium border border-slate-200 rounded-lg outline-none focus:border-teal-500 resize-none leading-relaxed bg-slate-50/50"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Notes are stored directly under the deliverable's Tag attribute.
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        File Link / Re-upload
                      </label>
                      
                      <div className="flex gap-2 items-stretch">
                        <div className="relative flex-1">
                          <div className="absolute left-2.5 top-2.5 text-slate-400">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="url"
                            value={previewFileLink}
                            onChange={(e) => setPreviewFileLink(e.target.value)}
                            placeholder="Edit File Link / URL"
                            className="w-full text-xs font-medium pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                          />
                        </div>

                        <label className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer transition-all shrink-0">
                          {isUploadingNewFile ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                              <span className="text-[10px] text-teal-600">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5 text-slate-500 font-bold" />
                              <span className="text-[10px]">Upload</span>
                            </>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleNewFileReupload}
                            disabled={isUploadingNewFile}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          type="button"
                          onClick={() => setDocStatus("Revision")}
                          className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                            docStatus === "Revision" 
                              ? "bg-amber-50 border-amber-300 text-amber-700 font-extrabold shadow-sm" 
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${docStatus === "Revision" ? "bg-amber-500 animate-pulse" : "bg-slate-400"}`} />
                          Revision
                        </button>
                        <button 
                          type="button"
                          onClick={() => setDocStatus("Verified")}
                          className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                            docStatus === "Verified" 
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-extrabold shadow-sm" 
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${docStatus === "Verified" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          Verified
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 flex gap-2 shrink-0 bg-slate-50">
                    <button 
                      onClick={() => setViewingFile(null)}
                      className="flex-1 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    <button 
                      onClick={handleSaveDocStatus}
                      className="flex-1 px-3 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

                {/* Right Pane: File Preview (only if URL exists) */}
                {viewingFile.url && viewingFile.url.trim().length > 0 && viewingFile.url !== "null" ? (
                  <div className="flex-1 h-full relative">
                    {viewingFile.url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                      <div className="w-full h-full flex items-center justify-center p-4 text-center bg-gray-900/5">
                        <img 
                          src={viewingFile.url} 
                          alt={viewingFile.title} 
                          className="max-w-full max-h-full object-contain mx-auto shadow-md bg-white rounded"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <iframe 
                        src={
                          viewingFile.url.includes("drive.google.com") 
                            ? viewingFile.url.replace("/view", "/preview").replace("/edit", "/preview")
                            : viewingFile.url
                        } 
                        className="w-full h-full border-none bg-white"
                        title="File Preview"
                      />
                    )}
                  </div>
                ) : (
                  /* If no URL exists, show a friendly notification */
                  <div className="hidden sm:flex flex-col items-center justify-center flex-1 h-full bg-slate-50 text-slate-400 p-8">
                    <FileText className="w-16 h-16 text-slate-300 stroke-[1.5] mb-3" />
                    <p className="text-xs font-bold text-slate-500">Note-Only Deliverable</p>
                    <p className="text-[11px] text-slate-400 text-center mt-1 max-w-xs leading-normal">
                      This deliverable was saved with notes only. No file has been uploaded yet.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
