import React, { useState, useMemo, useEffect } from 'react';
import { parseAlignedCourses } from './AlignedCourseTable';
import { 
  BookOpen, 
  Users, 
  Layers, 
  TrendingUp, 
  Percent, 
  Award, 
  GraduationCap, 
  Calendar, 
  Filter, 
  Search, 
  Download, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  PieChart as PieIcon, 
  BarChart2, 
  Activity, 
  Info, 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  Building2,
  Target,
  Sparkles,
  FileSearch,
  FileCheck,
  Globe,
  X,
  Columns,
  ChevronDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import MCCourseDetails from './MCCourseDetails';

interface CourseInsightsDashboardProps {
  courseData: any[];
  mcBatchData: any[];
  expensesData?: any[];
  programNameData?: any[];
  courseOfferData?: any[];
  documentsData?: any[];
  workflowData?: any[];
  employeesData?: any[];
  onCourseSave?: (formData: any, editingRow: any | null) => Promise<void>;
  onSaveBatch?: (formData: any, editingRow: any | null) => Promise<void>;
  onSaveDocument?: (formData: any, editingRow: any | null) => Promise<void>;
  onSaveExpense?: (formData: any, editingRow: any | null) => Promise<void>;
  onViewFile?: (url: string, title: string, doc?: any) => void;
  batchHeaders?: string[];
  documentHeaders?: string[];
  expensesHeaders?: string[];
  courseOfferHeaders?: string[];
  programNameHeaders?: string[];
  onSelectBatch?: (batch: any) => void;
}

// Helper to parse dates robustly
const parseDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (!str) return null;

  // Standard formats: YYYY-MM-DD
  const matchYmd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (matchYmd) {
    return new Date(parseInt(matchYmd[1], 10), parseInt(matchYmd[2], 10) - 1, parseInt(matchYmd[3], 10));
  }
  // DD-MM-YYYY
  const matchDmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (matchDmy) {
    return new Date(parseInt(matchDmy[3], 10), parseInt(matchDmy[2], 10) - 1, parseInt(matchDmy[1], 10));
  }
  // Fallback to Date.parse
  const ts = Date.parse(str);
  if (!isNaN(ts)) {
    return new Date(ts);
  }
  return null;
};

