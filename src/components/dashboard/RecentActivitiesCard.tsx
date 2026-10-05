import React from 'react';
import { History, Mic, Camera, Navigation, ShieldAlert, Cpu } from 'lucide-react';
import { useVisionStore } from '../../stores/useVisionStore';

export const RecentActivitiesCard: React.FC = () => {
  const recentActivities = useVisionStore((s) => s.recentActivities);
  const highContrast = useVisionStore((s) => s.highContrast);

  const getIcon = (type: string) => {
    switch (type) {
      case 'mic':
        return <Mic className="w-4 h-4 text-violet-400" aria-hidden="true" />;
      case 'camera':
        return <Camera className="w-4 h-4 text-sky-400" aria-hidden="true" />;
      case 'nav':
        return <Navigation className="w-4 h-4 text-emerald-400" aria-hidden="true" />;
      case 'emergency':
        return <ShieldAlert className="w-4 h-4 text-rose-400" aria-hidden="true" />;
      default:
        return <Cpu className="w-4 h-4 text-amber-400" aria-hidden="true" />;
    }
  };

  return (
    <div
      className={`rounded-[24px] p-6 shadow-sm border transition mb-6 ${
        highContrast
          ? 'bg-black text-white border-yellow-400 border-2'
          : 'bg-white border-slate-200/60'
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-slate-300 flex items-center justify-center shadow-md">
          <History className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
            Recent Activities
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Timeline of commands, obstacle warnings, and navigation events
          </p>
        </div>
      </div>

      {recentActivities.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs sm:text-sm font-medium">
          No recent activities yet
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {recentActivities.slice(0, 6).map((activity) => (
            <div key={activity.id} className="py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center shrink-0 shadow-sm">
                  {getIcon(activity.iconType)}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 leading-snug">
                    {activity.action}
                  </div>
                  <div className="text-xs text-slate-500 font-medium truncate max-w-xs sm:max-w-md">
                    {activity.details}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[11px] font-semibold text-slate-400">{activity.time}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activity.status === 'Active'
                      ? 'bg-blue-100 text-blue-700'
                      : activity.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {activity.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
