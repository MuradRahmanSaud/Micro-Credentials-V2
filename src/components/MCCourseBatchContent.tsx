import React from 'react';
import { Trash2, Search, Plus, Check, X, Layers, Calendar, Clock, Users, ChevronRight } from 'lucide-react';
import BatchDetailsView from './BatchDetailsView';
import { cn, formatToMmmDdYyyy } from '../lib/utils';

interface MCCourseBatchContentProps {
  courseBatches: any[];
  batchPage: number;
  setBatchPage: React.Dispatch<React.SetStateAction<number>>;
  ITEMS_PER_PAGE: number;
  isAddBatchOpen: boolean;
  setIsAddBatchOpen?: (val: boolean) => void;
  newBatchesData: any[];
  setNewBatchesData: React.Dispatch<React.SetStateAction<any[]>>;
  batchWarning: string | null;
  setBatchWarning: (val: string | null) => void;
  handleAddBatch?: () => Promise<void>;
  getNextBatchNumber?: (currentNewBatches?: any[]) => string;
  editedBatches: Record<string, any>;
  setEditedBatches: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  selectedBatchIndex: number | null;
  handleSelectBatchWithAutoSave: (index: number, batchKey: string) => void;
  isBatchRunning: (batch: any) => boolean;
  employees: any[];
  isEditing: boolean;
  data: any;
  editedData: any;
  workflowData?: any;
  documents: any[];
  localNewDocs: any[];
  setEditedDocs: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setLocalNewDocs: React.Dispatch<React.SetStateAction<any[]>>;
  extraFormProps?: any;
  batchSearchTerm?: string;
  setBatchSearchTerm?: (val: string) => void;
}

