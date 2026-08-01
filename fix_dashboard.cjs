const fs = require('fs');

let content = fs.readFileSync('src/components/CourseInsightsDashboard.tsx', 'utf-8');

// 1. Add activeTableTab state
content = content.replace(
  "  const [searchQuery, setSearchQuery] = useState('');",
  "  const [activeTableTab, setActiveTableTab] = useState<'courseList' | 'programAligned'>('programAligned');\n  const [searchQuery, setSearchQuery] = useState('');"
);

// 2. Add AnimatePresence and motion to imports
if (!content.includes('motion/react')) {
  content = content.replace(
    "import { cn } from '../lib/utils';",
    "import { cn } from '../lib/utils';\nimport { motion, AnimatePresence } from 'motion/react';"
  );
}

// 3. Update Card 1 onClick and className
content = content.replace(
  "onClick={() => setSelectedMetric('coursesCount')}",
  "onClick={() => { setSelectedMetric('coursesCount'); setActiveTableTab('courseList'); }}"
);
// To match the exact class replacement, let's use regex
content = content.replace(
  /selectedMetric === 'coursesCount' \? "ring-2 ring-teal-600 border-teal-400 shadow-sm" : "border-teal-100"/,
  "activeTableTab === 'courseList' ? \"ring-2 ring-teal-600 border-teal-400 shadow-sm\" : \"border-teal-100\""
);

// 4. Update Card 6 onClick and className
content = content.replace(
  "className=\"bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30 p-3.5 rounded-xl border border-purple-100 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer\"",
  "onClick={() => setActiveTableTab('programAligned')}\n          className={cn(\"bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer\", activeTableTab === 'programAligned' ? \"ring-2 ring-purple-600 border-purple-400 shadow-sm\" : \"border-purple-100\")}"
);

// 5. Extract blocks
const pAlignedStart = content.indexOf('{/* FACULTY-WISE PROGRAM & ALIGNED COURSES TABLES */}');
const pAlignedEnd = content.indexOf('{/* UNIFIED CARD: 12-MONTH TREND CHART');
const pAlignedBlock = content.substring(pAlignedStart, pAlignedEnd);

const detailTableStart = content.indexOf('{/* DETAILED COURSE INSIGHTS DATA TABLE */}');
const detailTableEnd = content.indexOf('{/* MC Course Details Modal */}');
const detailTableBlock = content.substring(detailTableStart, detailTableEnd);

// Wrap them with AnimatePresence
const tabsContainer = `
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
${pAlignedBlock}          </motion.div>
        )}
        {activeTableTab === 'courseList' && (
          <motion.div
            key="courseList"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
${detailTableBlock}          </motion.div>
        )}
      </AnimatePresence>
`;

// Remove the old blocks and insert the new one
content = content.substring(0, pAlignedStart) + tabsContainer + content.substring(pAlignedEnd, detailTableStart) + content.substring(detailTableEnd);

fs.writeFileSync('src/components/CourseInsightsDashboard.tsx', content);
console.log("Replaced successfully!");
