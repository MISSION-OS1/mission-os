// components/DashboardLayout.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // ✅ Dashboard دلوقتي مساره /dashboard مش / (الـ / بقت بتعمل redirect لصفحة Drops)
  const menuItems = [
    { name: 'Dashboard', icon: '📊', path: '/dashboard' },
    { name: 'Products', icon: '📦', path: '/products' },
    { name: 'Inventory', icon: '🗂️', path: '/inventory' },
    { name: 'Orders', icon: '🛍️', path: '/orders' },
    { name: 'Customers', icon: '👥', path: '/customers' },
    { name: 'Finance', icon: '💰', path: '/finance' },
    { name: 'Reports', icon: '📈', path: '/reports' },
  ];

  return (
    <div className="bg-[#000000] min-h-screen text-white font-sans antialiased flex">
      
      {/* الـ Sidebar الخاص بالـ Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#09090b] border-r border-zinc-800 fixed h-screen p-5 justify-between">
        <div>
          <div className="mb-6 px-2">
            <h1 className="text-2xl font-bold tracking-widest text-white">MISSION</h1>
            <p className="text-xs text-zinc-500 mt-1">The mission never stops.</p>
          </div>

          {/* ✅ زرار العودة لصفحة Drops، عشان تقدر تغير الـ Drop اللي شغال عليه بسهولة */}
          <Link
            href="/drops"
            className="flex items-center justify-between px-4 py-2.5 mb-6 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
          >
            <span>⇄ Switch Drop</span>
            <span className="text-zinc-600">→</span>
          </Link>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-white text-black font-semibold'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="border-t border-zinc-800 pt-4 px-2 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm">N</div>
          <div>
            <p className="text-xs font-semibold text-white">MISSION OS</p>
            <p className="text-[10px] text-zinc-500">Owner</p>
          </div>
        </div>
      </aside>

      {/* الـ Sidebar الخاص بالموبايل */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          
          <aside className="relative flex flex-col w-64 bg-[#09090b] h-full p-5 justify-between z-10 border-r border-zinc-800">
            <div>
              <div className="flex justify-between items-center mb-6 px-2">
                <h1 className="text-2xl font-bold tracking-widest text-white">MISSION</h1>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-400 text-xl">✕</button>
              </div>

              <Link
                href="/drops"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 mb-6 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400"
              >
                <span>⇄ Switch Drop</span>
                <span className="text-zinc-600">→</span>
              </Link>

              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium ${
                        isActive ? 'bg-white text-black font-semibold' : 'text-zinc-400'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>
        </div>
      )}

      {/* محتوى الصفحة الرئيسي */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <header className="md:hidden bg-[#09090b] border-b border-zinc-800 h-16 px-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-white p-2 text-xl">☰</button>
            <span className="font-bold tracking-wider text-sm">MISSION OS</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs">N</div>
        </header>

        <main className="flex-1 p-4 md:p-8 bg-[#000000]">
          {children}
        </main>
      </div>

    </div>
  );
}
