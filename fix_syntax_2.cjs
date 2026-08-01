const fs = require('fs');
let code = fs.readFileSync('src/components/CourseInsightsDashboard.tsx', 'utf8');

const target = `        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full">
                              </div>
        </div>
      </div>`;

const replacement = `        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full">
        </div>
      </div>`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/CourseInsightsDashboard.tsx', code);
    console.log("Fixed tags");
} else {
    console.log("Could not find target tags");
}
