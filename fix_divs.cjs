const fs = require('fs');
let code = fs.readFileSync('src/components/CourseInsightsDashboard.tsx', 'utf8');

// The problematic snippet is:
//       </div>
//       </div>
//       {/* MC Course Details Modal */}
// Let's replace those two closing divs with nothing, since we might need only 0, 1 or 2.
// We'll replace it with a single `</div>` if one is needed. Let's trace it.
// The whole component ends with:
//       {/* MC Course Details Modal */}
//       <MCCourseDetails ... />
//     </div>
//   );
// }

// If we remove the two divs before the modal, we might under-close or over-close.
// Let's just fix the exact string that is causing the error.
const exactStr = `      </div>\n      </div>\n      {/* MC Course Details Modal */}`;
if (code.includes(exactStr)) {
  console.log("Found double div before Modal");
  // Let's remove one and see if it builds.
  // Actually, wait, "Expected ')' but found '{'". This means there's an extra closing tag, or missing one.
  // Wait, if it says "Expected ')' but found '{'", it's in JSX.
  // Let's check how many divs are open.
}
