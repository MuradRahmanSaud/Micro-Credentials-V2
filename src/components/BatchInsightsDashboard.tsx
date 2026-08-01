import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Target, 
  Percent, 
  GraduationCap,
  Calendar,
  Filter,
  Search,
  Download,
  PieChart as PieIcon,
  BarChart2,
  TrendingUp,
  Activity,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
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

interface BatchInsightsDashboardProps {
  courseData: any[];
  mcBatchData: any[];
  expensesData?: any[];
  programNameData?: any[];
  courseOfferData?: any[];
}

const parseDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (!str) return null;

  const matchYmd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (matchYmd) {
    return new Date(parseInt(matchYmd[1], 10), parseInt(matchYmd[2], 10) - 1, parseInt(matchYmd[3], 10));
  }
  const matchDmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (matchDmy) {
    return new Date(parseInt(matchDmy[3], 10), parseInt(matchDmy[2], 10) - 1, parseInt(matchDmy[1], 10));
  }
  const ts = Date.parse(str);
  if (!isNaN(ts)) {
    return new Date(ts);
  }
  return null;
};

export default function BatchInsightsDashboard({
  courseData = [],
  mcBatchData = [],
  programNameData = [],
  courseOfferData = []
}: BatchInsightsDashboardProps) {
  // Filters
  const [periodFilter, setPeriodFilter] = useState<'all' | 'this_month' | 'this_quarter' | 'this_year'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Table State
  const [sortField, setSortField] = useState<string>('batchCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Chart Metric
  const [selectedMetric, setSelectedMetric] = useState<'batchCount' | 'studentCount' | 'occupancyRate'>('batchCount');

  // Parse and Enrich Batches
  const enrichedBatches = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return mcBatchData.map((b, idx) => {
      const batchCode = b["Batch Code"] || b["Batch ID"] || b["Code"] || b["batchCode"] || `Batch-${idx+1}`;
      const courseCode = b["Course Code"] || b["courseCode"] || "";
      const courseTitle = b["Course Title"] || b["Course Name"] || b["courseTitle"] || b["Title"] || "Untitled Course";

      const startDateStr = b["Start Date"] || b["startDate"] || b["Start date"] || "";
      const endDateStr = b["End Date"] || b["endDate"] || b["End date"] || "";

      const startDate = parseDate(startDateStr);
      const endDate = parseDate(endDateStr);

      let batchStatus = "Running";
      if (startDate && endDate) {
        if (startDate > today) batchStatus = "Upcoming";
        else if (endDate < today) batchStatus = "Completed";
        else batchStatus = "Running";
      } else if (startDate) {
        if (startDate > today) batchStatus = "Upcoming";
        else batchStatus = "Running";
      } else if (endDate) {
        if (endDate < today) batchStatus = "Completed";
        else batchStatus = "Running";
      } else {
        const rawStatus = String(b["Status"] || b["status"] || "").toLowerCase();
        if (rawStatus.includes("complete") || rawStatus.includes("done") || rawStatus.includes("finished")) batchStatus = "Completed";
        else if (rawStatus.includes("upcom") || rawStatus.includes("draft")) batchStatus = "Upcoming";
        else batchStatus = "Running";
      }

      const enrolled = parseInt(String(b["Student"] || b["Students"] || b["Enrolled"] || "0").replace(/[^0-9.]/g, ""), 10) || 0;
      const capacity = parseInt(String(b["Student Size"] || b["Capacity"] || b["Class"] || "30").replace(/[^0-9.]/g, ""), 10) || 30;
      const occupancyRate = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
      const mode = b["Mode"] || b["mode"] || "Offline";

      return {
        raw: b,
        batchCode,
        courseCode,
        courseTitle,
        startDateStr,
        endDateStr,
        startDate,
        endDate,
        status: batchStatus,
        enrolled,
        capacity,
        occupancyRate,
        mode
      };
    });
  }, [mcBatchData]);

  // Apply Filters
  const filteredBatches = useMemo(() => {
    return enrichedBatches.filter(b => {
      // Status Filter
      if (statusFilter !== 'all' && b.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Mode Filter
      if (modeFilter !== 'all' && b.mode.toLowerCase() !== modeFilter.toLowerCase()) {
        return false;
      }

      // Period Filter
      if (periodFilter !== 'all') {
        const d = b.startDate || b.endDate;
        if (d) {
          const now = new Date();
          if (periodFilter === 'this_month') {
            if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
          } else if (periodFilter === 'this_quarter') {
            const currentQ = Math.floor(now.getMonth() / 3);
            const dQ = Math.floor(d.getMonth() / 3);
            if (dQ !== currentQ || d.getFullYear() !== now.getFullYear()) return false;
          } else if (periodFilter === 'this_year') {
            if (d.getFullYear() !== now.getFullYear()) return false;
          }
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = b.batchCode.toLowerCase().includes(q);
        const matchTitle = b.courseTitle.toLowerCase().includes(q);
        const matchCourseCode = b.courseCode.toLowerCase().includes(q);
        const matchStatus = b.status.toLowerCase().includes(q);
        const matchMode = b.mode.toLowerCase().includes(q);
        if (!matchCode && !matchTitle && !matchCourseCode && !matchStatus && !matchMode) return false;
      }

      return true;
    });
  }, [enrichedBatches, statusFilter, modeFilter, periodFilter, searchQuery]);

  // Totals & KPI Metrics
  const totals = useMemo(() => {
    let running = 0;
    let completed = 0;
    let upcoming = 0;
    let totalStudents = 0;
    let totalCap = 0;

    filteredBatches.forEach(b => {
      if (b.status === 'Running') running++;
      else if (b.status === 'Completed') completed++;
      else if (b.status === 'Upcoming') upcoming++;

      totalStudents += b.enrolled;
      totalCap += b.capacity;
    });

    const totalCount = filteredBatches.length;
    const avgOccupancy = totalCap > 0 ? Math.round((totalStudents / totalCap) * 100) : 0;
    const avgStudentsPerBatch = totalCount > 0 ? Math.round(totalStudents / totalCount) : 0;

    return {
      totalCount,
      running,
      completed,
      upcoming,
      totalStudents,
      totalCap,
      avgOccupancy,
      avgStudentsPerBatch
    };
  }, [filteredBatches]);

  // Monthly Trend Data (12 Months of Current Year)
  const monthlyTrendData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = 2026;

    const monthlyStats = months.map((monthName, idx) => ({
      month: monthName,
      monthIdx: idx,
      batchCount: 0,
      studentCount: 0,
      totalCapacity: 0,
      occupancyRate: 0
    }));

    filteredBatches.forEach(b => {
      const d = b.startDate || b.endDate;
      if (d && d.getFullYear() === currentYear) {
        const mIdx = d.getMonth();
        if (mIdx >= 0 && mIdx < 12) {
          monthlyStats[mIdx].batchCount += 1;
          monthlyStats[mIdx].studentCount += b.enrolled;
          monthlyStats[mIdx].totalCapacity += b.capacity;
        }
      }
    });

    monthlyStats.forEach(m => {
      m.occupancyRate = m.totalCapacity > 0 ? Math.round((m.studentCount / m.totalCapacity) * 100) : 0;
    });

    return monthlyStats;
  }, [filteredBatches]);

  // Status Distribution Data for Pie Chart
  const statusPieData = useMemo(() => {
    return [
      { name: 'Running', value: totals.running, color: '#4f46e5' }, // Indigo
      { name: 'Completed', value: totals.completed, color: '#10b981' }, // Emerald
      { name: 'Upcoming', value: totals.upcoming, color: '#f59e0b' } // Amber
    ].filter(item => item.value > 0);
  }, [totals]);

  // Mode Distribution Data for Pie Chart
  const modePieData = useMemo(() => {
    const modeCounts: Record<string, number> = { Online: 0, Offline: 0, Hybrid: 0 };
    filteredBatches.forEach(b => {
      const m = b.mode.toLowerCase();
      if (m.includes("online")) modeCounts.Online++;
      else if (m.includes("hybrid")) modeCounts.Hybrid++;
      else modeCounts.Offline++;
    });

    return [
      { name: 'Offline', value: modeCounts.Offline, color: '#0ea5e9' },
      { name: 'Online', value: modeCounts.Online, color: '#8b5cf6' },
      { name: 'Hybrid', value: modeCounts.Hybrid, color: '#f43f5e' }
    ].filter(item => item.value > 0);
  }, [filteredBatches]);

  // Top Courses by Batch Count
  const topCoursesByBatches = useMemo(() => {
    const courseMap: Record<string, { title: string; count: number; enrolled: number }> = {};
    filteredBatches.forEach(b => {
      const key = b.courseTitle || b.courseCode || "Unknown";
      if (!courseMap[key]) {
        courseMap[key] = { title: key, count: 0, enrolled: 0 };
      }
      courseMap[key].count += 1;
      courseMap[key].enrolled += b.enrolled;
    });

    return Object.values(courseMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredBatches]);

  // Sorted and Paginated Table Batches
  const sortedBatches = useMemo(() => {
    return [...filteredBatches].sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredBatches, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedBatches.length / itemsPerPage) || 1;
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedBatches.slice(start, start + itemsPerPage);
  }, [sortedBatches, currentPage]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ["Batch Code", "Course Title", "Start Date", "End Date", "Status", "Mode", "Enrolled", "Capacity", "Occupancy Rate (%)"];
    const rows = sortedBatches.map(b => [
      `"${b.batchCode}"`,
      `"${b.courseTitle}"`,
      `"${b.startDateStr}"`,
      `"${b.endDateStr}"`,
      `"${b.status}"`,
      `"${b.mode}"`,
      b.enrolled,
      b.capacity,
      `${b.occupancyRate}%`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Batch_Insights_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-2 w-full px-1 sm:px-2 py-1 custom-scrollbar">

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
        
        {/* Total Batches */}
        <div 
          onClick={() => setStatusFilter('all')}
          className={cn(
            "bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            statusFilter === 'all' ? "ring-2 ring-indigo-600 border-indigo-400 shadow-sm" : "border-indigo-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0 shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs md:text-sm lg:text-base font-bold text-indigo-900/70 uppercase tracking-wider block truncate">
                Total Batches
              </span>
              <span className="text-sm md:text-base lg:text-lg font-extrabold text-indigo-950 font-mono block truncate">
                {totals.totalCount}
              </span>
            </div>
          </div>
        </div>

        {/* Running Batches */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Running' ? 'all' : 'Running')}
          className={cn(
            "bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            statusFilter === 'Running' ? "ring-2 ring-blue-600 border-blue-400 shadow-sm" : "border-blue-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0 shadow-xs">
              <PlayCircle className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs md:text-sm lg:text-base font-bold text-blue-900/70 uppercase tracking-wider block truncate">
                Running Batch
              </span>
              <span className="text-sm md:text-base lg:text-lg font-extrabold text-blue-950 font-mono block truncate">
                {totals.running}
              </span>
            </div>
          </div>
        </div>

        {/* Completed Batches */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'all' : 'Completed')}
          className={cn(
            "bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            statusFilter === 'Completed' ? "ring-2 ring-emerald-600 border-emerald-400 shadow-sm" : "border-emerald-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0 shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs md:text-sm lg:text-base font-bold text-emerald-900/70 uppercase tracking-wider block truncate">
                Completed Batch
              </span>
              <span className="text-sm md:text-base lg:text-lg font-extrabold text-emerald-950 font-mono block truncate">
                {totals.completed}
              </span>
            </div>
          </div>
        </div>

        {/* Upcoming Batches */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Upcoming' ? 'all' : 'Upcoming')}
          className={cn(
            "bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
            statusFilter === 'Upcoming' ? "ring-2 ring-amber-600 border-amber-400 shadow-sm" : "border-amber-100"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 text-white rounded-lg shrink-0 shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs md:text-sm lg:text-base font-bold text-amber-900/70 uppercase tracking-wider block truncate">
                Upcoming Batch
              </span>
              <span className="text-sm md:text-base lg:text-lg font-extrabold text-amber-950 font-mono block truncate">
                {totals.upcoming}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* FILTER BAR & SEARCH */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Period Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select 
              value={periodFilter}
              onChange={(e: any) => setPeriodFilter(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="all">All Period</option>
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year (2026)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select 
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="Running">Running</option>
              <option value="Completed">Completed</option>
              <option value="Upcoming">Upcoming</option>
            </select>
          </div>

          {/* Mode Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700">
            <select 
              value={modeFilter}
              onChange={(e: any) => setModeFilter(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="all">All Modes</option>
              <option value="Offline">Offline</option>
              <option value="Online">Online</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search batch code or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-500 transition-all"
            />
          </div>

          <button 
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 12-MONTH BATCH TREND CHART */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                Monthly Batch Performance (2026)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Track batch creation, student enrollments, and capacity over time</p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setSelectedMetric('batchCount')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                  selectedMetric === 'batchCount' ? "bg-white text-teal-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Batches
              </button>
              <button
                onClick={() => setSelectedMetric('studentCount')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                  selectedMetric === 'studentCount' ? "bg-white text-teal-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Students
              </button>
              <button
                onClick={() => setSelectedMetric('occupancyRate')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                  selectedMetric === 'occupancyRate' ? "bg-white text-teal-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Occupancy %
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="batchColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey={selectedMetric} 
                  stroke="#0d9488" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#batchColor)" 
                  name={selectedMetric === 'batchCount' ? 'Batches' : selectedMetric === 'studentCount' ? 'Students' : 'Occupancy (%)'}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* STATUS & MODE DISTRIBUTION */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* Status Donut */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex-1 flex flex-col justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Batch Status Distribution</span>
              <PieIcon className="w-4 h-4 text-slate-400" />
            </h4>
            <div className="h-36 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-600 mt-2">
              {statusPieData.map(item => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}: <b>{item.value}</b></span>
                </div>
              ))}
            </div>
          </div>

          {/* Mode Donut */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex-1 flex flex-col justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Delivery Mode Breakdown</span>
              <BarChart2 className="w-4 h-4 text-slate-400" />
            </h4>
            <div className="h-36 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {modePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-600 mt-2">
              {modePieData.map(item => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}: <b>{item.value}</b></span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* BATCHES TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" />
              Batch Directory ({sortedBatches.length})
            </h3>
            <p className="text-xs text-slate-400">Detailed list of all batches with enrollment and timeline details</p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {paginatedBatches.length} of {sortedBatches.length} batches
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th 
                  onClick={() => handleSort('batchCode')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-all"
                >
                  <div className="flex items-center gap-1">
                    <span>Batch Code</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('courseTitle')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-all"
                >
                  <div className="flex items-center gap-1">
                    <span>Course Title</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">End Date</th>
                <th 
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-all"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Mode</th>
                <th 
                  onClick={() => handleSort('enrolled')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 transition-all"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Enrolled</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Capacity</th>
                <th className="py-3 px-4 text-center">Occupancy Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedBatches.length > 0 ? (
                paginatedBatches.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {b.batchCode}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs truncate" title={b.courseTitle}>
                      {b.courseTitle}
                      {b.courseCode && <span className="text-[10px] text-slate-400 block font-normal">{b.courseCode}</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {b.startDateStr || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {b.endDateStr || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        b.status === 'Running' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                        b.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          b.status === 'Running' ? "bg-indigo-500 animate-pulse" :
                          b.status === 'Completed' ? "bg-emerald-500" :
                          "bg-amber-500"
                        )} />
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {b.mode}
                    </td>
                    <td className="py-3 px-4 text-right font-bold font-mono text-slate-900">
                      {b.enrolled}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {b.capacity}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              b.occupancyRate >= 80 ? "bg-emerald-500" :
                              b.occupancyRate >= 50 ? "bg-teal-500" :
                              "bg-amber-500"
                            )}
                            style={{ width: `${Math.min(100, b.occupancyRate)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold font-mono text-slate-700">
                          {b.occupancyRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No batches match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
