const fs = require('fs');
let content = fs.readFileSync('src/components/MCDashboard.tsx', 'utf8');

// The messed up file currently has mostly 'text-sm' because of the cascade.
// Actually wait, let me just undo the sed cascade. Wait, how? I can't.
