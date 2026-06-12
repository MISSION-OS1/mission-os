// components/StatCard.tsx
import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: string; // هنبعت شكل الأيقونة هنا كـ سيمبل أو إيموجي مؤقتاً
}

export default function StatCard({ title, value, change, icon }: StatCardProps) {
  return (
    <div className="bg-[#09090b] border border-zinc-800/80 rounded-xl p-5 md:p-6 flex flex-col justify-between transition-all hover:border-zinc-700">
      
      {/* الصف العلوي: العنوان والأيقونة */}
      <div className="flex justify-between items-start">
        <span className="text-zinc-400 text-sm font-medium tracking-wide">{title}</span>
        <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 text-sm">
          {icon}
        </div>
      </div>

      {/* المنتصف: الرقم الكبير */}
      <div className="mt-4">
        <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          {value}
        </h3>
      </div>

      {/* الصف السفلي: نسبة التغير (الـ Trend) */}
      <div className="flex items-center space-x-1.5 text-emerald-500 font-medium text-xs mt-4">
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/10 text-[10px]">
          ↗
        </span>
        <span>{change}</span>
      </div>

    </div>
  );
}