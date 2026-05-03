'use client';

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TimeSlot } from '@/lib/types';

interface TimeSlotPickerProps {
  schedule: { [key: string]: TimeSlot[] };
  selectedDate: string;
  selectedSlot: TimeSlot | null;
  onDateChange: (date: string) => void;
  onSlotSelect: (slot: TimeSlot) => void;
}

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Convertir formato 24h a 12h (AM/PM)
function formatTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatDate(dateString: string): { day: string; date: number; month: string; isToday: boolean } {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    day: dayNames[date.getDay()],
    date: date.getDate(),
    month: monthNames[date.getMonth()],
    isToday: date.getTime() === today.getTime(),
  };
}

// Devuelve true si el slot ya pasó hoy (solo aplica cuando la fecha seleccionada es hoy)
function isSlotPasado(selectedDate: string, slotTime: string): boolean {
  const now = new Date();
  // Usar fecha local para evitar desfase de zona horaria (Perú UTC-5)
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day   = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  if (selectedDate !== todayStr) return false;

  const [hours, minutes] = slotTime.split(':').map(Number);
  const slotDate = new Date();
  slotDate.setHours(hours, minutes, 0, 0);
  return slotDate <= now;
}

export function TimeSlotPicker({
  schedule,
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotSelect,
}: TimeSlotPickerProps) {
  const dates = Object.keys(schedule).sort();
  const slots = schedule[selectedDate] || [];
  const [startIndex, setStartIndex] = useState(0);
  const daysToShow = 6;

  const scrollLeft = () => {
    if (startIndex > 0) setStartIndex(startIndex - 1);
  };
  const scrollRight = () => {
    if (startIndex < dates.length - daysToShow) setStartIndex(startIndex + 1);
  };
  const visibleDates = dates.slice(startIndex, startIndex + daysToShow);

  return (
    <div className="space-y-4">
      {/* Mobile: scroll horizontal sin botones
          Desktop: grid con botones < > */}

      {/* Mobile date picker */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory md:hidden">
        {dates.map((date) => {
          const formatted = formatDate(date);
          return (
            <button
              key={date}
              onClick={() => onDateChange(date)}
              className={cn(
                'flex shrink-0 snap-start flex-col items-center justify-center rounded-lg py-3 px-3 transition-all w-[64px] h-[70px]',
                selectedDate === date
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              )}
            >
              <span className="text-xs font-medium">
                {formatted.isToday ? 'Hoy' : formatted.day}
              </span>
              <span className="text-lg font-bold">{formatted.date}</span>
              <span className="text-xs opacity-75">{formatted.month}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop date picker — botones < > igual que antes */}
      <div className="relative hidden md:block">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 z-10 h-8 w-8 rounded-full bg-background shadow-md"
            onClick={scrollLeft}
            disabled={startIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="mx-10 w-full">
            <div className="grid gap-2 w-full grid-cols-6">
              {visibleDates.map((date) => {
                const formatted = formatDate(date);
                return (
                  <button
                    key={date}
                    onClick={() => onDateChange(date)}
                    className={cn(
                      'relative flex flex-col items-center justify-center rounded-lg py-3 px-1 transition-all w-full h-[80px]',
                      selectedDate === date
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                    )}
                  >
                    <span className="text-xs font-medium">{formatted.day}</span>
                    <span className="text-lg font-bold">{formatted.date}</span>
                    <span className="text-xs opacity-75">{formatted.month}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 z-10 h-8 w-8 rounded-full bg-background shadow-md"
            onClick={scrollRight}
            disabled={startIndex >= dates.length - 6}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Time Slots */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {slots.map((slot) => {
          // Un slot es "pasado" solo si está disponible y la hora ya pasó hoy
          // Los ocupados/en_proceso se mantienen como están (fueron reservados antes)
          const pasado = slot.status === 'disponible' && isSlotPasado(selectedDate, slot.time);
          const isSelected = selectedSlot?.id === slot.id;

          return (
            <button
              key={slot.id}
              onClick={() => !pasado && slot.available && onSlotSelect(slot)}
              disabled={!slot.available || pasado}
              className={cn(
                'flex flex-col items-center rounded-lg border p-2 md:p-3 transition-all',
                // Disponible — no seleccionado
                slot.status === 'disponible' && !pasado && !isSelected &&
                  'border-border bg-card hover:border-primary hover:bg-primary/5 cursor-pointer',
                // Disponible — seleccionado
                slot.status === 'disponible' && !pasado && isSelected &&
                  'border-primary bg-primary text-primary-foreground',
                // Reservado — bloqueado
                slot.status === 'reservado' &&
                  'cursor-not-allowed border-transparent bg-muted opacity-50',
                // En proceso — advertencia
                slot.status === 'en_proceso' &&
                  'cursor-not-allowed border-yellow-500/40 bg-yellow-500/10 opacity-75',
                // Hora pasada — gris azulado suave
                pasado &&
                  'cursor-not-allowed border-blue-200/40 bg-slate-100 dark:bg-slate-800/40 opacity-60',
              )}
            >
              <span className={cn(
                'text-sm font-semibold',
                pasado && 'text-slate-400 dark:text-slate-500',
              )}>
                {formatTo12Hour(slot.time)}
              </span>
              <span className={cn(
                'text-xs',
                slot.status === 'disponible' && isSelected && 'text-primary-foreground/80',
                slot.status === 'disponible' && !isSelected && !pasado && 'text-muted-foreground',
                slot.status === 'reservado' && 'text-muted-foreground',
                slot.status === 'en_proceso' && 'text-yellow-600 font-medium',
                pasado && 'text-slate-400 dark:text-slate-500',
              )}>
                {pasado
                  ? <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> Pasado</span>
                  : slot.status === 'reservado' ? 'Ocupado'
                  : slot.status === 'en_proceso' ? 'En proceso'
                  : `S/ ${slot.price}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-border bg-card" />
          Disponible
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-yellow-500/40 bg-yellow-500/10" />
          En proceso
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-muted opacity-50" />
          Ocupado
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-blue-200/40 bg-slate-100 dark:bg-slate-800/40 opacity-60" />
          Hora pasada
        </div>
      </div>
    </div>
  );
}
