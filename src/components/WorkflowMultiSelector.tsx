import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layers, Check, Search, CheckSquare, Square } from 'lucide-react';
import { cn, parseWorkflowAndStages, serializeWorkflowAndStages } from '../lib/utils';

export interface WorkflowStageDef {
  id: string;
  stageName: string;
  tasks: string[];
  deliverables: string[];
  assigned?: string;
  [key: string]: any;
}

export interface ParsedWorkflowDef {
  id: string;
  title: string;
  stages: WorkflowStageDef[];
  rawText?: string;
  [key: string]: any;
}

interface WorkflowMultiSelectorProps {
  parsedWorkflows: ParsedWorkflowDef[];
  courseWorkflow: string;
  onWorkflowChange: (serializedWorkflow: string, newLocalStages: any[]) => void;
  className?: string;
}

export default function WorkflowMultiSelector({
  parsedWorkflows = [],
  courseWorkflow = '',
  onWorkflowChange,
  className
}: WorkflowMultiSelectorProps) {
  const [selectedStageKeys, setSelectedStageKeys] = useState<Set<string>>(new Set());
  const [activeWfId, setActiveWfId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const lastEmittedWorkflowRef = useRef<string>('');

  // Parse courseWorkflow initially or when changed externally
  useEffect(() => {
    if (!parsedWorkflows || parsedWorkflows.length === 0) return;
    if (lastEmittedWorkflowRef.current && courseWorkflow === lastEmittedWorkflowRef.current) {
      return;
    }

    const { jobTitle, stageAssignments } = parseWorkflowAndStages(courseWorkflow);
    const assignedStageIds = new Set(Object.keys(stageAssignments));

    const rawTokens = jobTitle
      ? jobTitle.split(/[,&+]/).map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const initialStageKeys = new Set<string>();
    let firstActiveId = '';

    parsedWorkflows.forEach((wf) => {
      const wfIdLower = (wf.id || '').trim().toLowerCase();
      const wfTitleLower = (wf.title || '').trim().toLowerCase();

      const isTitleMatch = rawTokens.some(
        t => t === wfIdLower || t === wfTitleLower || wfTitleLower.includes(t) || t.includes(wfTitleLower)
      );

      const matchingStages = (wf.stages || []).filter(
        s => assignedStageIds.has(s.id) || assignedStageIds.has(`${wf.id}::${s.id}`)
      );
      const isStageMatch = matchingStages.length > 0;

      if (isStageMatch) {
        if (!firstActiveId) firstActiveId = wf.id;
        (wf.stages || []).forEach(s => {
          const key = `${wf.id}::${s.id}`;
          if (assignedStageIds.has(s.id) || assignedStageIds.has(key)) {
            initialStageKeys.add(key);
          }
        });
      } else if (isTitleMatch) {
        if (!firstActiveId) firstActiveId = wf.id;
        // If matched by workflow title only and stageAssignments empty, select all
        if (assignedStageIds.size === 0) {
          (wf.stages || []).forEach(s => {
            initialStageKeys.add(`${wf.id}::${s.id}`);
          });
        }
      }
    });

    setSelectedStageKeys(initialStageKeys);
    if (!activeWfId) {
      setActiveWfId(firstActiveId || parsedWorkflows[0]?.id || '');
    }
  }, [courseWorkflow, parsedWorkflows]);

  // Compute selected workflows (any workflow with >= 1 selected stage)
  const selectedWfIds = useMemo(() => {
    return parsedWorkflows
      .filter(wf =>
        (wf.stages || []).some(
          s => selectedStageKeys.has(`${wf.id}::${s.id}`) || selectedStageKeys.has(s.id)
        )
      )
      .map(wf => wf.id);
  }, [parsedWorkflows, selectedStageKeys]);

  // Sync changes to parent
  const emitChanges = (newStageKeys: Set<string>) => {
    const { stageAssignments } = parseWorkflowAndStages(courseWorkflow);
    const newLocalStages: any[] = [];
    let overallIdx = 1;

    const activeWfList = parsedWorkflows.filter(wf =>
      (wf.stages || []).some(
        s => newStageKeys.has(`${wf.id}::${s.id}`) || newStageKeys.has(s.id)
      )
    );

    activeWfList.forEach(wf => {
      (wf.stages || []).forEach(stage => {
        const stageKey = `${wf.id}::${stage.id}`;
        if (newStageKeys.has(stageKey) || newStageKeys.has(stage.id)) {
          let name = stage.stageName || "Unnamed Stage";
          const cleanName = name.replace(/^\d+\.\s*/, '').trim();
          const displayStageName = `${overallIdx}. ${cleanName}`;
          overallIdx++;

          newLocalStages.push({
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
    });

    const combinedJobTitles = activeWfList.map(w => w.id).join(", ");

    const updatedAssignments: Record<string, string[]> = {};
    const today = new Date().toISOString().split('T')[0];

    newLocalStages.forEach(stg => {
      const stgId = stg["ID"];
      const stgKey = stg["StageKey"];
      let existingAssigned = stageAssignments[stgId] || stageAssignments[stgKey];

      if (!existingAssigned || existingAssigned.length === 0) {
        const wf = parsedWorkflows.find(p => p.id === stg["Job Title"]);
        const stageDef = wf?.stages.find(s => s.id === stgId);
        if (stageDef?.assigned) {
          const empList = stageDef.assigned.split(',').map(s => s.trim()).filter(Boolean);
          existingAssigned = empList.map(empId => `${empId}|${today}|`);
        } else {
          existingAssigned = [];
        }
      }

      updatedAssignments[stgId] = existingAssigned;
    });

    const serialized = serializeWorkflowAndStages(combinedJobTitles, updatedAssignments);
    lastEmittedWorkflowRef.current = serialized;
    onWorkflowChange(serialized, newLocalStages);
  };

  const handleToggleStage = (wfId: string, stageId: string) => {
    const stageKey = `${wfId}::${stageId}`;
    const nextStageKeys = new Set<string>(selectedStageKeys);

    const isChecked = nextStageKeys.has(stageKey) || nextStageKeys.has(stageId);

    if (isChecked) {
      nextStageKeys.delete(stageKey);
      nextStageKeys.delete(stageId);
    } else {
      nextStageKeys.add(stageKey);
    }

    setSelectedStageKeys(nextStageKeys);
    emitChanges(nextStageKeys);
  };

  const handleSelectAllStages = (wfId: string) => {
    const wf = parsedWorkflows.find(p => p.id === wfId);
    if (!wf) return;

    const nextStageKeys = new Set<string>(selectedStageKeys);
    (wf.stages || []).forEach(s => nextStageKeys.add(`${wf.id}::${s.id}`));

    setSelectedStageKeys(nextStageKeys);
    emitChanges(nextStageKeys);
  };

  const handleDeselectAllStages = (wfId: string) => {
    const wf = parsedWorkflows.find(p => p.id === wfId);
    if (!wf) return;

    const nextStageKeys = new Set<string>(selectedStageKeys);
    (wf.stages || []).forEach(s => {
      nextStageKeys.delete(`${wf.id}::${s.id}`);
      nextStageKeys.delete(s.id);
    });

    setSelectedStageKeys(nextStageKeys);
    emitChanges(nextStageKeys);
  };

  const totalSelectedStages = useMemo(() => {
    let count = 0;
    parsedWorkflows.forEach(wf => {
      (wf.stages || []).forEach(s => {
        if (selectedStageKeys.has(`${wf.id}::${s.id}`) || selectedStageKeys.has(s.id)) {
          count++;
        }
      });
    });
    return count;
  }, [parsedWorkflows, selectedStageKeys]);

  const filteredWorkflows = useMemo(() => {
    if (!searchTerm.trim()) return parsedWorkflows;
    const term = searchTerm.toLowerCase();
    return parsedWorkflows.filter(
      w => w.title.toLowerCase().includes(term) || w.id.toLowerCase().includes(term)
    );
  }, [parsedWorkflows, searchTerm]);

  const activeWorkflow = useMemo(() => {
    return parsedWorkflows.find(w => w.id === activeWfId) || filteredWorkflows[0] || parsedWorkflows[0];
  }, [parsedWorkflows, filteredWorkflows, activeWfId]);

  if (!parsedWorkflows || parsedWorkflows.length === 0) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500 font-medium">
        No workflow templates available.
      </div>
    );
  }

  return (
    <div className={cn("bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2.5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-teal-600" />
          Assign / Select Workflows
        </label>
        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full uppercase tracking-wide">
          {selectedWfIds.length} Workflows • {totalSelectedStages} Stages
        </span>
      </div>

      {/* Main Tabbed Container */}
      <div className="flex flex-col sm:flex-row border border-slate-200 rounded-lg overflow-hidden h-80 bg-slate-50/30">
        {/* Left Side: Workflow Tabs */}
        <div className="w-full sm:w-2/5 md:w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
          {/* Search Filter if many workflows */}
          {parsedWorkflows.length > 4 && (
            <div className="p-1.5 border-b border-slate-200/80 bg-white">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs">
                <Search className="w-3 h-3 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter workflows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-[11px] text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {/* Workflow Title Vertical Tabs */}
          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-100">
            {filteredWorkflows.map((wf) => {
              const isActive = wf.id === activeWorkflow?.id;

              const stageCount = (wf.stages || []).filter(
                s => selectedStageKeys.has(`${wf.id}::${s.id}`) || selectedStageKeys.has(s.id)
              ).length;
              const totalStages = wf.stages?.length || 0;
              const isSelected = stageCount > 0;

              return (
                <button
                  key={wf.id}
                  type="button"
                  onClick={() => setActiveWfId(wf.id)}
                  className={cn(
                    "w-full text-left p-2.5 transition-all flex items-center justify-between gap-2 cursor-pointer relative group",
                    isActive
                      ? "bg-white text-teal-900 font-semibold shadow-2xs border-l-4 border-l-teal-600"
                      : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "block text-xs truncate leading-snug",
                      isSelected ? "font-bold text-teal-800" : "font-medium"
                    )}>
                      {wf.title}
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-normal">
                      {totalStages} stages
                    </span>
                  </div>

                  {/* Selected Badge */}
                  {isSelected ? (
                    <span className="shrink-0 flex items-center gap-1 bg-teal-100 text-teal-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-teal-200">
                      <Check className="w-2.5 h-2.5 text-teal-700" />
                      {stageCount}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] text-slate-400 opacity-60 group-hover:opacity-100">
                      0
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Workflow Stage Content */}
        <div className="flex-1 bg-white flex flex-col min-w-0 overflow-hidden">
          {activeWorkflow ? (
            <>
              {/* Header inside right content pane */}
              <div className="p-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 tracking-wide truncate">
                    {activeWorkflow.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Check stages to add them to this course
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleSelectAllStages(activeWorkflow.id)}
                    className="text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/80 px-2 py-0.5 rounded border border-teal-200/80 transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeselectAllStages(activeWorkflow.id)}
                    className="text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/70 px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Stage List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 no-scrollbar">
                {(!activeWorkflow.stages || activeWorkflow.stages.length === 0) ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-medium">
                    No stages found for this workflow.
                  </div>
                ) : (
                  activeWorkflow.stages.map((stage, idx) => {
                    const stageKey = `${activeWorkflow.id}::${stage.id}`;
                    const isStageChecked = selectedStageKeys.has(stageKey) || selectedStageKeys.has(stage.id);

                    return (
                      <div
                        key={stage.id || idx}
                        onClick={() => handleToggleStage(activeWorkflow.id, stage.id)}
                        className={cn(
                          "flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all",
                          isStageChecked
                            ? "border-teal-300 bg-teal-50/50 text-slate-900 font-semibold shadow-2xs"
                            : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50/80"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isStageChecked}
                          onChange={() => handleToggleStage(activeWorkflow.id, stage.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block leading-snug text-xs">
                            {stage.stageName}
                          </span>
                          {stage.deliverables && stage.deliverables.length > 0 && (
                            <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                              Deliverables: {stage.deliverables.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 text-center text-xs text-slate-400">
              Select a workflow from the left sidebar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
