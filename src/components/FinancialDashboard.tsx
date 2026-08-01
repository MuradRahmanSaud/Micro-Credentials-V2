import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Percent, 
  Users, 
  Layers, 
  Download, 
  Search, 
  Calendar, 
  Filter, 
  FileText,
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  DollarSign,
  PieChart as PieIcon,
  BarChart2,
  Activity,
  Info,
  Tag
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

interface FinancialDashboardProps {
  courseData: any[];
  mcBatchData: any[];
  expensesData: any[];
  programNameData: any[];
  courseOfferData: any[];
}

// Helper to parse dates robustly
const parseDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (!str) return null;

  // Try standard formats: YYYY-MM-DD
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

// Heuristic to classify expenses based on their titles
const classifyExpense = (title: string): 'Instructors' | 'Marketing' | 'Operations' | 'Software/Platform' | 'Miscellaneous' => {
  const t = String(title).toLowerCase();
  if (
    t.includes('instructor') || 
    t.includes('teacher') || 
    t.includes('lecture') || 
    t.includes('faculty') || 
    t.includes('trainer') || 
    t.includes('honorarium') || 
    t.includes('speaker') || 
    t.includes('payment to') || 
    t.includes('conduct class') || 
    t.includes('teaching') ||
    t.includes('instractor')
  ) {
    return 'Instructors';
  }
  if (
    t.includes('marketing') || 
    t.includes('facebook') || 
    t.includes('ad') || 
    t.includes('ads') || 
    t.includes('social media') || 
    t.includes('boost') || 
    t.includes('poster') || 
    t.includes('flyer') || 
    t.includes('promo') || 
    t.includes('advertising') || 
    t.includes('campaign')
  ) {
    return 'Marketing';
  }
  if (
    t.includes('operation') || 
    t.includes('food') || 
    t.includes('catering') || 
    t.includes('refreshment') || 
    t.includes('tea') || 
    t.includes('coffee') || 
    t.includes('lunch') || 
    t.includes('snack') || 
    t.includes('operational') || 
    t.includes('admin') || 
    t.includes('rent') || 
    t.includes('electricity') || 
    t.includes('printing') || 
    t.includes('photocopy') || 
    t.includes('materials') || 
    t.includes('stationery') || 
    t.includes('utility') ||
    t.includes('hall') ||
    t.includes('venue')
  ) {
    return 'Operations';
  }
  if (
    t.includes('zoom') || 
    t.includes('software') || 
    t.includes('platform') || 
    t.includes('host') || 
    t.includes('cloud') || 
    t.includes('license') || 
    t.includes('subscription') || 
    t.includes('gsuite') || 
    t.includes('aws') || 
    t.includes('domain') || 
    t.includes('hosting') || 
    t.includes('email')
  ) {
    return 'Software/Platform';
  }
  return 'Miscellaneous';
};

