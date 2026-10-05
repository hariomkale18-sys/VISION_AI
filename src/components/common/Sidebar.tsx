import React from 'react';
import {
  LayoutDashboard,
  Eye,
  Navigation,
  Mic,
  ShieldAlert,
  Settings,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useVisionStore } from '../../stores/useVisionStore';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenEmergency: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings, onOpenEmergency }) => {
  const activeTab = useVisionStore((s) => s.activeTab);
  const setActiveTab = useVisionStore((s) => s.setActiveTab);
  const highContrast = useVisionStore((s) => s.highContrast);

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'detection' as const, label: 'Detection', icon: Eye },
    { id: 'navigation' as const, label: 'Navigation', icon: Navigation },
    { id: 'voice' as const, label: 'Voice Commands', icon: Mic },
    { id: 'emergency' as const, label: 'Emergency', icon: ShieldAlert },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (id: typeof activeTab) => {
    if (id === 'emergency') {
      onOpenEmergency();
    } else if (id === 'settings') {
      onOpenSettings();
    } else {
      setActiveTab(id);
    }
  };

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside
        aria-label="Application navigation"
        className="hidden lg:flex flex-col justify-between w-64 xl:w-72 bg-white/95 rounded-[32px] p-6 shadow-sm border border-slate-200/60 shrink-0"
      >
        <div className="space-y-6">
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Eye className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 block leading-tight">
                VISION_AI
              </span>
              <span className="text-[11px] font-semibold text-blue-600 tracking-wide uppercase">
                Voice-First Brain
              </span>
            </div>
          </div>

          {/* User Profile Tile */}
          <div className="bg-slate-50/80 rounded-2xl p-3.5 flex items-center gap-3 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm ring-2 ring-blue-500/30">
              HK
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-slate-900 truncate">Hariom Kale</div>
              <div className="text-xs text-slate-500 truncate">
                {highContrast ? 'High Contrast Mode' : 'Voice Assist Active'}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="space-y-1.5" aria-label="Main menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition relative group min-h-[52px] ${
                    isActive
                      ? highContrast
                        ? 'bg-black text-yellow-400'
                        : 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {/* Active Indicator Bar on Left */}
                  {isActive && (
                    <span
                      className={`absolute left-0 top-2.5 bottom-2.5 w-1.5 rounded-r-full ${
                        highContrast ? 'bg-yellow-400' : 'bg-blue-600'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive
                        ? highContrast
                          ? 'text-yellow-400'
                          : 'text-blue-600'
                        : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Dark Card: Reports & History */}
        <div className="bg-[#14141C] text-white rounded-2xl p-4 shadow-lg border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Activity Sync</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            History available. Check your weekly obstacle & walking reports.
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-blue-400 font-bold">
            <span>Offline Ready</span>
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-2 flex items-center justify-around shadow-xl"
      >
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition min-w-[56px] min-h-[56px] ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] mt-1 tracking-tight">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
