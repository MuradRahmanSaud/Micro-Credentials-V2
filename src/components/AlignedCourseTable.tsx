import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X, Trash2, Plus, BookOpen, Users, Phone, Mail, User } from "lucide-react";
import { cn, getPhotoUrl } from "../lib/utils";

export interface AlignedCourseItem {
  pId: string;
  courseCode: string;
  courseTitle: string;
  credit: string;
}

interface AlignedCourseTableProps {
  value: string;
  onChange: (val: string) => void;
  isEditing: boolean;
  courseOfferData?: any[];
  programData?: any[];
  employees?: any[];
}

export function parseAlignedCourses(rawValue: any, courseOfferData: any[] = []): AlignedCourseItem[] {
  if (!rawValue) return [];
  const str = String(rawValue).trim();
  if (!str || str === "—") return [];

  // 1. Try JSON parse
  if (str.startsWith("[")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          pId: String(item.pId || item["P-ID"] || item["PID"] || item["pId"] || "").trim(),
          courseCode: String(item.courseCode || item["Course Code"] || item["courseCode"] || "").trim(),
          courseTitle: String(item.courseTitle || item["Course Title"] || item["courseTitle"] || "").trim(),
          credit: String(item.credit || item["Credit"] || "").trim(),
        }));
      }
    } catch (e) {
      // Fallthrough if invalid JSON
    }
  }

  // 2. Try pipe or comma separated strings
  const lines = str.split(/\n|,|;/).map((s) => s.trim()).filter(Boolean);
  const items: AlignedCourseItem[] = [];

  for (const line of lines) {
    if (line.includes("|")) {
      const cols = line.split("|").map((c) => c.trim());
      items.push({
        pId: cols[0] || "",
        courseCode: cols[1] || "",
        courseTitle: cols[2] || "",
        credit: cols[3] || "",
      });
    } else {
      // Match against courseOfferData if possible
      const match = courseOfferData.find((c) => {
        const code = String(c["Course Code"] || "").trim().toLowerCase();
        const title = String(c["Course Title"] || "").trim().toLowerCase();
        const search = line.toLowerCase();
        return (code && search === code) || (title && search === title) || (title && title.includes(search));
      });

      if (match) {
        items.push({
          pId: String(match["P-ID"] || match["PID"] || "").trim(),
          courseCode: String(match["Course Code"] || "").trim(),
          courseTitle: String(match["Course Title"] || "").trim(),
          credit: String(match["Credit"] || "").trim(),
        });
      } else {
        items.push({
          pId: "",
          courseCode: "",
          courseTitle: line,
          credit: "",
        });
      }
    }
  }

  return items;
}

