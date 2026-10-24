import React from 'react';
import {
  Trophy,
  Copy,
  Download,
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronRight,
  X,
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
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Leaderboard Top Header Card */}
      <div className="glass-panel border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 bg-slate-900/80">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Trophy className="w-4 h-4 text-amber-400" /> Individual Rankings
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {sortedLeaderboardList.length} Players Ranked
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">Event Leaderboard Standings</h2>
            <p className="text-xs text-slate-400">
              Individual player rankings based on total wins, win percentage, and net point differential for{' '}
              <strong className="text-white">{eventTitle}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onCopyReportText}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Copy className="w-4 h-4 text-amber-400" /> Copy Text Summary
            </button>
            <button
              type="button"
              onClick={onExportReportCSV}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-dark-bg font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg hover:scale-[1.02]"
            >
              <Download className="w-4 h-4 text-dark-bg" /> Export Leaderboard CSV
            </button>
            <button
              type="button"
              onClick={onBackToMatrix}
              className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-brand-lime text-brand-lime text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-brand-lime" /> Back to Match Matrix
            </button>
          </div>
        </div>

        {/* Top 3 Podium Cards */}
        {sortedLeaderboardList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            {/* Gold 🥇 Rank #1 */}
            {sortedLeaderboardList[0] && (
              <div className="relative rounded-3xl border-2 border-amber-400/90 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 p-5 shadow-2xl flex flex-col justify-between space-y-4 text-left overflow-hidden group hover:border-amber-300 transition-all">
                <div className="absolute top-0 right-0 px-3 py-1 bg-amber-400 text-dark-bg font-black text-[11px] uppercase tracking-wider rounded-bl-2xl shadow-md flex items-center gap-1">
                  👑 1st Place (Gold)
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full border-2 border-amber-400 bg-amber-500/20 shrink-0 overflow-hidden shadow-inner">
                    <img
                      src={`https://robohash.org/${encodeURIComponent(sortedLeaderboardList[0].playerName)}?set=set4`}
                      alt={sortedLeaderboardList[0].playerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-black text-amber-300 truncate">
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
                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-2xl border border-amber-500/30 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Win Rate</span>
                    <span className="font-black text-brand-lime font-mono text-sm">
                      {sortedLeaderboardList[0].winRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Point Diff</span>
                    <span className="font-black text-amber-300 font-mono text-sm">
                      {sortedLeaderboardList[0].pointDiff >= 0
                        ? `+${sortedLeaderboardList[0].pointDiff}`
                        : sortedLeaderboardList[0].pointDiff}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Played</span>
                    <span className="font-black text-white font-mono text-sm">
                      {sortedLeaderboardList[0].completedMatches}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Silver 🥈 Rank #2 */}
            {sortedLeaderboardList[1] && (
              <div className="relative rounded-3xl border-2 border-slate-400/80 bg-gradient-to-b from-slate-800/40 via-slate-900 to-slate-950 p-5 shadow-xl flex flex-col justify-between space-y-4 text-left overflow-hidden group hover:border-slate-300 transition-all">
                <div className="absolute top-0 right-0 px-3 py-1 bg-slate-300 text-dark-bg font-black text-[11px] uppercase tracking-wider rounded-bl-2xl shadow-md flex items-center gap-1">
                  🥈 2nd Place (Silver)
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full border-2 border-slate-300 bg-slate-700/40 shrink-0 overflow-hidden shadow-inner">
                    <img
                      src={`https://robohash.org/${encodeURIComponent(sortedLeaderboardList[1].playerName)}?set=set4`}
                      alt={sortedLeaderboardList[1].playerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-black text-slate-200 truncate">
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
                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-700 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Win Rate</span>
                    <span className="font-black text-brand-lime font-mono text-sm">
                      {sortedLeaderboardList[1].winRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Point Diff</span>
                    <span className="font-black text-slate-200 font-mono text-sm">
                      {sortedLeaderboardList[1].pointDiff >= 0
                        ? `+${sortedLeaderboardList[1].pointDiff}`
                        : sortedLeaderboardList[1].pointDiff}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Played</span>
                    <span className="font-black text-white font-mono text-sm">
                      {sortedLeaderboardList[1].completedMatches}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bronze 🥉 Rank #3 */}
            {sortedLeaderboardList[2] && (
              <div className="relative rounded-3xl border-2 border-amber-700/80 bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-950 p-5 shadow-xl flex flex-col justify-between space-y-4 text-left overflow-hidden group hover:border-amber-600 transition-all">
                <div className="absolute top-0 right-0 px-3 py-1 bg-amber-700 text-white font-black text-[11px] uppercase tracking-wider rounded-bl-2xl shadow-md flex items-center gap-1">
                  🥉 3rd Place (Bronze)
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full border-2 border-amber-600 bg-amber-900/30 shrink-0 overflow-hidden shadow-inner">
                    <img
                      src={`https://robohash.org/${encodeURIComponent(sortedLeaderboardList[2].playerName)}?set=set4`}
                      alt={sortedLeaderboardList[2].playerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-black text-amber-500 truncate">
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
                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-2xl border border-amber-900/50 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Win Rate</span>
                    <span className="font-black text-brand-lime font-mono text-sm">
                      {sortedLeaderboardList[2].winRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Point Diff</span>
                    <span className="font-black text-amber-400 font-mono text-sm">
                      {sortedLeaderboardList[2].pointDiff >= 0
                        ? `+${sortedLeaderboardList[2].pointDiff}`
                        : sortedLeaderboardList[2].pointDiff}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Played</span>
                    <span className="font-black text-white font-mono text-sm">
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-900/60 p-4 rounded-3xl border border-slate-800">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] shrink-0">Rank By:</span>
          <select
            value={leaderboardSortField}
            onChange={(e) => onSortChange(e.target.value as 'wins' | 'winRate' | 'pointDiff' | 'pointsScored' | 'matches')}
            className="bg-slate-950 border border-slate-800 text-amber-300 font-black rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="wins">Total Wins (Most Wins First)</option>
            <option value="winRate">Win Percentage (%)</option>
            <option value="pointDiff">Net Point Differential (+/-)</option>
            <option value="pointsScored">Total Points Scored</option>
            <option value="matches">Completed Games Played</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search player name..."
            value={leaderboardSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-semibold"
          />
        </div>
      </div>

      {/* Full Player Standings Table */}
      <div className="border border-slate-800/90 rounded-3xl overflow-hidden bg-slate-950/60 shadow-xl text-xs">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="p-3.5 text-center w-14">Rank</th>
              <th className="p-3.5">Player Name & Info</th>
              <th className="p-3.5 text-center">Played</th>
              <th className="p-3.5 text-center">Record (W-L-T)</th>
              <th className="p-3.5 text-center">Win Rate</th>
              <th className="p-3.5 text-center">Point Diff</th>
              <th className="p-3.5">Game History & Match Results</th>
              <th className="p-3.5 text-center w-24">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {sortedLeaderboardList.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                  No player standings found.
                </td>
              </tr>
            ) : (
              sortedLeaderboardList.map((stat, idx) => {
                const isExpanded = expandedLeaderboardPlayerId === stat.playerId;
                const playerMatches = matches.filter(
                  (m) =>
                    m.teamRed.players.some((p) => (p.id && p.id === stat.playerId) || (p.name && p.name.trim().toLowerCase() === stat.playerName.trim().toLowerCase())) ||
                    m.teamBlue.players.some((p) => (p.id && p.id === stat.playerId) || (p.name && p.name.trim().toLowerCase() === stat.playerName.trim().toLowerCase()))
                );

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
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Total Scored: {stat.pointsScored} pts
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Games Played */}
                      <td className="p-3.5 text-center font-mono font-bold text-white">
                        {stat.completedMatches}
                      </td>

                      {/* W-L-T Record */}
                      <td className="p-3.5 text-center font-mono font-black text-xs">
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

                              const tooltipText = `${m.matchName || `Game ${m.round}`} (${m.courtName}): ${
                                isWin ? 'WIN' : isLoss ? 'LOSS' : isTie ? 'TIE' : m.status.toUpperCase()
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
                                  Match History & Roster for <span className="text-amber-300">{stat.playerName}</span>
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
                              <p className="text-xs text-slate-400 italic">No matches assigned to this player yet.</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
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
                                      className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                                        isWin
                                          ? 'bg-slate-950/90 border-emerald-500/40 ring-1 ring-emerald-500/20'
                                          : isLoss
                                          ? 'bg-slate-950/90 border-red-500/30'
                                          : 'bg-slate-950/90 border-slate-800'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between text-[11px]">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-black text-white text-xs">
                                            🎮 {m.matchName || `Game ${m.round}`}
                                          </span>
                                          <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 font-bold">
                                            {getRoundTitle(m.round)}
                                          </span>
                                          <span className="text-slate-400 font-semibold">📍 {m.courtName}</span>
                                        </div>
                                        <span
                                          className={`px-2.5 py-1 rounded-lg font-mono font-black text-[10px] ${
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

                                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                                          <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">
                                            {isRed ? 'Team Red (My Team)' : 'Team Blue (My Team)'}
                                          </span>
                                          <div className="space-y-1">
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
                                                  <span
                                                    className={
                                                      isMe ? 'text-brand-lime font-black' : 'text-slate-200'
                                                    }
                                                  >
                                                    {p.name} {isMe ? '(You)' : ''}
                                                  </span>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    {p.duprId && (
                                                      <span className="text-[9px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-1 rounded">
                                                        DUPR: {p.duprId}
                                                      </span>
                                                    )}
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
                                                  {p.duprId && (
                                                    <span className="text-[9px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-1 rounded">
                                                      DUPR: {p.duprId}
                                                    </span>
                                                  )}
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

