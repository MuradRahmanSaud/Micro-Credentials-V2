import React, { useState, useEffect, useMemo } from "react";
import { X, Save, Trash2, BookOpenCheck, Hash, Code, User, Mail, Phone, Users, ShieldAlert, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface CourseOfferPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete: (row: any) => Promise<void>;
  initialData?: any;
  headers: string[];
  onDirtyChange?: (isDirty: boolean) => void;
  allData?: any[];
}

export default function CourseOfferPanel({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  headers,
  onDirtyChange,
}: CourseOfferPanelProps) {
  const [formData, setFormData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(!initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInputTitle, setDeleteInputTitle] = useState("");

  const idKey = useMemo(() => {
    return headers.find(h => {
      const cleaned = h.toLowerCase().trim();
      return cleaned === "sl" || cleaned === "section id" || cleaned === "course code" || cleaned === "p-id";
    }) || "Sl";
  }, [headers]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setIsEditing(false);
    } else {
      // Default empty form state
      setFormData({
        "Sl": "",
        "P-ID": "",
        "Course ID": "",
        "Course Code": "",
        "Section ID": "",
        "Course Title": "",
        "Section": "",
        "Credit": "",
        "Course Type": "",
        "Employee ID": "",
        "Employee Name": "",
        "Designation": "",
        "Email": "",
        "Mobile": "",
        "Student": "",
        "Class": ""
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
      console.error("Failed to save course offer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async () => {
    const actualId = String(initialData?.[idKey] || initialData?.["Sl"] || initialData?.["Section ID"] || "");
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-lg border border-teal-100">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {initialData ? (isEditing ? "Edit Course Offer" : "Course Offer Details") : "Add New Course Offer"}
              </h2>
              <p className="text-[11px] font-mono text-slate-500">
                {initialData?.[idKey] || initialData?.["Course Title"] || "New Offer Entry"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Sl */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Sl
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Sl"] || ""}
                onChange={(e) => handleChange("Sl", e.target.value)}
                placeholder="e.g. 1"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>

            {/* P-ID */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                P-ID
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["P-ID"] || ""}
                onChange={(e) => handleChange("P-ID", e.target.value)}
                placeholder="e.g. 60"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>

            {/* Course ID */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Course ID
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Course ID"] || ""}
                onChange={(e) => handleChange("Course ID", e.target.value)}
                placeholder="e.g. C024"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>

            {/* Course Code */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Course Code
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Course Code"] || ""}
                onChange={(e) => handleChange("Course Code", e.target.value)}
                placeholder="e.g. 0541-201"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>

            {/* Section ID */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Section ID
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Section ID"] || ""}
                onChange={(e) => handleChange("Section ID", e.target.value)}
                placeholder="e.g. 174571"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>

            {/* Section */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Section
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Section"] || ""}
                onChange={(e) => handleChange("Section", e.target.value)}
                placeholder="e.g. 2A"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Course Title */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              Course Title
            </label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData["Course Title"] || ""}
              onChange={(e) => handleChange("Course Title", e.target.value)}
              placeholder="e.g. Business Mathematics"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Credit */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Credit
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Credit"] || ""}
                onChange={(e) => handleChange("Credit", e.target.value)}
                placeholder="e.g. 3"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>

            {/* Course Type */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Course Type
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Course Type"] || ""}
                onChange={(e) => handleChange("Course Type", e.target.value)}
                placeholder="e.g. MJR"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>

            {/* Employee ID */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Employee ID
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Employee ID"] || ""}
                onChange={(e) => handleChange("Employee ID", e.target.value)}
                placeholder="e.g. 721100200"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>

            {/* Employee Name */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Employee Name
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Employee Name"] || ""}
                onChange={(e) => handleChange("Employee Name", e.target.value)}
                placeholder="e.g. Asmani Akter"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>

            {/* Designation */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Designation
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Designation"] || ""}
                onChange={(e) => handleChange("Designation", e.target.value)}
                placeholder="e.g. Lecturer"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Email
              </label>
              <input
                type="email"
                disabled={!isEditing}
                value={formData["Email"] || ""}
                onChange={(e) => handleChange("Email", e.target.value)}
                placeholder="asmani@diu.edu.bd"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>

            {/* Mobile */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Mobile
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Mobile"] || ""}
                onChange={(e) => handleChange("Mobile", e.target.value)}
                placeholder="e.g. 01700000000"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>

            {/* Student */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Student
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Student"] || ""}
                onChange={(e) => handleChange("Student", e.target.value)}
                placeholder="e.g. 37"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>

            {/* Class */}
            <div className="col-span-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Class
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData["Class"] || ""}
                onChange={(e) => handleChange("Class", e.target.value)}
                placeholder="e.g. 192"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-70 disabled:bg-slate-100"
              />
            </div>
          </div>
        </form>

        {/* Action Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {initialData && (
            <div>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-rose-50 p-2 rounded-lg border border-rose-200">
                  <span className="text-[11px] text-rose-700 font-medium">Type ID to confirm:</span>
                  <input
                    type="text"
                    value={deleteInputTitle}
                    onChange={(e) => setDeleteInputTitle(e.target.value)}
                    placeholder={String(initialData?.[idKey] || initialData?.["Sl"] || "")}
                    className="w-20 px-2 py-0.5 text-xs bg-white border border-rose-300 rounded focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={deleteInputTitle !== String(initialData?.[idKey] || initialData?.["Sl"] || initialData?.["Section ID"] || "") || isSubmitting}
                    className="px-2 py-0.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {initialData && !isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-all"
              >
                Edit Entry
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Entry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
