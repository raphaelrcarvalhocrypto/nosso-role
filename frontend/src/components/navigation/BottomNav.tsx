"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Target, CalendarHeart, Plane, Sparkles, Settings as SettingsIcon } from 'lucide-react';

const navItems = [
  { name: 'Home', href: '/dashboard', icon: Target },
  { name: 'Dates', href: '/dates', icon: CalendarHeart },
  { name: 'Viagens', href: '/trips', icon: Plane },
  { name: 'Desejos', href: '/wishlist', icon: Sparkles },
  { name: 'Conf', href: '/settings', icon: SettingsIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-around px-2 pb-safe pb-4 pt-4 bg-white/80 dark:bg-[#0f1115]/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/5">
      {navItems.map((item) => {
        const isActive = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-col items-center justify-center w-16 gap-1 group transition-colors",
              isActive ? "text-rose-500 dark:text-rose-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <div className={clsx(
              "p-2 rounded-xl transition-all duration-300",
              isActive ? "bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.1)] dark:shadow-[0_0_15px_rgba(244,63,94,0.15)] scale-110" : ""
            )}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium tracking-wide">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
