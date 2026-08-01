const fs = require('fs');
let code = fs.readFileSync('src/components/CourseInsightsDashboard.tsx', 'utf8');

// The replacement was:
// code = code.replace(unifiedHeaderRegex, "{/* 2-Column Content Grid */}");
// This might have removed the opening <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
// which is matched by unifiedHeaderRegex.

// Let's just fix it by replacing the extra </div> or adding the missing ones.
// It's probably easier to restore the file from git or just fix the tags.
console.log(code.substring(code.indexOf('{/* 2-Column Content Grid */}'), code.indexOf('{/* MC Course Details Modal */}')));