const formatDateToMmmDdYyyy = (dateVal: any): string => {
  if (!dateVal) return "—";
  const str = String(dateVal).trim();
  if (!str || str === "—") return "—";
  const dateObj = parseDate(str);
  if (!dateObj || isNaN(dateObj.getTime())) {
    return str;
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mmm = months[dateObj.getMonth()];
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${mmm} ${dd}, ${yyyy}`;
};

// Helper to check exact match between an aligned course item and a target course
function isExactCourseMatch(
  p: { pId?: string; courseCode?: string; courseTitle?: string },
  targetPid: string,
  targetCode: string,
  targetTitle: string
): boolean {
  const pPid = String(p.pId || "").trim().toLowerCase();
  const pCode = String(p.courseCode || "").trim().toLowerCase();
  const pTitle = String(p.courseTitle || "").trim().toLowerCase();

  const tPid = String(targetPid || "").trim().toLowerCase();
  const tCode = String(targetCode || "").trim().toLowerCase();
  const tTitle = String(targetTitle || "").trim().toLowerCase();

  if (!pCode && !pTitle) return false;

  const pidMatches = pPid ? (pPid === tPid) : true;
  if (!pidMatches) return false;

  const codeMatches = pCode ? (tCode === pCode) : true;
  const titleMatches = pTitle ? (tTitle === pTitle) : true;

  return codeMatches && titleMatches;
}

export default function CourseInsightsDashboard({
  courseData = [],
  mcBatchData = [],
  expensesData = [],
  programNameData = [],
  courseOfferData = [],
  documentsData = [],
  workflowData = [],
  employeesData = [],
  onCourseSave = async () => {},
  onSaveBatch = async () => {},
  onSaveDocument = async () => {},
  onSaveExpense = async () => {},
  onViewFile = () => {},
  batchHeaders = [],
  documentHeaders = [],
  expensesHeaders = [],
  courseOfferHeaders = [],
  programNameHeaders = [],
  onSelectBatch
}: CourseInsightsDashboardProps) {
  // MC Course Popup State
  const [selectedMCCourseForDetails, setSelectedMCCourseForDetails] = useState<any | null>(null);

  // Global Filters State
  const [periodFilter, setPeriodFilter] = useState<'all' | 'this_month' | 'this_quarter' | 'this_year' | 'last_year' | 'custom'>('all');
  const [customStartMonth, setCustomStartMonth] = useState<string>('2026-01');
  const [customEndMonth, setCustomEndMonth] = useState<string>('2026-12');
  const [facultyFilter, setFacultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');

  // Interactive Metric State for 12-Month Trend Chart
  const [selectedMetric, setSelectedMetric] = useState<'coursesCount' | 'batchesCount' | 'enrolled' | 'occupancyRate' | 'avgFee'>('coursesCount');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  // Table State
  const [activeTableTab, setActiveTableTab] = useState<'courseList' | 'programAligned'>('courseList');
  const [selectedFacultyForAnalysis, setSelectedFacultyForAnalysis] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardFilter, setSelectedCardFilter] = useState<'all' | 'under_review' | 'ready_to_publish' | 'published' | 'active'>('all');
  const [sortField, setSortField] = useState<string>('enrolled');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Program & Course Alignment Interaction State
  const [selectedProgram, setSelectedProgram] = useState<{ pid: string; shortName: string } | null>(null);
  const [selectedProgramCourse, setSelectedProgramCourse] = useState<{ courseCode: string; courseTitle: string; credit: string; isAligned: boolean } | null>(null);
  const [programCourseQuery, setProgramCourseQuery] = useState('');
  const [mcCourseQuery, setMcCourseQuery] = useState('');
  const [expandedProgramPid, setExpandedProgramPid] = useState<string | null>(null);
  const [expandedProgramView, setExpandedProgramView] = useState<'details' | 'running' | 'completed' | 'upcoming' | null>(null);
  const [expandedCourseCode, setExpandedCourseCode] = useState<string | null>(null);

  // Sidebar Layout States
  const [expandedFaculties, setExpandedFaculties] = useState<Record<string, boolean>>({});
  const [sidebarProgramQuery, setSidebarProgramQuery] = useState('');

  // 1. EXTRACT ALL FACULTIES
  const faculties = useMemo(() => {
    const list = new Set<string>();
    programNameData.forEach(p => {
      if (p["Faculty"]) list.add(String(p["Faculty"]).trim());
    });
    return Array.from(list).sort();
  }, [programNameData]);

  // 2. HELPER TO MATCH FACULTY & DEPARTMENT FOR EACH COURSE
  const getCourseFacultyAndDept = useMemo(() => {
    const cache: Record<string, { faculty: string; department: string }> = {};

    return (courseCode: string): { faculty: string; department: string } => {
      const codeClean = String(courseCode).trim().toLowerCase();
      if (cache[codeClean]) return cache[codeClean];

      let faculty = 'Other Faculty';
      let department = 'Other Department';

      const offer = courseOfferData.find(o => 
        String(o["Course Code"]).trim().toLowerCase() === codeClean
      );
      const pid = offer ? offer["P-ID"] || offer["PID"] : null;

      if (pid) {
        const prog = programNameData.find(p => 
          String(p["PID"]).trim().toLowerCase() === String(pid).trim().toLowerCase()
        );
        if (prog) {
          faculty = prog["Faculty"] || 'Other Faculty';
          department = prog["Department Name"] || 'Other Department';
        }
      }

      const result = { faculty, department };
      cache[codeClean] = result;
      return result;
    };
  }, [courseOfferData, programNameData]);

  // 3. DATE COMPARISON UTILITY FOR PERIOD FILTERS
  const isDateInPeriod = (date: Date, period: typeof periodFilter, startStr?: string, endStr?: string): boolean => {
    const now = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();

    if (period === 'all') return true;

    if (period === 'this_month') {
      return year === now.getFullYear() && month === now.getMonth();
    }

    if (period === 'this_quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const dateQuarter = Math.floor(month / 3);
      return year === now.getFullYear() && dateQuarter === currentQuarter;
    }

    if (period === 'this_year') {
      return year === now.getFullYear();
    }

    if (period === 'last_year') {
      return year === now.getFullYear() - 1;
    }

    if (period === 'custom' && startStr && endStr) {
      const [startYear, startMonth] = startStr.split('-').map(Number);
      const [endYear, endMonth] = endStr.split('-').map(Number);
      const startDate = new Date(startYear, startMonth - 1, 1);
      const endDate = new Date(endYear, endMonth, 0, 23, 59, 59);
      return date >= startDate && date <= endDate;
    }

    return true;
  };

  // 4. MAIN COMPILED COURSE INSIGHTS DATA
  const compiledData = useMemo(() => {
    return courseData.map(course => {
      const code = String(course["Course Code"] || course["id"] || "").trim();
      const title = String(course["Course Title"] || course["Course Name"] || "Unnamed Course").trim();
      const mode = String(course["Mode"] || "Offline").trim();
      const duration = String(course["Duration"] || "-").trim();
      const credit = String(course["Credit"] || course["credit"] || "-").trim();
      const classesCount = String(course["Class"] || "-").trim();
      const industryExpert = String(course["Industry Expert"] || course["Industry Expart"] || "-").trim();
      const industryDemand = String(course["Industry Demand"] || "-").trim();
      
      const { faculty, department } = getCourseFacultyAndDept(code);
      const fee = parseFloat(String(course["Course Fee"] || "0").replace(/[^0-9.]/g, "")) || 0;
      
      const courseRawDate = course["Date"] || course["Start Date"] || "";
      const courseDateObj = parseDate(courseRawDate);

      // Match batches for this course
      const courseBatches = mcBatchData.filter(b => {
        const batchCode = String(b['Course Code'] || b['courseCode'] || '').trim().toLowerCase();
        const batchCourseTitle = String(b['Course Name'] || b['Course Title'] || '').trim().toLowerCase();
        return batchCode === code.toLowerCase() || batchCourseTitle === title.toLowerCase();
      });

      // Filter batches by period
      const filteredBatches = courseBatches.filter(b => {
        const batchStart = b["Start Date"] || b["startDate"] || "";
        const batchDateObj = parseDate(batchStart) || courseDateObj;
        if (!batchDateObj) return true;
        return isDateInPeriod(batchDateObj, periodFilter, customStartMonth, customEndMonth);
      });

      // Calculate enrollments and capacity
      const enrolled = filteredBatches.reduce((sum, b) => {
        const s = parseInt(String(b["Student"] || b["Students"] || "0").replace(/[^0-9.]/g, ""), 10);
        return sum + (isNaN(s) ? 0 : s);
      }, 0);

      const defaultSize = parseInt(String(course["Student Size"] || "40").replace(/[^0-9.]/g, ""), 10) || 40;
      const capacity = defaultSize * Math.max(1, filteredBatches.length);
      const occupancyRate = capacity > 0 ? Math.min(100, (enrolled / capacity) * 100) : 0;

      const grossRevenue = fee * enrolled;

      const isValidAlignedValue = (val: any): boolean => {
        if (val === null || val === undefined) return false;
        if (Array.isArray(val)) {
          return val.length > 0;
        }
        const str = String(val).trim().toLowerCase();
        if (
          str === "" ||
          str === "-" ||
          str === "n/a" ||
          str === "none" ||
          str === "null" ||
          str === "undefined" ||
          str === "[]" ||
          str === "[ ]" ||
          str === "[\"\"]" ||
          str === "['']"
        ) {
          return false;
        }
        if (str.startsWith("[") && str.endsWith("]")) {
          const inner = str.slice(1, -1).trim();
          if (inner === "" || inner === '""' || inner === "''") return false;
          try {
            const parsed = JSON.parse(str.replace(/'/g, '"'));
            if (Array.isArray(parsed) && parsed.length === 0) return false;
          } catch {
            if (str.replace(/\s+/g, '') === "[]") return false;
          }
        }
        return true;
      };

      let alignedCourseVal: any =
        course["Aligned Course name"] ||
        course["Aligned Course Name"] ||
        course["Aligned Course"] ||
        course["Aligned Course Title"] ||
        course["Aligned Course Code"] ||
        course["Aligned Course ID"] ||
        course["Aligned_Course"] ||
        course["Aligned Program"] ||
        course["Program Aligned"] ||
        course["Aligned_Program"] || "";

      if (!isValidAlignedValue(alignedCourseVal)) {
        alignedCourseVal = null;
        Object.keys(course).forEach(k => {
          if (!alignedCourseVal) {
            const kl = k.toLowerCase();
            if (kl.includes("aligned")) {
              const val = course[k];
              if (isValidAlignedValue(val)) {
                alignedCourseVal = val;
              }
            }
          }
        });
      }

      const parsedAligned = parseAlignedCourses(alignedCourseVal, courseOfferData);
      const isProgramAligned = parsedAligned.length > 0;

      const rawActivityStatus = String(course["Activity Status"] || course["Activity_Status"] || "").trim();
      const rawStatus = String(course["Status"] || "").trim().toLowerCase();
      let status: 'Active' | 'Completed' | 'Upcoming' = 'Active';
      if (rawStatus.includes('complete') || rawStatus.includes('done') || rawStatus.includes('finished')) {
        status = 'Completed';
      } else if (rawStatus.includes('upcom') || rawStatus.includes('draft') || rawStatus.includes('propos')) {
        status = 'Upcoming';
      }

      const publishedStatus = String(
        course["Publication Status"] ||
        course["Publication_Status"] ||
        course["Published Status"] ||
        course["Published_Status"] ||
        course["Publish Status"] ||
        course["PublishedStatus"] ||
        course["Published"] ||
        course["Status"] ||
        "-"
      ).trim();

      return {
        code,
        title,
        faculty,
        department,
        fee,
        mode,
        duration,
        classesCount,
        studentSize: defaultSize,
        batchesCount: filteredBatches.length,
        enrolled,
        capacity,
        occupancyRate,
        grossRevenue,
        status,
        activityStatus: rawActivityStatus,
        publishedStatus,
        isProgramAligned,
        industryExpert,
        industryDemand,
        dateObj: courseDateObj,
        hasHistoryInPeriod: filteredBatches.length > 0,
        batches: filteredBatches
      };
    }).filter(c => {
      if (facultyFilter !== 'all' && c.faculty !== facultyFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (modeFilter !== 'all' && c.mode.toLowerCase() !== modeFilter.toLowerCase()) return false;
      if (periodFilter !== 'all' && !c.hasHistoryInPeriod) {
        if (c.dateObj && isDateInPeriod(c.dateObj, periodFilter, customStartMonth, customEndMonth)) {
          return true;
        }
        return false;
      }
      return true;
    });
  }, [courseData, mcBatchData, periodFilter, customStartMonth, customEndMonth, facultyFilter, statusFilter, modeFilter, getCourseFacultyAndDept]);

  // Selector to find all Program Courses and MC Aligned Courses for selected program
  const programCoursesAndMCList = useMemo(() => {
    if (!selectedProgram) {
      return { programCourses: [], mcCoursesGrouped: [] };
    }

    const pidLower = selectedProgram.pid.toLowerCase().trim();

    // Find all MC courses and extract their parsed aligned details matching our program PID
    const mcCoursesGrouped: Array<{
      code: string;
      title: string;
      credit: string;
      duration: string;
      fee: number;
      alignedItems: Array<{ courseCode: string; courseTitle: string }>;
      parsedAligned: any[];
    }> = [];

    compiledData.forEach(mc => {
      const origCourse = courseData.find(c => String(c["Course Code"] || c["id"] || "").trim() === mc.code);
      const rawAligned = origCourse 
        ? (origCourse["Aligned Course name"] ||
           origCourse["Aligned Course Name"] ||
           origCourse["Aligned Course"] ||
           origCourse["Aligned Course Title"] ||
           origCourse["Aligned Course Code"] ||
           origCourse["Aligned Course ID"] ||
           origCourse["Aligned_Course"] ||
           origCourse["Aligned Program"] ||
           origCourse["Program Aligned"] ||
           origCourse["Aligned_Program"] || "")
        : "";

      if (!rawAligned) return;

      const parsed = parseAlignedCourses(rawAligned, courseOfferData);
      if (parsed.length === 0) return;
      
      // Determine if this MC Course aligns to any course within the selected program
      const alignedToSelectedProgram = courseOfferData.filter(row => {
        const rowPid = String(row["P-ID"] || row["PID"] || "").trim().toLowerCase();
        if (rowPid !== pidLower) return false;
        
        const rowCode = String(row["Course Code"] || "").trim().toLowerCase();
        const rowTitle = String(row["Course Title"] || "").trim().toLowerCase();

        // Match strictly through Aligned Courses parsed array
        return parsed.some(p => isExactCourseMatch(p, pidLower, rowCode, rowTitle));
      });

      const hasDirectCourseAlignment = parsed.some(p => {
        const pPid = p.pId ? p.pId.toLowerCase().trim() : "";
        const pCode = String(p.courseCode || "").trim();
        const pTitle = String(p.courseTitle || "").trim();
        return (pPid === pidLower) && (pCode !== "" || pTitle !== "");
      });

      if (alignedToSelectedProgram.length > 0 || hasDirectCourseAlignment) {
        const alignedItems: Array<{ courseCode: string; courseTitle: string }> = [];
        
        alignedToSelectedProgram.forEach(o => {
          const oCode = String(o["Course Code"] || "").trim();
          const oTitle = String(o["Course Title"] || "").trim();
          const alreadyHas = alignedItems.some(item => 
            (oCode && item.courseCode.toLowerCase() === oCode.toLowerCase()) ||
            (oTitle && item.courseTitle.toLowerCase() === oTitle.toLowerCase())
          );
          if (!alreadyHas) {
            alignedItems.push({
              courseCode: oCode,
              courseTitle: oTitle
            });
          }
        });

        // Also add direct parsed items that match this program PID to alignedItems
        parsed.forEach(p => {
          const pPid = p.pId ? p.pId.toLowerCase().trim() : "";
          if (pPid === pidLower) {
            const pCode = String(p.courseCode || "").trim();
            const pTitle = String(p.courseTitle || "").trim();
            if (pCode || pTitle) {
              const alreadyHas = alignedItems.some(item => 
                (pCode && item.courseCode.toLowerCase() === pCode.toLowerCase()) ||
                (pTitle && item.courseTitle.toLowerCase() === pTitle.toLowerCase())
              );
              if (!alreadyHas) {
                alignedItems.push({
                  courseCode: pCode,
                  courseTitle: pTitle
                });
              }
            }
          }
        });

        const origCourse = courseData.find(c => String(c["Course Code"] || c["id"] || "").trim() === mc.code);
        const credit = origCourse ? String(origCourse["Credit"] || origCourse["credit"] || "—").trim() : (mc.credit || "—");

        mcCoursesGrouped.push({
          code: mc.code,
          title: mc.title,
          credit: credit || "—",
          duration: mc.duration || "—",
          fee: mc.fee,
          alignedItems,
          parsedAligned: parsed
        });
      }
    });

    // Collect all program courses from courseOfferData for this program
    const programCourses: Array<{ courseCode: string; courseTitle: string; credit: string; isAligned: boolean }> = [];
    const seenCode = new Set<string>();

    courseOfferData.forEach(row => {
      const pid = String(
        row["P-ID"] || 
        row["PID"] || 
        row["P-Id"] || 
        row["p-id"] || 
        row["Program ID"] || 
        row["Program Code"] || 
        row["ProgramID"] || 
        row["ProgramCode"] || 
        ""
      ).trim().toLowerCase();
      if (pid === pidLower) {
        const courseCode = String(row["Course Code"] || row["course code"] || row["Course ID"] || row["course id"] || "").trim();
        const courseTitle = String(row["Course Title"] || row["course title"] || row["Course Name"] || row["course name"] || "").trim();
        const credit = String(row["Credit"] || row["credit"] || "").trim();

        if (!courseCode && !courseTitle) return;

        const key = `${courseCode.toLowerCase()}_${courseTitle.toLowerCase()}`;
        if (!seenCode.has(key)) {
          seenCode.add(key);
          
          const isAligned = mcCoursesGrouped.some(mc => 
            mc.parsedAligned.some(p => isExactCourseMatch(p, pidLower, courseCode, courseTitle))
          );

          programCourses.push({
            courseCode,
            courseTitle,
            credit,
            isAligned
          });
        }
      }
    });

    // Aligned Courses must be at the very top of the table
    programCourses.sort((a, b) => {
      if (a.isAligned && !b.isAligned) return -1;
      if (!a.isAligned && b.isAligned) return 1;
      return 0;
    });

    return {
      programCourses,
      mcCoursesGrouped
    };
  }, [selectedProgram, compiledData, courseData, courseOfferData]);

  // Aggregate data for ProgramWiseAnalysisModal
  const aggregatedProgramData = useMemo(() => {
    return programNameData.map(p => {
      const pid = String(p["PID"] || p["P-ID"] || "").trim().toLowerCase();
      const programName = String(p["Program Short Name"] || p["Program Name"] || "Unnamed Program").trim();

      // Find all courses for this program (from courseOfferData)
      const programOfferCourses = courseOfferData.filter(row => 
        String(row["P-ID"] || row["PID"] || "").trim().toLowerCase() === pid
      );
      
      const uniqueCourseKeys = new Set<string>();
      programOfferCourses.forEach(row => {
         const code = String(row["Course Code"] || "").trim().toLowerCase();
         const title = String(row["Course Title"] || "").trim().toLowerCase();
         if(code || title) uniqueCourseKeys.add(`${code}_${title}`);
      });

      // Find MC courses aligned to this program
      const alignedMCCourses = compiledData.filter(mc => {
        const origCourse = courseData.find(c => String(c["Course Code"] || c["id"] || "").trim() === mc.code);
        const rawAligned = origCourse 
          ? (origCourse["Aligned Course name"] ||
             origCourse["Aligned Course Name"] ||
             origCourse["Aligned Course"] ||
             origCourse["Aligned Course Title"] ||
             origCourse["Aligned Course Code"] ||
             origCourse["Aligned Course ID"] ||
             origCourse["Aligned_Course"] ||
             origCourse["Aligned Program"] ||
             origCourse["Program Aligned"] ||
             origCourse["Aligned_Program"] || "")
          : "";

        if (!rawAligned) return false;

        const parsed = parseAlignedCourses(rawAligned, courseOfferData);
        
        return parsed.some(p => {
          return programOfferCourses.some(row => {
            const rowCode = String(row["Course Code"] || "").trim().toLowerCase();
            const rowTitle = String(row["Course Title"] || "").trim().toLowerCase();
            return isExactCourseMatch(p, pid, rowCode, rowTitle);
          });
        });
      });

      // Count unique departmental courses that are aligned to at least one MC course
      const alignedDepartmentalCourseKeys = new Set<string>();
      programOfferCourses.forEach(row => {
        const rowCode = String(row["Course Code"] || "").trim().toLowerCase();
        const rowTitle = String(row["Course Title"] || "").trim().toLowerCase();
        if (!rowCode && !rowTitle) return;

        const key = `${rowCode}_${rowTitle}`;

        const isAligned = alignedMCCourses.some(mc => {
          const origCourse = courseData.find(c => String(c["Course Code"] || c["id"] || "").trim() === mc.code);
          const rawAligned = origCourse 
            ? (origCourse["Aligned Course name"] ||
               origCourse["Aligned Course Name"] ||
               origCourse["Aligned Course"] ||
               origCourse["Aligned Course Title"] ||
               origCourse["Aligned Course Code"] ||
               origCourse["Aligned Course ID"] ||
               origCourse["Aligned_Course"] ||
               origCourse["Aligned Program"] ||
               origCourse["Program Aligned"] ||
               origCourse["Aligned_Program"] || "")
            : "";

          if (!rawAligned) return false;

          const parsed = parseAlignedCourses(rawAligned, courseOfferData);

          return parsed.some(p => isExactCourseMatch(p, pid, rowCode, rowTitle));
        });

        if (isAligned) {
          alignedDepartmentalCourseKeys.add(key);
        }
      });

      const runningBatchesList: any[] = [];
      const completedBatchesList: any[] = [];
      const upcomingBatchesList: any[] = [];

      alignedMCCourses.forEach(mc => {
        mc.batches.forEach(b => {
          const startStr = b["Start Date"] || b["startDate"] || "";
          const endStr = b["End Date"] || b["endDate"] || "";
          const startDate = parseDate(startStr);
          const endDate = parseDate(endStr);
          const today = new Date();

          const batchWithMc = {
            ...b,
            mcCode: mc.code,
            mcTitle: mc.title
          };

          if (startDate && startDate > today) {
            upcomingBatchesList.push(batchWithMc);
          } else if (endDate && endDate < today) {
            completedBatchesList.push(batchWithMc);
          } else {
            runningBatchesList.push(batchWithMc);
          }
        });
      });

      const faculty = String(p["Faculty"] || "").trim() || "Other Faculty";
      
      return {
        pid,
        programName,
        faculty,
        uniqueCoursesCount: uniqueCourseKeys.size,
        alignedMCCoursesCount: alignedDepartmentalCourseKeys.size,
        runningBatches: runningBatchesList.length,
        completedBatches: completedBatchesList.length,
        upcomingBatches: upcomingBatchesList.length,
        runningBatchesList,
        completedBatchesList,
        upcomingBatchesList
      };
    });
  }, [programNameData, courseOfferData, compiledData]);

  // Filtered aggregated program data by selected faculty
  const filteredAggregatedProgramData = useMemo(() => {
    if (selectedFacultyForAnalysis === 'all') return aggregatedProgramData;
    return aggregatedProgramData.filter(p => p.faculty.toLowerCase() === selectedFacultyForAnalysis.toLowerCase());
  }, [aggregatedProgramData, selectedFacultyForAnalysis]);
  // Filtered list of MC Courses based on clicked course in program course table
  const displayedMCCourses = useMemo(() => {
    const { mcCoursesGrouped } = programCoursesAndMCList;
    if (!selectedProgramCourse) {
      return mcCoursesGrouped;
    }
    
    const selCode = selectedProgramCourse.courseCode.toLowerCase().trim();
    const selTitle = selectedProgramCourse.courseTitle.toLowerCase().trim();
    const pidLower = selectedProgram ? selectedProgram.pid.toLowerCase().trim() : "";

    return mcCoursesGrouped.filter(mc => 
      mc.parsedAligned?.some(p => isExactCourseMatch(p, pidLower, selCode, selTitle))
    );
  }, [programCoursesAndMCList, selectedProgramCourse, selectedProgram]);

  // Search-filtered list of program courses inside Program Details modal
  const filteredProgramCourses = useMemo(() => {
    const list = programCoursesAndMCList.programCourses;
    if (!programCourseQuery.trim()) return list;
    const q = programCourseQuery.toLowerCase().trim();
    return list.filter(pc => 
      (pc.courseCode && pc.courseCode.toLowerCase().includes(q)) || 
      (pc.courseTitle && pc.courseTitle.toLowerCase().includes(q))
    );
  }, [programCoursesAndMCList.programCourses, programCourseQuery]);

  // Search-filtered list of MC courses inside Program Details modal
  const filteredMCCourses = useMemo(() => {
    const list = displayedMCCourses;
    if (!mcCourseQuery.trim()) return list;
    const q = mcCourseQuery.toLowerCase().trim();
    return list.filter(mc => 
      (mc.code && mc.code.toLowerCase().includes(q)) || 
      (mc.title && mc.title.toLowerCase().includes(q))
    );
  }, [displayedMCCourses, mcCourseQuery]);

  // 5. TOTAL METRICS FOR CARDS
  const totals = useMemo(() => {
    let totalCourses = compiledData.length;
    let activeCourses = 0;
    let completedCourses = 0;
    let upcomingCourses = 0;
    let activeCoursesWithBatchesCount = 0;
    let programAlignedCourses = 0;
    let totalBatches = 0;
    let completedBatches = 0;
    let runningBatches = 0;
    let upcomingBatches = 0;
    let totalEnrolled = 0;
    let totalCapacity = 0;
    let totalFeeSum = 0;

    let underReviewCourses = 0;
    let readyToPublishCourses = 0;
    let publishedCourses = 0;

    const modeCounts: Record<string, number> = { Online: 0, Offline: 0, Hybrid: 0, Other: 0 };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    compiledData.forEach(c => {
      if (c.status === 'Active') activeCourses++;
      else if (c.status === 'Completed') completedCourses++;
      else if (c.status === 'Upcoming') upcomingCourses++;

      const pubStatus = (c.publishedStatus || "").trim().toLowerCase();
      if (pubStatus === "published") {
        publishedCourses++;
      } else if (pubStatus === "ready to publish" || pubStatus.includes("ready")) {
        readyToPublishCourses++;
      } else {
        underReviewCourses++;
      }

      totalBatches += c.batchesCount;
      totalEnrolled += c.enrolled;
      totalCapacity += c.capacity;
      totalFeeSum += c.fee;

      let hasActiveBatch = false;

      if (c.batches && Array.isArray(c.batches)) {
        c.batches.forEach((b: any) => {
          const startStr = b["Start Date"] || b["startDate"] || b["Start date"] || "";
          const endStr = b["End Date"] || b["endDate"] || b["End date"] || "";
          const startDate = parseDate(startStr);
          const endDate = parseDate(endStr);

          if (startDate && endDate) {
            if (startDate > todayEnd) {
              upcomingBatches++;
              hasActiveBatch = true;
            } else if (endDate < todayStart) {
              completedBatches++;
            } else {
              runningBatches++;
              hasActiveBatch = true;
            }
          } else if (startDate) {
            if (startDate > todayEnd) {
              upcomingBatches++;
              hasActiveBatch = true;
            } else {
              runningBatches++;
              hasActiveBatch = true;
            }
          } else if (endDate) {
            if (endDate < todayStart) {
              completedBatches++;
            } else {
              runningBatches++;
              hasActiveBatch = true;
            }
          } else {
            const bStatus = String(b["Status"] || b["status"] || "").toLowerCase();
            if (bStatus.includes("complete") || bStatus.includes("done") || bStatus.includes("finished")) {
              completedBatches++;
            } else if (bStatus.includes("upcom") || bStatus.includes("draft")) {
              upcomingBatches++;
              hasActiveBatch = true;
            } else {
              runningBatches++;
              hasActiveBatch = true;
            }
          }
        });
      }

      if (hasActiveBatch) {
        activeCoursesWithBatchesCount++;
      }

      if (c.isProgramAligned) {
        programAlignedCourses++;
      }

      const m = c.mode.toLowerCase();
      if (m.includes('online')) modeCounts.Online++;
      else if (m.includes('offline')) modeCounts.Offline++;
      else if (m.includes('hybrid')) modeCounts.Hybrid++;
      else modeCounts.Other++;
    });

    const avgOccupancyRate = totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0;
    const avgFee = totalCourses > 0 ? totalFeeSum / totalCourses : 0;
    const avgStudentsPerBatch = totalBatches > 0 ? totalEnrolled / totalBatches : 0;

    return {
      totalCourses,
      activeCourses,
      completedCourses,
      upcomingCourses,
      activeCoursesWithBatchesCount,
      programAlignedCourses,
      totalBatches,
      completedBatches,
      runningBatches,
      upcomingBatches,
      totalEnrolled,
      totalCapacity,
      avgOccupancyRate,
      avgFee,
      avgStudentsPerBatch,
      modeCounts,
      underReviewCourses,
      readyToPublishCourses,
      publishedCourses
    };
  }, [compiledData]);

  // 6. 12-MONTH TREND DATA
  const yearlyTrendData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const map: Record<string, { label: string; monthKey: string; coursesCount: number; batchesCount: number; enrolled: number; totalCapacity: number; feeSum: number }> = {};

    for (let m = 0; m < 12; m++) {
      const monthKey = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
      const label = `${monthNames[m]} ${selectedYear}`;
      map[monthKey] = {
        label,
        monthKey,
        coursesCount: 0,
        batchesCount: 0,
        enrolled: 0,
        totalCapacity: 0,
        feeSum: 0
      };
    }

    compiledData.forEach(course => {
      const code = course.code;
      const fee = course.fee;

      const courseBatches = mcBatchData.filter(b => {
        const batchCode = String(b['Course Code'] || b['courseCode'] || '').trim().toLowerCase();
        return batchCode === code.toLowerCase();
      });

      const processedMonths = new Set<string>();

      courseBatches.forEach(b => {
        const startDateStr = b["Start Date"] || b["startDate"] || "";
        const dateObj = parseDate(startDateStr) || course.dateObj;
        if (!dateObj || dateObj.getFullYear() !== selectedYear) return;

        const monthIdx = dateObj.getMonth();
        const monthKey = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}`;

        if (map[monthKey]) {
          const s = parseInt(String(b["Student"] || b["Students"] || "0").replace(/[^0-9.]/g, ""), 10) || 0;
          const defaultSize = parseInt(String(course["Student Size"] || "40").replace(/[^0-9.]/g, ""), 10) || 40;

          map[monthKey].batchesCount += 1;
          map[monthKey].enrolled += s;
          map[monthKey].totalCapacity += defaultSize;
          map[monthKey].feeSum += fee;

          if (!processedMonths.has(monthKey)) {
            map[monthKey].coursesCount += 1;
            processedMonths.add(monthKey);
          }
        }
      });
    });

    return Object.values(map).map(m => {
      const occupancyRate = m.totalCapacity > 0 ? (m.enrolled / m.totalCapacity) * 100 : 0;
      const avgFee = m.coursesCount > 0 ? m.feeSum / m.coursesCount : 0;
      return {
        label: m.label,
        monthKey: m.monthKey,
        coursesCount: m.coursesCount,
        batchesCount: m.batchesCount,
        enrolled: m.enrolled,
        occupancyRate: Number(occupancyRate.toFixed(1)),
        avgFee: Math.round(avgFee)
      };
    });
  }, [compiledData, mcBatchData, selectedYear]);

  // 7. FACULTY-WISE PROGRAMS WITH ALIGNED COURSES COUNT (Optimized matching AlignedCourseTable)
  const facultyProgramsMap = useMemo(() => {
    // Pre-index course offers by code and title for fast lookup of offers matching code/title
    const offerMatchesMap = new Map<string, string[]>(); // key: code_or_title -> array of PIDs
    courseOfferData.forEach(o => {
      const oCode = String(o["Course Code"] || o["Course ID"] || "").trim().toLowerCase();
      const oTitle = String(o["Course Title"] || o["Course Name"] || "").trim().toLowerCase();
      const oPid = String(o["P-ID"] || o["PID"] || "").trim();
      if (oPid) {
        if (oCode) {
          if (!offerMatchesMap.has(oCode)) offerMatchesMap.set(oCode, []);
          offerMatchesMap.get(oCode)!.push(oPid);
        }
        if (oTitle) {
          if (!offerMatchesMap.has(oTitle)) offerMatchesMap.set(oTitle, []);
          offerMatchesMap.get(oTitle)!.push(oPid);
        }
      }
    });

    // Count matching courses per PID (mirroring AlignedCourseTable expansion)
    const pidCountMap = new Map<string, number>();

    courseData.forEach(course => {
      const rawAligned = 
        course["Aligned Course name"] ||
        course["Aligned Course Name"] ||
        course["Aligned Course"] ||
        course["Aligned Course Title"] ||
        course["Aligned Course Code"] ||
        course["Aligned Course ID"] ||
        course["Aligned_Course"] ||
        course["Aligned Program"] ||
        course["Program Aligned"] ||
        course["Aligned_Program"] || "";

      if (!rawAligned) return;

      const rawItems = parseAlignedCourses(rawAligned, courseOfferData);
      const coursePids = new Set<string>();

      for (const item of rawItems) {
        const targetCode = String(item.courseCode || "").trim().toLowerCase();
        const targetTitle = String(item.courseTitle || "").trim().toLowerCase();

        if (!targetCode && !targetTitle) continue;

        if (item.pId) {
          coursePids.add(item.pId.toLowerCase());
        } else {
          const targetCode = String(item.courseCode || "").trim().toLowerCase();
          const targetTitle = String(item.courseTitle || "").trim().toLowerCase();

          // Check matches in courseOfferData
          courseOfferData.forEach(row => {
            if (!row) return;
            const code = String(row["Course Code"] || row["course code"] || "").trim().toLowerCase();
            const title = String(row["Course Title"] || row["course title"] || "").trim().toLowerCase();
            const pId = String(row["P-ID"] || row["PID"] || row["P-Id"] || row["p-id"] || "").trim();

            if (pId && ((targetCode && code && targetCode === code) || (targetTitle && title && targetTitle === title))) {
              coursePids.add(pId.toLowerCase());
            }
          });
        }
      }

      coursePids.forEach(pidKey => {
        pidCountMap.set(pidKey, (pidCountMap.get(pidKey) || 0) + 1);
      });
    });

    const map: Record<string, Array<{ pid: string; shortName: string; alignedCount: number }>> = {};

    faculties.forEach(f => {
      map[f] = [];
    });

    programNameData.forEach(p => {
      const faculty = String(p["Faculty"] || "Other Faculty").trim();
      const pid = String(p["PID"] || p["P-ID"] || "").trim();
      const shortName = String(p["Program Short Name"] || p["Program Name"] || p["Program Full Name"] || "Unnamed Program").trim();

      if (!map[faculty]) {
        map[faculty] = [];
      }

      const alignedCount = pid ? (pidCountMap.get(pid.toLowerCase()) || 0) : 0;

      map[faculty].push({
        pid,
        shortName,
        alignedCount
      });
    });

    return map;
  }, [programNameData, courseData, courseOfferData, faculties]);

  // 7.1 FLAT PROGRAMS LIST FOR SIDEBAR (NO COLLAPSE)
  const flatPrograms = useMemo(() => {
    const list: Array<{ pid: string; shortName: string; alignedCount: number; faculty: string }> = [];
    faculties.forEach(faculty => {
      const progs = facultyProgramsMap[faculty] || [];
      progs.forEach(prog => {
        list.push({
          pid: prog.pid,
          shortName: prog.shortName,
          alignedCount: prog.alignedCount,
          faculty
        });
      });
    });
    return list.sort((a, b) => a.pid.localeCompare(b.pid));
  }, [faculties, facultyProgramsMap]);

  const filteredFlatPrograms = useMemo(() => {
    if (!sidebarProgramQuery.trim()) return flatPrograms;
    const q = sidebarProgramQuery.toLowerCase().trim();
    return flatPrograms.filter(p => 
      p.pid.toLowerCase().includes(q) || 
      p.shortName.toLowerCase().includes(q) ||
      p.faculty.toLowerCase().includes(q)
    );
  }, [flatPrograms, sidebarProgramQuery]);

  // Auto-select first program when sidebar layout is active and selectedProgram is null
  useEffect(() => {
    if (!selectedProgram && flatPrograms.length > 0) {
      const firstProg = flatPrograms[0];
      setSelectedProgram({ pid: firstProg.pid, shortName: firstProg.shortName });
    }
  }, [flatPrograms, selectedProgram]);

  // 8. CHART DATA: COURSE STATUS & MODE BREAKDOWN
  const statusPieData = useMemo(() => {
    return [
      { name: 'Active', value: totals.activeCourses, color: '#0f766e' }, // Teal
      { name: 'Completed', value: totals.completedCourses, color: '#3b82f6' }, // Blue
      { name: 'Upcoming / Draft', value: totals.upcomingCourses, color: '#f59e0b' } // Amber
    ].filter(i => i.value > 0);
  }, [totals]);

  const modePieData = useMemo(() => {
    return [
      { name: 'Online', value: totals.modeCounts.Online, color: '#6366f1' }, // Indigo
      { name: 'Offline', value: totals.modeCounts.Offline, color: '#10b981' }, // Emerald
      { name: 'Hybrid', value: totals.modeCounts.Hybrid, color: '#ec4899' }, // Pink
      { name: 'Other', value: totals.modeCounts.Other, color: '#94a3b8' } // Slate
    ].filter(i => i.value > 0);
  }, [totals]);

  // 8. CHART DATA: TOP 10 COURSES BY ENROLLMENT
  const topCoursesByEnrollment = useMemo(() => {
    return [...compiledData]
      .sort((a, b) => b.enrolled - a.enrolled)
      .slice(0, 10)
      .map(c => ({
        code: c.code,
        title: c.title,
        'Enrolled Students': c.enrolled,
        'Batches': c.batchesCount,
        'Capacity': c.capacity
      }));
  }, [compiledData]);

  // 9. CHART DATA: FACULTY WISE COURSE & STUDENT BREAKDOWN
  const facultyChartData = useMemo(() => {
    const groups: Record<string, { faculty: string; 'Courses': number; 'Students': number; 'Batches': number }> = {};
    
    compiledData.forEach(c => {
      const f = c.faculty || 'Other Faculty';
      if (!groups[f]) {
        groups[f] = { faculty: f, 'Courses': 0, 'Students': 0, 'Batches': 0 };
      }
      groups[f]['Courses'] += 1;
      groups[f]['Students'] += c.enrolled;
      groups[f]['Batches'] += c.batchesCount;
    });

    return Object.values(groups).sort((a, b) => b['Students'] - a['Students']);
  }, [compiledData]);

  // 10. SEARCH, SORTING, AND PAGINATION FOR DETAILS TABLE
  const searchedAndSortedData = useMemo(() => {
    let result = [...compiledData];

    // Filter by top-level KPI metric cards
    if (selectedCardFilter === 'under_review') {
      result = result.filter(c => {
        const pubStatus = (c.publishedStatus || "").trim().toLowerCase();
        return pubStatus !== "published" && !pubStatus.includes("ready");
      });
    } else if (selectedCardFilter === 'ready_to_publish') {
      result = result.filter(c => {
        const pubStatus = (c.publishedStatus || "").trim().toLowerCase();
        return pubStatus === "ready to publish" || pubStatus.includes("ready");
      });
    } else if (selectedCardFilter === 'published') {
      result = result.filter(c => {
        const pubStatus = (c.publishedStatus || "").trim().toLowerCase();
        return pubStatus === "published";
      });
    } else if (selectedCardFilter === 'active') {
      result = result.filter(c => {
        let hasActiveBatch = false;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        if (c.batches && Array.isArray(c.batches)) {
          c.batches.forEach((b: any) => {
            const startStr = b["Start Date"] || b["startDate"] || b["Start date"] || "";
            const endStr = b["End Date"] || b["endDate"] || b["End date"] || "";
            const startDate = parseDate(startStr);
            const endDate = parseDate(endStr);

            if (startDate && endDate) {
              if (startDate > todayEnd) {
                hasActiveBatch = true;
              } else if (endDate < todayStart) {
                // completed
              } else {
                hasActiveBatch = true;
              }
            } else if (startDate) {
              if (startDate > todayEnd) {
                hasActiveBatch = true;
              } else {
                hasActiveBatch = true;
              }
            } else if (endDate) {
              if (endDate < todayStart) {
                // completed
              } else {
                hasActiveBatch = true;
              }
            } else {
              const bStatus = String(b["Status"] || b["status"] || "").toLowerCase();
              if (bStatus.includes("complete") || bStatus.includes("done") || bStatus.includes("finished")) {
                // completed
              } else if (bStatus.includes("upcom") || bStatus.includes("draft")) {
                hasActiveBatch = true;
              } else {
                hasActiveBatch = true;
              }
            }
          });
        }
        return hasActiveBatch;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(c => 
        c.code.toLowerCase().includes(query) ||
        c.title.toLowerCase().includes(query) ||
        c.faculty.toLowerCase().includes(query) ||
        c.department.toLowerCase().includes(query) ||
        c.mode.toLowerCase().includes(query) ||
        (c.publishedStatus && c.publishedStatus.toLowerCase().includes(query))
      );
    }

    result.sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' 
        ? (aValue || 0) - (bValue || 0) 
        : (bValue || 0) - (aValue || 0);
    });

    return result;
  }, [compiledData, selectedCardFilter, searchQuery, sortField, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return searchedAndSortedData.slice(start, start + itemsPerPage);
  }, [searchedAndSortedData, currentPage]);

  const totalPages = Math.ceil(searchedAndSortedData.length / itemsPerPage);

  const requestSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // 11. EXPORT TO CSV HANDLER
  const handleExportCSV = () => {
    const headersList = [
      "Course Code", "Course Title", "Faculty", "Department", "Mode", "Duration",
      "Activity Status", "Publication Status", "Batches", "Capacity", "Enrolled Students", "Occupancy Rate (%)", "Course Fee", "Industry Expert"
    ];

    const rows = compiledData.map(c => [
      `"${c.code}"`,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.faculty}"`,
      `"${c.department}"`,
      `"${c.mode}"`,
      `"${c.duration}"`,
      `"${c.status}"`,
      `"${c.publishedStatus}"`,
      c.batchesCount,
      c.capacity,
      c.enrolled,
      c.occupancyRate.toFixed(1),
      c.fee,
      `"${c.industryExpert.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headersList.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Course_Insights_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 12. PRINT EXECUTIVE REPORT HANDLER
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Course Insights & Performance Executive Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 30px; }
            h1 { font-size: 20px; font-weight: bold; margin-bottom: 5px; color: #0f766e; }
            .meta { font-size: 11px; color: #64748b; margin-bottom: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; }
            .card-title { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
            .card-val { font-size: 14px; font-weight: bold; color: #0f766e; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
            th { background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold; text-transform: uppercase; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Course Insights & Performance Executive Report</h1>
          <div class="meta">
            Period Filter: <strong>${periodFilter.toUpperCase()}</strong> &nbsp;|&nbsp; 
            Faculty Filter: <strong>${facultyFilter.toUpperCase()}</strong> &nbsp;|&nbsp; 
            Status Filter: <strong>${statusFilter.toUpperCase()}</strong> &nbsp;|&nbsp; 
            Generated on: ${new Date().toLocaleString()}
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Total Courses</div>
              <div class="card-val">${totals.totalCourses}</div>
            </div>
            <div class="card">
              <div class="card-title">Total Batches</div>
              <div class="card-val">${totals.totalBatches}</div>
            </div>
            <div class="card">
              <div class="card-title">Total Enrolled Students</div>
              <div class="card-val">${totals.totalEnrolled.toLocaleString()}</div>
            </div>
            <div class="card">
              <div class="card-title">Avg Occupancy Rate</div>
              <div class="card-val">${totals.avgOccupancyRate.toFixed(1)}%</div>
            </div>
          </div>

          <h2>Course Details Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Course Title</th>
                <th>Faculty</th>
                <th>Mode</th>
                <th>Status</th>
                <th class="text-right">Batches</th>
                <th class="text-right">Enrolled</th>
                <th class="text-right">Occupancy %</th>
                <th class="text-right">Fee</th>
              </tr>
            </thead>
            <tbody>
              ${compiledData.map(c => `
                <tr>
                  <td class="font-mono">${c.code}</td>
                  <td><strong>${c.title}</strong></td>
                  <td>${c.faculty}</td>
                  <td>${c.mode}</td>
                  <td>${c.status}</td>
                  <td class="text-right">${c.batchesCount}</td>
                  <td class="text-right font-mono">${c.enrolled}</td>
                  <td class="text-right font-mono">${c.occupancyRate.toFixed(1)}%</td>
                  <td class="text-right font-mono">৳ ${c.fee.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-2 w-full px-1 sm:px-2 py-1 custom-scrollbar">

      {/* TOP KPI METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Card 1: Total Courses */}
        <div 
          onClick={() => { setSelectedMetric('coursesCount'); setActiveTableTab('courseList'); setSelectedCardFilter('all'); setCurrentPage(1); }}
          className={cn(
            "bg-gradient-to-br from-teal-50/80 via-white to-teal-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            activeTableTab === 'courseList' && selectedCardFilter === 'all' ? "ring-2 ring-teal-600 border-teal-400 shadow-sm font-bold" : "border-teal-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-600 text-white rounded-lg shrink-0 shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-teal-900/70 uppercase tracking-wider block truncate">
                Total Courses
              </span>
              <span className="text-sm font-extrabold text-teal-950 font-mono block truncate">
                {totals.totalCourses}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Under Review */}
        <div 
          onClick={() => {
            setSelectedCardFilter(selectedCardFilter === 'under_review' ? 'all' : 'under_review');
            setActiveTableTab('courseList');
            setCurrentPage(1);
          }}
          className={cn(
            "bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            activeTableTab === 'courseList' && selectedCardFilter === 'under_review' ? "ring-2 ring-amber-600 border-amber-400 shadow-sm font-bold" : "border-amber-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 text-white rounded-lg shrink-0 shadow-xs">
              <FileSearch className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-amber-900/70 uppercase tracking-wider block truncate">
                Under Review
              </span>
              <span className="text-sm font-extrabold text-amber-950 font-mono block truncate">
                {totals.underReviewCourses}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Ready to Publish */}
        <div 
          onClick={() => {
            setSelectedCardFilter(selectedCardFilter === 'ready_to_publish' ? 'all' : 'ready_to_publish');
            setActiveTableTab('courseList');
            setCurrentPage(1);
          }}
          className={cn(
            "bg-gradient-to-br from-teal-50/80 via-white to-teal-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            activeTableTab === 'courseList' && selectedCardFilter === 'ready_to_publish' ? "ring-2 ring-teal-600 border-teal-400 shadow-sm font-bold" : "border-teal-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-600 text-white rounded-lg shrink-0 shadow-xs">
              <FileCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-teal-900/70 uppercase tracking-wider block truncate">
                Ready to Publish
              </span>
              <span className="text-sm font-extrabold text-teal-950 font-mono block truncate">
                {totals.readyToPublishCourses}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Published */}
        <div 
          onClick={() => {
            setSelectedCardFilter(selectedCardFilter === 'published' ? 'all' : 'published');
            setActiveTableTab('courseList');
            setCurrentPage(1);
          }}
          className={cn(
            "bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            activeTableTab === 'courseList' && selectedCardFilter === 'published' ? "ring-2 ring-emerald-600 border-emerald-400 shadow-sm font-bold" : "border-emerald-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0 shadow-xs">
              <Globe className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-emerald-900/70 uppercase tracking-wider block truncate">
                Published
              </span>
              <span className="text-sm font-extrabold text-emerald-950 font-mono block truncate">
                {totals.publishedCourses}
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: Active Course */}
        <div 
          onClick={() => {
            setSelectedCardFilter(selectedCardFilter === 'active' ? 'all' : 'active');
            setActiveTableTab('courseList');
            setCurrentPage(1);
          }}
          className={cn(
            "bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            activeTableTab === 'courseList' && selectedCardFilter === 'active' ? "ring-2 ring-blue-600 border-blue-400 shadow-sm font-bold" : "border-blue-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0 shadow-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-blue-900/70 uppercase tracking-wider block truncate">
                Active Course
              </span>
              <span className="text-sm font-extrabold text-blue-950 font-mono block truncate">
                {totals.activeCoursesWithBatchesCount}
              </span>
            </div>
          </div>
        </div>

        {/* Card 6: Program Aligned */}
        <div 
          onClick={() => {
            setActiveTableTab('programAligned');
            setSelectedCardFilter('all');
            setCurrentPage(1);
          }}
          className={cn(
            "bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            activeTableTab === 'programAligned' ? "ring-2 ring-purple-600 border-purple-400 shadow-sm" : "border-purple-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-600 text-white rounded-lg shrink-0 shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-purple-900/70 uppercase tracking-wider block truncate">
                Program Aligned
              </span>
              <span className="text-sm font-extrabold text-purple-950 font-mono block truncate">
                {totals.programAlignedCourses}
              </span>
            </div>
          </div>
        </div>

      </div>

      
      {/* TABS CONTAINER */}
      <AnimatePresence mode="wait">
        {activeTableTab === 'programAligned' && (
          <motion.div
            key="programAligned"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
{/* FACULTY-WISE PROGRAM & ALIGNED COURSES TABLES */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs space-y-2 relative overflow-hidden h-[600px] lg:h-[650px] flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-gray-100 gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-xs md:text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-teal-600" />
              Program Aligned Course List
            </h3>
            <span className="text-[11px] text-gray-400 font-mono">
              ({programNameData.length} Programs across {faculties.length} Faculties)
            </span>
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 flex-1 min-h-0 overflow-hidden">
            {/* Left Panel: Faculty List */}
            <div className="md:col-span-3 lg:col-span-2 border border-slate-200 rounded-lg overflow-hidden flex flex-col bg-white shadow-3xs h-full min-h-0">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
                  Faculties
                </h4>
                <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold font-mono shrink-0">
                  {faculties.length}
                </span>
              </div>
              <div className="p-2 flex flex-col gap-1 flex-1 overflow-y-auto no-scrollbar">
                <button
                  onClick={() => setSelectedFacultyForAnalysis('all')}
                  className={cn(
                    "w-full text-left px-2.5 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer",
                    selectedFacultyForAnalysis === 'all'
                      ? "bg-teal-50 text-teal-900 border border-teal-200 shadow-3xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  )}
                >
                  <span className="truncate">All Faculties</span>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {aggregatedProgramData.length}
                  </span>
                </button>
                {faculties.map((fac, idx) => {
                  const count = aggregatedProgramData.filter(p => p.faculty.toLowerCase() === fac.toLowerCase()).length;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedFacultyForAnalysis(fac)}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer",
                        selectedFacultyForAnalysis === fac
                          ? "bg-teal-50 text-teal-900 border border-teal-200 shadow-3xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                      )}
                    >
                      <span className="truncate pr-1" title={fac}>{fac}</span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Panel: Table */}
            <div className="md:col-span-9 lg:col-span-10 border border-slate-200 rounded-lg bg-slate-50/50 p-3 flex flex-col h-full min-h-0 overflow-hidden">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Program-wise Course & Batch Analysis {selectedFacultyForAnalysis !== 'all' ? `(${selectedFacultyForAnalysis})` : ''}
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  Showing {filteredAggregatedProgramData.length} Programs
                </span>
              </div>
              <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 no-scrollbar rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 z-10 shadow-3xs">
                    <tr className="border-b border-slate-200">
                      <th className="p-2.5 font-bold text-slate-700">Program</th>
                      <th className="p-2.5 font-bold text-slate-700 text-center">Departmental Course</th>
                      <th className="p-2.5 font-bold text-slate-700 text-center">Aligned MC Courses</th>
                      <th className="p-2.5 font-bold text-slate-700 text-center">Running Batches</th>
                      <th className="p-2.5 font-bold text-slate-700 text-center">Completed Batches</th>
                      <th className="p-2.5 font-bold text-slate-700 text-center">Upcoming Batches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAggregatedProgramData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                          No programs found for this faculty.
                        </td>
                      </tr>
                    ) : (
                      filteredAggregatedProgramData.map((p, idx) => (
                        <React.Fragment key={p.pid || idx}>
                          <tr className={cn(
                            "border-b border-gray-100 hover:bg-slate-50 transition-colors",
                            expandedProgramPid === p.pid && "bg-teal-50/20"
                          )}>
                            <td className="p-2.5 font-semibold text-slate-800">{p.programName}</td>
                            <td 
                              onClick={() => {
                                if (expandedProgramPid === p.pid && expandedProgramView === 'details') {
                                  setExpandedProgramPid(null);
                                  setExpandedProgramView(null);
                                  setSelectedProgram(null);
                                  setSelectedProgramCourse(null);
                                } else {
                                  setExpandedProgramPid(p.pid);
                                  setExpandedProgramView('details');
                                  setSelectedProgram({ pid: p.pid, shortName: p.programName });
                                  setSelectedProgramCourse(null);
                                  setProgramCourseQuery('');
                                  setMcCourseQuery('');
                                }
                              }}
                              className={cn(
                                "p-2.5 font-mono text-center cursor-pointer transition-all font-bold select-none",
                                expandedProgramPid === p.pid && expandedProgramView === 'details'
                                  ? "bg-teal-100 text-teal-900 font-bold" 
                                  : "hover:bg-teal-50 hover:text-teal-700 text-teal-800"
                              )}
                              title="Click to view Courses List inside the analysis table"
                            >
                              <span className="underline decoration-dotted decoration-teal-400 hover:decoration-teal-600">
                                {p.uniqueCoursesCount}
                              </span>
                            </td>
                            <td 
                              onClick={() => {
                                if (expandedProgramPid === p.pid && expandedProgramView === 'details') {
                                  setExpandedProgramPid(null);
                                  setExpandedProgramView(null);
                                  setSelectedProgram(null);
                                  setSelectedProgramCourse(null);
                                } else {
                                  setExpandedProgramPid(p.pid);
                                  setExpandedProgramView('details');
                                  setSelectedProgram({ pid: p.pid, shortName: p.programName });
                                  setSelectedProgramCourse(null);
                                  setProgramCourseQuery('');
                                  setMcCourseQuery('');
                                }
                              }}
                              className={cn(
                                "p-2.5 font-mono text-center cursor-pointer transition-all font-bold select-none",
                                expandedProgramPid === p.pid && expandedProgramView === 'details'
                                  ? "bg-amber-100 text-amber-900 font-bold" 
                                  : "hover:bg-amber-50 hover:text-amber-700 text-amber-800"
                              )}
                              title="Click to view Aligned MC Courses inside the analysis table"
                            >
                              <span className="underline decoration-dotted decoration-amber-400 hover:decoration-amber-600">
                                {p.alignedMCCoursesCount}
                              </span>
                            </td>
                            <td 
                              onClick={() => {
                                if (expandedProgramPid === p.pid && expandedProgramView === 'running') {
                                  setExpandedProgramPid(null);
                                  setExpandedProgramView(null);
                                  setSelectedProgram(null);
                                  setSelectedProgramCourse(null);
                                } else {
                                  setExpandedProgramPid(p.pid);
                                  setExpandedProgramView('running');
                                  setSelectedProgram({ pid: p.pid, shortName: p.programName });
                                  setSelectedProgramCourse(null);
                                  setProgramCourseQuery('');
                                  setMcCourseQuery('');
                                }
                              }}
                              className={cn(
                                "p-2.5 font-mono text-center cursor-pointer transition-all font-bold select-none",
                                expandedProgramPid === p.pid && expandedProgramView === 'running'
                                  ? "bg-emerald-100 text-emerald-900 font-bold" 
                                  : "hover:bg-emerald-50 hover:text-emerald-700 text-emerald-800"
                              )}
                              title="Click to view Running Batches inside the analysis table"
                            >
                              <span className="underline decoration-dotted decoration-emerald-400 hover:decoration-emerald-600">
                                {p.runningBatches}
                              </span>
                            </td>
                            <td 
                              onClick={() => {
                                if (expandedProgramPid === p.pid && expandedProgramView === 'completed') {
                                  setExpandedProgramPid(null);
                                  setExpandedProgramView(null);
                                  setSelectedProgram(null);
                                  setSelectedProgramCourse(null);
                                } else {
                                  setExpandedProgramPid(p.pid);
                                  setExpandedProgramView('completed');
                                  setSelectedProgram({ pid: p.pid, shortName: p.programName });
                                  setSelectedProgramCourse(null);
                                  setProgramCourseQuery('');
                                  setMcCourseQuery('');
                                }
                              }}
                              className={cn(
                                "p-2.5 font-mono text-center cursor-pointer transition-all font-bold select-none",
                                expandedProgramPid === p.pid && expandedProgramView === 'completed'
                                  ? "bg-blue-100 text-blue-900 font-bold" 
                                  : "hover:bg-blue-50 hover:text-blue-700 text-blue-800"
                              )}
                              title="Click to view Completed Batches inside the analysis table"
                            >
                              <span className="underline decoration-dotted decoration-blue-400 hover:decoration-blue-600">
                                {p.completedBatches}
                              </span>
                            </td>
                            <td 
                              onClick={() => {
                                if (expandedProgramPid === p.pid && expandedProgramView === 'upcoming') {
                                  setExpandedProgramPid(null);
                                  setExpandedProgramView(null);
                                  setSelectedProgram(null);
                                  setSelectedProgramCourse(null);
                                } else {
                                  setExpandedProgramPid(p.pid);
                                  setExpandedProgramView('upcoming');
                                  setSelectedProgram({ pid: p.pid, shortName: p.programName });
                                  setSelectedProgramCourse(null);
                                  setProgramCourseQuery('');
                                  setMcCourseQuery('');
                                }
                              }}
                              className={cn(
                                "p-2.5 font-mono text-center cursor-pointer transition-all font-bold select-none",
                                expandedProgramPid === p.pid && expandedProgramView === 'upcoming'
                                  ? "bg-amber-100 text-amber-900 font-bold" 
                                  : "hover:bg-amber-50 hover:text-amber-700 text-amber-800"
                              )}
                              title="Click to view Upcoming Batches inside the analysis table"
                            >
                              <span className="underline decoration-dotted decoration-amber-400 hover:decoration-amber-600">
                                {p.upcomingBatches}
                              </span>
                            </td>
                          </tr>
                          
                          {expandedProgramPid === p.pid && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={6} className="p-3">
                                {expandedProgramView === 'details' ? (
                                  <div className="bg-white border-2 border-slate-200/80 rounded-xl p-4 shadow-inner space-y-4">
                                    {/* Header with program details and a close button */}
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                                          {p.pid ? p.pid.toUpperCase() : "PROGRAM"}
                                        </span>
                                        <h4 className="text-xs md:text-sm font-bold text-slate-800">
                                          {p.programName} — Courses & Micro-Credentials Details
                                        </h4>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setExpandedProgramPid(null);
                                          setExpandedProgramView(null);
                                          setSelectedProgram(null);
                                          setSelectedProgramCourse(null);
                                        }}
                                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 hover:bg-slate-100 rounded cursor-pointer"
                                      >
                                        Collapse ✕
                                      </button>
                                    </div>

                                  {/* Split Grid for Curriculum Tables */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* Left side: Program Courses Table */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col bg-white">
                                      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider truncate">
                                            Courses List
                                          </h4>
                                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                                            {filteredProgramCourses.length}
                                          </span>
                                        </div>
                                        <div className="relative max-w-[150px] w-full shrink-0">
                                          <input
                                            type="text"
                                            value={programCourseQuery}
                                            onChange={(e) => setProgramCourseQuery(e.target.value)}
                                            placeholder="Search courses..."
                                            className="w-full text-[11px] px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
                                          />
                                          {programCourseQuery && (
                                            <button
                                              onClick={() => setProgramCourseQuery('')}
                                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <div className="overflow-y-auto max-h-[300px] no-scrollbar">
                                        <table className="w-full text-left border-collapse text-xs">
                                          <thead className="sticky top-0 bg-slate-100 z-10 shadow-3xs">
                                            <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                              <th className="py-2 px-3 w-px whitespace-nowrap">Code</th>
                                              <th className="py-2 px-3">Course Title</th>
                                              <th className="py-2 px-3 w-px whitespace-nowrap text-center">Credit</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 text-slate-700">
                                            {filteredProgramCourses.length === 0 ? (
                                              <tr>
                                                <td colSpan={3} className="py-12 px-4 text-center text-slate-400 italic">
                                                  No program courses matched your search.
                                                </td>
                                              </tr>
                                            ) : (
                                              filteredProgramCourses.map((pc, pcIdx) => {
                                                const isSelected = selectedProgramCourse?.courseCode === pc.courseCode && selectedProgramCourse?.courseTitle === pc.courseTitle;
                                                return (
                                                  <tr
                                                    key={pcIdx}
                                                    onClick={() => {
                                                      if (isSelected) {
                                                        setSelectedProgramCourse(null);
                                                      } else {
                                                        setSelectedProgramCourse(pc);
                                                      }
                                                    }}
                                                    className={cn(
                                                      "cursor-pointer transition-colors group",
                                                      pc.isAligned 
                                                        ? (isSelected 
                                                            ? "bg-amber-100 border-l-4 border-l-amber-600 text-amber-950 shadow-xs" 
                                                            : "bg-amber-50/60 hover:bg-amber-100/50 border-l-4 border-l-amber-400 text-amber-900")
                                                        : (isSelected 
                                                            ? "bg-teal-50/80 font-medium border-l-4 border-l-teal-600 text-teal-950 shadow-xs" 
                                                            : "hover:bg-slate-50 text-slate-700")
                                                    )}
                                                    title="Click to view aligned MC Courses on the right"
                                                  >
                                                    <td className={cn(
                                                      "py-2 px-3 font-mono font-bold transition-colors w-px whitespace-nowrap",
                                                      pc.isAligned 
                                                        ? (isSelected ? "text-amber-950" : "text-amber-700")
                                                        : (isSelected ? "text-teal-950" : "text-slate-600")
                                                    )}>
                                                      {pc.courseCode || "—"}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                      <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                          "transition-colors text-xs font-semibold",
                                                          pc.isAligned
                                                            ? (isSelected ? "text-amber-950 font-bold" : "text-amber-900 font-bold")
                                                            : (isSelected ? "text-teal-950 font-bold" : "text-slate-800 font-semibold group-hover:text-teal-900")
                                                        )}>
                                                          {pc.courseTitle || "—"}
                                                        </span>

                                                      </div>
                                                    </td>
                                                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-600 w-px whitespace-nowrap">
                                                      {pc.credit || "—"}
                                                    </td>
                                                  </tr>
                                                );
                                              })
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>

                                    {/* Right side: Aligned MC Courses Table */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col bg-white">
                                      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider truncate">
                                            Aligned MC Courses
                                          </h4>
                                          {selectedProgramCourse && (
                                            <button
                                              onClick={() => setSelectedProgramCourse(null)}
                                              className="text-[9px] font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-250 px-1.5 py-0.5 rounded transition-colors cursor-pointer shrink-0"
                                              title="Clear filter to show all MC courses"
                                            >
                                              Show All
                                            </button>
                                          )}
                                        </div>
                                        <div className="relative max-w-[150px] w-full shrink-0">
                                          <input
                                            type="text"
                                            value={mcCourseQuery}
                                            onChange={(e) => setMcCourseQuery(e.target.value)}
                                            placeholder="Search MC courses..."
                                            className="w-full text-[11px] px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
                                          />
                                          {mcCourseQuery && (
                                            <button
                                              onClick={() => setMcCourseQuery('')}
                                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      <div className="overflow-y-auto max-h-[300px] no-scrollbar">
                                        <table className="w-full text-left border-collapse text-xs">
                                          <thead className="sticky top-0 bg-slate-100 z-10 shadow-3xs">
                                            <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                              <th className="py-2 px-3 w-20">Code</th>
                                              <th className="py-2 px-3">MC Course Title</th>
                                              <th className="py-2 px-3 w-px whitespace-nowrap text-center">Credit</th>
                                              <th className="py-2 px-3 w-px whitespace-nowrap text-right">Duration</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 text-slate-700">
                                            {filteredMCCourses.length === 0 ? (
                                              <tr>
                                                <td colSpan={4} className="py-12 px-4 text-center text-slate-400 italic">
                                                  No MC courses matched your search.
                                                </td>
                                              </tr>
                                            ) : (
                                              filteredMCCourses.map((mc, mcIdx) => (
                                                <tr 
                                                  key={mcIdx} 
                                                  onClick={(e) => {
                                                    if (e.ctrlKey || e.metaKey) {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      const fullCourse = courseData.find(c => {
                                                        const code = String(c["Course Code"] || c["courseCode"] || c["id"] || "").trim().toLowerCase();
                                                        return code === String(mc.code).trim().toLowerCase();
                                                      });
                                                      if (fullCourse) {
                                                        setSelectedMCCourseForDetails(fullCourse);
                                                      } else {
                                                        setSelectedMCCourseForDetails({
                                                          "Course Code": mc.code,
                                                          "Course Title": mc.title,
                                                          "Duration": mc.duration,
                                                          "Course Fee": mc.fee
                                                        });
                                                      }
                                                    }
                                                  }}
                                                  className="hover:bg-teal-50/40 transition-colors cursor-pointer"
                                                  title="Ctrl+Click to view Micro-Credential Course Details"
                                                >
                                                  <td className="py-2 px-3 font-mono text-slate-600 font-bold whitespace-nowrap">
                                                    {mc.code || "—"}
                                                  </td>
                                                  <td className="py-2 px-3 font-semibold text-slate-800">
                                                    {mc.title || "—"}
                                                  </td>
                                                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-600 w-px whitespace-nowrap">
                                                    {mc.credit || "—"}
                                                  </td>
                                                  <td className="py-2 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                                                    {(() => {
                                                       const d = String(mc.duration || "").trim();
                                                       if (!d || d === "—" || d === "-") return "—";
                                                       if (d.toLowerCase().includes("hour") || d.toLowerCase().includes("hrs")) return d;
                                                       return `${d} Hours`;
                                                     })()}
                                                  </td>
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                ) : (
                                  <div className="bg-white border-2 border-slate-200/80 rounded-xl p-4 shadow-sm space-y-4">
                                    {/* Header with program details and a close button */}
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                      <div className="flex items-center gap-2">
                                        <span className={cn(
                                          "font-mono font-bold text-xs px-2 py-0.5 rounded uppercase tracking-wider",
                                          expandedProgramView === 'running' && "bg-emerald-100 text-emerald-800",
                                          expandedProgramView === 'completed' && "bg-blue-100 text-blue-800",
                                          expandedProgramView === 'upcoming' && "bg-amber-100 text-amber-800"
                                        )}>
                                          {expandedProgramView === 'running' ? 'Running Batches' :
                                           expandedProgramView === 'completed' ? 'Completed Batches' :
                                           expandedProgramView === 'upcoming' ? 'Upcoming Batches' : 'Batches'}
                                        </span>
                                        <h4 className="text-xs md:text-sm font-bold text-slate-800">
                                          {p.programName} — Batch List
                                        </h4>
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                                          {(() => {
                                            const batchesToDisplay = 
                                              expandedProgramView === 'running' ? p.runningBatchesList :
                                              expandedProgramView === 'completed' ? p.completedBatchesList :
                                              expandedProgramView === 'upcoming' ? p.upcomingBatchesList : [];
                                            return batchesToDisplay.length;
                                          })()}{' '}
                                          {(() => {
                                            const batchesToDisplay = 
                                              expandedProgramView === 'running' ? p.runningBatchesList :
                                              expandedProgramView === 'completed' ? p.completedBatchesList :
                                              expandedProgramView === 'upcoming' ? p.upcomingBatchesList : [];
                                            return batchesToDisplay.length === 1 ? 'Batch' : 'Batches';
                                          })()}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setExpandedProgramPid(null);
                                          setExpandedProgramView(null);
                                          setSelectedProgram(null);
                                          setSelectedProgramCourse(null);
                                        }}
                                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 hover:bg-slate-100 rounded cursor-pointer"
                                      >
                                        Collapse ✕
                                      </button>
                                    </div>

                                    {/* Batch List Table */}
                                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                      <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-slate-100 sticky top-0 z-10 shadow-3xs">
                                          <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                                            <th className="py-2.5 px-3">Batch Number</th>
                                            <th className="py-2.5 px-3">Aligned MC Course</th>
                                            <th className="py-2.5 px-3 text-center">Start Date</th>
                                            <th className="py-2.5 px-3 text-center">End Date</th>
                                            <th className="py-2.5 px-3 text-center font-bold">Enrolled Students</th>
                                            <th className="py-2.5 px-3 text-center font-bold">Status</th>
                                            <th className="py-2.5 px-3">Remarks</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700">
                                          {(() => {
                                            const batchesToDisplay = 
                                              expandedProgramView === 'running' ? p.runningBatchesList :
                                              expandedProgramView === 'completed' ? p.completedBatchesList :
                                              expandedProgramView === 'upcoming' ? p.upcomingBatchesList : [];
                                            
                                            if (batchesToDisplay.length === 0) {
                                              return (
                                                <tr>
                                                  <td colSpan={7} className="text-center py-12 text-slate-400 italic">
                                                    No batches found for this category.
                                                  </td>
                                                </tr>
                                              );
                                            }

                                            return batchesToDisplay.map((b, bIdx) => {
                                              const enrolledCount = b["Student"] || b["Students"] || b["enrolled"] || "—";
                                              const status = b["Status"] || b["status"] || (expandedProgramView === 'running' ? 'Running' : expandedProgramView === 'completed' ? 'Completed' : 'Upcoming');
                                              const startStr = b["Start Date"] || b["startDate"] || "—";
                                              const endStr = b["End Date"] || b["endDate"] || "—";
                                              const formattedStart = formatDateToMmmDdYyyy(startStr);
                                              const formattedEnd = formatDateToMmmDdYyyy(endStr);
                                              return (
                                                <tr 
                                                  key={bIdx} 
                                                  onClick={(e) => {
                                                    if ((e.ctrlKey || e.metaKey) && onSelectBatch) {
                                                      onSelectBatch(b);
                                                    }
                                                  }}
                                                  className="hover:bg-slate-100/70 transition-colors cursor-pointer"
                                                  title="Ctrl + Click (or Cmd + Click) to open Batch Detail Expand view"
                                                >
                                                  <td className="py-2.5 px-3 font-bold text-slate-900 font-mono">
                                                    {b["Batch Number"] || `Batch-${bIdx + 1}`}
                                                  </td>
                                                  <td className="py-2.5 px-3">
                                                    <div className="flex flex-col">
                                                      <span className="font-semibold text-slate-800">{b.mcTitle}</span>
                                                      <span className="text-[10px] text-slate-500 font-mono font-bold">{b.mcCode}</span>
                                                    </div>
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center text-slate-600 font-medium whitespace-nowrap">{formattedStart}</td>
                                                  <td className="py-2.5 px-3 text-center text-slate-600 font-medium whitespace-nowrap">{formattedEnd}</td>
                                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">{enrolledCount}</td>
                                                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                    <span className={cn(
                                                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                                      expandedProgramView === 'running' && "bg-emerald-100 text-emerald-800 border-emerald-200/60",
                                                      expandedProgramView === 'completed' && "bg-blue-100 text-blue-800 border-blue-200/60",
                                                      expandedProgramView === 'upcoming' && "bg-amber-100 text-amber-800 border-amber-200/60"
                                                    )}>
                                                      {status}
                                                    </span>
                                                  </td>
                                                  <td className="py-2.5 px-3 text-slate-600 font-medium text-xs">
                                                    {b["Remarks"] || "—"}
                                                  </td>
                                                </tr>
                                              );
                                            });
                                          })()}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
      </div>

                </motion.div>
        )}
        {activeTableTab === 'courseList' && (
          <motion.div
            key="courseList"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
{/* DETAILED COURSE INSIGHTS DATA TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-4">
        
        {/* Table Header Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" />
              Detailed Course Performance & Insights Table
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Showing {searchedAndSortedData.length} of {compiledData.length} total courses
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by code, title, faculty..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-teal-500 bg-gray-50/50"
              />
            </div>

            {/* Action Buttons to the Right of Search Bar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg border border-teal-200 transition-all cursor-pointer shadow-xs"
                title="Export to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handlePrintReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg border border-gray-200 transition-all cursor-pointer shadow-xs"
                title="Print Executive Report"
              >
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                <span>Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-3 cursor-pointer hover:bg-gray-100 transition-colors w-px whitespace-nowrap" onClick={() => requestSort('code')}>
                  <div className="flex items-center gap-1">
                    <span>Course Code</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-100 transition-colors w-full" onClick={() => requestSort('title')}>
                  <div className="flex items-center gap-1">
                    <span>Course Title</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                
                
                <th className="p-3 text-center cursor-pointer hover:bg-gray-100 transition-colors w-px whitespace-nowrap" onClick={() => requestSort('publishedStatus')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Publication Status</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="p-3 text-center cursor-pointer hover:bg-gray-100 transition-colors w-px whitespace-nowrap" onClick={() => requestSort('status')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Activity Status</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="p-3 text-center cursor-pointer hover:bg-gray-100 transition-colors w-px whitespace-nowrap" onClick={() => requestSort('batchesCount')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Batches</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="p-3 text-center cursor-pointer hover:bg-gray-100 transition-colors w-px whitespace-nowrap" onClick={() => requestSort('enrolled')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Enrolled</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                
                <th className="p-3 text-center cursor-pointer hover:bg-gray-100 transition-colors w-px whitespace-nowrap" onClick={() => requestSort('fee')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Course Fee</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {paginatedData.length > 0 ? (
                paginatedData.map((c, idx) => (
                  <React.Fragment key={c.code + idx}>
                    <tr 
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          e.preventDefault();
                          e.stopPropagation();
                          const fullCourse = courseData.find(course => {
                            const code = String(course["Course Code"] || course["courseCode"] || course["id"] || "").trim().toLowerCase();
                            return code === String(c.code).trim().toLowerCase();
                          });
                          if (fullCourse) {
                            setSelectedMCCourseForDetails(fullCourse);
                          } else {
                            setSelectedMCCourseForDetails({
                              "Course Code": c.code,
                              "Course Title": c.title,
                              "Duration": c.duration,
                              "Course Fee": c.fee
                            });
                          }
                        }
                      }}
                      className="hover:bg-teal-50/20 transition-colors select-none cursor-default"
                      title="Ctrl + Click (or Cmd + Click) to view Course Details"
                    >
                      <td className="p-3 font-mono font-bold text-teal-800 whitespace-nowrap w-px">{c.code}</td>
                      <td className="p-3 font-semibold text-gray-900 w-full">{c.title}</td>
                      
                      
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          c.publishedStatus?.toLowerCase().includes("ready") || c.publishedStatus?.toLowerCase() === "ready to publish" || c.publishedStatus?.toLowerCase() === "published" || c.publishedStatus?.toLowerCase() === "active" || c.publishedStatus?.toLowerCase() === "live"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                            : c.publishedStatus?.toLowerCase().includes("review") || c.publishedStatus?.toLowerCase() === "under review"
                            ? "bg-amber-50 text-amber-700 border-amber-200/80"
                            : c.publishedStatus?.toLowerCase().includes("unpublish") || c.publishedStatus?.toLowerCase().includes("draft") || c.publishedStatus?.toLowerCase().includes("pause")
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            c.publishedStatus?.toLowerCase().includes("ready") || c.publishedStatus?.toLowerCase() === "ready to publish" || c.publishedStatus?.toLowerCase() === "published" || c.publishedStatus?.toLowerCase() === "active" || c.publishedStatus?.toLowerCase() === "live"
                              ? "bg-emerald-500"
                              : c.publishedStatus?.toLowerCase().includes("review") || c.publishedStatus?.toLowerCase() === "under review"
                              ? "bg-amber-500"
                              : c.publishedStatus?.toLowerCase().includes("unpublish") || c.publishedStatus?.toLowerCase().includes("draft")
                              ? "bg-slate-400"
                              : "bg-purple-500"
                          )} />
                          {c.publishedStatus || "-"}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {(() => {
                          const status = c.activityStatus || c.status;
                          let badgeColors = "bg-gray-100 text-gray-600 border-gray-200";
                          if (status === "Ready to Publish" || status.toLowerCase().includes("ready")) badgeColors = "bg-emerald-50 text-emerald-800 border-emerald-200/80";
                          else if (status === "Under Review" || status.toLowerCase().includes("review")) badgeColors = "bg-amber-50 text-amber-800 border-amber-200/80";
                          else if (status === "100%" || status.includes("100%")) badgeColors = "bg-emerald-50 text-emerald-700 border-emerald-200/50";
                          else if (status === "0%" || status.includes("0%")) badgeColors = "bg-slate-100 text-slate-600 border-slate-200";
                          else if (status.endsWith("%")) badgeColors = "bg-sky-50 text-sky-700 border-sky-200/50";
                          else if (status === "Proposed") badgeColors = "bg-indigo-50 text-indigo-700 border-indigo-200/50";
                          else if (status === "Developed") badgeColors = "bg-amber-50 text-amber-700 border-amber-200/50";
                          else if (status === "Reviewed") badgeColors = "bg-sky-50 text-sky-700 border-sky-200/50";
                          else if (status === "Approved") badgeColors = "bg-emerald-50 text-emerald-700 border-emerald-200/50";
                          else if (status === "Published") badgeColors = "bg-teal-50 text-teal-700 border-teal-200/50";
                          else if (status === "Active" || status === "Completed") badgeColors = "bg-green-100 text-green-800 border-green-300/50";
                          
                          return (
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border", badgeColors)}>
                              {status}
                            </span>
                          );
                        })()}
                      </td>
                      <td 
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCourseCode(expandedCourseCode === c.code ? null : c.code);
                        }}
                        className={cn(
                          "p-3 text-center font-mono cursor-pointer transition-all font-bold select-none",
                          expandedCourseCode === c.code
                            ? "bg-teal-100 text-teal-900 font-bold font-mono"
                            : "hover:bg-teal-50 hover:text-teal-700 text-gray-700 font-mono"
                        )}
                        title="Click to view Batch List inside the analysis table"
                      >
                        <span className="underline decoration-dotted decoration-teal-400 hover:decoration-teal-600">
                          {c.batchesCount}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-indigo-700 whitespace-nowrap">{c.enrolled}</td>
                      
                      <td className="p-3 text-center font-mono font-bold text-teal-700 whitespace-nowrap">
                        ৳ {c.fee.toLocaleString()}
                      </td>
                    </tr>
                    {expandedCourseCode === c.code && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={7} className="p-3">
                          <div className="bg-white border-2 border-slate-200/80 rounded-xl p-4 shadow-sm space-y-4">
                            {/* Header with course details and a close button */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                                  {c.code ? c.code.toUpperCase() : "COURSE"}
                                </span>
                                <h4 className="text-xs md:text-sm font-bold text-slate-800">
                                  {c.title} — Batch List
                                </h4>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                                  {c.batches ? c.batches.length : 0} {c.batches?.length === 1 ? 'Batch' : 'Batches'}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setExpandedCourseCode(null);
                                }}
                                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 hover:bg-slate-100 rounded cursor-pointer"
                              >
                                Collapse ✕
                              </button>
                            </div>

                            {/* Batch List Table */}
                            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-slate-100 sticky top-0 z-10 shadow-3xs">
                                  <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="py-2.5 px-3">Batch Number</th>
                                    <th className="py-2.5 px-3">Aligned MC Course</th>
                                    <th className="py-2.5 px-3 text-center">Start Date</th>
                                    <th className="py-2.5 px-3 text-center">End Date</th>
                                    <th className="py-2.5 px-3 text-center font-bold">Enrolled Students</th>
                                    <th className="py-2.5 px-3 text-center font-bold">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  {!c.batches || c.batches.length === 0 ? (
                                    <tr>
                                      <td colSpan={6} className="text-center py-12 text-slate-400 italic">
                                        No batches found for this course.
                                      </td>
                                    </tr>
                                  ) : (
                                    c.batches.map((b: any, bIdx: number) => {
                                      const enrolledCount = b["Student"] || b["Students"] || b["enrolled"] || "—";
                                      const startStr = b["Start Date"] || b["startDate"] || "—";
                                      const endStr = b["End Date"] || b["endDate"] || "—";
                                      const formattedStart = formatDateToMmmDdYyyy(startStr);
                                      const formattedEnd = formatDateToMmmDdYyyy(endStr);
                                      
                                      // Dynamically determine status: Running, Completed, or Upcoming
                                      const rawStatus = String(b["Status"] || b["status"] || "").trim().toLowerCase();
                                      let status = "Running";
                                      if (rawStatus === "running" || rawStatus === "active") {
                                        status = "Running";
                                      } else if (rawStatus === "completed" || rawStatus === "finished") {
                                        status = "Completed";
                                      } else if (rawStatus === "upcoming") {
                                        status = "Upcoming";
                                      } else {
                                        const startDate = parseDate(startStr);
                                        const endDate = parseDate(endStr);
                                        const today = new Date();
                                        if (startDate && startDate > today) {
                                          status = "Upcoming";
                                        } else if (endDate && endDate < today) {
                                          status = "Completed";
                                        } else {
                                          status = "Running";
                                        }
                                      }
                                      const statusLower = status.toLowerCase();
                                      return (
                                        <tr 
                                          key={bIdx} 
                                          onClick={(e) => {
                                            if ((e.ctrlKey || e.metaKey) && onSelectBatch) {
                                              onSelectBatch(b);
                                            }
                                          }}
                                          className="hover:bg-slate-100/70 transition-colors cursor-pointer"
                                          title="Ctrl + Click (or Cmd + Click) to open Batch Detail Expand view"
                                        >
                                          <td className="py-2.5 px-3 font-bold text-slate-900 font-mono">
                                            {b["Batch Number"] || `Batch-${bIdx + 1}`}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <div className="flex flex-col">
                                              <span className="font-semibold text-slate-800">{b["Course Name"] || b["Course Title"] || c.title}</span>
                                              <span className="text-[10px] text-slate-500 font-mono font-bold">{b["Course Code"] || b["courseCode"] || c.code}</span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3 text-center text-slate-600 font-medium whitespace-nowrap">{formattedStart}</td>
                                          <td className="py-2.5 px-3 text-center text-slate-600 font-medium whitespace-nowrap">{formattedEnd}</td>
                                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">{enrolledCount}</td>
                                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                            <span className={cn(
                                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                              statusLower === 'running' || statusLower === 'active' 
                                                ? "bg-emerald-100 text-emerald-800 border-emerald-200/60"
                                                : statusLower === 'completed' || statusLower === 'finished'
                                                ? "bg-blue-100 text-blue-800 border-blue-200/60"
                                                : "bg-amber-100 text-amber-800 border-amber-200/60"
                                            )}>
                                              {status}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No matching course insights found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
            <div>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

                </motion.div>
        )}
      </AnimatePresence>
{/* UNIFIED CARD: 12-MONTH TREND CHART & COURSE DETAILS TABLE */}
      {/* MC Course Details Modal */}
      <MCCourseDetails
        isOpen={selectedMCCourseForDetails !== null}
        onClose={() => setSelectedMCCourseForDetails(null)}
        data={selectedMCCourseForDetails}
        onSave={async (formData, editingRow) => {
          await onCourseSave(formData, editingRow);
          setSelectedMCCourseForDetails(formData);
        }}
        employees={employeesData}
        batches={mcBatchData}
        documents={documentsData}
        workflowData={workflowData}
        extraFormProps={{
          onViewFile,
          employees: employeesData,
          onSaveBatch,
          onSaveDocument,
          batchHeaders,
          documentHeaders,
          expensesData,
          onSaveExpense,
          expensesHeaders,
          programNameData,
          programNameHeaders,
          courseOfferData,
          courseOfferHeaders,
          allCourses: courseData
        }}
        initialExpanded={true}
      />

    </div>
  );
}
