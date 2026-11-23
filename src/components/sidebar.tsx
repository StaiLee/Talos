"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Coins, LayoutDashboard, MapPinCheck, Radio, ScrollText, Settings, Sparkles } from "lucide-react";

const navigation = [
  { href: "/", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/demonstration", label: "Démonstration IA", icon: Sparkles },
  { href: "/appels-offres", label: "Appels d’offres", icon: ScrollText },
  { href: "/eligibilite", label: "Éligibilité fibre", icon: MapPinCheck },
  { href: "/sources", label: "Sources & collecte", icon: Radio },
  { href: "/connaissances", label: "Base Paritel", icon: BookOpen },
  { href: "/consommation", label: "Tokens & coûts", icon: Coins },
];

export function Sidebar() {
  const pathname = usePathname();
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] flex-col bg-[#0c2340] text-white lg:flex">
    <Link href="/" className="flex h-[84px] items-center gap-3 border-b border-white/10 px-5" aria-label="Talos · Paritel">
      <Image src="/logo-paritel-blanc.svg" alt="Paritel" width={88} height={43} priority />
      <div className="border-l border-white/20 pl-3"><div className="text-[18px] font-bold tracking-[.16em]">TALOS</div><div className="text-[9px] text-white/55">APPELS D’OFFRES</div></div>
    </Link>
    <nav className="flex-1 space-y-1 px-3 py-6">
      {navigation.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition ${active ? "bg-white/12 font-semibold text-white" : "text-white/65 hover:bg-white/7 hover:text-white"}`}>
          <Icon size={17} strokeWidth={1.8} />{item.label}
        </Link>;
      })}
    </nav>
    <div className="m-4 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-xs font-medium"><span className="h-2 w-2 rounded-full bg-emerald-400" />Plateforme opérationnelle</div>
      <div className="mt-1.5 text-[10px] leading-relaxed text-white/45">Données sources · contrôle humain · aucune réponse automatique sans validation</div>
    </div>
    <div className="flex items-center gap-2 border-t border-white/10 px-6 py-4 text-xs text-white/50"><Settings size={14} /> POC · v0.1</div>
  </aside>;
}
