import React, { useState } from 'react';
import {
  Trophy,
  Copy,
  Download,
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
} from 'lucide-react';
import type { PlayerMatchStats, OpenPlayMatch } from '../../adminTypes';
import { DuprRatingBadge } from '../../../../utils/duprColorUtils';

interface OpenPlayLeaderboardViewProps {
  sortedLeaderboardList: PlayerMatchStats[];
  matches: OpenPlayMatch[];
  eventTitle: string;
  eventDate: string;
  leaderboardSortField: 'wins' | 'winRate' | 'pointDiff' | 'pointsScored' | 'matches';
  leaderboardSearch: string;
  expandedLeaderboardPlayerId: string | null;
  getRoundTitle: (roundNum: number) => string;
  onSortChange: (field: 'wins' | 'winRate' | 'pointDiff' | 'pointsScored' | 'matches') => void;
  onSearchChange: (search: string) => void;
  onToggleExpandPlayer: (playerId: string) => void;
  onBackToMatrix: () => void;
  onCopyReportText: () => void;
  onExportReportCSV: () => void;
}

export const OpenPlayLeaderboardView: React.FC<OpenPlayLeaderboardViewProps> = ({
  sortedLeaderboardList,
  matches,
  eventTitle,
  eventDate: _eventDate,
  leaderboardSortField,
  leaderboardSearch,
  expandedLeaderboardPlayerId,
  getRoundTitle,
  onSortChange,
  onSearchChange,
  onToggleExpandPlayer,
  onBackToMatrix,
  onCopyReportText,
  onExportReportCSV,
}) => {
  // Layout display mode: 'auto' (cards on mobile, table on desktop), or explicit 'cards' / 'table'
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Helper to extract player's DUPR info from matches
  const getPlayerDuprInfo = (playerId: string, playerName: string) => {
    for (const m of matches) {
      const p =
        m.teamRed.players.find(
          (pl) =>
            (pl.id && pl.id === playerId) ||
            (pl.name && pl.name.trim().toLowerCase() === playerName.trim().toLowerCase())
        ) ||
        m.teamBlue.players.find(
          (pl) =>
            (pl.id && pl.id === playerId) ||
            (pl.name && pl.name.trim().toLowerCase() === playerName.trim().toLowerCase())
        );
      if (p && (p.duprId || p.duprRating)) {
        return { duprId: p.duprId, duprRating: p.duprRating };
      }
    }
    return null;
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full max-w-full overflow-hidden">
      {/* Leaderboard Top Header Card */}
      <div className="glass-panel border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 bg-slate-900/80">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[10px] sm:text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> Individual Rankings
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-mono">
                {sortedLeaderboardList.length} Players Ranked
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Event Leaderboard Standings
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Individual player rankings based on total wins, win percentage, and net point differential for{' '}
              <strong className="text-white">{eventTitle}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={onCopyReportText}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Copy text summary to clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>Copy Text</span>
            </button>
            <button
              type="button"
              onClick={onExportReportCSV}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-dark-bg font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg hover:scale-[1.01]"
              title="Download Leaderboard Standings CSV"
            >
              <Download className="w-3.5 h-3.5 text-dark-bg" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onBackToMatrix}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-brand-lime text-brand-lime text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-brand-lime" />
              <span>Back to Match Matrix</span>
            </button>
          </div>
        </div>

        {/* Top 3 Podium Cards */}
        {sortedLeaderboardList.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-slate-800">
            {/* Gold 🥇 Rank #1 */}
            {sortedLeaderboardList[0] && (
              <div className="relative rounded-2xl sm:rounded-3xl border-2 border-amber-400/90 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-2xl flex flex-col justify-between space-y-3.5 text-left overflow-hidden group hover:border-amber-300 transition-all">
                <div className="absolute top-0 right-0 px-2.5 sm:px-3 py-1 bg-amber-400 text-dark-bg font-black text-[10px] sm:text-[11px] uppercase tracking-wider rounded-bl-2xl shadow-md flex items-center gap-1">
                  👑 1st (Gold)
                </div>
                <div className="flex items-center gap-3 pr-24 sm:pr-28">
                  <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-amber-400 bg-amber-500/20 shrink-0 overflow-hidden shadow-inner">
                    <img
                      src={`https://robohash.org/${encodeURIComponent(sortedLeaderboardList[0].playerName)}?set=set4`}
                      alt={sortedLeaderboardList[0].playerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm sm:text-base font-black text-amber-300 truncate">
                      {sortedLeaderboardList[0].playerName}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>🥇 Rank #1</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {sortedLeaderboardList[0].wins} Wins
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-950/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-amber-500/30 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Win Rate</span>
                    <span className="font-black text-brand-lime font-mono text-xs sm:text-sm">
                      {sortedLeaderboardList[0].winRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Point Diff</span>
                    <span className="font-black text-amber-300 font-mono text-xs sm:text-sm">
                      {sortedLeaderboardList[0].pointDiff >= 0
                        ? `+${sortedLeaderboardList[0].pointDiff}`
                        : sortedLeaderboardList[0].pointDiff}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Played</span>
                    <span className="font-black text-white font-mono text-xs sm:text-sm">
                      {sortedLeaderboardList[0].completedMatches}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Silver 🥈 Rank #2 */}
            {sortedLeaderboardList[1] && (
              <div className="relative rounded-2xl sm:rounded-3xl border-2 border-slate-400/80 bg-gradient-to-b from-slate-800/40 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-3.5 text-left overflow-hidden group hover:border-slate-300 transition-all">
                <div className="absolute top-0 right-0 px-2.5 sm:px-3 py-1 bg-slate-300 text-dark-bg font-black text-[10px] sm:text-[11px] uppercase tracking-wider rounded-bl-2xl shadow-md flex items-center gap-1">
                  🥈 2nd (Silver)
                </div>
                <div className="flex items-center gap-3 pr-24 sm:pr-28">
                  <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-slate-300 bg-slate-700/40 shrink-0 overflow-hidden shadow-inner">
                    <img
                      src={`https://robohash.org/${encodeURIComponent(sortedLeaderboardList[1].playerName)}?set=set4`}
                      alt={sortedLeaderboardList[1].playerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm sm:text-base font-black text-slate-200 truncate">
                      {sortedLeaderboardList[1].playerName}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>🥈 Rank #2</span>
                      <span className="font-mono text-slate-200 font-bold">
                        {sortedLeaderboardList[1].wins} Wins
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-950/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-700 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Win Rate</span>
                    <span className="font-black text-brand-lime font-mono text-xs sm:text-sm">
                      {sortedLeaderboardList[1].winRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Point Diff</span>
                    <span className="font-black text-slate-200 font-mono text-xs sm:text-sm">
                      {sortedLeaderboardList[1].pointDiff >= 0
                        ? `+${sortedLeaderboardList[1].pointDiff}`
                        : sortedLeaderboardList[1].pointDiff}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Played</span>
                    <span className="font-black text-white font-mono text-xs sm:text-sm">
                      {sortedLeaderboardList[1].completedMatches}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bronze 🥉 Rank #3 */}
            {sortedLeaderboardList[2] && (
              <div className="relative rounded-2xl sm:rounded-3xl border-2 border-amber-700/80 bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-3.5 text-left overflow-hidden group hover:border-amber-600 transition-all sm:col-span-2 lg:col-span-1">
                <div className="absolute top-0 right-0 px-2.5 sm:px-3 py-1 bg-amber-700 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider rounded-bl-2xl shadow-md flex items-center gap-1">
                  🥉 3rd (Bronze)
                </div>
                <div className="flex items-center gap-3 pr-24 sm:pr-28">
                  <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-amber-600 bg-amber-900/30 shrink-0 overflow-hidden shadow-inner">
                    <img
                      src={`https://robohash.org/${encodeURIComponent(sortedLeaderboardList[2].playerName)}?set=set4`}
                      alt={sortedLeaderboardList[2].playerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm sm:text-base font-black text-amber-500 truncate">
                      {sortedLeaderboardList[2].playerName}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>🥉 Rank #3</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {sortedLeaderboardList[2].wins} Wins
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-950/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-amber-900/50 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Win Rate</span>
                    <span className="font-black text-brand-lime font-mono text-xs sm:text-sm">
                      {sortedLeaderboardList[2].winRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Point Diff</span>
                    <span className="font-black text-amber-400 font-mono text-xs sm:text-sm">
                      {sortedLeaderboardList[2].pointDiff >= 0
                        ? `+${sortedLeaderboardList[2].pointDiff}`
                        : sortedLeaderboardList[2].pointDiff}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Played</span>
                    <span className="font-black text-white font-mono text-xs sm:text-sm">
                      {sortedLeaderboardList[2].completedMatches}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard Toolbar & Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs bg-slate-900/60 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] shrink-0">
              Rank By:
            </span>
            <select
              value={leaderboardSortField}
              onChange={(e) =>
                onSortChange(
                  e.target.value as 'wins' | 'winRate' | 'pointDiff' | 'pointsScored' | 'matches'
                )
              }
              className="flex-1 sm:flex-initial bg-slate-950 border border-slate-800 text-amber-300 font-black rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="wins">Total Wins (Most Wins First)</option>
              <option value="winRate">Win Percentage (%)</option>
              <option value="pointDiff">Net Point Differential (+/-)</option>
              <option value="pointsScored">Total Points Scored</option>
              <option value="matches">Completed Games Played</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* View Mode Segmented Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-amber-400 text-dark-bg font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Show as Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-amber-400 text-dark-bg font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Show as Table"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('auto')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'auto'
                  ? 'bg-slate-800 text-brand-lime font-black border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Responsive: Cards on Mobile, Table on Desktop"
            >
              <Sparkles className="w-3 h-3 text-brand-lime" />
              <span>Auto</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 md:w-60 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search player name..."
              value={leaderboardSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-semibold"
            />
            {leaderboardSearch && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {sortedLeaderboardList.length === 0 && (
        <div className="border border-slate-800 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center bg-slate-950/60 shadow-xl space-y-2">
          <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-400">No player standings found.</p>
          <p className="text-xs text-slate-500">
            {leaderboardSearch ? 'Try a different search query.' : 'Matches will populate rankings once recorded.'}
          </p>
        </div>
      )}

      {/* MOBILE / TABLET CARDS VIEW (Displayed when viewMode === 'cards' or when viewMode === 'auto' on screens < lg) */}
      {sortedLeaderboardList.length > 0 && (
        <div
          className={`space-y-3 ${
            viewMode === 'table' ? 'hidden' : viewMode === 'cards' ? 'block' : 'block lg:hidden'
          }`}
        >
          {sortedLeaderboardList.map((stat, idx) => {
            const isExpanded = expandedLeaderboardPlayerId === stat.playerId;
            const playerMatches = matches.filter(
              (m) =>
                m.teamRed.players.some(
                  (p) =>
                    (p.id && p.id === stat.playerId) ||
                    (p.name && p.name.trim().toLowerCase() === stat.playerName.trim().toLowerCase())
                ) ||
                m.teamBlue.players.some(
                  (p) =>
                    (p.id && p.id === stat.playerId) ||
                    (p.name && p.name.trim().toLowerCase() === stat.playerName.trim().toLowerCase())
                )
            );
            const duprInfo = getPlayerDuprInfo(stat.playerId, stat.playerName);

            return (
              <div
                key={stat.playerId}
                className={`rounded-2xl border p-4 sm:p-5 transition-all space-y-3 text-left shadow-lg ${
                  idx === 0
                    ? 'bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-950 border-amber-500/50 ring-1 ring-amber-500/30'
                    : idx === 1
                    ? 'bg-gradient-to-b from-slate-800/30 via-slate-900 to-slate-950 border-slate-600/50'
                    : idx === 2
                    ? 'bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-950 border-amber-700/50'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header: Rank + Avatar + Name + Expand Button */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div className="shrink-0">
                      {idx === 0 ? (
                        <span className="w-8 h-8 rounded-full bg-amber-400 text-dark-bg flex items-center justify-center font-black text-xs shadow-md">
                          🥇 1
                        </span>
                      ) : idx === 1 ? (
                        <span className="w-8 h-8 rounded-full bg-slate-300 text-dark-bg flex items-center justify-center font-black text-xs shadow-md">
                          🥈 2
                        </span>
                      ) : idx === 2 ? (
                        <span className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center font-black text-xs shadow-md">
                          🥉 3
                        </span>
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono font-bold text-xs flex items-center justify-center shadow-inner">
                          #{idx + 1}
                        </span>
                      )}
                    </div>

                    {/* Avatar + Player Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-white text-sm truncate">
                          {stat.playerName}
                        </span>
                        {stat.playerType === 'guest' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 font-bold uppercase shrink-0">
                            Guest
                          </span>
                        )}
                        {duprInfo?.duprRating && (
                          <DuprRatingBadge rating={duprInfo.duprRating} />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>Total Scored: {stat.pointsScored} pts</span>
                        {duprInfo?.duprId && (
                          <span className="text-slate-500">DUPR: {duprInfo.duprId}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expand / Collapse Button */}
                  <button
                    type="button"
                    onClick={() => onToggleExpandPlayer(stat.playerId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                      isExpanded
                        ? 'bg-brand-lime text-dark-bg font-black shadow-md'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title={isExpanded ? 'Collapse Match Details' : 'View Match Details'}
                  >
                    <span>{isExpanded ? 'Hide' : 'Matches'}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* 4-KPI Stats Grid */}
                <div className="grid grid-cols-4 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Played</span>
                    <span className="font-black text-white font-mono text-sm">{stat.completedMatches}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Record</span>
                    <span className="font-black text-xs font-mono">
                      <span className="text-brand-lime">{stat.wins}W</span>-
                      <span className="text-red-400">{stat.losses}L</span>
                      {stat.ties > 0 && <span className="text-amber-400">-{stat.ties}T</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Win Rate</span>
                    <span className="font-black text-brand-lime font-mono text-sm">{stat.winRate}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Point Diff</span>
                    <span
                      className={`font-black font-mono text-sm ${
                        stat.pointDiff > 0
                          ? 'text-brand-lime'
                          : stat.pointDiff < 0
                          ? 'text-red-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {stat.pointDiff >= 0 ? `+${stat.pointDiff}` : stat.pointDiff}
                    </span>
                  </div>
                </div>

                {/* Game History Match Pills */}
                {playerMatches.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0 mr-1">
                      Results:
                    </span>
                    {playerMatches.map((m) => {
                      const isRed = m.teamRed.players.some(
                        (p) =>
                          (p.id && p.id === stat.playerId) ||
                          (p.name && p.name.trim().toLowerCase() === stat.playerName.trim().toLowerCase())
                      );
                      const myTeam = isRed ? m.teamRed : m.teamBlue;
                      const oppTeam = isRed ? m.teamBlue : m.teamRed;
                      const isWin =
                        m.status === 'completed' &&
                        ((isRed && m.winner === 'red') || (!isRed && m.winner === 'blue'));
                      const isLoss =
                        m.status === 'completed' &&
                        ((isRed && m.winner === 'blue') || (!isRed && m.winner === 'red'));
                      const isTie = m.status === 'completed' && m.winner === 'tie';

                      return (
                        <span
                          key={m.id}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black border transition-all ${
                            isWin
                              ? 'bg-brand-lime/15 border-brand-lime/40 text-brand-lime'
                              : isLoss
                              ? 'bg-red-500/15 border-red-500/40 text-red-400'
                              : isTie
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                              : 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                          }`}
                        >
                          {isWin
                            ? `W (${myTeam.score}-${oppTeam.score})`
                            : isLoss
                            ? `L (${myTeam.score}-${oppTeam.score})`
                            : isTie
                            ? `T (${myTeam.score}-${oppTeam.score})`
                            : 'LIVE'}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Mobile Expanded Match Breakdown */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>Match Roster & Scores</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {playerMatches.length} Games
                      </span>
                    </div>

                    {playerMatches.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No matches assigned yet.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {playerMatches.map((m) => {
                          const isRed = m.teamRed.players.some(
                            (p) =>
                              (p.id && p.id === stat.playerId) ||
                              (p.name && p.name.trim().toLowerCase() === stat.playerName.trim().toLowerCase())
                          );
                          const myTeam = isRed ? m.teamRed : m.teamBlue;
                          const oppTeam = isRed ? m.teamBlue : m.teamRed;
                          const isWin =
                            m.status === 'completed' &&
                            ((isRed && m.winner === 'red') || (!isRed && m.winner === 'blue'));
                          const isLoss =
                            m.status === 'completed' &&
                            ((isRed && m.winner === 'blue') || (!isRed && m.winner === 'red'));
                          const isTie = m.status === 'completed' && m.winner === 'tie';

                          return (
                            <div
                              key={m.id}
                              className={`p-3 rounded-xl border text-xs space-y-2 ${
                                isWin
                                  ? 'bg-slate-900 border-emerald-500/40'
                                  : isLoss
                                  ? 'bg-slate-900 border-red-500/30'
                                  : 'bg-slate-900 border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-black text-white">
                                    {m.matchName || `Game ${m.round}`}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 font-bold text-[9px]">
                                    {getRoundTitle(m.round)}
                                  </span>
                                  <span className="text-slate-400 font-semibold text-[10px]">
                                    📍 {m.courtName}
                                  </span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                                    isWin
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : isLoss
                                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  }`}
                                >
                                  {isWin
                                    ? `WIN (${myTeam.score}-${oppTeam.score})`
                                    : isLoss
                                    ? `LOSS (${myTeam.score}-${oppTeam.score})`
                                    : isTie
                                    ? `TIE (${myTeam.score}-${oppTeam.score})`
                                    : m.status.toUpperCase()}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 space-y-1">
                                  <span className="text-[9px] text-slate-400 font-extrabold uppercase block">
                                    {isRed ? 'Team Red (My Team)' : 'Team Blue (My Team)'}
                                  </span>
                                  {myTeam.players.map((p, pIdx) => {
                                    const isMe =
                                      (p.id && p.id === stat.playerId) ||
                                      (p.name &&
                                        p.name.trim().toLowerCase() === stat.playerName.trim().toLowerCase());
                                    return (
                                      <div
                                        key={pIdx}
                                        className="flex items-center justify-between text-white font-bold truncate gap-1"
                                      >
                                        <span className={isMe ? 'text-brand-lime font-black' : 'text-slate-200'}>
                                          {p.name} {isMe ? '(You)' : ''}
                                        </span>
                                        {p.duprRating && <DuprRatingBadge rating={p.duprRating} />}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 space-y-1">
                                  <span className="text-[9px] text-slate-400 font-extrabold uppercase block">
                                    {isRed ? 'Team Blue (Opponents)' : 'Team Red (Opponents)'}
                                  </span>
                                  {oppTeam.players.map((p, pIdx) => (
                                    <div
                                      key={pIdx}
                                      className="flex items-center justify-between text-slate-300 font-semibold truncate gap-1"
                                    >
                                      <span>{p.name}</span>
                                      {p.duprRating && <DuprRatingBadge rating={p.duprRating} />}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DESKTOP FULL TABLE VIEW (Displayed when viewMode === 'table' or when viewMode === 'auto' on screens >= lg) */}
      {sortedLeaderboardList.length > 0 && (
        <div
          className={`border border-slate-800/90 rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950/60 shadow-xl text-xs ${
            viewMode === 'cards' ? 'hidden' : viewMode === 'table' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[840px] text-left border-collapse">
              <thead className="bg-slate-900 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5 text-center w-14">Rank</th>
                  <th className="p-3.5 min-w-[200px]">Player Name & Info</th>
                  <th className="p-3.5 text-center w-20">Played</th>
                  <th className="p-3.5 text-center min-w-[120px]">Record (W-L-T)</th>
                  <th className="p-3.5 text-center w-24">Win Rate</th>
                  <th className="p-3.5 text-center w-24">Point Diff</th>
                  <th className="p-3.5 min-w-[200px]">Game History</th>
                  <th className="p-3.5 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {sortedLeaderboardList.map((stat, idx) => {
                  const isExpanded = expandedLeaderboardPlayerId === stat.playerId;
                  const playerMatches = matches.filter(
                    (m) =>
                      m.teamRed.players.some(
                        (p) =>
                          (p.id && p.id === stat.playerId) ||
                          (p.name && p.name.trim().toLowerCase() === stat.playerName.trim().toLowerCase())
                      ) ||
                      m.teamBlue.players.some(
                        (p) =>
                          (p.id && p.id === stat.playerId) ||
                          (p.name && p.name.trim().toLowerCase() === stat.playerName.trim().toLowerCase())
                      )
                  );
                  const duprInfo = getPlayerDuprInfo(stat.playerId, stat.playerName);

                  return (
                    <React.Fragment key={stat.playerId}>
                      <tr
                        onClick={() => onToggleExpandPlayer(stat.playerId)}
                        className={`hover:bg-slate-900/60 transition-all cursor-pointer ${
                          idx === 0
                            ? 'bg-amber-950/20'
                            : idx === 1
                            ? 'bg-slate-800/20'
                            : idx === 2
                            ? 'bg-amber-900/10'
                            : ''
                        }`}
                      >
                        {/* Rank Position Badge */}
                        <td className="p-3.5 text-center font-black">
                          {idx === 0 ? (
                            <span className="w-7 h-7 rounded-full bg-amber-400 text-dark-bg flex items-center justify-center font-black text-xs mx-auto shadow-md">
                              1
                            </span>
                          ) : idx === 1 ? (
                            <span className="w-7 h-7 rounded-full bg-slate-300 text-dark-bg flex items-center justify-center font-black text-xs mx-auto shadow-md">
                              2
                            </span>
                          ) : idx === 2 ? (
                            <span className="w-7 h-7 rounded-full bg-amber-700 text-white flex items-center justify-center font-black text-xs mx-auto shadow-md">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-sm">#{idx + 1}</span>
                          )}
                        </td>

                        {/* Player Profile & Name */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-sm">
                              <img
                                src={`https://robohash.org/${encodeURIComponent(stat.playerName)}?set=set4`}
                                alt={stat.playerName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-white text-xs truncate flex items-center gap-1.5">
                                <span>{stat.playerName}</span>
                                {stat.playerType === 'guest' && (
                                  <span className="text-[9px] px-1 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 font-bold uppercase shrink-0">
                                    Guest
                                  </span>
                                )}
                                {duprInfo?.duprRating && (
                                  <DuprRatingBadge rating={duprInfo.duprRating} />
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Scored: {stat.pointsScored} pts
                                {duprInfo?.duprId && ` • DUPR: ${duprInfo.duprId}`}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Games Played */}
                        <td className="p-3.5 text-center font-mono font-bold text-white">
                          {stat.completedMatches}
                        </td>

                        {/* W-L-T Record */}
                        <td className="p-3.5 text-center font-mono font-black text-xs whitespace-nowrap">
                          <span className="text-brand-lime">{stat.wins}W</span>
                          <span className="text-slate-500 mx-1">-</span>
                          <span className="text-red-400">{stat.losses}L</span>
                          {stat.ties > 0 && (
                            <>
                              <span className="text-slate-500 mx-1">-</span>
                              <span className="text-amber-400">{stat.ties}T</span>
                            </>
                          )}
                        </td>

                        {/* Win Rate */}
                        <td className="p-3.5 text-center font-mono font-black text-brand-lime">
                          {stat.winRate}%
                        </td>

                        {/* Point Diff */}
                        <td className="p-3.5 text-center font-mono font-black">
                          <span
                            className={
                              stat.pointDiff > 0
                                ? 'text-brand-lime'
                                : stat.pointDiff < 0
                                ? 'text-red-400'
                                : 'text-slate-400'
                            }
                          >
                            {stat.pointDiff >= 0 ? `+${stat.pointDiff}` : stat.pointDiff}
                          </span>
                        </td>

                        {/* Game History Pills */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            {playerMatches.length === 0 ? (
                              <span className="text-slate-500 text-[10px] italic">No matches</span>
                            ) : (
                              playerMatches.map((m) => {
                                const isRed = m.teamRed.players.some(
                                  (p) =>
                                    (p.id && p.id === stat.playerId) ||
                                    (p.name &&
                                      p.name.trim().toLowerCase() === stat.playerName.trim().toLowerCase())
                                );
                                const myTeam = isRed ? m.teamRed : m.teamBlue;
                                const oppTeam = isRed ? m.teamBlue : m.teamRed;
                                const isWin =
                                  m.status === 'completed' &&
                                  ((isRed && m.winner === 'red') || (!isRed && m.winner === 'blue'));
                                const isLoss =
                                  m.status === 'completed' &&
                                  ((isRed && m.winner === 'blue') || (!isRed && m.winner === 'red'));
                                const isTie = m.status === 'completed' && m.winner === 'tie';

                                const tooltipText = `${m.matchName || `Game ${m.round}`} (${m.courtName}): ${
                                  isWin
                                    ? 'WIN'
                                    : isLoss
                                    ? 'LOSS'
                                    : isTie
                                    ? 'TIE'
                                    : m.status.toUpperCase()
                                } ${myTeam.score}-${oppTeam.score}`;

                                return (
                                  <span
                                    key={m.id}
                                    title={tooltipText}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black border transition-all cursor-help flex items-center gap-1 ${
                                      isWin
                                        ? 'bg-brand-lime/15 border-brand-lime/40 text-brand-lime hover:bg-brand-lime hover:text-dark-bg'
                                        : isLoss
                                        ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white'
                                        : isTie
                                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                        : 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                                    }`}
                                  >
                                    <span>
                                      {isWin
                                        ? `W (${myTeam.score}-${oppTeam.score})`
                                        : isLoss
                                        ? `L (${myTeam.score}-${oppTeam.score})`
                                        : isTie
                                        ? `T (${myTeam.score}-${oppTeam.score})`
                                        : `LIVE`}
                                    </span>
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>

                        {/* Expand History Button Column */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleExpandPlayer(stat.playerId);
                            }}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 mx-auto transition-all cursor-pointer ${
                              isExpanded
                                ? 'bg-brand-lime text-dark-bg font-black'
                                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                            }`}
                            title={isExpanded ? 'Collapse Match History' : 'View Match Details & Roster'}
                          >
                            <span>{isExpanded ? 'Hide' : 'Matches'}</span>
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Player Match History Sub-Row */}
                      {isExpanded && (
                        <tr className="bg-slate-900/90 border-t border-b border-slate-800">
                          <td colSpan={8} className="p-4 sm:p-5">
                            <div className="space-y-4 animate-fade-in text-left">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <Trophy className="w-4 h-4 text-amber-400" />
                                  <h4 className="font-black text-sm text-white">
                                    Match History & Roster for{' '}
                                    <span className="text-amber-300">{stat.playerName}</span>
                                  </h4>
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                                    {playerMatches.length} Total Assigned Games
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onToggleExpandPlayer(stat.playerId)}
                                  className="text-xs text-slate-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg"
                                >
                                  <X className="w-3.5 h-3.5 text-slate-400" /> Close Details
                                </button>
                              </div>

                              {playerMatches.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">
                                  No matches assigned to this player yet.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  {playerMatches.map((m) => {
                                    const isRed = m.teamRed.players.some(
                                      (p) =>
                                        (p.id && p.id === stat.playerId) ||
                                        (p.name &&
                                          p.name.trim().toLowerCase() ===
                                            stat.playerName.trim().toLowerCase())
                                    );
                                    const myTeam = isRed ? m.teamRed : m.teamBlue;
                                    const oppTeam = isRed ? m.teamBlue : m.teamRed;
                                    const isWin =
                                      m.status === 'completed' &&
                                      ((isRed && m.winner === 'red') || (!isRed && m.winner === 'blue'));
                                    const isLoss =
                                      m.status === 'completed' &&
                                      ((isRed && m.winner === 'blue') || (!isRed && m.winner === 'red'));
                                    const isTie = m.status === 'completed' && m.winner === 'tie';

                                    return (
                                      <div
                                        key={m.id}
                                        className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                                          isWin
                                            ? 'bg-slate-950/90 border-emerald-500/40 ring-1 ring-emerald-500/20'
                                            : isLoss
                                            ? 'bg-slate-950/90 border-red-500/30'
                                            : 'bg-slate-950/90 border-slate-800'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between text-[11px] gap-2">
                                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                                            <span className="font-black text-white text-xs">
                                              🎮 {m.matchName || `Game ${m.round}`}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 font-bold">
                                              {getRoundTitle(m.round)}
                                            </span>
                                            <span className="text-slate-400 font-semibold truncate">
                                              📍 {m.courtName}
                                            </span>
                                          </div>
                                          <span
                                            className={`px-2.5 py-1 rounded-lg font-mono font-black text-[10px] shrink-0 ${
                                              isWin
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                : isLoss
                                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                            }`}
                                          >
                                            {isWin
                                              ? `WIN (${myTeam.score} - ${oppTeam.score})`
                                              : isLoss
                                              ? `LOSS (${myTeam.score} - ${oppTeam.score})`
                                              : isTie
                                              ? `TIE (${myTeam.score} - ${oppTeam.score})`
                                              : m.status.toUpperCase()}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                                          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                                            <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">
                                              {isRed ? 'Team Red (My Team)' : 'Team Blue (My Team)'}
                                            </span>
                                            <div className="space-y-1">
                                              {myTeam.players.map((p, pIdx) => {
                                                const isMe =
                                                  (p.id && p.id === stat.playerId) ||
                                                  (p.name &&
                                                    p.name.trim().toLowerCase() ===
                                                      stat.playerName.trim().toLowerCase());
                                                return (
                                                  <div
                                                    key={pIdx}
                                                    className="flex items-center justify-between text-white font-bold truncate gap-1"
                                                  >
                                                    <span
                                                      className={
                                                        isMe ? 'text-brand-lime font-black' : 'text-slate-200'
                                                      }
                                                    >
                                                      {p.name} {isMe ? '(You)' : ''}
                                                    </span>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                      {p.duprRating && (
                                                        <DuprRatingBadge rating={p.duprRating} />
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                                            <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">
                                              {isRed ? 'Team Blue (Opponents)' : 'Team Red (Opponents)'}
                                            </span>
                                            <div className="space-y-1">
                                              {oppTeam.players.map((p, pIdx) => (
                                                <div
                                                  key={pIdx}
                                                  className="flex items-center justify-between text-slate-300 font-semibold truncate gap-1"
                                                >
                                                  <span>{p.name}</span>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    {p.duprRating && (
                                                      <DuprRatingBadge rating={p.duprRating} />
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};


