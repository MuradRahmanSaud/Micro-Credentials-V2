const fs = require('fs');
let code = fs.readFileSync('src/components/CourseInsightsDashboard.tsx', 'utf8');

// Just remove all div tags after the "UNIFIED CARD" container div starts.
// Actually, let's just replace the whole container.
const container = /\{\/\* UNIFIED CARD: 12-MONTH TREND CHART & COURSE DETAILS TABLE \*\/\}[\s\S]*?\{\/\* MC Course Details Modal \*\/}/;

const replacement = `{/* UNIFIED CARD: 12-MONTH TREND CHART & COURSE DETAILS TABLE */}
      {/* MC Course Details Modal */}`;

if (container.test(code)) {
    code = code.replace(container, replacement);
    fs.writeFileSync('src/components/CourseInsightsDashboard.tsx', code);
    console.log("Fixed container");
} else {
    console.log("Could not find container");
}