export default function AlignedCourseTable({
  value,
  onChange,
  isEditing,
  courseOfferData = [],
  programData = [],
  employees = [],
}: AlignedCourseTableProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourseItem, setSelectedCourseItem] = useState<AlignedCourseItem | null>(null);
  const [expandedTeacherKey, setExpandedTeacherKey] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto reset expanded teacher card when selected course changes
  useEffect(() => {
    setExpandedTeacherKey(null);
  }, [selectedCourseItem]);

  // Parse current selected items without multiplying or expanding them to other programs
  const items = useMemo(() => {
    return parseAlignedCourses(value, courseOfferData);
  }, [value, courseOfferData]);

  // Lookup map for PID -> Program Short Name
  const pidToProgramMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!programData || !Array.isArray(programData)) return map;
    for (let i = 0; i < programData.length; i++) {
      const row = programData[i];
      if (!row) continue;
      const pid = String(row["PID"] || row["pid"] || row["P-ID"] || row["P-Id"] || row["p-id"] || "").trim();
      const shortName = String(
        row["Program Short Name"] ||
        row["program short name"] ||
        row["Program Name"] ||
        row["Program"] ||
        row["Program Full Name"] ||
        ""
      ).trim();
      if (pid && shortName) {
        map.set(pid.toLowerCase(), shortName);
      }
    }
    return map;
  }, [programData]);

  const getProgramName = (pId: string) => {
    if (!pId) return "—";
    const clean = pId.trim().toLowerCase();
    return pidToProgramMap.get(clean) || "—";
  };

  // Compute unique teachers taking the selected course or related sections from courseOfferData
  const assignedTeachers = useMemo(() => {
    if (!selectedCourseItem || !courseOfferData || !Array.isArray(courseOfferData)) return [];

    const targetCode = String(selectedCourseItem.courseCode || "").trim().toLowerCase();
    const targetTitle = String(selectedCourseItem.courseTitle || "").trim().toLowerCase();
    const targetPId = String(selectedCourseItem.pId || "").trim().toLowerCase();

    // 1. Find all teacher names or employee IDs who teach the selected course AND program
    const teachersForCourse = new Set<string>();
    courseOfferData.forEach((row) => {
      if (!row) return;
      const code = String(row["Course Code"] || row["course code"] || "").trim().toLowerCase();
      const title = String(row["Course Title"] || row["course title"] || "").trim().toLowerCase();
      const pid = String(row["P-ID"] || row["PID"] || row["P-Id"] || row["p-id"] || "").trim().toLowerCase();

      let matchesCourse = false;
      if (targetCode && code && targetCode === code) matchesCourse = true;
      else if (targetTitle && title && targetTitle === title) matchesCourse = true;
      else if (targetPId && pid && targetPId === pid && targetTitle && title && title.includes(targetTitle)) matchesCourse = true;

      const matchesProgram = targetPId ? (pid === targetPId) : true;

      if (matchesCourse && matchesProgram) {
        const empId = String(row["Employee ID"] || row["employee id"] || row["Teacher ID"] || row["Instructor ID"] || row["ID"] || "").trim().toLowerCase();
        const empName = String(row["Employee Name"] || row["employee name"] || row["Teacher Name"] || row["Instructor"] || row["Instractor"] || "").trim().toLowerCase();
        if (empId) teachersForCourse.add(`id_${empId}`);
        else if (empName) teachersForCourse.add(`name_${empName}`);
      }
    });

    // 2. Filter matching rows to ONLY those rows that match the selected course AND program for these teachers
    const matchingRows = courseOfferData.filter((row) => {
      if (!row) return false;
      const code = String(row["Course Code"] || row["course code"] || "").trim().toLowerCase();
      const title = String(row["Course Title"] || row["course title"] || "").trim().toLowerCase();
      const pid = String(row["P-ID"] || row["PID"] || row["P-Id"] || row["p-id"] || "").trim().toLowerCase();

      let isSelectedCourseMatch = false;
      if (targetCode && code && targetCode === code) isSelectedCourseMatch = true;
      else if (targetTitle && title && targetTitle === title) isSelectedCourseMatch = true;
      else if (targetPId && pid && targetPId === pid && targetTitle && title && title.includes(targetTitle)) isSelectedCourseMatch = true;

      if (!isSelectedCourseMatch) return false;
      if (targetPId && pid !== targetPId) return false;

      const empId = String(row["Employee ID"] || row["employee id"] || row["Teacher ID"] || row["Instructor ID"] || row["ID"] || "").trim().toLowerCase();
      const empName = String(row["Employee Name"] || row["employee name"] || row["Teacher Name"] || row["Instructor"] || row["Instractor"] || "").trim().toLowerCase();
      
      const keyId = empId ? `id_${empId}` : "";
      const keyName = empName ? `name_${empName}` : "";

      return (keyId && teachersForCourse.has(keyId)) || (keyName && teachersForCourse.has(keyName));
    });

    // Group matching rows by unique teacher
    const teacherMap = new Map<string, {
      key: string;
      employeeId: string;
      teacherName: string;
      designation: string;
      mobile: string;
      email: string;
      photoUrl: string;
      assignments: Array<{ pId: string; programName: string; courseCode: string; courseTitle: string; section: string; students: string }>;
    }>();

    matchingRows.forEach((row) => {
      const employeeId = String(
        row["Employee ID"] || row["employee id"] || row["Teacher ID"] || row["Instructor ID"] || row["ID"] || ""
      ).trim();

      const teacherName = String(
        row["Employee Name"] || row["employee name"] || row["Teacher Name"] || row["Instructor"] || row["Instractor"] || ""
      ).trim() || "Unassigned Faculty";

      const section = String(
        row["Section"] || row["section"] || row["Section ID"] || row["Sec"] || "—"
      ).trim();

      const courseCode = String(row["Course Code"] || row["course code"] || "").trim();
      const courseTitle = String(row["Course Title"] || row["course title"] || "").trim();

      const students = String(
        row["Students"] ||
        row["students"] ||
        row["Student Number"] ||
        row["Student Count"] ||
        row["Enrolled"] ||
        row["Total Student"] ||
        row["Total Students"] ||
        row["No. of Students"] ||
        row["No of Students"] ||
        row["Std"] ||
        row["Student"] ||
        "—"
      ).trim();

      const pId = String(row["P-ID"] || row["PID"] || row["P-Id"] || row["p-id"] || "").trim();
      const programName = getProgramName(pId);

      // Key by employeeId if available, else teacherName
      const key = employeeId ? `id_${employeeId.toLowerCase()}` : `name_${teacherName.toLowerCase()}`;

      if (!teacherMap.has(key)) {
        let matchedEmp: any = null;
        if (employees && Array.isArray(employees) && employees.length > 0) {
          matchedEmp = employees.find((e) => {
            if (!e) return false;
            const eId = String(e["Employee ID"] || e["ID"] || "").trim();
            const eName = String(e["Employee Name"] || e["Name"] || "").trim();
            if (employeeId && eId && employeeId.toLowerCase() === eId.toLowerCase()) return true;
            if (teacherName && eName && teacherName.toLowerCase() === eName.toLowerCase()) return true;
            return false;
          });
        }

        const designation = String(
          row["Designation"] ||
          row["designation"] ||
          (matchedEmp && (matchedEmp["Designation"] || matchedEmp["Administrative Designation"])) ||
          "Faculty"
        ).trim();

        const mobile = String(
          row["Mobile"] ||
          row["mobile"] ||
          row["Phone"] ||
          (matchedEmp && (matchedEmp["Mobile"] || matchedEmp["Phone"] || matchedEmp["Contact"])) ||
          "—"
        ).trim();

        const email = String(
          row["Email"] ||
          row["E-mail"] ||
          row["email"] ||
          (matchedEmp && (matchedEmp["E-mail"] || matchedEmp["Email"])) ||
          "—"
        ).trim();

        const photoUrl = getPhotoUrl(matchedEmp || row, teacherName);

        teacherMap.set(key, {
          key,
          employeeId,
          teacherName,
          designation,
          mobile,
          email,
          photoUrl,
          assignments: [],
        });
      }

      const teacher = teacherMap.get(key)!;
      const exists = teacher.assignments.some(
        (a) => a.pId.toLowerCase() === pId.toLowerCase() && 
               a.courseCode.toLowerCase() === courseCode.toLowerCase() && 
               a.section.toLowerCase() === section.toLowerCase()
      );
      if (!exists) {
        teacher.assignments.push({
          pId: pId || "—",
          programName: programName || "—",
          courseCode: courseCode || "—",
          courseTitle: courseTitle || "—",
          section: section || "—",
          students: students || "—",
        });
      }
    });

    return Array.from(teacherMap.values());
  }, [selectedCourseItem, courseOfferData, employees, pidToProgramMap]);

  // Extract unique Course Offer options (unique by pId, courseCode, courseTitle, credit)
  const uniqueOptions = useMemo(() => {
    if (!courseOfferData || !Array.isArray(courseOfferData)) return [];
    const seen = new Set<string>();
    const list: AlignedCourseItem[] = [];

    for (let i = 0; i < courseOfferData.length; i++) {
      const row = courseOfferData[i];
      if (!row) continue;

      const pId = String(row["P-ID"] || row["PID"] || row["P-Id"] || row["p-id"] || row["IP-D"] || row["IPD"] || "").trim();
      const courseCode = String(row["Course Code"] || row["course code"] || "").trim();
      const courseTitle = String(row["Course Title"] || row["course title"] || "").trim();
      const credit = String(row["Credit"] || row["credit"] || "").trim();

      if (!courseCode && !courseTitle) continue;

      const key = `${pId.toLowerCase()}|${courseCode.toLowerCase()}|${courseTitle.toLowerCase()}|${credit.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ pId, courseCode, courseTitle, credit });
      }
    }

    // Sort list so that currently selected items appear at the top!
    const rawItems = parseAlignedCourses(value, courseOfferData);
    const selectedSet = new Set<string>();
    rawItems.forEach(item => {
      const pId = String(item.pId || "").trim().toLowerCase();
      const code = String(item.courseCode || "").trim().toLowerCase();
      const title = String(item.courseTitle || "").trim().toLowerCase();
      if (pId) {
        if (code) selectedSet.add(`${pId}_${code}`);
        if (title) selectedSet.add(`${pId}_${title}`);
      } else {
        if (code) selectedSet.add(code);
        if (title) selectedSet.add(title);
      }
    });

    list.sort((a, b) => {
      const aPid = String(a.pId || "").trim().toLowerCase();
      const aCode = String(a.courseCode || "").trim().toLowerCase();
      const aTitle = String(a.courseTitle || "").trim().toLowerCase();
      const bPid = String(b.pId || "").trim().toLowerCase();
      const bCode = String(b.courseCode || "").trim().toLowerCase();
      const bTitle = String(b.courseTitle || "").trim().toLowerCase();

      let aSelected = false;
      if (aPid) {
        aSelected = (aCode && selectedSet.has(`${aPid}_${aCode}`)) || (aTitle && selectedSet.has(`${aPid}_${aTitle}`));
      } else {
        aSelected = (aCode && selectedSet.has(aCode)) || (aTitle && selectedSet.has(aTitle));
      }

      let bSelected = false;
      if (bPid) {
        bSelected = (bCode && selectedSet.has(`${bPid}_${bCode}`)) || (bTitle && selectedSet.has(`${bPid}_${bTitle}`));
      } else {
        bSelected = (bCode && selectedSet.has(bCode)) || (bTitle && selectedSet.has(bTitle));
      }

      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

    return list;
  }, [courseOfferData, value]);

  // Selected keys lookup set for instant O(1) checks
  const selectedKeys = useMemo(() => {
    const set = new Set<string>();
    const rawItems = parseAlignedCourses(value, courseOfferData);
    rawItems.forEach((item) => {
      const pId = String(item.pId || "").trim().toLowerCase();
      const code = String(item.courseCode || "").trim().toLowerCase();
      const title = String(item.courseTitle || "").trim().toLowerCase();
      const credit = String(item.credit || "").trim().toLowerCase();

      set.add(`${pId}|${code}|${title}|${credit}`);
      if (!credit) {
        set.add(`${pId}|${code}|${title}|nocredit`);
      }
    });
    return set;
  }, [value, courseOfferData]);

  // Filtered options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return uniqueOptions;
    const term = searchTerm.toLowerCase().trim();
    return uniqueOptions.filter((opt) => {
      const programName = getProgramName(opt.pId).toLowerCase();
      return (
        opt.pId.toLowerCase().includes(term) ||
        programName.includes(term) ||
        opt.courseCode.toLowerCase().includes(term) ||
        opt.courseTitle.toLowerCase().includes(term) ||
        opt.credit.toLowerCase().includes(term)
      );
    });
  }, [uniqueOptions, searchTerm, pidToProgramMap]);

  // Limit rendering to top 60 items for instant dropdown opening speed
  const displayedOptions = useMemo(() => {
    return filteredOptions.slice(0, 60);
  }, [filteredOptions]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const isItemSelected = (opt: AlignedCourseItem) => {
    const pId = String(opt.pId || "").trim().toLowerCase();
    const code = String(opt.courseCode || "").trim().toLowerCase();
    const title = String(opt.courseTitle || "").trim().toLowerCase();
    const credit = String(opt.credit || "").trim().toLowerCase();

    const exactKey = `${pId}|${code}|${title}|${credit}`;
    if (selectedKeys.has(exactKey)) return true;
    if (selectedKeys.has(`${pId}|${code}|${title}|nocredit`)) return true;
    return false;
  };

  const isExactCourseMatch = (item: AlignedCourseItem, opt: AlignedCourseItem) => {
    const iPId = String(item.pId || "").trim().toLowerCase();
    const iCode = String(item.courseCode || "").trim().toLowerCase();
    const iTitle = String(item.courseTitle || "").trim().toLowerCase();
    const iCredit = String(item.credit || "").trim().toLowerCase();

    const oPId = String(opt.pId || "").trim().toLowerCase();
    const oCode = String(opt.courseCode || "").trim().toLowerCase();
    const oTitle = String(opt.courseTitle || "").trim().toLowerCase();
    const oCredit = String(opt.credit || "").trim().toLowerCase();

    const pIdMatch = iPId === oPId;
    const codeMatch = iCode === oCode;
    const titleMatch = iTitle === oTitle;
    const creditMatch = !iCredit || !oCredit || iCredit === oCredit;

    return pIdMatch && codeMatch && titleMatch && creditMatch;
  };

  const toggleSelectOption = (opt: AlignedCourseItem) => {
    const rawItems = parseAlignedCourses(value, courseOfferData);

    const alreadySelected = rawItems.some((item) => isExactCourseMatch(item, opt));

    let nextItems: AlignedCourseItem[];
    if (alreadySelected) {
      nextItems = rawItems.filter((item) => !isExactCourseMatch(item, opt));
    } else {
      nextItems = [...rawItems, opt];
    }
    onChange(JSON.stringify(nextItems));
  };

  const handleRemoveIndex = (index: number) => {
    const nextItems = items.filter((_, idx) => idx !== index);
    onChange(JSON.stringify(nextItems));
  };

  return (
    <div className="w-full flex flex-col bg-white border-none rounded-xl shadow-none relative overflow-hidden h-[460px] md:h-[500px] max-h-[calc(100vh-220px)]">
      {isEditing && (
        <div className="flex items-center justify-end mb-2.5 shrink-0 relative z-30">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-white border border-teal-200 hover:border-teal-300 hover:bg-teal-50/60 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Select Aligned Course ({uniqueOptions.length})</span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 shrink-0", isDropdownOpen && "rotate-180")} />
            </button>

            {/* Dropdown Panel */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-[560px] bg-white rounded-xl shadow-2xl border border-slate-200 z-[9999] overflow-hidden flex flex-col max-h-[380px]">
                {/* Search Bar */}
                <div className="p-2 border-b border-slate-200 bg-slate-50/80 flex items-center gap-2 shrink-0">
                  <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by P-ID, Program Name, Course Code, or Title..."
                    className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400 py-0.5"
                    autoFocus
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")} className="text-slate-400 hover:text-slate-600 p-0.5 mr-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Table Header in Dropdown */}
                <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-slate-100/80 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0">
                  <div className="col-span-1 truncate">P-ID</div>
                  <div className="col-span-2 truncate">Program Name</div>
                  <div className="col-span-3 truncate">Course Code</div>
                  <div className="col-span-4 truncate">Course Title</div>
                  <div className="col-span-2 text-right truncate">Credit</div>
                </div>

                {/* Options List */}
                <div className="overflow-y-auto divide-y divide-slate-100 flex-1 min-h-0">
                  {displayedOptions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No matching Course Offer entries found</div>
                  ) : (
                    displayedOptions.map((opt, idx) => {
                      const selected = isItemSelected(opt);
                      const programName = getProgramName(opt.pId);
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleSelectOption(opt)}
                          className={cn(
                            "grid grid-cols-12 gap-2 px-3 py-2 text-xs items-center cursor-pointer transition-colors hover:bg-teal-50/60",
                            selected && "bg-teal-50/80 font-medium"
                          )}
                        >
                          <div className="col-span-1 text-slate-600 font-mono text-[11px] truncate">
                            {opt.pId || "—"}
                          </div>
                          <div className="col-span-2 text-indigo-700 font-semibold text-[11px] truncate" title={programName}>
                            {programName}
                          </div>
                          <div className="col-span-3 text-teal-700 font-mono font-bold text-[11px] truncate">
                            {opt.courseCode || "—"}
                          </div>
                          <div className="col-span-4 text-slate-800 truncate flex items-center gap-1.5">
                            {selected && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                            <span className={cn(selected ? "font-semibold text-teal-900" : "")}>{opt.courseTitle || "—"}</span>
                          </div>
                          <div className="col-span-2 text-right text-slate-600 font-mono text-[11px]">
                            {opt.credit || "—"}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer bar if list is truncated */}
                {filteredOptions.length > displayedOptions.length && (
                  <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 font-medium text-center shrink-0">
                    Showing top {displayedOptions.length} of {filteredOptions.length} courses. Type in search bar to find more.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Container with split view layout when a course is selected */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative">
        {/* Left-side Table - shrinks width when selectedCourseItem is open */}
        <div
          className={cn(
            "flex-1 overflow-y-auto no-scrollbar min-h-0 transition-all duration-300",
            selectedCourseItem ? "w-full md:w-3/5 lg:w-2/3 border-none" : "w-full"
          )}
        >
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="px-3.5 py-2.5 w-1 whitespace-nowrap">P-ID</th>
                <th className="px-3.5 py-2.5 w-1 whitespace-nowrap">Program Name</th>
                <th className="px-3.5 py-2.5 w-1 whitespace-nowrap">Course Code</th>
                <th className="px-3.5 py-2.5">Course Title</th>
                <th className="px-3.5 py-2.5 w-1 whitespace-nowrap text-center">Credit</th>
                {isEditing && <th className="px-3.5 py-2.5 w-1 whitespace-nowrap text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={isEditing ? 6 : 5}
                    className="px-4 py-8 text-center text-slate-400 italic text-xs bg-slate-50/30"
                  >
                    No aligned courses selected.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const isSelected = selectedCourseItem === item;
                  return (
                    <tr
                      key={idx}
                      onClick={() => {
                        if (selectedCourseItem === item) {
                          setSelectedCourseItem(null);
                        } else {
                          setSelectedCourseItem(item);
                        }
                      }}
                      className={cn(
                        "hover:bg-teal-50/70 transition-colors cursor-pointer group",
                        isSelected && "bg-teal-50/90 font-medium border-l-4 border-l-teal-600 text-teal-950"
                      )}
                      title="Click to view course faculty and details on the right"
                    >
                      <td className="px-3.5 py-2.5 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                        {item.pId || "—"}
                      </td>
                      <td className="px-3.5 py-2.5 font-sans font-semibold text-indigo-700 text-[11px] whitespace-nowrap">
                        {getProgramName(item.pId)}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-teal-700 text-[11px] whitespace-nowrap">
                        {item.courseCode || "—"}
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-800 group-hover:text-teal-900">
                        {item.courseTitle || "—"}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-center text-slate-600 text-[11px] whitespace-nowrap">
                        {item.credit || "—"}
                      </td>
                      {isEditing && (
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedCourseItem === item) setSelectedCourseItem(null);
                              handleRemoveIndex(idx);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Remove aligned course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Right-side Detail View Panel for Selected Course */}
        {selectedCourseItem && (
          <div className="w-full md:w-80 lg:w-[350px] bg-slate-50/70 border-t md:border-t-0 md:border-l border-slate-200/80 flex flex-col h-full min-h-0 shrink-0 animate-in slide-in-from-right duration-200 rounded-none">
            {/* Right Panel Header */}
            <div className="px-2.5 py-2 bg-teal-600 text-white flex items-start justify-between shrink-0 shadow-xs border-none rounded-none">
              <div className="space-y-0.5 pr-2 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  {selectedCourseItem.pId && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-white/20 text-white border border-white/30 rounded">
                      P-ID: {selectedCourseItem.pId}
                    </span>
                  )}
                  {getProgramName(selectedCourseItem.pId) !== "—" && (
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-white/20 text-white border border-white/30 rounded truncate max-w-[130px]" title={getProgramName(selectedCourseItem.pId)}>
                      {getProgramName(selectedCourseItem.pId)}
                    </span>
                  )}
                  {selectedCourseItem.courseCode && (
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded">
                      {selectedCourseItem.courseCode}
                    </span>
                  )}
                  {selectedCourseItem.credit && (
                    <span className="px-1.5 py-0.5 text-[9px] font-medium bg-white/20 text-white rounded">
                      {selectedCourseItem.credit} CR
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-white leading-tight truncate" title={selectedCourseItem.courseTitle}>
                  {selectedCourseItem.courseTitle || "Aligned Course Details"}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCourseItem(null)}
                className="p-1 text-teal-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Close Detail View"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right Panel Body - Assigned Teachers */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-2.5 space-y-2.5 min-h-0">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Assigned Teachers ({assignedTeachers.length})
                  </h4>
                </div>
                <span className="text-[9px] font-semibold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                  Course Offer
                </span>
              </div>

              {assignedTeachers.length === 0 ? (
                <div className="p-4 text-center bg-white rounded-lg border border-dashed border-slate-200 shadow-2xs space-y-1">
                  <Users className="w-5 h-5 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">No Teacher records found</p>
                  <p className="text-[10px] text-slate-400">
                    No matching teacher in Course Offer for <span className="font-mono font-bold">{selectedCourseItem.courseCode || selectedCourseItem.courseTitle}</span>.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedTeachers.map((teacher) => {
                    const isExpanded = expandedTeacherKey === teacher.key;

                    return (
                      <div
                        key={teacher.key}
                        className={cn(
                          "bg-white rounded-lg border transition-all overflow-hidden shadow-2xs",
                          isExpanded ? "border-teal-400 ring-1 ring-teal-300/40" : "border-slate-200/90 hover:border-teal-300"
                        )}
                      >
                        {/* Clickable Header */}
                        <div
                          onClick={() => setExpandedTeacherKey((prev) => (prev === teacher.key ? null : teacher.key))}
                          className="p-2.5 flex items-center justify-between gap-2 cursor-pointer select-none bg-white hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <img
                              src={teacher.photoUrl}
                              alt={teacher.teacherName}
                              className="w-9 h-9 rounded-md object-cover border border-slate-200 shadow-2xs shrink-0 bg-slate-100"
                              onError={(e) => {
                                (e.target as HTMLElement).setAttribute(
                                  "src",
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.teacherName)}&background=0D9488&color=fff`
                                );
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold text-slate-900 leading-snug truncate" title={teacher.teacherName}>
                                {teacher.teacherName}
                              </h5>
                              <div className="text-[10px] text-slate-600 truncate mt-0.5">
                                <span className="font-medium text-slate-700 truncate">{teacher.designation}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-1.5 py-0.5 text-[9px] font-bold text-teal-800 bg-teal-50 border border-teal-200/80 rounded flex items-center gap-1">
                              <span className="text-[8px] text-teal-600 uppercase font-semibold">Assign:</span>
                              <span>{teacher.assignments.length}</span>
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0",
                                isExpanded && "rotate-180 text-teal-600"
                              )}
                            />
                          </div>
                        </div>

                        {/* Collapsible Content Drawer */}
                        {isExpanded && (
                          <div className="p-2.5 pt-1.5 bg-slate-50/70 border-t border-slate-100 space-y-2.5 text-[10px] animate-in fade-in duration-150">
                            {/* Contact Details inside Collapsible Panel - Side by side */}
                            <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-slate-700">
                              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200/80 min-w-0 col-span-1">
                                <Phone className="w-3 h-3 text-teal-600 shrink-0" />
                                <span className="font-mono text-[10px] text-slate-800 truncate" title={teacher.mobile}>
                                  {teacher.mobile || "—"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200/80 min-w-0 col-span-2">
                                <Mail className="w-3 h-3 text-teal-600 shrink-0" />
                                <span className="text-[10px] text-slate-800 truncate" title={teacher.email}>
                                  {teacher.email || "—"}
                                </span>
                              </div>
                            </div>

                            {/* Assigned Programs Table */}
                            <div className="border border-slate-200/90 rounded-md overflow-hidden bg-white shadow-2xs">
                              <div className="bg-slate-100/90 px-2 py-1 border-b border-slate-200 text-[9px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                                <span>Assigned Programs</span>
                                <span className="text-teal-700 font-mono text-[9px]">{teacher.assignments.length} assignment(s)</span>
                              </div>
                              <table className="w-full text-left text-[10px]">
                                <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200/80 uppercase text-[8px] tracking-wider">
                                  <tr>
                                    <th className="px-2 py-1 w-1 whitespace-nowrap">P-ID</th>
                                    <th className="px-2 py-1">Program</th>
                                    <th className="px-2 py-1 w-1 whitespace-nowrap text-center">Sec</th>
                                    <th className="px-2 py-1 w-1 whitespace-nowrap text-center">Students</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  {teacher.assignments.map((asgn, aIdx) => (
                                    <tr key={aIdx} className="hover:bg-teal-50/50">
                                      <td className="px-2 py-1 font-mono font-bold text-slate-600 whitespace-nowrap">{asgn.pId}</td>
                                      <td className="px-2 py-1 font-semibold text-indigo-700 truncate max-w-[130px]" title={asgn.programName}>
                                        {asgn.programName}
                                      </td>
                                      <td className="px-2 py-1 font-mono font-bold text-teal-800 text-center whitespace-nowrap">{asgn.section}</td>
                                      <td className="px-2 py-1 font-mono font-semibold text-slate-700 text-center whitespace-nowrap">{asgn.students}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
