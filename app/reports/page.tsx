// app/reports/page.tsx
import DashboardLayout from '@/components/DashboardLayout';

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics & Reports</h2>
          <p className="text-xs text-zinc-500 mt-1">Performance breakdown and historical metrics.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-6 h-64 flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-zinc-400">Monthly Sales Chart</h3>
            <div className="flex items-end justify-between h-32 px-4 border-b border-zinc-800 pb-2">
              <div className="w-8 bg-zinc-800 h-12 rounded-t"></div>
              <div className="w-8 bg-zinc-800 h-20 rounded-t"></div>
              <div className="w-8 bg-zinc-800 h-28 rounded-t"></div>
              <div className="w-8 bg-white h-40 rounded-t"></div>
            </div>
            <p className="text-[10px] text-zinc-500 text-center">Feb — Mar — Apr — May</p>
          </div>

          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-zinc-400">Key Performance Indicators</h3>
            <div className="space-y-4 mt-4">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Average Order Value</span>
                <span className="text-white font-bold">EGP 600.00</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Return Customer Rate</span>
                <span className="text-emerald-400 font-bold">24.5%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Gross Profit Margin</span>
                <span className="text-white font-bold">40.6%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}