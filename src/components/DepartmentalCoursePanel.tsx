import React, { useState, useEffect, useMemo } from "react";
import { X, Save, Trash2, BookMarked, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DepartmentalCoursePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete: (row: any) => Promise<void>;
  initialData?: any;
  headers: string[];
  onDirtyChange?: (isDirty: boolean) => void;
  allData?: any[];
}

export default function DepartmentalCoursePanel({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  headers,
  onDirtyChange,
}: DepartmentalCoursePanelProps) {
  const [formData, setFormData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(!initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInputTitle, setDeleteInputTitle] = useState("");

  const idKey = useMemo(() => {
    return headers.find(h => {
      const cleaned = h.toLowerCase().trim();
      return cleaned === "course code" || cleaned === "p-id" || cleaned === "course title";
    }) || "Course Code";
  }, [headers]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setIsEditing(false);
    } else {
      setFormData({
        "P-ID": "",
        "Course Code": "",
        "Course Title": "",
        "Credit": ""
      });
      setIsEditing(true);
    }
    setShowDeleteConfirm(false);
    setDeleteInputTitle("");
  }, [initialData, isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (onDirtyChange) onDirtyChange(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onSave(formData);
      setIsEditing(false);
      onClose();
    } catch (error) {
      console.error("Failed to save departmental course:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async () => {
    const actualId = String(initialData?.[idKey] || initialData?.["Course Code"] || initialData?.["P-ID"] || "");
    if (deleteInputTitle !== actualId) return;

    try {
      setIsSubmitting(true);
      await onDelete(initialData!);
      setShowDeleteConfirm(false);
      setDeleteInputTitle("");
      onClose();
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-lg border border-teal-100">
                <BookMarked className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  {initialData ? (isEditing ? "Edit Departmental Course" : "Departmental Course Details") : "Add Departmental Course"}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                  {initialData?.[idKey] || initialData?.["Course Title"] || "New Departmental Course Entry"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* P-ID */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  P-ID
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData["P-ID"] || ""}
                  onChange={(e) => handleChange("P-ID", e.target.value)}
                  placeholder="e.g. 60"
                  className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 disabled:opacity-75"
                />
              </div>

              {/* Course Code */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Course Code
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData["Course Code"] || ""}
                  onChange={(e) => handleChange("Course Code", e.target.value)}
                  placeholder="e.g. CSE 111"
                  className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 disabled:opacity-75"
                />
              </div>
            </div>

            {/* Course Title */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Course Title
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Course Title"] || ""}
                onChange={(e) => handleChange("Course Title", e.target.value)}
                placeholder="e.g. Computer Fundamentals"
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 disabled:opacity-75"
              />
            </div>

            {/* Credit */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Credit
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Credit"] || ""}
                onChange={(e) => handleChange("Credit", e.target.value)}
                placeholder="e.g. 3"
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 disabled:opacity-75"
              />
            </div>

            {/* Delete Confirmation Box */}
            {initialData && showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2 mt-4"
              >
                <div className="flex items-center gap-2 text-rose-700 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Confirm Deletion</span>
                </div>
                <p className="text-[11px] text-rose-600">
                  Type ID <span className="font-mono font-bold">{initialData?.[idKey] || initialData?.["Course Code"]}</span> to confirm deletion:
                </p>
                <input
                  type="text"
                  value={deleteInputTitle}
                  onChange={(e) => setDeleteInputTitle(e.target.value)}
                  placeholder="Type ID to delete..."
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-rose-300 rounded bg-white focus:outline-none focus:border-rose-500"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteInputTitle("");
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-200 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteInputTitle !== String(initialData?.[idKey] || initialData?.["Course Code"] || initialData?.["P-ID"] || "") || isSubmitting}
                    onClick={handleDeleteClick}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase bg-rose-600 hover:bg-rose-700 text-white rounded disabled:opacity-50"
                  >
                    {isSubmitting ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </motion.div>
            )}
          </form>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
            {initialData && !isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors uppercase tracking-wider"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors uppercase tracking-wider ml-auto"
                >
                  <span>Edit Entry</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (initialData) setIsEditing(false);
                    else onClose();
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors uppercase tracking-wider ml-auto disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Entry</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
