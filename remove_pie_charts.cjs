const fs = require('fs');
let code = fs.readFileSync('src/components/CourseInsightsDashboard.tsx', 'utf8');

const pieChartsRegex = /\{\/\* Right: Analytics & Distribution Summary \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
// This might be tricky because of nested divs.
// The structure is:
//           {/* Right: Analytics & Distribution Summary */}
//           <div ...>
//             ... pie charts ...
//           </div>
//         </div>
//       </div>

// Let's try to match the container div.
const startRegex = /\{\/\* Right: Analytics & Distribution Summary \*\/\}[\s\S]*?<div className="border border-gray-100 rounded-lg p-3 bg-gray-50\/30 lg:col-span-12 xl:col-span-12 flex flex-col justify-between">/;

// That's too specific. Let's just remove the right analytics summary div block.
// Let's count divs if needed, or use a more robust approach.
// Since I want to remove the *whole* div block:
const blockRegex = /\{\/\* Right: Analytics & Distribution Summary \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

if (blockRegex.test(code)) {
    code = code.replace(blockRegex, "");
    fs.writeFileSync('src/components/CourseInsightsDashboard.tsx', code);
    console.log("Removed analytics block");
} else {
    console.log("Could not find analytics block");
}
