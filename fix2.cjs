const fs = require('fs');
let text = fs.readFileSync('src/components/MCDashboard.tsx', 'utf8');

// Undo the cascade from fix_dashboard.cjs
text = text.replace(/text-2xl font-bold/g, 'text-base font-bold'); // Reset to a reasonable default

// Let's manually adjust important elements.
text = text.replace('className="bg-white border border-stone-200/80 rounded-lg p-4 shadow-2xs space-y-4 w-full lg:w-1/2"',
  'className="bg-white border border-stone-200/80 rounded-lg p-3 shadow-2xs space-y-3 w-full lg:w-1/2"');

fs.writeFileSync('src/components/MCDashboard.tsx', text);