export const MCCourseBatchContent: React.FC<MCCourseBatchContentProps> = ({
  courseBatches,
  batchPage,
  setBatchPage,
  ITEMS_PER_PAGE,
  isAddBatchOpen,
  setIsAddBatchOpen,
  newBatchesData,
  setNewBatchesData,
  batchWarning,
  setBatchWarning,
  handleAddBatch,
  getNextBatchNumber,
  editedBatches,
  setEditedBatches,
  selectedBatchIndex,
  handleSelectBatchWithAutoSave,
  isBatchRunning,
  employees,
  isEditing,
  data,
  editedData,
  workflowData,
  documents,
  localNewDocs,
  setEditedDocs,
  setLocalNewDocs,
  extraFormProps,
  batchSearchTerm = '',
  setBatchSearchTerm
}) => {
  const totalBatches = courseBatches.length;
  const totalBatchPages = Math.ceil(totalBatches / ITEMS_PER_PAGE) || 1;
  const currentBatchPage = Math.min(batchPage, totalBatchPages);
  const paginatedBatches = courseBatches.slice((currentBatchPage - 1) * ITEMS_PER_PAGE, currentBatchPage * ITEMS_PER_PAGE);

  const renderFloatingAddBatchBtn = () => (
    <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-full shadow-lg border border-slate-200">
      {isAddBatchOpen && (
        <>
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              const incompleteRow = newBatchesData.find(b => !b["Start Date"] || !b["End Date"]);
              if (incompleteRow) {
                setBatchWarning("invalid");
                return;
              }
              setBatchWarning(null);
              if (handleAddBatch) await handleAddBatch();
            }}
            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
            title="Save Batch"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (setIsAddBatchOpen) setIsAddBatchOpen(false);
              setNewBatchesData([]);
              setBatchWarning(null);
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
        id="add-batch-btn"
        onClick={async (e) => {
          e.stopPropagation();
          if (isAddBatchOpen) {
            const incompleteRow = newBatchesData.find(b => !b["Start Date"] || !b["End Date"]);
            if (incompleteRow) {
              setBatchWarning("invalid");
              return;
            }
            setBatchWarning(null);
            if (getNextBatchNumber) {
              const nextNum = getNextBatchNumber(newBatchesData);
              setNewBatchesData(prev => [
                ...prev,
                {
                  "Batch Number": nextNum,
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
            setBatchWarning(null);
            if (setIsAddBatchOpen) setIsAddBatchOpen(true);
          }
        }}
        className="flex items-center gap-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-full shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
        title={isAddBatchOpen ? "Add Another Batch Row" : "Add Batch"}
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{isAddBatchOpen ? "Add Row" : "Add Batch"}</span>
      </button>
    </div>
  );

  // Auto-select first batch if none is selected and batches exist
  React.useEffect(() => {
    if (selectedBatchIndex === null && courseBatches.length > 0) {
      const firstKey = courseBatches[0]["Batch Number"] || `batch-0`;
      handleSelectBatchWithAutoSave(0, firstKey);
    }
  }, [courseBatches, selectedBatchIndex]);

  const filteredBatches = React.useMemo(() => {
    if (!batchSearchTerm) return courseBatches;
    const term = batchSearchTerm.toLowerCase();
    return courseBatches.filter(b => 
      String(b["Batch Number"] || "").toLowerCase().includes(term) ||
      String(b["Start Date"] || "").toLowerCase().includes(term) ||
      String(b["End Date"] || "").toLowerCase().includes(term) ||
      String(b["Instractor"] || "").toLowerCase().includes(term) ||
      String(b["Student"] || "").toLowerCase().includes(term)
    );
  }, [courseBatches, batchSearchTerm]);

  const filteredTotalBatches = filteredBatches.length;
  const filteredTotalPages = Math.ceil(filteredTotalBatches / ITEMS_PER_PAGE) || 1;
  const filteredCurrentPage = Math.min(batchPage, filteredTotalPages);
  const displayBatches = filteredBatches.slice((filteredCurrentPage - 1) * ITEMS_PER_PAGE, filteredCurrentPage * ITEMS_PER_PAGE);

  const getBatchStatusInfo = (batch: any) => {
    const statusExplicit = batch["Status"] || batch["status"];
    const startVal = batch["Start Date"] || batch["startDate"];
    const endVal = batch["End Date"] || batch["endDate"];

    let derivedStatus = statusExplicit || '';

    if (!derivedStatus && startVal && endVal) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDate = new Date(startVal);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(endVal);
      endDate.setHours(23, 59, 59, 999);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        if (today > endDate) {
          derivedStatus = 'Completed';
        } else if (today >= startDate && today <= endDate) {
          derivedStatus = 'Running';
        } else {
          derivedStatus = 'Upcoming';
        }
      }
    }

    if (!derivedStatus) derivedStatus = 'Upcoming';

    const lower = derivedStatus.toLowerCase();
    if (lower === 'running') {
      return {
        label: 'Running',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200/80',
        dot: true
      };
    } else if (lower === 'completed') {
      return {
        label: 'Completed',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200/80',
        dot: false
      };
    } else {
      return {
        label: 'Upcoming',
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-200/80',
        dot: false
      };
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full min-h-[460px] bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shadow-xs">
      {/* Left Panel: Batch Cards List */}
      <div className={cn("w-full md:w-[260px] lg:w-[280px] bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-0", selectedBatchIndex !== null ? "hidden md:flex" : "flex")}>
        {/* Left Panel Header */}
        <div className="p-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
              Batches ({courseBatches.length})
            </span>
          </div>
          <button
            id="add-batch-btn"
            onClick={async (e) => {
              e.stopPropagation();
              if (isAddBatchOpen) {
                const incompleteRow = newBatchesData.find(b => !b["Start Date"] || !b["End Date"]);
                if (incompleteRow) {
                  setBatchWarning("invalid");
                  return;
                }
                setBatchWarning(null);
                if (getNextBatchNumber) {
                  const nextNum = getNextBatchNumber(newBatchesData);
                  setNewBatchesData(prev => [
                    ...prev,
                    {
                      "Batch Number": nextNum,
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
                setBatchWarning(null);
                if (setIsAddBatchOpen) setIsAddBatchOpen(true);
              }
            }}
            className="flex items-center gap-1 px-2 py-0.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            title="Add New Batch"
          >
            <Plus className="w-3 h-3" />
            <span>Add Batch</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-1.5 border-b border-slate-100 bg-white shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            <input 
              type="text"
              placeholder="Filter batches..."
              value={batchSearchTerm}
              onChange={(e) => setBatchSearchTerm && setBatchSearchTerm(e.target.value)}
              className="w-full text-[11px] pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-teal-500 outline-none transition-all"
            />
            {batchSearchTerm && (
              <button 
                onClick={() => setBatchSearchTerm && setBatchSearchTerm('')}
                className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Batch Cards Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
          {/* New Batch Creation Entry Card */}
          {isAddBatchOpen && (
            <div className="bg-teal-50/70 border-2 border-dashed border-teal-500 rounded-md p-2 shadow-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-teal-200/60 pb-1">
                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
                  <Plus className="w-3 h-3 text-teal-600" /> New Batch Entry
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const incompleteRow = newBatchesData.find(b => !b["Start Date"] || !b["End Date"]);
                      if (incompleteRow) {
                        setBatchWarning("invalid");
                        return;
                      }
                      setBatchWarning(null);
                      if (handleAddBatch) await handleAddBatch();
                    }}
                    className="px-1.5 py-0.5 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold rounded flex items-center gap-0.5 transition-all cursor-pointer"
                    title="Save Batch"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (setIsAddBatchOpen) setIsAddBatchOpen(false);
                      setNewBatchesData([]);
                      setBatchWarning(null);
                    }}
                    className="p-0.5 text-slate-400 hover:text-red-500 rounded transition-all cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {newBatchesData.map((newBatchRow, rowIndex) => (
                <div key={`new-batch-card-${rowIndex}`} className="space-y-1.5 text-[11px]">
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-0.5">Batch No</label>
                      <input 
                        type="text" 
                        placeholder="Batch No" 
                        value={newBatchRow["Batch Number"] || ""} 
                        onChange={e => {
                          const updated = [...newBatchesData];
                          updated[rowIndex] = { ...newBatchRow, "Batch Number": e.target.value };
                          setNewBatchesData(updated);
                        }}
                        className="w-full text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:border-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-0.5">Students</label>
                      <input 
                        type="number" 
                        placeholder="Count" 
                        value={newBatchRow["Student"] || ""} 
                        onChange={e => {
                          const updated = [...newBatchesData];
                          updated[rowIndex] = { ...newBatchRow, "Student": e.target.value };
                          setNewBatchesData(updated);
                        }}
                        className="w-full text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:border-teal-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-0.5">Start Date *</label>
                      <input 
                        type="date" 
                        value={newBatchRow["Start Date"] || ""} 
                        onChange={e => {
                          const updated = [...newBatchesData];
                          updated[rowIndex] = { ...newBatchRow, "Start Date": e.target.value };
                          setNewBatchesData(updated);
                          if (e.target.value && newBatchRow["End Date"]) setBatchWarning(null);
                        }}
                        className={`w-full text-[10px] bg-white border rounded px-1 py-0.5 outline-none ${
                          !newBatchRow["Start Date"] && batchWarning ? "border-red-400 bg-red-50/30" : "border-slate-200 focus:border-teal-500"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-0.5">End Date *</label>
                      <input 
                        type="date" 
                        value={newBatchRow["End Date"] || ""} 
                        onChange={e => {
                          const updated = [...newBatchesData];
                          updated[rowIndex] = { ...newBatchRow, "End Date": e.target.value };
                          setNewBatchesData(updated);
                          if (newBatchRow["Start Date"] && e.target.value) setBatchWarning(null);
                        }}
                        className={`w-full text-[10px] bg-white border rounded px-1 py-0.5 outline-none ${
                          !newBatchRow["End Date"] && batchWarning ? "border-red-400 bg-red-50/30" : "border-slate-200 focus:border-teal-500"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cards List */}
          {displayBatches.length === 0 && !isAddBatchOpen ? (
            <div className="p-4 text-center text-slate-400 italic text-[11px] border border-dashed border-slate-200 rounded-md bg-slate-50/50">
              No matching batches found.
            </div>
          ) : (
            displayBatches.map((batch) => {
              const originalIndex = courseBatches.indexOf(batch);
              const index = originalIndex !== -1 ? originalIndex : 0;
              const batchKey = batch["Batch Number"] || `batch-${index}`;
              const localBatch = editedBatches[batchKey] || batch;
              const isSelected = selectedBatchIndex === index;
              const isDirty = JSON.stringify(localBatch) !== JSON.stringify(batch);
              const statusInfo = getBatchStatusInfo(localBatch);

              // Clean batch title formatting (e.g. Batch-01)
              const rawBatchNum = localBatch["Batch Number"] || localBatch["Batch No"] || localBatch["batch_number"] || "";
              let batchTitle = String(rawBatchNum || '').trim();
              if (!batchTitle) {
                batchTitle = `Batch-${String(index + 1).padStart(2, '0')}`;
              } else {
                batchTitle = batchTitle.replace(/^Batch\s*#?\s*/i, '');
                if (!batchTitle.toLowerCase().startsWith('batch')) {
                  batchTitle = `Batch-${batchTitle}`;
                }
              }

              // Instructor assignment check
              const rawInstructor = localBatch["Instractor"] || localBatch["Instructor"] || "";
              const hasInstructor = typeof rawInstructor === 'string'
                ? (rawInstructor.trim().length > 0 && rawInstructor.trim() !== '-' && rawInstructor.trim() !== 'N/A')
                : Boolean(rawInstructor);

              return (
                <div
                  key={batchKey || index}
                  onClick={() => handleSelectBatchWithAutoSave(index, batchKey)}
                  className={cn(
                    "group relative p-2 rounded-md border transition-all duration-150 cursor-pointer flex flex-col gap-1.5",
                    isSelected 
                      ? "bg-teal-50/90 border-teal-600 shadow-2xs ring-1 ring-teal-500/20" 
                      : "bg-white border-slate-200 hover:border-teal-300 hover:shadow-2xs"
                  )}
                >
                  {/* Card Top Row: Title + Status Badge */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={cn("text-[11px] font-bold tracking-tight truncate", isSelected ? "text-teal-950" : "text-slate-800")} title={batchTitle}>
                        {batchTitle}
                      </span>
                      {isDirty && (
                        <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 uppercase shrink-0">
                          Edit
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border shrink-0 uppercase tracking-tight", statusInfo.badgeClass)}>
                        {statusInfo.dot && (
                          <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                          </span>
                        )}
                        {statusInfo.label}
                      </span>
                      <ChevronRight className={cn("w-3.5 h-3.5 transition-transform shrink-0", isSelected ? "text-teal-600 translate-x-0.5" : "text-slate-300 group-hover:text-slate-400")} />
                    </div>
                  </div>

                  {/* Card Dates */}
                  <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1 truncate" title={`Start: ${localBatch["Start Date"] || 'N/A'}`}>
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate font-mono">
                        {localBatch["Start Date"] ? formatToMmmDdYyyy(localBatch["Start Date"]) : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 truncate" title={`End: ${localBatch["End Date"] || 'N/A'}`}>
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate font-mono">
                        {localBatch["End Date"] ? formatToMmmDdYyyy(localBatch["End Date"]) : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Card Remarks */}
                  {localBatch["Remarks"] && (
                    <div className="text-[10px] text-slate-600 truncate border-t border-slate-100 pt-1">
                      <span className="font-bold text-slate-500">Remarks:</span> {localBatch["Remarks"]}
                    </div>
                  )}

                  {/* Card Bottom Row */}
                  <div className="flex items-center justify-between text-[10px] pt-0.5 gap-1">
                    <div className="flex items-center gap-1 text-teal-800 font-semibold bg-teal-100/70 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                      <Users className="w-3 h-3 text-teal-600 shrink-0" />
                      <span>{localBatch["Student"] ? `${localBatch["Student"]}` : "0"} St.</span>
                    </div>

                    {hasInstructor ? (
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 truncate" title={`Instructor: ${rawInstructor}`}>
                        Instructor Assigned
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 truncate">
                        Instructor Not Assigned
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {filteredTotalPages > 1 && (
          <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">
              Page {filteredCurrentPage} of {filteredTotalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setBatchPage(p => Math.max(p - 1, 1))}
                disabled={filteredCurrentPage === 1}
                className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <button
                onClick={() => setBatchPage(p => Math.min(p + 1, filteredTotalPages))}
                disabled={filteredCurrentPage === filteredTotalPages}
                className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Batch Information View */}
      <div className={cn("flex-1 bg-slate-50 flex flex-col min-h-0 min-w-0", selectedBatchIndex === null ? "hidden md:flex" : "flex")}>
        {selectedBatchIndex !== null && courseBatches[selectedBatchIndex] ? (() => {
          const selectedBatchData = courseBatches[selectedBatchIndex];
          const selectedBatchKey = selectedBatchData ? (selectedBatchData["Batch Number"] || `batch-${selectedBatchIndex}`) : '';
          const batchToPass = (selectedBatchKey && editedBatches[selectedBatchKey]) ? editedBatches[selectedBatchKey] : selectedBatchData;

          return (
            <div className="flex flex-col h-full w-full min-h-0">
              {/* Header Bar */}
              <div className="px-4 py-2 bg-slate-800 text-white flex items-center justify-between shrink-0 shadow-xs border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
                    Batch Information — Batch #{selectedBatchData["Batch Number"] || (selectedBatchIndex + 1)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectBatchWithAutoSave(null, '')}
                  className="md:hidden flex items-center gap-1 text-xs font-semibold bg-slate-700 text-slate-200 px-2 py-1 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Back
                </button>
              </div>

              {/* Batch Details View */}
              <div className="flex-1 overflow-y-auto p-1 bg-slate-50">
                <BatchDetailsView 
                  batch={batchToPass} 
                  allBatches={courseBatches}
                  employees={employees} 
                  isEditing={isEditing}
                  courseFee={editedData?.["Course Fee"] !== undefined ? editedData["Course Fee"] : (data?.["Course Fee"] ?? "")}
                  onSaveBatch={async (batchData) => {
                    if (isEditing) {
                      const batchKey = batchData["Batch Number"] || batchData["id"] || batchData["ID"] || selectedBatchKey;
                      setEditedBatches(prev => ({ ...prev, [batchKey]: batchData }));
                    } else if (extraFormProps?.onSaveBatch) {
                      await extraFormProps.onSaveBatch(batchData, batchData);
                    }
                  }}
                  workflowData={workflowData}
                  documents={[...documents, ...localNewDocs]}
                  onSaveDocument={async (docData, originalRow) => {
                    if (extraFormProps?.onSaveDocument) {
                      await extraFormProps.onSaveDocument(docData, originalRow);
                    }
                    if (isEditing) {
                      const docKey = docData["Documents Title"] || docData["id"] || docData["ID"];
                      setEditedDocs(prev => ({ ...prev, [docKey]: docData }));
                    }
                    if (setLocalNewDocs) {
                      setLocalNewDocs(prev => [...prev, docData]);
                    }
                  }}
                  expensesData={extraFormProps?.expensesData}
                  onSaveExpense={extraFormProps?.onSaveExpense}
                  expensesHeaders={extraFormProps?.expensesHeaders}
                  onViewFile={extraFormProps?.onViewFile}
                />
              </div>
            </div>
          );
        })() : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 min-h-[350px]">
            <Layers className="w-12 h-12 mb-3 text-teal-600/40" />
            <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">No Batch Selected</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
              Select a batch card from the left panel to view and manage its detailed information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MCCourseBatchContent;
