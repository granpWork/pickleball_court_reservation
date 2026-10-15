import React from 'react';
import { BarChart2, X, Copy, Download } from 'lucide-react';
import { type OpenPlayEvent } from '../../../OpenPlayDetails';
import {
  type OpenPlayMatch,
  type OpenPlayMatchRosterItem,
  type PlayerMatchStats,
} from '../../adminTypes';

export interface OpenPlayReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: OpenPlayEvent;
  matches: OpenPlayMatch[];
  rosterPool: OpenPlayMatchRosterItem[];
  playerStatsList: PlayerMatchStats[];
  reportSortField: 'matches' | 'winRate' | 'pointDiff' | 'name';
  setReportSortField: (field: 'matches' | 'winRate' | 'pointDiff' | 'name') => void;
  onCopyReportText: () => void;
  onExportReportCSV: () => void;
}

export const OpenPlayReportModal: React.FC<OpenPlayReportModalProps> = ({
  isOpen,
  onClose,
  event,
  matches,
  rosterPool,
  playerStatsList,
  reportSortField,
  setReportSortField,
  onCopyReportText,
  onExportReportCSV,
}) => {
  if (!isOpen) return null;

  const sortedStats = [...playerStatsList].sort((a, b) => {
    if (reportSortField === 'matches') return b.totalMatches - a.totalMatches;
    if (reportSortField === 'winRate') return b.winRate - a.winRate;
    if (reportSortField === 'pointDiff') return b.pointDiff - a.pointDiff;
    return a.playerName.localeCompare(b.playerName);
  });

  const totalSessionMatches = matches.length;
  const totalCompletedGames = matches.filter((m) => m.status === 'completed').length;
  const avgMatchesPerPlayer =
    rosterPool.length > 0
      ? (playerStatsList.reduce((sum, s) => sum + s.totalMatches, 0) / rosterPool.length).toFixed(1)
      : '0';
  const topScorer = [...playerStatsList].sort((a, b) => b.wins - a.wins)[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 text-left bg-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="w-6 h-6 text-brand-emerald" />
            <div>
              <h3 className="text-lg font-black text-white">Player Match Activity & Statistics Report</h3>
              <p className="text-xs text-slate-400">
                Session: <strong className="text-slate-200">{event.title}</strong> ({event.eventDate})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Total Roster Players
            </span>
            <span className="text-xl font-black text-white font-mono">{rosterPool.length}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Total Session Games
            </span>
            <span className="text-xl font-black text-purple-300 font-mono">
              {totalSessionMatches} ({totalCompletedGames} done)
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Avg Games / Player
            </span>
            <span className="text-xl font-black text-brand-lime font-mono">{avgMatchesPerPlayer}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Win Leader
            </span>
            <span className="text-sm font-black text-amber-400 truncate block mt-1">
              {topScorer ? `${topScorer.playerName} (${topScorer.wins}W)` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Toolbar Actions & Sort controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">Sort By:</span>
            <select
              value={reportSortField}
              onChange={(e) => setReportSortField(e.target.value as 'matches' | 'winRate' | 'pointDiff' | 'name')}
              className="bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-1 font-bold focus:outline-none focus:border-brand-emerald"
            >
              <option value="matches">Total Matches</option>
              <option value="winRate">Win Rate (%)</option>
              <option value="pointDiff">Point Differential</option>
              <option value="name">Player Name</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCopyReportText}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-brand-lime" /> Copy Text Summary
            </button>

            <button
              type="button"
              onClick={onExportReportCSV}
              className="px-3.5 py-1.5 rounded-xl bg-brand-emerald text-dark-bg font-extrabold text-xs flex items-center gap-1.5 hover:bg-[#20f5b4] transition-all cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV Report
            </button>
          </div>
        </div>

        {/* Player Report Table */}
        <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-80 overflow-y-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="p-3">Player</th>
                <th className="p-3 text-center">Assigned Games</th>
                <th className="p-3 text-center">Completed</th>
                <th className="p-3 text-center">W - L - T</th>
                <th className="p-3 text-center">Win Rate</th>
                <th className="p-3 text-center">Points (+/-)</th>
                <th className="p-3">Courts Played On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
              {sortedStats.map((stat, idx) => (
                <tr key={stat.playerId} className="hover:bg-slate-800/40 transition-all">
                  <td className="p-3">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="w-5 text-slate-500 font-mono text-[10px]">#{idx + 1}</span>
                      <span>{stat.playerName}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                        {stat.playerType}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-purple-300">
                    {stat.totalMatches}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-300">
                    {stat.completedMatches}
                  </td>
                  <td className="p-3 text-center font-mono font-bold">
                    <span className="text-brand-lime">{stat.wins}W</span> -{' '}
                    <span className="text-red-400">{stat.losses}L</span>{' '}
                    {stat.ties > 0 && <span className="text-slate-400">({stat.ties}T)</span>}
                  </td>
                  <td className="p-3 text-center font-mono font-bold">
                    <span className={stat.winRate >= 50 ? 'text-brand-lime' : 'text-slate-400'}>
                      {stat.winRate}%
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono">
                    <span
                      className={
                        stat.pointDiff > 0
                          ? 'text-brand-lime font-bold'
                          : stat.pointDiff < 0
                          ? 'text-red-400'
                          : 'text-slate-400'
                      }
                    >
                      {stat.pointDiff >= 0 ? `+${stat.pointDiff}` : stat.pointDiff}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ({stat.pointsScored} / {stat.pointsConceded})
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 flex-wrap text-[10px]">
                      {Object.entries(stat.courtsBreakdown).map(([court, count], cIdx) => (
                        <span
                          key={cIdx}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono"
                        >
                          {court}: <strong>{count}x</strong>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};

