'use client';

import { cn } from '@/lib/utils';
import { SportType, sportLabels } from '@/lib/types';

interface SportFilterProps {
  selectedSport: SportType | 'all';
  onSelectSport: (sport: SportType | 'all') => void;
}

const sportData: { type: SportType | 'all'; icon: string; label: string }[] = [
  { type: 'all', icon: '🏟️', label: 'Todas' },
  { type: 'futbol', icon: '⚽', label: sportLabels.futbol },
  { type: 'voley', icon: '🏐', label: sportLabels.voley },
  { type: 'basquet', icon: '🏀', label: sportLabels.basquet },
  { type: 'tenis', icon: '🎾', label: sportLabels.tenis },
  { type: 'futsal', icon: '⚽', label: sportLabels.futsal },
];

export function SportFilter({ selectedSport, onSelectSport }: SportFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {sportData.map((sport) => (
        <button
          key={sport.type}
          onClick={() => onSelectSport(sport.type)}
          className={cn(
            'flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all',
            selectedSport === sport.type
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          )}
        >
          <span className="text-base">{sport.icon}</span>
          <span>{sport.label}</span>
        </button>
      ))}
    </div>
  );
}
