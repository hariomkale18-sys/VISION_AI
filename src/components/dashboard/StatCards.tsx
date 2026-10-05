import React from 'react';
import { Eye, Footprints, Mic, TrendingUp, Minus } from 'lucide-react';
import { useStatsStore } from '../../store/statsStore';
import { useVisionStore } from '../../stores/useVisionStore';

export const StatCards: React.FC = () => {
  const objectsDetectedToday = useStatsStore((s) => s.objectsDetectedToday);
  const distanceWalkedMeters = useStatsStore((s) => s.distanceWalkedMeters);
  const voiceCommandsCount = useStatsStore((s) => s.voiceCommandsCount);
  const getYesterdayComparison = useStatsStore((s) => s.getYesterdayComparison);
  const getSparklineData = useStatsStore((s) => s.getSparklineData);

  const isNavigating = useVisionStore((s) => s.isNavigating);
  const highContrast = useVisionStore((s) => s.highContrast);

  // Real distance formatting: show metres under 1 km, km afterwards. Shows 0 m until real movement.
  const distanceDisplay =
    distanceWalkedMeters < 1000
      ? `${Math.round(distanceWalkedMeters)}`
      : `${(distanceWalkedMeters / 1000).toFixed(2)}`;
  const distanceUnit = distanceWalkedMeters < 1000 ? 'm' : 'km';

  // Real comparisons with yesterday
  const objectsComparison = getYesterdayComparison('objects');
  const distanceComparison = getYesterdayComparison('distance');
  const voiceComparison = getYesterdayComparison('voice');

  // Real sparkline historical arrays (last 7 recorded values)
  const objectsSparkline = getSparklineData('objects');
  const distanceSparkline = getSparklineData('distance');
  const voiceSparkline = getSparklineData('voice');

  const stats = [
    {
      title: 'Objects Detected Today',
      value: objectsDetectedToday,
      unit: 'items',
      trend: objectsComparison.text,
      hasTrendData: objectsComparison.hasYesterday,
      icon: Eye,
      iconBg: 'bg-slate-900',
      iconColor: 'text-sky-400',
      sparkline: objectsSparkline,
      sparklineColor: '#38BDF8',
    },
    {
      title: 'Distance Walked',
      value: distanceDisplay,
      unit: distanceUnit,
      trend: isNavigating ? 'Navigation active' : distanceComparison.text,
      hasTrendData: isNavigating || distanceComparison.hasYesterday,
      icon: Footprints,
      iconBg: 'bg-slate-900',
      iconColor: 'text-emerald-400',
      sparkline: distanceSparkline,
      sparklineColor: '#10B981',
    },
    {
      title: 'Voice Commands Used',
      value: voiceCommandsCount,
      unit: 'commands',
      trend: voiceComparison.text,
      hasTrendData: voiceComparison.hasYesterday,
      icon: Mic,
      iconBg: 'bg-slate-900',
      iconColor: 'text-violet-400',
      sparkline: voiceSparkline,
      sparklineColor: '#8B5CF6',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        const allZeros = stat.sparkline.every((v) => v === 0);
        const min = Math.min(...stat.sparkline);
        const max = Math.max(...stat.sparkline);
        const hasVariation = !allZeros && max > min;

        return (
          <div
            key={idx}
            className={`rounded-[24px] p-5 shadow-sm border transition ${
              highContrast
                ? 'bg-black text-white border-yellow-400 border-2'
                : 'bg-white border-slate-200/60 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-2xl ${
                  highContrast ? 'bg-yellow-400 text-black' : `${stat.iconBg} ${stat.iconColor}`
                } flex items-center justify-center shadow-md`}
              >
                <Icon className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {stat.title}
                </span>
                <div className="flex items-baseline justify-end gap-1 mt-0.5">
                  <span
                    className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                      highContrast ? 'text-yellow-400' : 'text-slate-900'
                    }`}
                  >
                    {stat.value}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{stat.unit}</span>
                </div>
              </div>
            </div>

            {/* Sparkline & Real Trend Indicator */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div
                className={`flex items-center gap-1 text-[11px] font-semibold ${
                  stat.hasTrendData ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {stat.hasTrendData ? (
                  <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                )}
                <span>{stat.trend}</span>
              </div>

              {/* Real Data Sparkline or Clean Empty State Line */}
              <svg className="w-20 h-6 overflow-visible" aria-hidden="true">
                {hasVariation ? (
                  <polyline
                    fill="none"
                    stroke={highContrast ? '#FACC15' : stat.sparklineColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={stat.sparkline
                      .map((val, i) => {
                        const normalizedY = 22 - ((val - min) / (max - min)) * 18;
                        const x = (i / (stat.sparkline.length - 1)) * 76 + 2;
                        return `${x},${normalizedY}`;
                      })
                      .join(' ')}
                  />
                ) : (
                  // Empty state subtle flat dashed line
                  <line
                    x1="2"
                    y1="14"
                    x2="78"
                    y2="14"
                    stroke="#CBD5E1"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
};
