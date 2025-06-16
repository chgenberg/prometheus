'use client';

import { FaSort, FaSortUp, FaSortDown, FaSearch } from 'react-icons/fa';
import { useDebouncedCallback } from 'use-debounce';

const columns = [
  { key: 'player_name', label: 'Player', sortable: true, width: 'w-32', priority: 1 },
  { key: 'hands_played', label: 'Hands', sortable: true, width: 'w-20', priority: 2 },
  { key: 'net_win_chips', label: 'Real Money', sortable: true, width: 'w-24', priority: 2 },
  { key: 'win_rate_percent', label: 'Win Rate %', sortable: true, width: 'w-20', priority: 2 },
  { key: 'bot_score', label: 'Bot Score', sortable: true, width: 'w-24', priority: 2 },
  { key: 'num_players', label: 'Players', sortable: true, width: 'w-16', priority: 2 },
  { key: 'game_type', label: 'Game Type', sortable: true, width: 'w-24', priority: 2 },
  { key: 'net_win_bb', label: 'Net Win (BB)', sortable: true, width: 'w-24', priority: 3, hideOnMedium: true },
  { key: 'preflop_vpip', label: 'VPIP %', sortable: true, width: 'w-28', priority: 3, hideOnMedium: true },
  { key: 'postflop_aggression', label: 'Aggression %', sortable: true, width: 'w-28', priority: 3, hideOnMedium: true },
  { key: 'flop_score', label: 'Flop Score', sortable: true, width: 'w-20', priority: 4, hideOnMedium: true },
  { key: 'turn_score', label: 'Turn Score', sortable: true, width: 'w-20', priority: 4, hideOnMedium: true },
  { key: 'river_score', label: 'River Score', sortable: true, width: 'w-20', priority: 4, hideOnMedium: true },
  { key: 'intention_score', label: 'Intention', sortable: true, width: 'w-20', priority: 5, hideOnLarge: true },
  { key: 'collusion_score', label: 'Collusion', sortable: true, width: 'w-20', priority: 5, hideOnLarge: true },
  { key: 'bad_actor_score', label: 'Bad Actor', sortable: true, width: 'w-20', priority: 5, hideOnLarge: true },
];

interface TableHeaderProps {
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onPlayerNameFilter?: (playerName: string) => void;
  currentSort?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  playerNameFilter?: string;
}

export default function TableHeader({ 
  onSort, 
  onPlayerNameFilter, 
  currentSort,
  playerNameFilter 
}: TableHeaderProps) {
  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    
    const currentSortBy = currentSort?.sortBy;
    const currentSortOrder = currentSort?.sortOrder;

    if (currentSortBy === columnKey && currentSortOrder === 'desc') {
      onSort(columnKey, 'asc');
    } else {
      onSort(columnKey, 'desc');
    }
  };

  const handleFilterChange = useDebouncedCallback((value: string) => {
    if (onPlayerNameFilter) {
      onPlayerNameFilter(value);
    }
  }, 300);

  const getSortIcon = (columnKey: string) => {
    const sortBy = currentSort?.sortBy;
    const sortOrder = currentSort?.sortOrder;
    if (sortBy !== columnKey) return <FaSort className="opacity-30 group-hover:opacity-60" />;
    if (sortOrder === 'asc') return <FaSortUp className="text-indigo-400" />;
    return <FaSortDown className="text-indigo-400" />;
  };

  return (
    <thead className="bg-gray-800/50 backdrop-blur-sm">
      <tr className="border-b border-gray-700/50">
        {columns.map(({ key, label, sortable, width, hideOnMedium, hideOnLarge }) => (
          <th 
            key={key} 
            scope="col" 
            className={`
              px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider
              ${sortable ? 'cursor-pointer hover:text-gray-300 group' : ''}
              ${width || ''}
              ${hideOnMedium ? 'hidden xl:table-cell' : ''}
              ${hideOnLarge ? 'hidden 2xl:table-cell' : ''}
            `}
            onClick={sortable ? () => handleSort(key) : undefined}
          >
            <div className="flex items-center gap-2">
              <span>{label}</span>
              {sortable && (
                <span className="text-xs">{getSortIcon(key)}</span>
              )}
            </div>
          </th>
        ))}
      </tr>

    </thead>
  );
} 