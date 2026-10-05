import React from 'react';
import { Eye, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useVisionStore } from '../../stores/useVisionStore';

export const LiveDetectionsTable: React.FC = () => {
  const detectedObjects = useVisionStore((s) => s.detectedObjects);
  const isDetecting = useVisionStore((s) => s.isDetecting);

  // Identify nearest object (very close > close > far, or lowest estimatedMeters)
  const nearestObstacleId = detectedObjects.reduce<string | null>((nearestId, current) => {
    if (!nearestId) return current.id;
    const currentNearest = detectedObjects.find((o) => o.id === nearestId);
    if (!currentNearest) return current.id;
    return current.estimatedMeters < currentNearest.estimatedMeters ? current.id : nearestId;
  }, null);

  return (
    <div className="bg-[#14141C] text-white rounded-[24px] p-6 shadow-xl border border-slate-800 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-800 text-sky-400 flex items-center justify-center">
            <Eye className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white leading-snug">
              Live Detections
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Nearest obstacle highlighted in real time
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
          {detectedObjects.length} In View
        </span>
      </div>

      {!isDetecting ? (
        <div className="text-center py-8 text-slate-500 text-xs sm:text-sm font-medium">
          Detection is currently paused. Tap "Start Detection" to scan objects.
        </div>
      ) : detectedObjects.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs sm:text-sm font-medium flex flex-col items-center justify-center gap-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" aria-hidden="true" />
          <span>No detections yet</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Object</th>
                <th className="py-2.5 px-3">Direction</th>
                <th className="py-2.5 px-3">Distance</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {detectedObjects.map((obj) => {
                const isNearest = obj.id === nearestObstacleId;
                return (
                  <tr
                    key={obj.id}
                    className={`transition-colors rounded-xl ${
                      isNearest ? 'bg-slate-800/90 font-bold' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: obj.color }}
                          aria-hidden="true"
                        />
                        <span className="capitalize text-white">{obj.class}</span>
                        {isNearest && (
                          <span className="text-[10px] uppercase font-extrabold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                            Nearest
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 capitalize text-slate-300">{obj.direction}</td>
                    <td className="py-3 px-3 text-slate-300">
                      <span className="capitalize">{obj.distance}</span>
                      <span className="text-slate-500 text-xs ml-1">({obj.estimatedMeters}m)</span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          obj.dangerLevel === 'Danger'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : obj.dangerLevel === 'Caution'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {obj.dangerLevel === 'Danger' ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        <span>{obj.dangerLevel}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {obj.confidence}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
