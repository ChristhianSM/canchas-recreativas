"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TimeSlot } from "@/lib/types";

interface TimeSlotPickerProps {
  schedule: { [key: string]: TimeSlot[] };
  selectedDate: string;
  selectedSlots: TimeSlot[];
  onDateChange: (date: string) => void;
  onSlotsChange: (slots: TimeSlot[]) => void;
}

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const monthNames = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function formatDate(dateString: string): {
  day: string;
  date: number;
  month: string;
  isToday: boolean;
} {
  const date = new Date(dateString + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    day: dayNames[date.getDay()],
    date: date.getDate(),
    month: monthNames[date.getMonth()],
    isToday: date.getTime() === today.getTime(),
  };
}

// Cuenta slots disponibles para una fecha (excluye pasados)
function getDisponiblesCount(slots: TimeSlot[], dateStr: string): number {
  return slots.filter(
    (s) => s.status === "disponible" && !isSlotPasado(dateStr, s.time),
  ).length;
}

// Devuelve true si el slot ya pasó hoy (solo aplica cuando la fecha seleccionada es hoy)
function isSlotPasado(selectedDate: string, slotTime: string): boolean {
  const now = new Date();
  // Usar fecha local para evitar desfase de zona horaria (Perú UTC-5)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;
  if (selectedDate !== todayStr) return false;

  const [hours, minutes] = slotTime.split(":").map(Number);
  const slotDate = new Date();
  slotDate.setHours(hours, minutes, 0, 0);
  return slotDate <= now;
}

