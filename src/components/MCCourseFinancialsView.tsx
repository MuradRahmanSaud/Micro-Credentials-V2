import React from 'react';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart as RechartsBarChart, Bar, XAxis, YAxis } from 'recharts';
import { cn } from '../lib/utils';

interface MCCourseFinancialsViewProps {
  courseBatches: any[];
  courseFinancials: {
    grossRevenue: number;
    netRevenue: number;
    netProfit: number;
    profitMargin: number;
    courseFee: number;
    enrolled: number;
    batchDiscountSum: number;
    expenses: number;
    discount: number;
  };
  data: any;
}

export const MCCourseFinancialsView: React.FC<MCCourseFinancialsViewProps> = ({
  courseBatches,
  courseFinancials,
  data
}) => {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h4 className="text-sm md:text-base lg:text-lg font-bold text-teal-800 bg-teal-50/80 px-4 py-2 rounded-lg uppercase tracking-wider border-b border-teal-100 mb-2">Cumulative Financials</h4>
      </div>

      {/* Main calculated cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs md:text-sm lg:text-base font-bold text-slate-400 uppercase tracking-wider block mb-1">Gross Revenue</span>
            <p className="text-sm md:text-base lg:text-lg font-bold text-slate-800 font-mono">৳ {courseFinancials.grossRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs md:text-sm lg:text-base font-bold text-slate-400 uppercase tracking-wider block mb-1">Net Revenue</span>
            <p className="text-sm md:text-base lg:text-lg font-bold text-teal-600 font-mono">৳ {courseFinancials.netRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs md:text-sm lg:text-base font-bold text-slate-400 uppercase tracking-wider block mb-1">Net Profit</span>
            <p className={cn("text-sm md:text-base lg:text-lg font-bold font-mono", courseFinancials.netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {courseFinancials.netProfit < 0 ? "− " : ""}৳ {Math.abs(courseFinancials.netProfit).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs md:text-sm lg:text-base font-bold text-slate-400 uppercase tracking-wider block mb-1">Profit Margin</span>
            <p className={cn("text-sm md:text-base lg:text-lg font-extrabold font-mono", courseFinancials.netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {courseFinancials.profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown details side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cumulative Inputs Summation */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-sm md:text-base lg:text-lg font-extrabold text-slate-700 uppercase tracking-wider block pb-2 border-b border-slate-100 mb-3">
              Cumulative Inputs Summation
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full space-y-2">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-xs md:text-sm lg:text-base text-slate-500">Total Course Fee</span>
                  <span className="text-sm md:text-base lg:text-lg font-bold text-slate-800 font-mono">৳ {courseFinancials.courseFee.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-xs md:text-sm lg:text-base text-slate-500">Total Enrolled Students</span>
                  <span className="text-sm md:text-base lg:text-lg font-bold text-slate-800 font-mono">{courseFinancials.enrolled}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-xs md:text-sm lg:text-base text-slate-500">Total Discount</span>
                  <span className="text-sm md:text-base lg:text-lg font-bold text-rose-600 font-mono">− ৳ {courseFinancials.batchDiscountSum.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs md:text-sm lg:text-base text-slate-500">Total Expenses</span>
                  <span className="text-sm md:text-base lg:text-lg font-bold text-rose-600 font-mono">− ৳ {courseFinancials.expenses.toLocaleString()}</span>
                </div>
              </div>

              {/* Chart on the right side of amounts */}
              <div className="w-full sm:w-36 h-36 shrink-0 flex items-center justify-center border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-3">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Course Fee', value: courseFinancials.courseFee, color: '#2563eb' },
                        { name: 'Discount', value: courseFinancials.batchDiscountSum, color: '#f43f5e' },
                        { name: 'Expenses', value: courseFinancials.expenses, color: '#f59e0b' }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={24}
                      outerRadius={44}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {[
                        { name: 'Course Fee', value: courseFinancials.courseFee, color: '#2563eb' },
                        { name: 'Discount', value: courseFinancials.batchDiscountSum, color: '#f43f5e' },
                        { name: 'Expenses', value: courseFinancials.expenses, color: '#f59e0b' }
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: any) => [`৳ ${Number(value).toLocaleString()}`, '']}
                      contentStyle={{ fontSize: '12px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Calculation Flows */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-sm md:text-base lg:text-lg font-extrabold text-slate-700 uppercase tracking-wider block pb-2 border-b border-slate-100 mb-3">
              Cumulative Flow Breakdown
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full space-y-2">
                <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs md:text-sm lg:text-base font-bold text-slate-700">Gross Revenue</span>
                    <span className="text-xs md:text-sm lg:text-base font-extrabold text-slate-800 font-mono">৳ {courseFinancials.grossRevenue.toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] md:text-xs text-slate-400">Sum of (Fee × Enrolled) of all batches</p>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs md:text-sm lg:text-base font-bold text-slate-700">Net Revenue</span>
                    <span className="text-xs md:text-sm lg:text-base font-extrabold text-teal-700 font-mono">৳ {courseFinancials.netRevenue.toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] md:text-xs text-slate-400 font-mono">Gross (৳{courseFinancials.grossRevenue.toLocaleString()}) − Discount (৳{courseFinancials.discount.toLocaleString()})</p>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs md:text-sm lg:text-base font-bold text-slate-700">Net Profit</span>
                    <span className={cn("text-xs md:text-sm lg:text-base font-extrabold font-mono", courseFinancials.netProfit >= 0 ? "text-emerald-700" : "text-rose-700")}>
                      ৳ {courseFinancials.netProfit.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] md:text-xs text-slate-400 font-mono">Net (৳{courseFinancials.netRevenue.toLocaleString()}) − Expenses (৳{courseFinancials.expenses.toLocaleString()})</p>
                </div>
              </div>

              {/* Chart on the right side of amounts */}
              <div className="w-full sm:w-36 h-36 shrink-0 flex items-center justify-center border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-3">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={[
                      { name: 'Gross', value: courseFinancials.grossRevenue, color: '#475569' },
                      { name: 'Net Rev', value: courseFinancials.netRevenue, color: '#0d9488' },
                      { name: 'Profit', value: courseFinancials.netProfit, color: courseFinancials.netProfit >= 0 ? '#10b981' : '#f43f5e' }
                    ]}
                    margin={{ top: 10, right: 4, left: 4, bottom: 0 }}
                  >
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                    <YAxis hide />
                    <RechartsTooltip
                      formatter={(value: any) => [`৳ ${Number(value).toLocaleString()}`, 'Amount']}
                      contentStyle={{ fontSize: '12px', borderRadius: '8px', padding: '6px 10px', backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={16}>
                      {[
                        { name: 'Gross', value: courseFinancials.grossRevenue, color: '#475569' },
                        { name: 'Net Rev', value: courseFinancials.netRevenue, color: '#0d9488' },
                        { name: 'Profit', value: courseFinancials.netProfit, color: courseFinancials.netProfit >= 0 ? '#10b981' : '#f43f5e' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCCourseFinancialsView;
