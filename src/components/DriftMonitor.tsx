import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import { TrendingDown, AlertTriangle, CheckCircle, Activity, TrendingUp, Zap } from 'lucide-react';
import { DriftDataPoint } from '../types';

interface DriftMonitorProps {
  driftData: DriftDataPoint[];
}

export default function DriftMonitor({ driftData }: DriftMonitorProps) {
  // Default to the last data point (most recent)
  const [selectedPoint, setSelectedPoint] = useState<DriftDataPoint | null>(null);

  // Derive the currently selected point: default to the latest run
  const activePoint = selectedPoint ?? (driftData.length > 0 ? driftData[driftData.length - 1] : null);

  // Compute live aggregate stats from actual data
  const stats = useMemo(() => {
    if (!driftData.length) return null;

    const cohesionValues = driftData.map(d => d.cohesionScore);
    const wordCounts = driftData.map(d => d.wordCount);
    const failureCount = driftData.filter(d => d.hasFailure).length;

    const avgCohesion = cohesionValues.reduce((a, b) => a + b, 0) / cohesionValues.length;
    const avgWordCount = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
    const minCohesion = Math.min(...cohesionValues);
    const maxCohesion = Math.max(...cohesionValues);

    // Detect if latest run is degraded vs average
    const latest = driftData[driftData.length - 1];
    const isCurrentlyDrifted = latest.cohesionScore < avgCohesion - 0.1 || latest.wordCount > avgWordCount * 1.3;

    // Find drift inflection point: first run where cohesion dropped significantly
    let inflectionRun: DriftDataPoint | null = null;
    for (let i = 1; i < driftData.length; i++) {
      if (driftData[i].cohesionScore < driftData[i - 1].cohesionScore - 0.07) {
        inflectionRun = driftData[i];
        break;
      }
    }

    return {
      avgCohesion: avgCohesion.toFixed(2),
      avgWordCount: Math.round(avgWordCount),
      minCohesion: minCohesion.toFixed(2),
      maxCohesion: maxCohesion.toFixed(2),
      failureRate: ((failureCount / driftData.length) * 100).toFixed(0),
      totalRuns: driftData.length,
      latestCohesion: latest.cohesionScore,
      latestWordCount: latest.wordCount,
      isCurrentlyDrifted,
      inflectionRun,
    };
  }, [driftData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as DriftDataPoint;
      return (
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-xl text-left font-sans text-xs">
          <p className="font-bold text-white mb-1">Run #{data.runIndex} ({data.runId})</p>
          <p className="text-violet-400">Cohesion: <span className="font-mono font-bold">{data.cohesionScore}</span></p>
          <p className="text-amber-400">Word Count: <span className="font-mono font-bold">{data.wordCount} words</span></p>
          {data.hasFailure && <p className="text-red-400 font-bold mt-1">⚠ Failure detected</p>}
          <p className="text-slate-500 text-[10px] mt-1 italic">{data.model}</p>
        </div>
      );
    }
    return null;
  };

  // Empty state
  if (!driftData.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#0f172a] border border-slate-800 rounded-xl text-slate-500 text-sm">
        <Activity size={16} className="mr-2" /> No drift data available yet — run the agent to generate records.
      </div>
    );
  }

  return (
    <div className="space-y-6" id="scen-b-container">

      {/* Header Banner — alert state driven by real data */}
      <div className="p-5 bg-[#0f172a] border border-slate-800 rounded-xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                SCENARIO B MONITORS
              </span>
              <h2 className="text-xl font-serif text-white flex items-center gap-2">
                <TrendingDown className="text-amber-400" size={20} /> Continuous <span className="italic">Drift Monitor</span>
              </h2>
            </div>
            {stats && (
              <p className="text-xs text-slate-400 max-w-3xl">
                Tracking <strong>{stats.totalRuns} runs</strong>. Current average output is{' '}
                <strong>{stats.avgWordCount} words</strong> with a cohesion index of{' '}
                <strong>{stats.avgCohesion}</strong>.
                {stats.inflectionRun && (
                  <> Drift inflection detected at <strong>Run #{stats.inflectionRun.runIndex}</strong>.</>
                )}
              </p>
            )}
          </div>

          {stats && (
            stats.isCurrentlyDrifted ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold leading-none animate-pulse">
                <AlertTriangle size={14} /> HIGH DRIFT ALERT ACTIVE
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold leading-none">
                <CheckCircle size={14} /> STABLE — NO DRIFT DETECTED
              </div>
            )
          )}
        </div>
      </div>

      {/* Live Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Avg Cohesion',
              value: stats.avgCohesion,
              sub: `Range: ${stats.minCohesion} – ${stats.maxCohesion}`,
              color: parseFloat(stats.avgCohesion) >= 0.70 ? 'text-emerald-400' : 'text-red-400',
              icon: <Activity size={14} />,
            },
            {
              label: 'Avg Word Count',
              value: `${stats.avgWordCount}w`,
              sub: 'Per Confluence output',
              color: stats.avgWordCount < 130 ? 'text-emerald-400' : 'text-amber-400',
              icon: <TrendingUp size={14} />,
            },
            {
              label: 'Latest Cohesion',
              value: stats.latestCohesion,
              sub: 'Most recent run',
              color: stats.latestCohesion >= 0.70 ? 'text-emerald-400' : 'text-red-400',
              icon: <Zap size={14} />,
            },
            {
              label: 'Failure Rate',
              value: `${stats.failureRate}%`,
              sub: `Over ${stats.totalRuns} runs`,
              color: parseInt(stats.failureRate) < 20 ? 'text-emerald-400' : 'text-red-400',
              icon: <AlertTriangle size={14} />,
            },
          ].map((s) => (
            <div key={s.label} className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span className={s.color}>{s.icon}</span>
                {s.label}
              </div>
              <div className={`text-2xl font-mono font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-600">{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Chart Panel */}
        <div className="lg:col-span-7 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-serif text-slate-200">
              Cohesion Index vs. Word Count — {driftData[0]?.runIndex} to {driftData[driftData.length - 1]?.runIndex}
            </h3>
            <p className="text-[10px] text-slate-500">
              Click on a point to inspect the run in the right panel.
            </p>
          </div>

          <div className="w-full h-[280px]" id="drift-recharts-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={driftData}
                onClick={(state: any) => {
                  if (state?.activePayload?.length) {
                    setSelectedPoint(state.activePayload[0].payload);
                  }
                }}
                margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="runIndex"
                  stroke="#64748b"
                  tickLine={false}
                  fontSize={10}
                  label={{ value: 'Execution Runs (Time series)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis
                  yAxisId="left"
                  domain={[0.3, 1.0]}
                  stroke="#8b5cf6"
                  tickLine={false}
                  fontSize={10}
                  label={{ value: 'Cohesion Score', angle: -90, position: 'insideLeft', offset: 10, fill: '#8b5cf6', fontSize: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#f59e0b"
                  tickLine={false}
                  fontSize={10}
                  label={{ value: 'Word Count', angle: 90, position: 'insideRight', offset: 10, fill: '#f59e0b', fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} fontSize={10} wrapperStyle={{ fontSize: 10, color: '#64748b' }} />

                {/* Dynamic inflection marker */}
                {stats?.inflectionRun && (
                  <ReferenceLine
                    yAxisId="left"
                    x={stats.inflectionRun.runIndex}
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={{ value: 'Drift Start', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }}
                  />
                )}

                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cohesionScore"
                  name="Cohesion Index"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const isSelected = activePoint?.runIndex === props.payload.runIndex;
                    const isInflection = stats?.inflectionRun?.runIndex === props.payload.runIndex;
                    return (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={isSelected ? 6 : isInflection ? 5 : 2}
                        fill={isSelected ? '#d946ef' : isInflection ? '#ef4444' : '#8b5cf6'}
                        stroke="none"
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="wordCount"
                  name="Word Count"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {stats?.inflectionRun && (
            <div className="flex items-center gap-1.5 p-3 bg-slate-950 border border-slate-900 rounded-lg text-slate-400 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>
                <strong>Drift inflection at Run #{stats.inflectionRun.runIndex} ({stats.inflectionRun.model}):</strong>{' '}
                Cohesion dropped to {stats.inflectionRun.cohesionScore} and word count rose to {stats.inflectionRun.wordCount}.
              </span>
            </div>
          )}
        </div>

        {/* Inspector Panel */}
        <div className="lg:col-span-5 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col space-y-4" id="drift-comparer-panel">
          <div>
            <h3 className="text-sm font-serif text-slate-200 flex items-center gap-1.5">
              <Activity size={14} className="text-violet-400" /> Run Inspector
            </h3>
            <p className="text-[10px] text-slate-500">
              Click any point on the chart, or use the quick-access buttons below.
            </p>
          </div>

          {/* Quick access: first, last, worst */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { label: 'First Run', run: driftData[0] },
              { label: 'Latest Run', run: driftData[driftData.length - 1] },
              {
                label: 'Worst Run',
                run: driftData.reduce((w, d) => d.cohesionScore < w.cohesionScore ? d : w, driftData[0])
              },
            ].map(({ label, run }) => (
              <button
                key={label}
                onClick={() => setSelectedPoint(run)}
                className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                  activePoint?.runIndex === run.runIndex
                    ? 'bg-violet-600/10 border-violet-500 text-violet-300'
                    : 'bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-400'
                }`}
              >
                <div className="font-bold text-[10px] truncate">{label}</div>
                <div className="font-mono text-[10px] text-slate-500 mt-0.5">#{run.runIndex}</div>
              </button>
            ))}
          </div>

          {/* Dynamic inspector content */}
          {activePoint && (
            <div className="p-4 bg-slate-950 border border-slate-900 rounded-lg space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-900 pb-1.5 text-slate-500">
                <span>Run #{activePoint.runIndex} — {activePoint.runId}</span>
                <span className={activePoint.hasFailure ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {activePoint.hasFailure ? '⚠ FAILED' : '✓ OK'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-900/80 p-2 rounded">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Cohesion Index</div>
                  <div className={`text-xl font-extrabold font-mono mt-0.5 ${activePoint.cohesionScore >= 0.70 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {activePoint.cohesionScore}
                  </div>
                  {stats && (
                    <div className="text-[9px] text-slate-600 mt-0.5">
                      avg {stats.avgCohesion}
                    </div>
                  )}
                </div>
                <div className="bg-slate-900/80 p-2 rounded">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Word Count</div>
                  <div className={`text-xl font-extrabold font-mono mt-0.5 ${activePoint.wordCount < 120 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {activePoint.wordCount}w
                  </div>
                  {stats && (
                    <div className="text-[9px] text-slate-600 mt-0.5">
                      avg {stats.avgWordCount}w
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-500">
                  <span>Model</span>
                  <span className="font-mono text-slate-300">{activePoint.model}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Timestamp</span>
                  <span className="font-mono text-slate-300">{activePoint.timestamp}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>vs. Average Cohesion</span>
                  <span className={`font-mono font-bold ${
                    stats && activePoint.cohesionScore >= parseFloat(stats.avgCohesion)
                      ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {stats
                      ? `${activePoint.cohesionScore >= parseFloat(stats.avgCohesion) ? '+' : ''}${(activePoint.cohesionScore - parseFloat(stats.avgCohesion)).toFixed(2)}`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>vs. Average Words</span>
                  <span className={`font-mono font-bold ${
                    stats && activePoint.wordCount <= stats.avgWordCount
                      ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {stats
                      ? `${activePoint.wordCount > stats.avgWordCount ? '+' : ''}${activePoint.wordCount - stats.avgWordCount}w`
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Drift verdict badge */}
              <div className={`mt-auto text-center text-[10px] font-bold py-1.5 rounded-lg ${
                activePoint.cohesionScore >= 0.70 && activePoint.wordCount < 150
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : activePoint.hasFailure
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {activePoint.cohesionScore >= 0.70 && activePoint.wordCount < 150
                  ? '✓ Run within healthy bounds'
                  : activePoint.hasFailure
                  ? '✗ Run marked as failed'
                  : '⚠ Degraded output detected'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}