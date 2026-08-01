const fs = require('fs');
let text = fs.readFileSync('src/components/MCDashboard.tsx', 'utf8');

text = text.replace(/text-xl font-bold text-stone-900 tracking-tight/g, 'text-3xl font-bold text-stone-900 tracking-tight');
text = text.replace(/text-xl font-bold text-emerald-700 tracking-tight/g, 'text-3xl font-bold text-emerald-700 tracking-tight');

fs.writeFileSync('src/components/MCDashboard.tsx', text);
