const fs = require('fs');
let text = fs.readFileSync('src/components/MCDashboard.tsx', 'utf8');

const startMarker = '{/* Cumulative Financials Section */}';
const endMarker = '{/* Main Charts & Analytics Section */}';
let startIndex = text.indexOf(startMarker);
let endIndex = text.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  // Let's replace the entire section with the new design
  const newSection = `      {/* Cumulative Financials Section */}
      <div className="space-y-3 w-full lg:w-1/2">
        
        {/* Title Box */}
        <div className="bg-teal-50/50 border border-teal-200 rounded-lg p-3">
          <h4 className="text-[13px] font-bold text-teal-800 uppercase tracking-[0.15em]">Cumulative Financials</h4>
        </div>
        <p className="text-[11px] text-slate-500 px-1 -mt-1 mb-2">Calculated by summing metrics across all {stats.runningBatchesCount} active batches under this course.</p>

        {/* Main calculated cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Gross Revenue</span>
            <p className="text-sm font-bold text-stone-800 font-mono flex items-center gap-1">
              <span className="text-xs">৳</span> {stats.totalGrossRevenue.toLocaleString()}
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Net Revenue</span>
            <p className="text-sm font-bold text-teal-600 font-mono flex items-center gap-1">
              <span className="text-xs">৳</span> {stats.totalRevenue.toLocaleString()}
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Net Profit</span>
            <p className={\`text-sm font-bold font-mono flex items-center gap-1 \${stats.totalNetProfit >= 0 ? "text-emerald-600" : "text-rose-600"}\`}>
              <span className="text-xs">{stats.totalNetProfit < 0 ? "− ৳" : "৳"}</span> {Math.abs(stats.totalNetProfit).toLocaleString()}
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Profit Margin</span>
            <p className={\`text-sm font-bold font-mono \${stats.totalNetProfit >= 0 ? "text-emerald-600" : "text-rose-600"}\`}>
              {(stats.totalGrossRevenue > 0 ? (stats.totalNetProfit / stats.totalGrossRevenue) * 100 : 0).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Breakdown details - Input Summation */}
        <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm space-y-3">
          <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider block pb-2 border-b border-stone-100">
            Cumulative Inputs Summation
          </span>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-slate-500">Total Course Fee</span>
                <span className="text-[12px] font-bold text-stone-800 font-mono flex items-center gap-1">
                  <span className="text-[10px]">৳</span> {stats.totalCourseFee.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-slate-500">Total Enrolled Students</span>
                <span className="text-[12px] font-bold text-stone-800 font-mono">{stats.totalEnrollments}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-slate-500">Total Discount</span>
                <span className="text-[12px] font-bold text-rose-600 font-mono flex items-center gap-1">
                  <span className="text-[10px]">− ৳</span> {stats.totalDiscount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-slate-500">Total Expenses</span>
                <span className="text-[12px] font-bold text-rose-600 font-mono flex items-center gap-1">
                  <span className="text-[10px]">− ৳</span> {stats.totalExpenses.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Chart on the right */}
            <div className="w-28 sm:w-36 h-28 flex-none flex items-center justify-center border-l border-stone-100 pl-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Course Fee', value: stats.totalCourseFee, color: '#3b82f6' },
                      { name: 'Discount', value: stats.totalDiscount, color: '#f43f5e' },
                      { name: 'Expenses', value: stats.totalExpenses, color: '#f59e0b' }
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={24}
                    outerRadius={36}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {[
                      { name: 'Course Fee', value: stats.totalCourseFee, color: '#3b82f6' },
                      { name: 'Discount', value: stats.totalDiscount, color: '#f43f5e' },
                      { name: 'Expenses', value: stats.totalExpenses, color: '#f59e0b' }
                    ].filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [\`৳ \${Number(value).toLocaleString()}\`, '']}
                    contentStyle={{ fontSize: '10px', borderRadius: '6px', padding: '4px 8px', backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Calculation Flows */}
        <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm space-y-3">
          <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider block pb-2 border-b border-stone-100">
            Cumulative Flow Breakdown
          </span>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="p-2.5 bg-stone-50 border border-stone-100 rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-bold text-slate-800">Gross Revenue</span>
                  <span className="text-[12px] font-bold text-stone-900 font-mono flex items-center gap-1">
                    <span className="text-[10px]">৳</span> {stats.totalGrossRevenue.toLocaleString()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Sum of (Fee × Enrolled) of all batches</p>
              </div>
              <div className="p-2.5 bg-stone-50 border border-stone-100 rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-bold text-slate-800">Net Revenue</span>
                  <span className="text-[12px] font-bold text-teal-700 font-mono flex items-center gap-1">
                    <span className="text-[10px]">৳</span> {stats.totalRevenue.toLocaleString()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">Gross (৳{stats.totalGrossRevenue.toLocaleString()}) − Discount (৳{stats.totalDiscount.toLocaleString()})</p>
              </div>
              <div className="p-2.5 bg-stone-50 border border-stone-100 rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-bold text-slate-800">Net Profit</span>
                  <span className={\`text-[12px] font-bold font-mono flex items-center gap-1 \${stats.totalNetProfit >= 0 ? "text-emerald-700" : "text-rose-700"}\`}>
                    <span className="text-[10px]">{stats.totalNetProfit < 0 ? "− ৳" : "৳"}</span> {Math.abs(stats.totalNetProfit).toLocaleString()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">Net (৳{stats.totalRevenue.toLocaleString()}) − Expenses (৳{stats.totalExpenses.toLocaleString()})</p>
              </div>
            </div>

            {/* Chart on the right side of amounts */}
            <div className="w-28 sm:w-36 h-36 flex-none flex items-center justify-center border-l border-stone-100 pl-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Gross', value: stats.totalGrossRevenue, color: '#475569' },
                    { name: 'Net Rev', value: stats.totalRevenue, color: '#0d9488' },
                    { name: 'Profit', value: stats.totalNetProfit, color: stats.totalNetProfit >= 0 ? '#10b981' : '#f43f5e' }
                  ]}
                  margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} interval={0} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value) => [\`৳ \${Number(value).toLocaleString()}\`, 'Amount']}
                    contentStyle={{ fontSize: '10px', borderRadius: '6px', padding: '4px 8px', backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    cursor={{fill: 'transparent'}}
                  />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={12}>
                    {[
                      { name: 'Gross', value: stats.totalGrossRevenue, color: '#475569' },
                      { name: 'Net Rev', value: stats.totalRevenue, color: '#0d9488' },
                      { name: 'Profit', value: stats.totalNetProfit, color: stats.totalNetProfit >= 0 ? '#10b981' : '#f43f5e' }
                    ].map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
`;
  text = text.substring(0, startIndex) + newSection + text.substring(endIndex);
  fs.writeFileSync('src/components/MCDashboard.tsx', text);
}
