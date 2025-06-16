import { PlayerStat } from '../../lib/database-unified';
import TableHeader from './TableHeader';
import { FaTrophy, FaChartLine, FaSearch, FaArrowDown, FaArrowUp } from 'react-icons/fa';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useRouter } from 'next/navigation';

function formatNumber(num: number | null | undefined) {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatChips(num: number) {
  if (isNaN(num)) return 'N/A';
  const absNum = Math.abs(num);
  if (absNum >= 1000000) {
    return `${num >= 0 ? '' : '-'}${(absNum / 1000000).toFixed(1)}M`;
  } else if (absNum >= 1000) {
    return `${num >= 0 ? '' : '-'}${(absNum / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function getBotScoreColor(score: number) {
  if (score > 80) return 'text-red-400';
  if (score > 60) return 'text-orange-400';
  if (score > 40) return 'text-yellow-400';
  if (score > 20) return 'text-blue-400';
  return 'text-green-400';
}

interface PlayerStatsTableProps {
  stats: (PlayerStat & { bot_score?: number, classification?: string })[];
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onPlayerNameFilter?: (name: string) => void;
  currentSort: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  playerNameFilter?: string;
}

export default function PlayerStatsTable({
  stats,
  onSort,
  onPlayerNameFilter,
  currentSort,
  playerNameFilter
}: PlayerStatsTableProps) {

  const router = useRouter();

  const handlePlayerClick = (playerName: string) => {
    router.push(`/?player=${encodeURIComponent(playerName)}`);
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 30) return 'text-green-400';
    if (winRate >= 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getNetWinColor = (netWin: number) => {
    if (netWin > 0) return 'text-green-400';
    if (netWin < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getScoreColor = (score: string) => {
    if (score === 'High' || score === 'High Risk' || score === 'Suspicious') return 'text-red-400';
    if (score === 'Medium' || score === 'Medium Risk' || score === 'Monitor') return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <>
      <div className="mt-4 sm:mt-6 flow-root">

        {/* Mobile View - Cards */}
        <div className="sm:hidden space-y-3">
          {stats.length === 0 ? (
            <div className="text-center py-8">
              <FaChartLine className="text-3xl text-gray-600 mb-3 mx-auto" />
              <p className="text-gray-400 text-sm">No players found</p>
              <p className="text-gray-500 text-xs mt-1">Try adjusting filters</p>
            </div>
          ) : (
            stats.map((player, index) => (
              <div
                key={`${player.player_name}-${index}`}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 cursor-pointer hover:bg-gray-700/50 transition-colors"
                onClick={() => handlePlayerClick(player.player_name)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {index < 3 && player.net_win_chips > 0 && (
                      <FaTrophy className={`
                        ${index === 0 ? 'text-yellow-400' : ''}
                        ${index === 1 ? 'text-gray-400' : ''}
                        ${index === 2 ? 'text-orange-600' : ''}
                        text-sm
                      `} />
                    )}
                    <span className="font-medium text-sm text-indigo-400 hover:text-indigo-300">
                      {player.player_name}
                    </span>
                  </div>
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">
                    {player.hands_played} hands
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-500 mb-1">Net Win</p>
                    <p className={`font-semibold ${getNetWinColor(player.net_win_chips)}`}>
                      {formatChips(player.net_win_chips)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Win Rate</p>
                    <p className={`font-semibold ${getWinRateColor(player.win_rate_percent)}`}>
                      {formatNumber(player.win_rate_percent)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">VPIP</p>
                    <p className="text-white font-semibold">{formatNumber(player.preflop_vpip)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">PFR</p>
                    <p className="text-white font-semibold">{formatNumber(player.preflop_pfr)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Players</p>
                    <p className="text-white font-semibold">{player.num_players || 6}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Game Type</p>
                    <p className="text-white font-semibold">{player.game_type || 'CashGame'}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden sm:block">
          <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            <div className="inline-block min-w-full align-middle">
              <div className="rounded-xl bg-gray-900/50 backdrop-blur-sm overflow-hidden shadow-xl">
                <table className="min-w-full text-gray-300">
                  <TableHeader
                    onSort={onSort}
                    onPlayerNameFilter={onPlayerNameFilter}
                    currentSort={currentSort}
                    playerNameFilter={playerNameFilter}
                  />
                  <tbody className="divide-y divide-gray-700/50">
                    {stats.length === 0 ? (
                      <>
                        <tr className="xl:hidden">
                          <td colSpan={6} className="text-center py-16">
                            <div className="flex flex-col items-center">
                              <FaChartLine className="text-4xl text-gray-600 mb-4" />
                              <p className="text-gray-400 text-lg">No players found matching the current filters</p>
                              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters to see more results</p>
                            </div>
                          </td>
                        </tr>
                        <tr className="hidden xl:table-row 2xl:hidden">
                          <td colSpan={12} className="text-center py-16">
                            <div className="flex flex-col items-center">
                              <FaChartLine className="text-4xl text-gray-600 mb-4" />
                              <p className="text-gray-400 text-lg">No players found matching the current filters</p>
                              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters to see more results</p>
                            </div>
                          </td>
                        </tr>
                        <tr className="hidden 2xl:table-row">
                          <td colSpan={15} className="text-center py-16">
                          <div className="flex flex-col items-center">
                            <FaChartLine className="text-4xl text-gray-600 mb-4" />
                            <p className="text-gray-400 text-lg">No players found matching the current filters</p>
                            <p className="text-gray-500 text-sm mt-2">Try adjusting your filters to see more results</p>
                          </div>
                                                </td>
                        </tr>
                      </>
                      ) : (
                      stats.map((player, index) => (
                        <tr
                          key={`${player.player_name}-${index}`}
                          className="table-row-hover hover:bg-gray-800/30 transition-all duration-200"
                        >
                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="flex items-center gap-2">
                              {index < 3 && player.net_win_chips > 0 && (
                                <FaTrophy className={`
                                ${index === 0 ? 'text-yellow-400' : ''}
                                ${index === 1 ? 'text-gray-400' : ''}
                                ${index === 2 ? 'text-orange-600' : ''}
                              `} />
                              )}
                              <button
                                onClick={() => handlePlayerClick(player.player_name)}
                                className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                              >
                                {player.player_name}
                              </button>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700">
                              {player.hands_played}
                            </span>
                          </td>
                          <td className={`whitespace-nowrap px-4 py-4 font-semibold ${getNetWinColor(player.net_win_chips || 0)}`}>
                            {formatChips(player.net_win_chips || 0)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <span className={`font-semibold ${getWinRateColor(player.win_rate_percent || 0)}`}>
                              {formatNumber(player.win_rate_percent)}%
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            {player.bot_score !== undefined ? (
                                <div className="flex items-center">
                                    <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                                        <div
                                            className={`${getBotScoreColor(player.bot_score)} h-2 rounded-full transition-all duration-500`}
                                            style={{ width: `${Math.max(5, player.bot_score)}%` }}
                                        />
                                    </div>
                                    <span className={`font-semibold ${getBotScoreColor(player.bot_score)}`}>
                                        {player.bot_score.toFixed(1)}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-gray-500">N/A</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-700">
                              {player.num_players || 6}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              player.game_type === 'Tournament' ? 'bg-yellow-700 text-yellow-200' : 'bg-green-700 text-green-200'
                            }`}>
                              {player.game_type || 'CashGame'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 hidden xl:table-cell">
                            <span className={`font-semibold ${getNetWinColor(player.net_win_bb || 0)}`}>
                              {formatNumber(player.net_win_bb)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 hidden xl:table-cell">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                                <div
                                  className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(Math.max(player.preflop_vpip || 0, 0), 100)}%` }}
                                />
                              </div>
                              <span className="text-sm">{formatNumber(player.preflop_vpip)}%</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 hidden xl:table-cell">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(Math.max(player.postflop_aggression || 0, 0), 100)}%` }}
                                />
                              </div>
                              <span className="text-sm">{formatNumber(player.postflop_aggression)}%</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 hidden xl:table-cell">
                            <span className="text-sm font-medium text-blue-400">
                              {player.flop_score ? formatNumber(player.flop_score) : 'N/A'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 hidden xl:table-cell">
                            <span className="text-sm font-medium text-green-400">
                              {player.turn_score ? formatNumber(player.turn_score) : 'N/A'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 hidden xl:table-cell">
                            <span className="text-sm font-medium text-purple-400">
                              {player.river_score ? formatNumber(player.river_score) : 'N/A'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 hidden 2xl:table-cell">
                            <span className={`text-sm font-medium ${getScoreColor(String(player.intention_score || 'Low'))}`}>
                              {player.intention_score || 'Low'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 hidden 2xl:table-cell">
                            <span className={`text-sm font-medium ${getScoreColor(String(player.collusion_score || 'Clean'))}`}>
                              {player.collusion_score || 'Clean'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 hidden 2xl:table-cell">
                            <span className={`text-sm font-medium ${getScoreColor(String(player.bad_actor_score || 'Low Risk'))}`}>
                              {player.bad_actor_score || 'Low Risk'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 