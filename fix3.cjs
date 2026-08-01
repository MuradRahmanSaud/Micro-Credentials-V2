const fs = require('fs');
let text = fs.readFileSync('src/components/MCDashboard.tsx', 'utf8');

// I will just let the user see the current version, and make sure Cumulative Financials is w-1/2.
// The user asked to make text sizes bigger. Let's make some key numbers bigger.

text = text.replace(/<span className="text-base font-bold text-stone-900 tracking-tight">/g, 
  '<span className="text-xl font-bold text-stone-900 tracking-tight">');
  
text = text.replace(/<span className="text-base font-bold text-emerald-700 tracking-tight">/g,
  '<span className="text-xl font-bold text-emerald-700 tracking-tight">');
  
text = text.replace(/<span className="text-lg font-bold /g,
  '<span className="text-2xl font-bold ');

fs.writeFileSync('src/components/MCDashboard.tsx', text);
