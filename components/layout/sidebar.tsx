"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Dumbbell,
  Weight,
  UtensilsCrossed,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rutinas", label: "Rutinas", icon: Dumbbell },
  { href: "/peso", label: "Peso", icon: Weight },
  { href: "/comidas", label: "Comidas", icon: UtensilsCrossed },
  { href: "/notificaciones", label: "Notificaciones", icon: Bell },
];

const bottomItems = [
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavLink = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
  }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-sm font-medium transition-colors",
          active
            ? "bg-[#1A1A18] text-white"
            : "text-[#6B6B65] hover:bg-[#F0EFE9] hover:text-[#1A1A18]"
        )}
      >
        <Icon size={16} strokeWidth={active ? 2.5 : 2} />
        {label}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full py-4 px-3">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-6">
        <div className="w-7 h-7 bg-[#1A1A18] rounded-[6px] flex items-center justify-center">
          <Activity size={14} color="white" strokeWidth={2.5} />
        </div>
        <span className="font-medium text-[#1A1A18] text-base">FitTrack</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Bottom items */}
      <div className="flex flex-col gap-0.5 mt-2 pt-3 border-t border-[rgba(0,0,0,0.08)]">
        {bottomItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-sm font-medium text-[#6B6B65] hover:bg-[#FCEBEB] hover:text-[#A32D2D] transition-colors w-full text-left"
        >
          <LogOut size={16} strokeWidth={2} />
          Salir
        </button>

        {/* User info */}
        {session?.user && (
          <div className="mt-3 px-3 py-2 border-t border-[rgba(0,0,0,0.08)]">
            <p className="text-xs font-medium text-[#1A1A18] truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-[#A0A09A] truncate mt-0.5">
              {session.user.email}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-[220px] bg-white border-r border-[rgba(0,0,0,0.08)] z-30">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[rgba(0,0,0,0.08)] z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1A1A18] rounded-[6px] flex items-center justify-center">
            <Activity size={14} color="white" strokeWidth={2.5} />
          </div>
          <span className="font-medium text-[#1A1A18] text-base">FitTrack</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-[8px] hover:bg-[#F0EFE9] transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[220px] bg-white border-r border-[rgba(0,0,0,0.08)]">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
