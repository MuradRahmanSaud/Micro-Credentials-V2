const fs = require('fs');
let text = fs.readFileSync('src/components/MCDashboard.tsx', 'utf8');

const startMarker = '{/* Cumulative Financials Section */}';
const endMarker = '{/* Main Charts & Analytics Section */}';
let startIndex = text.indexOf(startMarker);
let endIndex = text.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  console.log(text.substring(startIndex, endIndex));
}