export default function FinancialDashboard({
  courseData = [],
  mcBatchData = [],
  expensesData = [],
  programNameData = [],
  courseOfferData = []
}: FinancialDashboardProps) {
  // Global Filters State
  const [periodFilter, setPeriodFilter] = useState<'all' | 'this_month' | 'this_quarter' | 'this_year' | 'last_year' | 'custom'>('all');
  const [customStartMonth, setCustomStartMonth] = useState<string>('2026-01');
  const [customEndMonth, setCustomEndMonth] = useState<string>('2026-12');
  const [facultyFilter, setFacultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Interactive Metric State for Trend Chart & Year Selection
  const [selectedMetric, setSelectedMetric] = useState<'grossRevenue' | 'discount' | 'netRevenue' | 'totalExpenses' | 'netProfit' | 'profitMargin'>('grossRevenue');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  // Table State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('netRevenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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

      // Look up program ID from course offers
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
      const endDate = new Date(endYear, endMonth, 0, 23, 59, 59); // Last day of that month
      return date >= startDate && date <= endDate;
    }

    return true;
  };

  // Helper to determine the previous period boundary for trend calculations
  const getPreviousPeriodDateRange = (period: typeof periodFilter, startStr?: string, endStr?: string): { start: Date; end: Date } | null => {
    const now = new Date();
    
    if (period === 'this_month') {
      // Prev Month
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start, end };
    }
    if (period === 'this_quarter') {
      // Prev Quarter
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      const end = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59);
      return { start, end };
    }
    if (period === 'this_year') {
      // Prev Year
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      return { start, end };
    }
    if (period === 'last_year') {
      // Year before last
      const start = new Date(now.getFullYear() - 2, 0, 1);
      const end = new Date(now.getFullYear() - 2, 11, 31, 23, 59, 59);
      return { start, end };
    }
    if (period === 'custom' && startStr && endStr) {
      // Previous period of equal duration
      const [sYr, sMn] = startStr.split('-').map(Number);
      const [eYr, eMn] = endStr.split('-').map(Number);
      const start = new Date(sYr, sMn - 1, 1);
      const end = new Date(eYr, eMn, 0, 23, 59, 59);
      const durationMs = end.getTime() - start.getTime();
      
      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - durationMs);
      return { start: prevStart, end: prevEnd };
    }
    return null;
  };

  // 4. MAIN DATA COMPILATION & FILTERING
  const compiledData = useMemo(() => {
    // A. Filter and enrich courses first
    return courseData.map(course => {
      const code = String(course["Course Code"] || course["id"] || "").trim();
      const title = String(course["Course Title"] || course["Course Name"] || "Unnamed Course").trim();
      
      const { faculty, department } = getCourseFacultyAndDept(code);
      const fee = parseFloat(String(course["Course Fee"] || "0").replace(/[^0-9.]/g, "")) || 0;
      
      // Determine course date
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

      // Capacity = default size (e.g., 40) or "Student Size" from course multiplied by filtered batches count
      const defaultSize = parseInt(String(course["Student Size"] || "40").replace(/[^0-9.]/g, ""), 10) || 40;
      const capacity = defaultSize * filteredBatches.length;

      // Calculate revenue
      const grossRevenue = fee * enrolled;
      
      // Calculate discount
      const discount = filteredBatches.reduce((sum, b) => {
        const s = parseInt(String(b["Student"] || b["Students"] || "0").replace(/[^0-9.]/g, ""), 10) || 0;
        const d = parseFloat(String(b["Discount"] || "0").replace(/[^0-9.]/g, "")) || 0;
        return sum + (d * s);
      }, 0);

      const netRevenue = Math.max(0, grossRevenue - discount);

      // Match and classify expenses
      const matchedExpenses = expensesData.filter(exp => {
        const expTag = String(exp["Tag"] || "").trim().toLowerCase();
        const codeLower = code.toLowerCase();
        return expTag === codeLower || expTag.startsWith(codeLower + "-") || expTag.includes(codeLower);
      });

      // Filter expenses by period
      const filteredExpenses = matchedExpenses.filter(exp => {
        const expDate = exp["Date"] || exp["date"] || "";
        const expDateObj = parseDate(expDate) || courseDateObj;
        if (!expDateObj) return true;
        return isDateInPeriod(expDateObj, periodFilter, customStartMonth, customEndMonth);
      });

      const totalExpenses = filteredExpenses.reduce((sum, exp) => {
        const amt = parseFloat(String(exp["Amount"] || "0").replace(/[^0-9.]/g, ""));
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);

      // Detailed Expense Breakdown
      const expenseBreakdown = {
        Instructors: 0,
        Marketing: 0,
        Operations: 0,
        Software: 0,
        Miscellaneous: 0
      };

      filteredExpenses.forEach(exp => {
        const amt = parseFloat(String(exp["Amount"] || "0").replace(/[^0-9.]/g, "")) || 0;
        const category = classifyExpense(exp["Expenses Title"] || exp["title"] || "");
        if (category === 'Instructors') expenseBreakdown.Instructors += amt;
        else if (category === 'Marketing') expenseBreakdown.Marketing += amt;
        else if (category === 'Operations') expenseBreakdown.Operations += amt;
        else if (category === 'Software/Platform') expenseBreakdown.Software += amt;
        else expenseBreakdown.Miscellaneous += amt;
      });

      const netProfit = netRevenue - totalExpenses;
      const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
      const arpu = enrolled > 0 ? netRevenue / enrolled : 0;

      const rawStatus = String(course["Status"] || "").trim().toLowerCase();
      let status: 'Active' | 'Completed' | 'Upcoming' = 'Active';
      if (rawStatus.includes('complete') || rawStatus.includes('done') || rawStatus.includes('finished')) {
        status = 'Completed';
      } else if (rawStatus.includes('upcom') || rawStatus.includes('draft') || rawStatus.includes('propos')) {
        status = 'Upcoming';
      }

      return {
        code,
        title,
        faculty,
        department,
        fee,
        batchesCount: filteredBatches.length,
        enrolled,
        capacity,
        grossRevenue,
        discount,
        netRevenue,
        totalExpenses,
        expenseBreakdown,
        netProfit,
        profitMargin,
        arpu,
        status,
        dateObj: courseDateObj,
        hasHistoryInPeriod: filteredBatches.length > 0 || filteredExpenses.length > 0
      };
    }).filter(c => {
      // Faculty Filter
      if (facultyFilter !== 'all' && c.faculty !== facultyFilter) return false;
      // Status Filter
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      // If we are filtering by a specific period, only show courses that had active batches or expenses in that period,
      // or match the course's own date if there are no batches.
      if (periodFilter !== 'all' && !c.hasHistoryInPeriod) {
        if (c.dateObj && isDateInPeriod(c.dateObj, periodFilter, customStartMonth, customEndMonth)) {
          return true;
        }
        return false;
      }
      return true;
    });
  }, [courseData, mcBatchData, expensesData, periodFilter, customStartMonth, customEndMonth, facultyFilter, statusFilter, getCourseFacultyAndDept]);

  // 5. COMPUTE TOTALS FOR CURRENT PERIOD (OR SELECTED MONTH)
  const totals = useMemo(() => {
    let grossRevenue = 0;
    let netRevenue = 0;
    let discount = 0;
    let totalExpenses = 0;
    let netProfit = 0;
    let enrolled = 0;
    let capacity = 0;
    let batchesCount = 0;

    const expenseBreakdown = {
      Instructors: 0,
      Marketing: 0,
      Operations: 0,
      Software: 0,
      Miscellaneous: 0
    };

    if (selectedMonthKey) {
      courseData.forEach(course => {
        const code = String(course["Course Code"] || course["id"] || "").trim();
        const title = String(course["Course Title"] || course["Course Name"] || "Unnamed Course").trim();
        const fee = parseFloat(String(course["Course Fee"] || "0").replace(/[^0-9.]/g, "")) || 0;
        const courseRawDate = course["Date"] || course["Start Date"] || "";
        const courseDateObj = parseDate(courseRawDate);
        
        const courseBatches = mcBatchData.filter(b => {
          const batchCode = String(b['Course Code'] || b['courseCode'] || '').trim().toLowerCase();
          const batchCourseTitle = String(b['Course Name'] || b['Course Title'] || '').trim().toLowerCase();
          return batchCode === code.toLowerCase() || batchCourseTitle === title.toLowerCase();
        });

        let cEnrolled = 0;
        let cCapacity = 0;
        let cDiscount = 0;
        let cGross = 0;
        let cBatches = 0;

        courseBatches.forEach(b => {
          const batchStart = b["Start Date"] || b["startDate"] || "";
          const batchDateObj = parseDate(batchStart) || courseDateObj;
          if (batchDateObj) {
            const monthKey = `${batchDateObj.getFullYear()}-${String(batchDateObj.getMonth() + 1).padStart(2, '0')}`;
            if (monthKey === selectedMonthKey) {
              const s = parseInt(String(b["Student"] || b["Students"] || "0").replace(/[^0-9.]/g, ""), 10) || 0;
              const d = parseFloat(String(b["Discount"] || "0").replace(/[^0-9.]/g, "")) || 0;
              const defaultSize = parseInt(String(course["Student Size"] || "40").replace(/[^0-9.]/g, ""), 10) || 40;
              cEnrolled += s;
              cCapacity += defaultSize;
              cDiscount += (d * s);
              cGross += (fee * s);
              cBatches += 1;
            }
          }
        });

        grossRevenue += cGross;
        discount += cDiscount;
        netRevenue += Math.max(0, cGross - cDiscount);
        enrolled += cEnrolled;
        capacity += cCapacity;
        batchesCount += cBatches;

        const matchedExpenses = expensesData.filter(exp => {
          const expTag = String(exp["Tag"] || "").trim().toLowerCase();
          const codeLower = code.toLowerCase();
          return expTag === codeLower || expTag.startsWith(codeLower + "-") || expTag.includes(codeLower);
        });

        matchedExpenses.forEach(exp => {
          const expDate = exp["Date"] || exp["date"] || "";
          const expDateObj = parseDate(expDate) || courseDateObj;
          if (expDateObj) {
            const monthKey = `${expDateObj.getFullYear()}-${String(expDateObj.getMonth() + 1).padStart(2, '0')}`;
            if (monthKey === selectedMonthKey) {
              const amt = parseFloat(String(exp["Amount"] || "0").replace(/[^0-9.]/g, "")) || 0;
              totalExpenses += amt;
              const category = classifyExpense(exp["Expenses Title"] || exp["title"] || "");
              if (category === 'Instructors') expenseBreakdown.Instructors += amt;
              else if (category === 'Marketing') expenseBreakdown.Marketing += amt;
              else if (category === 'Operations') expenseBreakdown.Operations += amt;
              else if (category === 'Software/Platform') expenseBreakdown.Software += amt;
              else expenseBreakdown.Miscellaneous += amt;
            }
          }
        });
      });
      netProfit = netRevenue - totalExpenses;
    } else {
      compiledData.forEach(c => {
        grossRevenue += c.grossRevenue;
        netRevenue += c.netRevenue;
        discount += c.discount;
        totalExpenses += c.totalExpenses;
        netProfit += c.netProfit;
        enrolled += c.enrolled;
        capacity += c.capacity;
        batchesCount += c.batchesCount;

        expenseBreakdown.Instructors += c.expenseBreakdown.Instructors;
        expenseBreakdown.Marketing += c.expenseBreakdown.Marketing;
        expenseBreakdown.Operations += c.expenseBreakdown.Operations;
        expenseBreakdown.Software += c.expenseBreakdown.Software;
        expenseBreakdown.Miscellaneous += c.expenseBreakdown.Miscellaneous;
      });
    }

    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
    const arpu = enrolled > 0 ? netRevenue / enrolled : 0;
    const occupancyRate = capacity > 0 ? (enrolled / capacity) * 100 : 0;

    return {
      grossRevenue,
      netRevenue,
      discount,
      totalExpenses,
      netProfit,
      profitMargin,
      enrolled,
      capacity,
      occupancyRate,
      arpu,
      batchesCount,
      expenseBreakdown
    };
  }, [compiledData, selectedMonthKey, courseData, mcBatchData, expensesData]);

  const totalsOverall = useMemo(() => {
    let grossRevenue = 0;
    let netRevenue = 0;
    let discount = 0;
    let totalExpenses = 0;
    let netProfit = 0;
    let enrolled = 0;
    let capacity = 0;
    let batchesCount = 0;

    const expenseBreakdown = {
      Instructors: 0,
      Marketing: 0,
      Operations: 0,
      Software: 0,
      Miscellaneous: 0
    };

    compiledData.forEach(c => {
      grossRevenue += c.grossRevenue;
      netRevenue += c.netRevenue;
      discount += c.discount;
      totalExpenses += c.totalExpenses;
      netProfit += c.netProfit;
      enrolled += c.enrolled;
      capacity += c.capacity;
      batchesCount += c.batchesCount;

      expenseBreakdown.Instructors += c.expenseBreakdown.Instructors;
      expenseBreakdown.Marketing += c.expenseBreakdown.Marketing;
      expenseBreakdown.Operations += c.expenseBreakdown.Operations;
      expenseBreakdown.Software += c.expenseBreakdown.Software;
      expenseBreakdown.Miscellaneous += c.expenseBreakdown.Miscellaneous;
    });

    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
    const arpu = enrolled > 0 ? netRevenue / enrolled : 0;
    const occupancyRate = capacity > 0 ? (enrolled / capacity) * 100 : 0;

    return {
      grossRevenue,
      netRevenue,
      discount,
      totalExpenses,
      netProfit,
      profitMargin,
      enrolled,
      capacity,
      occupancyRate,
      arpu,
      batchesCount,
      expenseBreakdown
    };
  }, [compiledData]);

  // 6. COMPUTE TOTALS FOR PREVIOUS PERIOD (FOR TREND INDICATORS)
  const previousTotals = useMemo(() => {
    const range = getPreviousPeriodDateRange(periodFilter, customStartMonth, customEndMonth);
    if (!range) return null;

    let grossRevenue = 0;
    let netRevenue = 0;
    let totalExpenses = 0;
    let netProfit = 0;
    let enrolled = 0;
    let capacity = 0;

    courseData.forEach(course => {
      const code = String(course["Course Code"] || course["id"] || "").trim();
      const title = String(course["Course Title"] || course["Course Name"] || "Unnamed Course").trim();
      
      const fee = parseFloat(String(course["Course Fee"] || "0").replace(/[^0-9.]/g, "")) || 0;
      const courseRawDate = course["Date"] || course["Start Date"] || "";
      const courseDateObj = parseDate(courseRawDate);

      // Match batches
      const courseBatches = mcBatchData.filter(b => {
        const batchCode = String(b['Course Code'] || b['courseCode'] || '').trim().toLowerCase();
        const batchCourseTitle = String(b['Course Name'] || b['Course Title'] || '').trim().toLowerCase();
        return batchCode === code.toLowerCase() || batchCourseTitle === title.toLowerCase();
      });

      // Filter batches by previous period range
      const prevBatches = courseBatches.filter(b => {
        const batchStart = b["Start Date"] || b["startDate"] || "";
        const batchDateObj = parseDate(batchStart) || courseDateObj;
        return batchDateObj && batchDateObj >= range.start && batchDateObj <= range.end;
      });

      const courseEnrolled = prevBatches.reduce((sum, b) => {
        const s = parseInt(String(b["Student"] || b["Students"] || "0").replace(/[^0-9.]/g, ""), 10);
        return sum + (isNaN(s) ? 0 : s);
      }, 0);

      const defaultSize = parseInt(String(course["Student Size"] || "40").replace(/[^0-9.]/g, ""), 10) || 40;
      const courseCapacity = defaultSize * prevBatches.length;

      const courseGross = fee * courseEnrolled;
      const courseDiscount = prevBatches.reduce((sum, b) => {
        const s = parseInt(String(b["Student"] || b["Students"] || "0").replace(/[^0-9.]/g, ""), 10) || 0;
        const d = parseFloat(String(b["Discount"] || "0").replace(/[^0-9.]/g, "")) || 0;
        return sum + (d * s);
      }, 0);

      const courseNet = Math.max(0, courseGross - courseDiscount);

      // Expenses
      const matchedExpenses = expensesData.filter(exp => {
        const expTag = String(exp["Tag"] || "").trim().toLowerCase();
        const codeLower = code.toLowerCase();
        return expTag === codeLower || expTag.startsWith(codeLower + "-") || expTag.includes(codeLower);
      });

      const prevExpenses = matchedExpenses.filter(exp => {
        const expDate = exp["Date"] || exp["date"] || "";
        const expDateObj = parseDate(expDate) || courseDateObj;
        return expDateObj && expDateObj >= range.start && expDateObj <= range.end;
      });

      const courseExpenses = prevExpenses.reduce((sum, exp) => {
        const amt = parseFloat(String(exp["Amount"] || "0").replace(/[^0-9.]/g, ""));
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);

      const courseProfit = courseNet - courseExpenses;

      // Filter by Faculty/Status
      const { faculty } = getCourseFacultyAndDept(code);
      if (facultyFilter !== 'all' && faculty !== facultyFilter) return;

      const rawStatus = String(course["Status"] || "").trim().toLowerCase();
      let status = 'Active';
      if (rawStatus.includes('complete') || rawStatus.includes('done') || rawStatus.includes('finished')) {
        status = 'Completed';
      } else if (rawStatus.includes('upcom') || rawStatus.includes('draft') || rawStatus.includes('propos')) {
        status = 'Upcoming';
      }
      if (statusFilter !== 'all' && status !== statusFilter) return;

      grossRevenue += courseGross;
      netRevenue += courseNet;
      totalExpenses += courseExpenses;
      netProfit += courseProfit;
      enrolled += courseEnrolled;
      capacity += courseCapacity;
    });

    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
    const arpu = enrolled > 0 ? netRevenue / enrolled : 0;

    return {
      grossRevenue,
      netRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      enrolled,
      capacity,
      arpu
    };
  }, [courseData, mcBatchData, expensesData, periodFilter, customStartMonth, customEndMonth, facultyFilter, statusFilter, getCourseFacultyAndDept]);

  // 7. COMPUTE TREND PERCENTAGES
  const trends = useMemo(() => {
    if (!previousTotals) return null;

    const calcPercentChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      grossRevenue: calcPercentChange(totalsOverall.grossRevenue, previousTotals.grossRevenue),
      netRevenue: calcPercentChange(totalsOverall.netRevenue, previousTotals.netRevenue),
      netProfit: calcPercentChange(totalsOverall.netProfit, previousTotals.netProfit),
      totalExpenses: calcPercentChange(totalsOverall.totalExpenses, previousTotals.totalExpenses),
      arpu: calcPercentChange(totalsOverall.arpu, previousTotals.arpu),
      enrolled: calcPercentChange(totalsOverall.enrolled, previousTotals.enrolled)
    };
  }, [totalsOverall, previousTotals]);

  // 8. DATA FOR CHART 1: MONTHLY REVENUE & PROFIT TRENDS
  const monthlyTrendsData = useMemo(() => {
    const monthlyGroups: Record<string, { 
      monthLabel: string; 
      sortKey: string; 
      gross: number; 
      net: number; 
      expenses: number; 
      profit: number 
    }> = {};

    compiledData.forEach(course => {
      const code = course.code;
      const fee = course.fee;

      // Find monthly distribution via batches
      const courseBatches = mcBatchData.filter(b => {
        const batchCode = String(b['Course Code'] || b['courseCode'] || '').trim().toLowerCase();
        return batchCode === code.toLowerCase();
      });

      courseBatches.forEach(b => {
        const startDateStr = b["Start Date"] || b["startDate"] || "";
        const dateObj = parseDate(startDateStr) || course.dateObj;
        if (!dateObj) return;

        // Verify period filter bounds
        if (!isDateInPeriod(dateObj, periodFilter, customStartMonth, customEndMonth)) return;

        const year = dateObj.getFullYear();
        const monthIdx = dateObj.getMonth();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthLabel = `${monthNames[monthIdx]} ${year}`;
        const sortKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

        const s = parseInt(String(b["Student"] || b["Students"] || "0").replace(/[^0-9.]/g, ""), 10) || 0;
        const disc = (parseFloat(String(b["Discount"] || "0").replace(/[^0-9.]/g, "")) || 0) * s;
        const gross = fee * s;
        const net = Math.max(0, gross - disc);

        if (!monthlyGroups[sortKey]) {
          monthlyGroups[sortKey] = { monthLabel, sortKey, gross: 0, net: 0, expenses: 0, profit: 0 };
        }
        monthlyGroups[sortKey].gross += gross;
        monthlyGroups[sortKey].net += net;
      });

      // Distribute expenses chronologically
      const matchedExpenses = expensesData.filter(exp => {
        const expTag = String(exp["Tag"] || "").trim().toLowerCase();
        return expTag === code.toLowerCase() || expTag.startsWith(code.toLowerCase() + "-") || expTag.includes(code.toLowerCase());
      });

      matchedExpenses.forEach(exp => {
        const expDate = exp["Date"] || exp["date"] || "";
        const dateObj = parseDate(expDate) || course.dateObj;
        if (!dateObj) return;

        if (!isDateInPeriod(dateObj, periodFilter, customStartMonth, customEndMonth)) return;

        const year = dateObj.getFullYear();
        const monthIdx = dateObj.getMonth();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthLabel = `${monthNames[monthIdx]} ${year}`;
        const sortKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

        const amt = parseFloat(String(exp["Amount"] || "0").replace(/[^0-9.]/g, "")) || 0;

        if (!monthlyGroups[sortKey]) {
          monthlyGroups[sortKey] = { monthLabel, sortKey, gross: 0, net: 0, expenses: 0, profit: 0 };
        }
        monthlyGroups[sortKey].expenses += amt;
      });
    });

    // Calculate profit for each month
    return Object.values(monthlyGroups)
      .map(g => ({
        ...g,
        profit: g.net - g.expenses
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [compiledData, mcBatchData, expensesData, periodFilter, customStartMonth, customEndMonth]);

  // 9. DATA FOR 12-MONTH YEARLY TRENDS
  const availableYears = useMemo(() => {
    const years = new Set<number>([2026, 2025, 2024]);
    compiledData.forEach(c => {
      if (c.dateObj) years.add(c.dateObj.getFullYear());
    });
    mcBatchData.forEach(b => {
      const d = parseDate(b["Start Date"] || b["startDate"]);
      if (d) years.add(d.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [compiledData, mcBatchData]);

  const yearlyTrendData = useMemo(() => {
    const result: Array<{
      monthKey: string;
      label: string;
      grossRevenue: number;
      discount: number;
      netRevenue: number;
      netProfit: number;
      totalExpenses: number;
      arpu: number;
      occupancy: number;
    }> = [];

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let m = 0; m < 12; m++) {
      const label = `${monthNames[m]} ${selectedYear}`;
      const monthKey = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
      result.push({
        monthKey,
        label,
        grossRevenue: 0,
        discount: 0,
        netRevenue: 0,
        netProfit: 0,
        totalExpenses: 0,
        arpu: 0,
        occupancy: 0
      });
    }

    const map: Record<string, { label: string; grossRevenue: number; discount: number; netRevenue: number; netProfit: number; totalExpenses: number; studentCount: number; capacityCount: number }> = {};
    result.forEach(item => {
      map[item.monthKey] = { ...item, studentCount: 0, capacityCount: 0 };
    });

    compiledData.forEach(course => {
      const code = course.code;
      const fee = course.fee;

      const courseBatches = mcBatchData.filter(b => {
        const batchCode = String(b['Course Code'] || b['courseCode'] || '').trim().toLowerCase();
        return batchCode === code.toLowerCase();
      });

      courseBatches.forEach(b => {
        const startDateStr = b["Start Date"] || b["startDate"] || "";
        const dateObj = parseDate(startDateStr) || course.dateObj;
        if (!dateObj || dateObj.getFullYear() !== selectedYear) return;

        const monthIdx = dateObj.getMonth();
        const monthKey = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}`;

        if (map[monthKey]) {
          const s = parseInt(String(b["Student"] || b["Students"] || "0").replace(/[^0-9.]/g, ""), 10) || 0;
          const disc = (parseFloat(String(b["Discount"] || "0").replace(/[^0-9.]/g, "")) || 0) * s;
          const gross = fee * s;
          const net = Math.max(0, gross - disc);
          const defaultSize = parseInt(String(course["Student Size"] || "40").replace(/[^0-9.]/g, ""), 10) || 40;

          map[monthKey].grossRevenue += gross;
          map[monthKey].discount += disc;
          map[monthKey].netRevenue += net;
          map[monthKey].studentCount += s;
          map[monthKey].capacityCount += defaultSize;
        }
      });

      const matchedExpenses = expensesData.filter(exp => {
        const expTag = String(exp["Tag"] || "").trim().toLowerCase();
        return expTag === code.toLowerCase() || expTag.startsWith(code.toLowerCase() + "-") || expTag.includes(code.toLowerCase());
      });

      matchedExpenses.forEach(exp => {
        const expDate = exp["Date"] || exp["date"] || "";
        const dateObj = parseDate(expDate) || course.dateObj;
        if (!dateObj || dateObj.getFullYear() !== selectedYear) return;

        const monthIdx = dateObj.getMonth();
        const monthKey = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}`;

        if (map[monthKey]) {
          const amt = parseFloat(String(exp["Amount"] || "0").replace(/[^0-9.]/g, "")) || 0;
          map[monthKey].totalExpenses += amt;
        }
      });
    });

    return result.map(item => {
      const m = map[item.monthKey];
      const netProfit = m.netRevenue - m.totalExpenses;
      const profitMargin = m.netRevenue > 0 ? (netProfit / m.netRevenue) * 100 : 0;
      return {
        label: item.label,
        grossRevenue: m.grossRevenue,
        discount: m.discount,
        netRevenue: m.netRevenue,
        netProfit: netProfit,
        totalExpenses: m.totalExpenses,
        profitMargin: Number(profitMargin.toFixed(1))
      };
    });
  }, [compiledData, mcBatchData, expensesData, selectedYear]);

  // Data for Course / Batch Table filtered by selected year or specific month
  const yearOrMonthTableData = useMemo(() => {
    const result: Array<{
      code: string;
      title: string;
      batchesCount: number;
      batchNos: string[];
      grossRevenue: number;
      discount: number;
      netRevenue: number;
      totalExpenses: number;
      netProfit: number;
      profitMargin: number;
      enrolled: number;
    }> = [];

    compiledData.forEach(course => {
      const code = course.code;
      const fee = course.fee;

      const courseBatches = mcBatchData.filter(b => {
        const batchCode = String(b['Course Code'] || b['courseCode'] || '').trim().toLowerCase();
        return batchCode === code.toLowerCase();
      });

      let courseGross = 0;
      let courseDiscount = 0;
      let courseNet = 0;
      let courseStudents = 0;
      let courseCapacity = 0;
      let validBatchesCount = 0;
      const batchNosList: string[] = [];

      courseBatches.forEach(b => {
        const startDateStr = b["Start Date"] || b["startDate"] || "";
        const dateObj = parseDate(startDateStr) || course.dateObj;
        if (!dateObj) return;

        const year = dateObj.getFullYear();
        const monthIdx = dateObj.getMonth();
        const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

        let matches = false;
        if (selectedMonthKey) {
          matches = monthKey === selectedMonthKey;
        } else {
          matches = year === selectedYear;
        }

        if (matches) {
          validBatchesCount++;
          const bNo = String(b["Batch Number"] || b["batchNumber"] || b["Batch"] || "").trim();
          if (bNo && !batchNosList.includes(bNo)) {
            batchNosList.push(bNo);
          }

          const s = parseInt(String(b["Student"] || b["Students"] || "0").replace(/[^0-9.]/g, ""), 10) || 0;
          const disc = (parseFloat(String(b["Discount"] || "0").replace(/[^0-9.]/g, "")) || 0) * s;
          const gross = fee * s;
          const net = Math.max(0, gross - disc);
          const defaultSize = parseInt(String(course["Student Size"] || "40").replace(/[^0-9.]/g, ""), 10) || 40;

          courseGross += gross;
          courseDiscount += disc;
          courseNet += net;
          courseStudents += s;
          courseCapacity += defaultSize;
        }
      });

      const matchedExpenses = expensesData.filter(exp => {
        const expTag = String(exp["Tag"] || "").trim().toLowerCase();
        return expTag === code.toLowerCase() || expTag.startsWith(code.toLowerCase() + "-") || expTag.includes(code.toLowerCase());
      });

      let courseExpenses = 0;
      matchedExpenses.forEach(exp => {
        const expDate = exp["Date"] || exp["date"] || "";
        const dateObj = parseDate(expDate) || course.dateObj;
        if (!dateObj) return;

        const year = dateObj.getFullYear();
        const monthIdx = dateObj.getMonth();
        const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

        let matches = false;
        if (selectedMonthKey) {
          matches = monthKey === selectedMonthKey;
        } else {
          matches = year === selectedYear;
        }

        if (matches) {
          const amt = parseFloat(String(exp["Amount"] || "0").replace(/[^0-9.]/g, "")) || 0;
          courseExpenses += amt;
        }
      });

      if (courseGross > 0 || courseNet > 0 || courseExpenses > 0 || validBatchesCount > 0) {
        const netProfit = courseNet - courseExpenses;
        const profitMargin = courseNet > 0 ? (netProfit / courseNet) * 100 : 0;

        result.push({
          code,
          title: course.title,
          batchesCount: validBatchesCount || course.batchesCount,
          batchNos: batchNosList,
          grossRevenue: courseGross,
          discount: courseDiscount,
          netRevenue: courseNet,
          totalExpenses: courseExpenses,
          netProfit,
          profitMargin: Number(profitMargin.toFixed(1)),
          enrolled: courseStudents
        });
      }
    });

    return result.sort((a, b) => b.netRevenue - a.netRevenue);
  }, [compiledData, mcBatchData, expensesData, selectedYear, selectedMonthKey]);

  // 9. DATA FOR CHART 2: EXPENSE DISTRIBUTION
  const expenseDonutData = useMemo(() => {
    const { Instructors, Marketing, Operations, Software, Miscellaneous } = totals.expenseBreakdown;
    return [
      { name: 'Instructor Fees', value: Instructors, color: '#0f766e' }, // Teal 700
      { name: 'Marketing & Promotion', value: Marketing, color: '#3b82f6' }, // Blue 500
      { name: 'Operational & Administrative', value: Operations, color: '#f59e0b' }, // Amber 500
      { name: 'Software & Cloud Licenses', value: Software, color: '#a855f7' }, // Purple 500
      { name: 'Miscellaneous', value: Miscellaneous, color: '#64748b' } // Slate 500
    ].filter(item => item.value > 0);
  }, [totals]);

  // 10. DATA FOR CHART 3: TOP 10 COURSES BY REVENUE VS PROFIT
  const topCoursesChartData = useMemo(() => {
    return [...compiledData]
      .sort((a, b) => b.netRevenue - a.netRevenue)
      .slice(0, 10)
      .map(c => ({
        code: c.code,
        title: c.title,
        'Net Revenue': c.netRevenue,
        'Net Profit': c.netProfit
      }));
  }, [compiledData]);

  // 11. DATA FOR CHART 4: DEPARTMENTAL FINANCIAL PERFORMANCE
  const departmentalChartData = useMemo(() => {
    const deptGroups: Record<string, { 
      name: string; 
      'Net Revenue': number; 
      'Expenses': number; 
      'Net Profit': number 
    }> = {};

    compiledData.forEach(c => {
      const deptName = c.faculty || 'Other Faculty';
      if (!deptGroups[deptName]) {
        deptGroups[deptName] = { name: deptName, 'Net Revenue': 0, 'Expenses': 0, 'Net Profit': 0 };
      }
      deptGroups[deptName]['Net Revenue'] += c.netRevenue;
      deptGroups[deptName]['Expenses'] += c.totalExpenses;
      deptGroups[deptName]['Net Profit'] += c.netProfit;
    });

    return Object.values(deptGroups).sort((a, b) => b['Net Revenue'] - a['Net Revenue']);
  }, [compiledData]);

  // 12. DATA FOR CHART 5: DISCOUNT IMPACT ANALYSIS
  const discountImpactData = useMemo(() => {
    return compiledData
      .filter(c => c.grossRevenue > 0)
      .slice(0, 10)
      .map(c => ({
        name: c.code,
        'Net Collected': c.netRevenue,
        'Discount Given': c.discount
      }));
  }, [compiledData]);

  // 13. SEARCH, SORTING, AND PAGINATION FOR DETAILS TABLE
  const searchedAndSortedData = useMemo(() => {
    let result = [...compiledData];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(c => 
        c.code.toLowerCase().includes(query) ||
        c.title.toLowerCase().includes(query) ||
        c.faculty.toLowerCase().includes(query) ||
        c.department.toLowerCase().includes(query)
      );
    }

    // Sorting
    result.sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle string comparison
      if (typeof aValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }

      // Handle number comparison
      return sortDirection === 'asc' 
        ? (aValue || 0) - (bValue || 0) 
        : (bValue || 0) - (aValue || 0);
    });

    return result;
  }, [compiledData, searchQuery, sortField, sortDirection]);

  // Paginated Data
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

  // 14. EXPORT TO CSV HANDLER
  const handleExportCSV = () => {
    const headersList = [
      "Course Code", "Course Title", "Faculty", "Department", "Batches", 
      "Enrolled Students", "Course Fee", "Gross Revenue", "Discount", 
      "Net Revenue", "Total Expenses", "Net Profit", "Profit Margin (%)", "Status"
    ];

    const rows = compiledData.map(c => [
      `"${c.code}"`,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.faculty}"`,
      `"${c.department}"`,
      c.batchesCount,
      c.enrolled,
      c.fee,
      c.grossRevenue,
      c.discount,
      c.netRevenue,
      c.totalExpenses,
      c.netProfit,
      c.profitMargin.toFixed(2),
      c.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headersList.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Financial_Report_${periodFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 15. PRINT REPORT VIEW (PDF EXPORT FRIENDLY)
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Micro-Credentials Financial Performance Report</title>
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
          <h1>Financial Performance Executive Report</h1>
          <div class="meta">
            Period Filter: <strong>${periodFilter.toUpperCase()}</strong> &nbsp;|&nbsp; 
            Department Filter: <strong>${facultyFilter.toUpperCase()}</strong> &nbsp;|&nbsp; 
            Generated on: ${new Date().toLocaleString()}
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Total Gross Revenue</div>
              <div class="card-val">৳ ${totals.grossRevenue.toLocaleString()}</div>
            </div>
            <div class="card">
              <div class="card-title">Total Net Revenue</div>
              <div class="card-val">৳ ${totals.netRevenue.toLocaleString()}</div>
            </div>
            <div class="card">
              <div class="card-title">Total Expenses</div>
              <div class="card-val">৳ ${totals.totalExpenses.toLocaleString()}</div>
            </div>
            <div class="card">
              <div class="card-title">Total Net Profit</div>
              <div class="card-val">৳ ${totals.netProfit.toLocaleString()} (${totals.profitMargin.toFixed(1)}%)</div>
            </div>
          </div>

          <h2>Detailed Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Course Title</th>
                <th>Faculty</th>
                <th class="text-right">Enrolled</th>
                <th class="text-right">Fee</th>
                <th class="text-right">Gross Rev</th>
                <th class="text-right">Discount</th>
                <th class="text-right">Net Rev</th>
                <th class="text-right">Expenses</th>
                <th class="text-right">Net Profit</th>
                <th class="text-right">Margin (%)</th>
              </tr>
            </thead>
            <tbody>
              ${compiledData.map(c => `
                <tr>
                  <td class="font-mono">${c.code}</td>
                  <td><strong>${c.title}</strong></td>
                  <td>${c.faculty}</td>
                  <td class="text-right">${c.enrolled}</td>
                  <td class="text-right font-mono">৳ ${c.fee.toLocaleString()}</td>
                  <td class="text-right font-mono">৳ ${c.grossRevenue.toLocaleString()}</td>
                  <td class="text-right font-mono text-rose-600">৳ ${c.discount.toLocaleString()}</td>
                  <td class="text-right font-mono">৳ ${c.netRevenue.toLocaleString()}</td>
                  <td class="text-right font-mono text-rose-600">৳ ${c.totalExpenses.toLocaleString()}</td>
                  <td class="text-right font-mono" style="color: ${c.netProfit >= 0 ? '#10b981' : '#f43f5e'}">
                    ৳ ${c.netProfit.toLocaleString()}
                  </td>
                  <td class="text-right font-mono" style="font-weight: bold; color: ${c.netProfit >= 0 ? '#10b981' : '#f43f5e'}">
                    ${c.profitMargin.toFixed(1)}%
                  </td>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        
        {/* Card 1: Total Gross Revenue */}
        <div 
          onClick={() => setSelectedMetric('grossRevenue')}
          className={cn(
            "bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            selectedMetric === 'grossRevenue' ? "ring-2 ring-blue-600 border-blue-400 shadow-sm" : "border-blue-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0 shadow-xs">
              <Coins className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-blue-900/70 uppercase tracking-wider block truncate">
                Gross Revenue
              </span>
              <span className="text-sm font-extrabold text-blue-950 font-mono block truncate">
                ৳ {totals.grossRevenue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Discount */}
        <div 
          onClick={() => setSelectedMetric('discount')}
          className={cn(
            "bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            selectedMetric === 'discount' ? "ring-2 ring-rose-600 border-rose-400 shadow-sm" : "border-rose-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-600 text-white rounded-lg shrink-0 shadow-xs">
              <Tag className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-rose-900/70 uppercase tracking-wider block truncate">
                Discount
              </span>
              <span className="text-sm font-extrabold text-rose-950 font-mono block truncate">
                ৳ {totals.discount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Net Revenue */}
        <div 
          onClick={() => setSelectedMetric('netRevenue')}
          className={cn(
            "bg-gradient-to-br from-teal-50/80 via-white to-teal-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            selectedMetric === 'netRevenue' ? "ring-2 ring-teal-600 border-teal-400 shadow-sm" : "border-teal-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-600 text-white rounded-lg shrink-0 shadow-xs">
              <Coins className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-teal-900/70 uppercase tracking-wider block truncate">
                Net Revenue
              </span>
              <span className="text-sm font-extrabold text-teal-950 font-mono block truncate">
                ৳ {totals.netRevenue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Expenses */}
        <div 
          onClick={() => setSelectedMetric('totalExpenses')}
          className={cn(
            "bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            selectedMetric === 'totalExpenses' ? "ring-2 ring-amber-600 border-amber-400 shadow-sm" : "border-amber-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 text-white rounded-lg shrink-0 shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-amber-900/70 uppercase tracking-wider block truncate">
                Total Expenses
              </span>
              <span className="text-sm font-extrabold text-amber-950 font-mono block truncate">
                ৳ {totals.totalExpenses.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: Net Profit */}
        <div 
          onClick={() => setSelectedMetric('netProfit')}
          className={cn(
            "p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            totals.netProfit >= 0 
              ? "bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30" 
              : "bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30",
            selectedMetric === 'netProfit' 
              ? (totals.netProfit >= 0 ? "ring-2 ring-emerald-600 border-emerald-400 shadow-sm" : "ring-2 ring-rose-600 border-rose-400 shadow-sm")
              : (totals.netProfit >= 0 ? "border-emerald-100" : "border-rose-100")
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "p-2 text-white rounded-lg shrink-0 shadow-xs",
              totals.netProfit >= 0 ? "bg-emerald-600" : "bg-rose-600"
            )}>
              {totals.netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider block truncate",
                totals.netProfit >= 0 ? "text-emerald-900/70" : "text-rose-900/70"
              )}>
                Net Profit
              </span>
              <span className={cn(
                "text-sm font-extrabold font-mono block truncate",
                totals.netProfit >= 0 ? "text-emerald-950" : "text-rose-950"
              )}>
                ৳ {totals.netProfit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 6: Profit Margin */}
        <div 
          onClick={() => setSelectedMetric('profitMargin')}
          className={cn(
            "bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            selectedMetric === 'profitMargin' ? "ring-2 ring-indigo-600 border-indigo-400 shadow-sm" : "border-indigo-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0 shadow-xs">
              <Percent className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-indigo-900/70 uppercase tracking-wider block truncate">
                Profit Margin
              </span>
              <span className="text-sm font-extrabold text-indigo-950 font-mono block truncate">
                {totals.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* UNIFIED CARD: 12-MONTH TREND CHART & COURSE DETAILS TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-xs">
        {/* Unified Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              {selectedMetric === 'grossRevenue' && `12-Month Gross Revenue Trend & Details (${selectedYear})`}
              {selectedMetric === 'discount' && `12-Month Discount Trend & Details (${selectedYear})`}
              {selectedMetric === 'netRevenue' && `12-Month Net Revenue Trend & Details (${selectedYear})`}
              {selectedMetric === 'netProfit' && `12-Month Net Profit Trend & Details (${selectedYear})`}
              {selectedMetric === 'totalExpenses' && `12-Month Total Expenses Trend & Details (${selectedYear})`}
              {selectedMetric === 'profitMargin' && `12-Month Profit Margin Trend & Details (${selectedYear})`}
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {selectedMonthKey ? `Filtered by month: ${selectedMonthKey}. Click bar or reset to view full year.` : `Click any monthly bar to filter course details for that month.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedMonthKey && (
              <button
                onClick={() => setSelectedMonthKey(null)}
                className="text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-md transition-all cursor-pointer"
              >
                Reset Year {selectedYear}
              </button>
            )}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="text-[10px] font-bold text-gray-500 uppercase">Period:</span>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setSelectedMonth(m);
                  setSelectedMonthKey(`${selectedYear}-${String(m).padStart(2, '0')}`);
                }}
                className="text-[11px] font-bold text-gray-800 bg-transparent outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
              <input
                type="number"
                min="2020"
                max="2035"
                value={selectedYear}
                onChange={(e) => {
                  const y = Number(e.target.value) || 2026;
                  setSelectedYear(y);
                  setSelectedMonthKey(`${y}-${String(selectedMonth).padStart(2, '0')}`);
                }}
                className="w-12 text-[11px] font-bold text-gray-800 bg-transparent outline-none cursor-pointer font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full">
          
          {/* Left: 12-Month Interactive Trend Chart */}
          <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/30 lg:col-span-5 xl:col-span-5 flex flex-col">
            <div className="text-[12px] font-bold text-gray-700 mb-2 flex items-center justify-between">
              <span>
                Monthly Trend Breakdown
                {selectedMonthKey && (
                  <button onClick={() => setSelectedMonthKey(null)} className="ml-2 text-[10px] bg-gray-200 hover:bg-gray-300 text-gray-600 px-1.5 py-0.5 rounded cursor-pointer transition-colors">
                    Clear Filter
                  </button>
                )}
              </span>
              <span className="text-[11px] font-normal text-teal-700 capitalize">Metric: {selectedMetric.replace(/([A-Z])/g, ' $1')}</span>
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyTrendData} margin={{ top: 5, right: 10, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    axisLine={{ stroke: '#e2e8f0' }} 
                    tickLine={false}
                    angle={-20}
                    textAnchor="end"
                    height={35}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(val) => selectedMetric === 'profitMargin' ? `${val}%` : `৳ ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(val: any) => [
                      selectedMetric === 'profitMargin' ? `${Number(val).toFixed(1)}%` : `৳ ${Number(val).toLocaleString()}`,
                      selectedMetric === 'grossRevenue' ? 'Gross Revenue' :
                      selectedMetric === 'discount' ? 'Discount' :
                      selectedMetric === 'netRevenue' ? 'Net Revenue' :
                      selectedMetric === 'netProfit' ? 'Net Profit' :
                      selectedMetric === 'totalExpenses' ? 'Total Expenses' :
                      'Profit Margin'
                    ]}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                  />
                  <Bar 
                    dataKey={selectedMetric} 
                    onClick={(data: any) => {
                      const mKey = data?.monthKey || data?.payload?.monthKey;
                      if (mKey) {
                        setSelectedMonthKey(prev => prev === mKey ? null : mKey);
                      }
                    }}
                    activeBar={{ filter: 'brightness(0.85)' }}
                    fill={
                      selectedMetric === 'grossRevenue' ? '#2563eb' :
                      selectedMetric === 'discount' ? '#e11d48' :
                      selectedMetric === 'netRevenue' ? '#0d9488' :
                      selectedMetric === 'netProfit' ? '#10b981' :
                      selectedMetric === 'totalExpenses' ? '#f59e0b' :
                      '#6366f1'
                    } 
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right: Cumulative Flow Breakdown */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-row gap-4">
            {/* Cumulative Inputs Summation */}
            <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-xs flex flex-col justify-between w-1/2">
              <div>
                <div className="text-[12px] font-bold text-gray-700 mb-2 border-b border-gray-100 pb-1 flex items-center justify-between">
                  <span>Cumulative Inputs Summation</span>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                    {selectedMonthKey ? `Month: ${selectedMonthKey}` : `Year: ${selectedYear}`}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="flex-1 w-full space-y-1">
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-[11px] text-slate-500">Gross Revenue</span>
                      <span className="text-[11px] font-bold text-slate-800 font-mono">৳ {totals.grossRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-[11px] text-slate-500">Total Enrolled Students</span>
                      <span className="text-[11px] font-bold text-slate-800 font-mono">{totals.enrolled}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-[11px] text-slate-500">Total Discount</span>
                      <span className="text-[11px] font-bold text-rose-600 font-mono">− ৳ {totals.discount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[11px] text-slate-500">Total Expenses</span>
                      <span className="text-[11px] font-bold text-amber-600 font-mono">− ৳ {totals.totalExpenses.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Chart on the right side of amounts */}
                  <div className="w-full sm:w-24 h-24 shrink-0 flex items-center justify-center border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Gross Rev', value: totals.grossRevenue, color: '#2563eb' },
                            { name: 'Discount', value: totals.discount, color: '#f43f5e' },
                            { name: 'Expenses', value: totals.totalExpenses, color: '#f59e0b' }
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={16}
                          outerRadius={32}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {[
                            { name: 'Gross Rev', value: totals.grossRevenue, color: '#2563eb' },
                            { name: 'Discount', value: totals.discount, color: '#f43f5e' },
                            { name: 'Expenses', value: totals.totalExpenses, color: '#f59e0b' }
                          ].filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`৳ ${Number(value).toLocaleString()}`, '']}
                          contentStyle={{ fontSize: '10px', borderRadius: '4px', padding: '2px 4px', backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Cumulative Flow Breakdown */}
            <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-xs space-y-1.5 flex flex-col justify-between w-1/2">
              <div>
                <div className="text-[14px] font-bold text-gray-700 mb-2 border-b border-gray-100 pb-1">
                  <span>Cumulative Flow Breakdown</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="flex-1 w-full space-y-1">
                    <div className="p-1 bg-slate-50 border border-slate-100 rounded">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[12px] font-bold text-slate-700">Gross Revenue</span>
                        <span className="text-[12px] font-extrabold text-slate-800 font-mono">৳ {totals.grossRevenue.toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Sum of (Fee × Enrolled)</p>
                    </div>
                    <div className="p-1 bg-slate-50 border border-slate-100 rounded">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[12px] font-bold text-slate-700">Net Revenue</span>
                        <span className="text-[12px] font-extrabold text-teal-700 font-mono">৳ {totals.netRevenue.toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">Gross − Discount</p>
                    </div>
                    <div className="p-1 bg-slate-50 border border-slate-100 rounded">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[12px] font-bold text-slate-700">Net Profit</span>
                        <span className={cn("text-[12px] font-extrabold font-mono", totals.netProfit >= 0 ? "text-emerald-700" : "text-rose-700")}>
                          ৳ {totals.netProfit.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">Net − Expenses</p>
                    </div>
                  </div>

                  {/* Chart on the right side of amounts */}
                  <div className="w-full sm:w-24 h-24 shrink-0 flex items-center justify-center border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Gross Rev', value: totals.grossRevenue, color: '#475569' },
                            { name: 'Net Rev', value: totals.netRevenue, color: '#0d9488' },
                            { name: 'Net Profit', value: Math.abs(totals.netProfit), color: totals.netProfit >= 0 ? '#10b981' : '#f43f5e' }
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={16}
                          outerRadius={32}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {[
                            { name: 'Gross Rev', value: totals.grossRevenue, color: '#475569' },
                            { name: 'Net Rev', value: totals.netRevenue, color: '#0d9488' },
                            { name: 'Net Profit', value: Math.abs(totals.netProfit), color: totals.netProfit >= 0 ? '#10b981' : '#f43f5e' }
                          ].filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`৳ ${Number(value).toLocaleString()}`, '']}
                          contentStyle={{ fontSize: '10px', borderRadius: '4px', padding: '2px 4px', backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        
        {/* Table Header & Controls */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Financial Breakdown Details
            </h3>
            <p className="text-[9.5px] text-gray-400">Individual program matrices mapping courses, enrollments, gross vs net income, and profit margins.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search code, title, faculty..."
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-teal-500 w-52 bg-white font-medium"
              />
            </div>

            {/* CSV Export */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 hover:bg-slate-50 text-gray-600 text-xs font-bold rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            {/* PDF Report Export */}
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Report</span>
            </button>

          </div>
        </div>

        {/* Live Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-gray-400 font-bold uppercase text-[9px] tracking-wider border-b border-gray-200">
                <th className="py-3 px-4">
                  <button onClick={() => requestSort('code')} className="flex items-center gap-1 text-left hover:text-gray-600 cursor-pointer">
                    Course / Faculty
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-right">
                  <button onClick={() => requestSort('batchesCount')} className="flex items-center gap-1 ml-auto hover:text-gray-600 cursor-pointer">
                    Batches
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-right">
                  <button onClick={() => requestSort('enrolled')} className="flex items-center gap-1 ml-auto hover:text-gray-600 cursor-pointer">
                    Enrolled
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-right">Course Fee</th>
                <th className="py-3 px-3 text-right">
                  <button onClick={() => requestSort('grossRevenue')} className="flex items-center gap-1 ml-auto hover:text-gray-600 cursor-pointer">
                    Gross Rev
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-right">Discount</th>
                <th className="py-3 px-3 text-right">
                  <button onClick={() => requestSort('netRevenue')} className="flex items-center gap-1 ml-auto hover:text-gray-600 cursor-pointer">
                    Net Rev
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-right">
                  <button onClick={() => requestSort('totalExpenses')} className="flex items-center gap-1 ml-auto hover:text-gray-600 cursor-pointer">
                    Expenses
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-right">
                  <button onClick={() => requestSort('netProfit')} className="flex items-center gap-1 ml-auto hover:text-gray-600 cursor-pointer">
                    Net Profit
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-right">
                  <button onClick={() => requestSort('profitMargin')} className="flex items-center gap-1 ml-auto hover:text-gray-600 cursor-pointer">
                    Margin
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-center">Profit Rating</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-xs text-gray-400 italic">
                    No programs matched the current criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  
                  // Color-coded logic for profit margin badges
                  let marginBadgeColor = "bg-slate-50 text-slate-600 border-slate-100";
                  let marginBadgeLabel = "Moderate";
                  if (item.netProfit < 0) {
                    marginBadgeColor = "bg-rose-50 text-rose-600 border-rose-100 font-bold";
                    marginBadgeLabel = "Loss";
                  } else if (item.profitMargin > 30) {
                    marginBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100 font-extrabold";
                    marginBadgeLabel = "High Profit";
                  } else if (item.profitMargin < 10) {
                    marginBadgeColor = "bg-amber-50 text-amber-600 border-amber-100 font-bold";
                    marginBadgeLabel = "Low Profit";
                  }

                  return (
                    <tr key={item.code + index} className="hover:bg-slate-50/70 transition-colors duration-150 font-medium text-gray-700">
                      
                      {/* Code and Title */}
                      <td className="py-2.5 px-4 max-w-xs">
                        <div className="font-bold text-gray-800 truncate" title={item.title}>
                          {item.title}
                        </div>
                        <div className="text-[9px] text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                          <span className="bg-slate-100 px-1 rounded uppercase font-bold text-[8px] text-slate-500">
                            {item.code}
                          </span>
                          <span className="truncate max-w-[120px]">{item.faculty}</span>
                        </div>
                      </td>

                      {/* Batches Count */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-500">
                        {item.batchesCount}
                      </td>

                      {/* Enrolled Students */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-600">
                        {item.enrolled}
                      </td>

                      {/* Course Fee */}
                      <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                        ৳ {item.fee.toLocaleString()}
                      </td>

                      {/* Gross Revenue */}
                      <td className="py-2.5 px-3 text-right font-mono text-gray-800">
                        ৳ {item.grossRevenue.toLocaleString()}
                      </td>

                      {/* Discount Offered */}
                      <td className="py-2.5 px-3 text-right font-mono text-rose-500">
                        {item.discount > 0 ? `৳ ${item.discount.toLocaleString()}` : "—"}
                      </td>

                      {/* Net Revenue */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-700">
                        ৳ {item.netRevenue.toLocaleString()}
                      </td>

                      {/* Total Expenses */}
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                        {item.totalExpenses > 0 ? `৳ ${item.totalExpenses.toLocaleString()}` : "—"}
                      </td>

                      {/* Net Profit */}
                      <td className={cn(
                        "py-2.5 px-3 text-right font-mono font-bold",
                        item.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {item.netProfit < 0 ? "− " : ""}৳ {Math.abs(item.netProfit).toLocaleString()}
                      </td>

                      {/* Profit Margin (%) */}
                      <td className={cn(
                        "py-2.5 px-3 text-right font-mono font-extrabold",
                        item.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {item.profitMargin.toFixed(1)}%
                      </td>

                      {/* Profit Margin Rating Badge */}
                      <td className="py-2.5 px-4 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8.5px] uppercase tracking-wider border",
                          marginBadgeColor
                        )}>
                          {marginBadgeLabel}
                        </span>
                      </td>

                      {/* Status Badges */}
                      <td className="py-2.5 px-4 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider border",
                          item.status === 'Active' && "bg-teal-50 text-teal-600 border-teal-100",
                          item.status === 'Completed' && "bg-slate-50 text-slate-500 border-slate-200",
                          item.status === 'Upcoming' && "bg-blue-50 text-blue-600 border-blue-100"
                        )}>
                          {item.status}
                        </span>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between text-xs font-bold text-gray-500">
            <div>
              Showing <span className="text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-800">{Math.min(currentPage * itemsPerPage, searchedAndSortedData.length)}</span> of <span className="text-gray-800">{searchedAndSortedData.length}</span> programs
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 border border-gray-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all",
                    currentPage === i + 1 
                      ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                      : "bg-white border-gray-200 hover:bg-slate-50 text-gray-600"
                  )}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 border border-gray-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
