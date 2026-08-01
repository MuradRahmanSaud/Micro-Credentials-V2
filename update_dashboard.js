const fs = require('fs');

let code = fs.readFileSync('src/components/CourseInsightsDashboard.tsx', 'utf8');

// 1. Remove Top 10 Courses and Faculty Distribution (Lines ~2060 to ~2130)
// It's wrapped in a grid: {/* ADDITIONAL ANALYTICS CHARTS GRID */}
const addChartsRegex = /\{\/\* ADDITIONAL ANALYTICS CHARTS GRID \*\/\}[\s\S]*?(?=\{\/\* MC Course Details Modal \*\/\}|<\/div>\s*\{\/\* MC Course Details Modal \*\/)/;
code = code.replace(addChartsRegex, "");

// 2. Remove the 12-Month chart. 
// It starts around {/* UNIFIED CARD: 12-MONTH TREND CHART & COURSE DETAILS TABLE */}
// Wait, actually earlier I saw "UNIFIED CARD: 12-MONTH TREND CHART & COURSE DETAILS TABLE" in the sed output. Let's see what else is in that Unified Card.
// It contains "12-Month Interactive Trend Chart" and "Right: Analytics & Distribution Summary"
// Let's print out the structure first to be safe.
console.log("Found add charts:", addChartsRegex.test(fs.readFileSync('src/components/CourseInsightsDashboard.tsx', 'utf8')));
