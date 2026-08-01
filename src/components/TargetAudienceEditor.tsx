import React, { useState, useMemo } from 'react';
import { Plus, X, Search, Check, Sparkles, HelpCircle, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface TargetAudienceEditorProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

export default function TargetAudienceEditor({ value, onChange, options }: TargetAudienceEditorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestionSearch, setSuggestionSearch] = useState('');

  const selectedAudiences = useMemo(() => {
    if (!value) return [];
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }, [value]);

  const toggleAudience = (audience: string) => {
    const isSelected = selectedAudiences.some(a => a.toLowerCase() === audience.toLowerCase());
    let newSelected: string[];
    if (isSelected) {
      newSelected = selectedAudiences.filter(a => a.toLowerCase() !== audience.toLowerCase());
    } else {
      newSelected = [...selectedAudiences, audience];
    }
    onChange(newSelected.join(', '));
  };

  const handleAddNew = () => {
    const newAudience = searchTerm.trim();
    if (newAudience) {
      const alreadyExists = selectedAudiences.some(a => a.toLowerCase() === newAudience.toLowerCase());
      if (!alreadyExists) {
        const newSelected = [...selectedAudiences, newAudience];
        onChange(newSelected.join(', '));
      }
      setSearchTerm('');
    }
  };

  const filteredOptions = useMemo(() => {
    const lowerSearch = suggestionSearch.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(lowerSearch));
  }, [options, suggestionSearch]);

  return (
    <div className="w-full">
      {/* 12-Column Split Layout for Precise Width Management */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column (Span 8/9): Selected Target Audiences in a wide, short rectangular grid */}
        <motion.div 
          className="md:col-span-8 lg:col-span-9 flex flex-col h-full"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 120 }}
        >
          <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100 min-h-[24px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Target Audience ({selectedAudiences.length})</span>
            {selectedAudiences.length > 0 && (
              <button 
                type="button"
                onClick={() => onChange("")}
                className="text-[9px] font-bold text-red-500 hover:text-red-700 transition-colors uppercase cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[460px] min-h-[250px] pr-1 no-scrollbar">
            {selectedAudiences.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 py-8 bg-slate-50/40 rounded-lg border border-dashed border-slate-200 min-h-[200px]">
                <HelpCircle className="w-5 h-5 text-slate-300 mb-1" />
                <p className="text-[11px] text-slate-400 font-medium">No target audience selected yet.</p>
                <p className="text-[10px] text-slate-400">Click suggestions on the right or type below.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {selectedAudiences.map((aud, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: "spring", damping: 20, stiffness: 100, delay: i * 0.03 }}
                    className="relative flex items-center gap-2.5 bg-teal-50/50 border border-teal-100/70 rounded-lg py-2 pl-3 pr-8 transition-all hover:bg-teal-100/50 w-full min-h-[44px]"
                  >
                    <Users className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-[11px] font-bold text-teal-900 uppercase leading-snug line-clamp-2">{aud}</span>
                    <button
                      type="button"
                      onClick={() => toggleAudience(aud)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-teal-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Column (Span 4/3): Narrow Suggestions list and Add Custom field underneath with equal width */}
        <motion.div 
          className="md:col-span-4 lg:col-span-3 flex flex-col justify-between h-full gap-5 border-l border-slate-100 md:pl-5"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 120, delay: 0.1 }}
        >
          {/* Suggestions List */}
          <div className="flex flex-col flex-1 min-h-[220px]">
            <div className="mb-3 space-y-2 pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggestions</span>
              </div>
              {options.length > 3 && (
                <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-full">
                  <Search className="w-3 h-3 text-slate-400 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    placeholder="Filter suggestions..."
                    value={suggestionSearch}
                    onChange={(e) => setSuggestionSearch(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-[11px] text-slate-600 p-0 font-medium placeholder-slate-400"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px] min-h-[160px] pr-1">
              {filteredOptions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center p-4">
                  <p className="text-[10px] text-slate-400 font-medium">No previous suggestions found.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredOptions.map((opt, i) => {
                    const isSelected = selectedAudiences.some(a => a.toLowerCase() === opt.toLowerCase());
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleAudience(opt)}
                        className={cn(
                          "w-full text-[11px] font-semibold px-3 py-2 rounded-lg transition-all border uppercase text-left flex items-center justify-between cursor-pointer group",
                          isSelected 
                            ? "bg-teal-600 text-white border-teal-600 shadow-3xs" 
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300"
                        )}
                      >
                        <span className="truncate pr-2">{opt}</span>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Add Custom Target Audience Input Field directly underneath Suggestions with exact same width */}
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-1.5 shrink-0">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">Add Custom Target Audience</label>
            <div className="flex flex-col gap-2">
              <div className="relative flex items-center bg-white border border-slate-200 rounded-lg shadow-3xs hover:border-slate-300 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-all overflow-hidden">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNew();
                    }
                  }}
                  placeholder="e.g. Graduates..."
                  className="w-full bg-transparent border-none outline-none py-2 px-3 text-xs text-slate-700 placeholder-slate-400 font-medium"
                />
              </div>
              <button
                type="button"
                onClick={handleAddNew}
                disabled={!searchTerm.trim()}
                className="w-full py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg shadow-3xs transition-all uppercase flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
