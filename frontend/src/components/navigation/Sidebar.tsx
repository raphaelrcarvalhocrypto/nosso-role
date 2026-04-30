"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useAuthStore } from '@/src/stores/authStore';
import { Target, CalendarHeart, Plane, Sparkles, Gift, Settings as SettingsIcon, LogOut } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Target },
  { name: 'Dates', href: '/dates', icon: CalendarHeart },
  { name: 'Viagens', href: '/trips', icon: Plane },
  { name: 'Desejos', href: '/wishlist', icon: Sparkles },
  { name: 'Surpresas', href: '/surprises', icon: Gift },
  { name: 'Configurações', href: '/settings', icon: SettingsIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuthStore();

  return (
    <div className="flex flex-col h-full bg-white/40 dark:bg-[#0f1115]/40 p-6 backdrop-blur-md">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <span className="text-white">❤</span>
        </div>
        <h1 className="font-serif text-3xl font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-rose-700 dark:from-rose-200 dark:to-rose-500">
          Nosso Rolê
        </h1>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group",
                isActive 
                  ? "bg-rose-500/10 text-rose-500 dark:text-rose-400 font-medium border border-rose-500/20 shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[15px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <button 
          onClick={() => signOut()}
          className="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 w-full group"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[15px]">Sair</span>
        </button>
      </div>
    </div>
  );
}