export function TimeSlotPicker({
  schedule,
  selectedDate,
  selectedSlots,
  onDateChange,
  onSlotsChange,
}: TimeSlotPickerProps) {
  const dates = Object.keys(schedule).sort();
  const slots = schedule[selectedDate] || [];
  const [startIndex, setStartIndex] = useState(0);
  const daysToShow = 6;

  function handleSlotClick(slot: TimeSlot) {
    const pasado =
      slot.status === "disponible" && isSlotPasado(selectedDate, slot.time);
    if (!slot.available || pasado) return;

    const isAlreadySelected = selectedSlots.some((s) => s.id === slot.id);
    if (isAlreadySelected) {
      const first = selectedSlots[0];
      const last = selectedSlots[selectedSlots.length - 1];
      if (slot.id === last.id) {
        onSlotsChange(selectedSlots.slice(0, -1));
        return;
      }
      if (slot.id === first.id) {
        onSlotsChange(selectedSlots.slice(1));
        return;
      }
      // Slot en el medio → resetear a sólo ese
      onSlotsChange([slot]);
      return;
    }

    if (selectedSlots.length === 0) {
      onSlotsChange([slot]);
      return;
    }

    const idx = slots.findIndex((s) => s.id === slot.id);
    const indices = selectedSlots.map((s) =>
      slots.findIndex((sl) => sl.id === s.id),
    );
    const minIdx = Math.min(...indices);
    const maxIdx = Math.max(...indices);

    if (idx === maxIdx + 1) {
      onSlotsChange([...selectedSlots, slot]);
    } else if (idx === minIdx - 1) {
      onSlotsChange([slot, ...selectedSlots]);
    } else {
      // No contiguo → reiniciar selección
      onSlotsChange([slot]);
    }
  }

  const scrollLeft = () => {
    if (startIndex > 0) setStartIndex(startIndex - 1);
  };
  const scrollRight = () => {
    if (startIndex < dates.length - daysToShow) setStartIndex(startIndex + 1);
  };
  const visibleDates = dates.slice(startIndex, startIndex + daysToShow);

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Mobile: scroll horizontal sin botones
          Desktop: grid con botones < > */}

      {/* Mobile date picker */}
      <div className="w-full overflow-x-auto pb-1 scrollbar-none lg:hidden">
        <div className="flex gap-2 snap-x snap-mandatory">
        {dates.map((date) => {
          const formatted = formatDate(date);
          const disponibles = getDisponiblesCount(schedule[date] || [], date);
          const totalSlots = (schedule[date] || []).length;
          const agotado = totalSlots > 0 && disponibles === 0;
          const pocos = disponibles > 0 && disponibles <= 2;
          return (
            <button
              key={date}
              onClick={() => onDateChange(date)}
              className={cn(
                "relative flex shrink-0 snap-start flex-col items-center justify-center rounded-lg py-3 px-3 transition-all w-[64px] h-[70px]",
                selectedDate === date
                  ? "bg-primary text-primary-foreground"
                  : agotado
                    ? "bg-secondary text-secondary-foreground opacity-50"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              {pocos && selectedDate !== date && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-orange-500" />
              )}
              <span className="text-xs font-medium">
                {formatted.isToday ? "Hoy" : formatted.day}
              </span>
              <span className="text-lg font-bold">{formatted.date}</span>
              <span className="text-xs opacity-75">{formatted.month}</span>
            </button>
          );
        })}
        </div>
      </div>

      {/* Desktop date picker — botones < > igual que antes */}
      <div className="relative hidden lg:block">
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
                const disponibles = getDisponiblesCount(
                  schedule[date] || [],
                  date,
                );
                const totalSlots = (schedule[date] || []).length;
                const agotado = totalSlots > 0 && disponibles === 0;
                const pocos = disponibles > 0 && disponibles <= 2;
                return (
                  <button
                    key={date}
                    onClick={() => onDateChange(date)}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-lg py-3 px-1 transition-all w-full h-[80px]",
                      selectedDate === date
                        ? "bg-primary text-primary-foreground"
                        : agotado
                          ? "bg-secondary text-secondary-foreground opacity-50"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    )}
                  >
                    {pocos && selectedDate !== date && (
                      <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-orange-500" />
                    )}
                    <span className="text-xs font-medium">
                      {formatted.isToday ? "Hoy" : formatted.day}
                    </span>
                    <span className="text-lg font-bold">{formatted.date}</span>
                    <span className="text-xs opacity-75">
                      {formatted.month}
                    </span>
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
      <div className="grid w-full grid-cols-4 gap-2 md:grid-cols-5 lg:grid-cols-6">
        {slots.map((slot) => {
          // Un slot es "pasado" solo si está disponible y la hora ya pasó hoy
          // Los ocupados/en_proceso se mantienen como están (fueron reservados antes)
          const pasado =
            slot.status === "disponible" &&
            isSlotPasado(selectedDate, slot.time);
          const isSelected = selectedSlots.some((s) => s.id === slot.id);

          return (
            <button
              key={slot.id}
              onClick={() => handleSlotClick(slot)}
              disabled={!slot.available || pasado}
              className={cn(
                "flex flex-col items-center rounded-lg border p-2 md:p-3 transition-all",
                // Disponible — no seleccionado
                slot.status === "disponible" &&
                  !pasado &&
                  !isSelected &&
                  "border-border bg-card hover:border-primary hover:bg-primary/5 cursor-pointer",
                // Disponible — seleccionado
                slot.status === "disponible" &&
                  !pasado &&
                  isSelected &&
                  "border-foreground bg-foreground text-background",
                // Reservado — bloqueado
                slot.status === "reservado" &&
                  "cursor-not-allowed border-transparent bg-muted opacity-50",
                // En proceso — advertencia
                slot.status === "en_proceso" &&
                  "cursor-not-allowed border-yellow-500/40 bg-yellow-500/10 opacity-75",
                // Hora pasada — gris azulado suave
                pasado &&
                  "cursor-not-allowed border-blue-200/40 bg-slate-100 dark:bg-slate-800/40 opacity-60",
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold",
                  pasado && "text-slate-400 dark:text-slate-500",
                )}
              >
                {slot.time}
              </span>
              <span
                className={cn(
                  "text-xs",
                  slot.status === "disponible" &&
                    isSelected &&
                    "text-background/80",
                  slot.status === "disponible" &&
                    !isSelected &&
                    !pasado &&
                    "text-muted-foreground",
                  slot.status === "reservado" && "text-muted-foreground",
                  slot.status === "en_proceso" && "text-yellow-600 font-medium",
                  pasado && "text-slate-400 dark:text-slate-500",
                )}
              >
                {pasado ? (
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" /> Pasado
                  </span>
                ) : slot.status === "reservado" ? (
                  "Ocupado"
                ) : slot.status === "en_proceso" ? (
                  "En proceso"
                ) : (
                  `S/ ${slot.price}`
                )}
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
