import React from 'react';
import { Trash2, Search, Plus, Check, X } from 'lucide-react';
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

  if (courseBatches.length === 0 && !isAddBatchOpen) {
    return (
      <div className="relative py-6 px-4 m-3 text-center rounded border border-dashed border-slate-200 bg-slate-50/50 min-h-[220px] flex flex-col items-center justify-center">
        <span className="text-gray-400 text-[13px] font-medium block mb-1">NO BATCHES FOUND</span>
        <p className="text-gray-400/70 text-[13px] italic">No matching batches found.</p>
        {renderFloatingAddBatchBtn()}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full min-h-[300px]">
      <div className="flex flex-col md:flex-row w-full bg-white flex-1 min-h-0">
        <div className="w-full md:w-[45%] relative flex flex-col min-h-0">
          <div className="w-full h-full overflow-y-auto no-scrollbar">
            <table className="w-full table-auto text-left relative">
            <thead className="bg-gray-50 shadow-sm sticky top-0 z-10">
              <tr>
                <th className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-tighter border-b border-gray-200 border-r border-gray-100 bg-gray-50 whitespace-nowrap text-left">Batch No</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-tighter border-b border-gray-200 border-r border-gray-100 bg-gray-50 whitespace-nowrap text-center">Start Date</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-tighter border-b border-gray-200 border-r border-gray-100 bg-gray-50 whitespace-nowrap text-center">End Date</th>
                <th className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-tighter border-b border-gray-200 border-r border-gray-100 bg-gray-50 whitespace-nowrap text-center">Student</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isAddBatchOpen && newBatchesData.map((newBatchRow, rowIndex) => (
                <tr key={`new-batch-${rowIndex}`} data-add-batch-row="true" className="bg-amber-50/30">
                  <td className="px-2 py-1 border-r border-gray-100">
                    <input 
                        type="text" 
                        placeholder="Batch No" 
                        value={newBatchRow["Batch Number"] || ""} 
                        onChange={e => {
                          const updated = [...newBatchesData];
                          updated[rowIndex] = { ...newBatchRow, "Batch Number": e.target.value };
                          setNewBatchesData(updated);
                        }}
                        className="w-full min-w-[80px] text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:border-teal-500 outline-none"
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-gray-100 text-center">
                    <input 
                        type="date" 
                        value={newBatchRow["Start Date"] || ""} 
                        onChange={e => {
                          const updated = [...newBatchesData];
                          updated[rowIndex] = { ...newBatchRow, "Start Date": e.target.value };
                          setNewBatchesData(updated);
                          if (e.target.value && newBatchRow["End Date"]) {
                            const stillIncomplete = updated.some(b => !b["Start Date"] || !b["End Date"]);
                            if (!stillIncomplete) {
                              setBatchWarning(null);
                            }
                          }
                        }}
                        className={`w-full min-w-[100px] text-[11px] bg-white border rounded px-1.5 py-0.5 outline-none transition-all ${
                          !newBatchRow["Start Date"] && batchWarning 
                            ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-200" 
                            : "border-slate-200 focus:border-teal-500"
                        }`}
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-gray-100 text-center">
                    <input 
                        type="date" 
                        value={newBatchRow["End Date"] || ""} 
                        onChange={e => {
                          const updated = [...newBatchesData];
                          updated[rowIndex] = { ...newBatchRow, "End Date": e.target.value };
                          setNewBatchesData(updated);
                          if (newBatchRow["Start Date"] && e.target.value) {
                            const stillIncomplete = updated.some(b => !b["Start Date"] || !b["End Date"]);
                            if (!stillIncomplete) {
                              setBatchWarning(null);
                            }
                          }
                        }}
                        className={`w-full min-w-[100px] text-[11px] bg-white border rounded px-1.5 py-0.5 outline-none transition-all ${
                          !newBatchRow["End Date"] && batchWarning 
                            ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-200" 
                            : "border-slate-200 focus:border-teal-500"
                        }`}
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-gray-100 text-center">
                    <div className="flex items-center gap-1.5">
                      <input 
                          type="number" 
                          placeholder="Students" 
                          value={newBatchRow["Student"] || ""} 
                          onChange={e => {
                            const updated = [...newBatchesData];
                            updated[rowIndex] = { ...newBatchRow, "Student": e.target.value };
                            setNewBatchesData(updated);
                          }}
                          className="w-full min-w-[50px] text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:border-teal-500 outline-none"
                      />
                      {newBatchesData.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = newBatchesData.filter((_, idx) => idx !== rowIndex);
                            setNewBatchesData(updated);
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0 cursor-pointer"
                          title="Remove Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedBatches.map((batch, localIndex) => {
                const index = (currentBatchPage - 1) * ITEMS_PER_PAGE + localIndex;
                const batchKey = batch["Batch Number"] || `batch-${index}`;
                const localBatch = editedBatches[batchKey] || batch;
                const isBatchDirty = JSON.stringify(localBatch) !== JSON.stringify(batch);

                return (
                  <React.Fragment key={index}>
                    <tr 
                      onClick={() => handleSelectBatchWithAutoSave(index, batchKey)}
                      className={cn("group transition-all duration-150 text-xs hover:bg-gray-50/80 cursor-pointer", selectedBatchIndex === index ? "bg-teal-100/85 hover:bg-teal-100" : "")}
                    >
                      <td className={cn("px-2 py-1 text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-100 transition-all duration-150 text-left", selectedBatchIndex === index ? "border-l-[3px] border-teal-600" : "")}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900">{localBatch["Batch Number"] || "N/A"}</span>
                          {isBatchDirty && (
                            <span className="text-[8px] font-bold text-amber-500 bg-amber-50 px-1 rounded border border-amber-200 uppercase tracking-tighter">Edited</span>
                          )}
                          {isBatchRunning(localBatch) && (
                            <span className="relative flex h-1.5 w-1.5 shrink-0" title="Active Running Batch">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1 font-mono text-[11px] text-gray-600 border-r border-gray-100 transition-all duration-150 text-center">
                        {localBatch["Start Date"] ? formatToMmmDdYyyy(localBatch["Start Date"]) : "—"}
                      </td>
                      <td className="px-2 py-1 font-mono text-[11px] text-gray-600 border-r border-gray-100 transition-all duration-150 text-center">
                        {localBatch["End Date"] ? formatToMmmDdYyyy(localBatch["End Date"]) : "—"}
                      </td>
                      <td className="px-2 py-1 text-[11px] font-medium text-teal-600 transition-all duration-150 text-center border-r border-gray-100">
                        {localBatch["Student"] ? `${localBatch["Student"]}` : "—"}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {renderFloatingAddBatchBtn()}
      </div>
        <div className="hidden md:flex w-full md:w-[55%] bg-slate-50 relative border-l border-slate-200 flex-col">
          {(() => {
            const selectedBatchData = courseBatches[selectedBatchIndex ?? 0];
            const selectedBatchKey = selectedBatchData ? (selectedBatchData["Batch Number"] || `batch-${selectedBatchIndex}`) : '';
            const batchToPass = (selectedBatchKey && editedBatches[selectedBatchKey]) ? editedBatches[selectedBatchKey] : selectedBatchData;

            return (
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
                  if (isEditing) {
                    const docKey = docData["Documents Title"] || docData["id"] || docData["ID"];
                    setEditedDocs(prev => ({ ...prev, [docKey]: docData }));
                    setLocalNewDocs(prev => [...prev, docData]);
                  } else if (extraFormProps?.onSaveDocument) {
                    await extraFormProps.onSaveDocument(docData, originalRow);
                  }
                }}
                expensesData={extraFormProps?.expensesData}
                onSaveExpense={extraFormProps?.onSaveExpense}
                expensesHeaders={extraFormProps?.expensesHeaders}
                onViewFile={extraFormProps?.onViewFile}
              />
            );
          })()}
        </div>
      </div>
      {totalBatchPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/80 shrink-0">
          <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
            Showing {(currentBatchPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentBatchPage * ITEMS_PER_PAGE, totalBatches)} of {totalBatches}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setBatchPage(p => Math.max(1, p - 1))}
              disabled={currentBatchPage === 1}
              className="px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="px-2 text-[11px] font-bold text-gray-700">
              {currentBatchPage} / {totalBatchPages}
            </span>
            <button
              onClick={() => setBatchPage(p => Math.min(totalBatchPages, p + 1))}
              disabled={currentBatchPage === totalBatchPages}
              className="px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MCCourseBatchContent;
