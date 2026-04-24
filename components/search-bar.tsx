'use client';

import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Buscar canchas...' }: SearchBarProps) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 border-border">
        <SlidersHorizontal className="h-4 w-4" />
        <span className="sr-only">Filtros</span>
      </Button>
    </div>
  );
}
