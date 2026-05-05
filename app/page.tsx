'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin, Search, Calendar, CheckCircle, ArrowRight,
  Zap, Phone, CreditCard, ShieldCheck, Clock,
} from 'lucide-react';
import { Header } from '@/components/header';
import { CanchaCard } from '@/components/cancha-card';
import { Button } from '@/components/ui/button';
import { SportType } from '@/lib/types';

type Cancha = {
  id: string; nombre: string; tipo: SportType; direccion: string;
  distrito: string; descripcion: string; imagenes: string[];
  rating: number; total_resenas: number; precio_por_hora: number;
  amenidades: string[]; lat: number; lng: number; telefono: string;
  destacada: boolean; activa: boolean;
  superficie?: string | null;
  max_jugadores?: number | null;
  balon_disponible?: boolean;
  balon_precio?: number | null;
  chalecos_disponible?: boolean;
  chalecos_precio?: number | null;
};

function adaptCancha(c: Cancha) {
  return {
    id: c.id, name: c.nombre, type: c.tipo, address: c.direccion,
    district: c.distrito, description: c.descripcion, images: c.imagenes ?? [],
    rating: c.rating, reviewCount: c.total_resenas, pricePerHour: c.precio_por_hora,
    amenities: c.amenidades ?? [], coordinates: { lat: c.lat, lng: c.lng },
    phone: c.telefono, featured: c.destacada, schedule: {},
    superficie:        (c.superficie ?? null) as any,
    maxJugadores:      c.max_jugadores ?? null,
    balonDisponible:   c.balon_disponible  ?? false,
    balonPrecio:       c.balon_precio      ?? null,
    chalecoDisponible: c.chalecos_disponible ?? false,
    chalecosPrecio:    c.chalecos_precio   ?? null,
  };
}

export default function HomePage() {  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [ubicacion, setUbicacion] = useState('Mi ubicación');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');

  useEffect(() => {
    // Fecha de hoy formateada
    const hoy = new Date();
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    setFecha(`Hoy, ${hoy.toLocaleDateString('es-PE', opciones)}`);
    
    // Hora actual del sistema en formato 12 horas con minutos
    const horas24 = hoy.getHours();
    const minutos = hoy.getMinutes();
    
    // Convertir a formato 12 horas
    const hora12 = horas24 === 0 ? 12 : horas24 > 12 ? horas24 - 12 : horas24;
    const periodo = horas24 >= 12 ? 'PM' : 'AM';
    const minutosFormateados = String(minutos).padStart(2, '0');
    
    setHora(`${hora12}:${minutosFormateados} ${periodo}`);

    fetch('/api/canchas/list')
      .then(r => r.json())
      .then(data => {
        setCanchas(Array.isArray(data) ? data.filter((c: Cancha) => c.destacada) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleBuscar = () => {
    router.push('/canchas');
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-background">
      <Header />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[520px] md:min-h-[600px] flex items-center overflow-hidden">
        {/* Imagen de fondo */}
        <div className="absolute inset-0">
          <Image
            src="/images/cancha-login.png"
            alt="Cancha deportiva"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Overlay oscuro degradado */}
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        </div>

        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-3 tracking-tight">
              Reserva tu cancha
              <br />
              <span className="text-[#4ade80]">en segundos</span>
            </h1>
            <p className="text-white/80 text-lg mb-8 max-w-md">
              Encuentra canchas cerca de ti, elige horario y reserva sin llamadas.
            </p>

            {/* Buscador tipo booking */}
            <div className="bg-white dark:bg-card rounded-lg shadow-2xl p-2 flex flex-col sm:flex-row gap-0 sm:gap-0 overflow-hidden max-w-3xl">
              {/* Ubicación */}
              <button
                onClick={handleBuscar}
                className="flex items-center gap-3 px-4 py-3 flex-1 text-left hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors rounded-md sm:rounded-none sm:rounded-l-md border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-border"
              >
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Ubicación</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-foreground">{ubicacion}</p>
                </div>
              </button>

              {/* Fecha */}
              <button
                onClick={handleBuscar}
                className="flex items-center gap-3 px-4 py-3 flex-1 text-left hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-border"
              >
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Fecha</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-foreground">{fecha}</p>
                </div>
              </button>

              {/* Hora */}
              <button
                onClick={handleBuscar}
                className="flex items-center gap-3 px-4 py-3 flex-1 text-left hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-border"
              >
                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Hora</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-foreground">{hora}</p>
                </div>
              </button>

              {/* Botón buscar */}
              <button
                onClick={handleBuscar}
                className="flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold px-5 py-3 rounded-md transition-colors text-sm whitespace-nowrap"
              >
                <Search className="h-4 w-4" />
                Buscar canchas
              </button>
            </div>

            {/* Badges de confianza */}
            <div className="mt-5 flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5 text-white/90 text-sm">
                <CheckCircle className="h-4 w-4 text-[#4ade80]" />
                Sin llamadas
              </div>
              <div className="flex items-center gap-1.5 text-white/90 text-sm">
                <CheckCircle className="h-4 w-4 text-[#4ade80]" />
                Reserva 100% online
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CANCHAS CERCA DE TI ───────────────────────────────────── */}
      <section className="py-12 bg-white dark:bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-foreground">Canchas cerca de ti</h2>
            <Link href="/canchas" className="text-[#16a34a] text-sm font-medium hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-md overflow-hidden border border-border">
                  <div className="aspect-video bg-muted animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : canchas.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {canchas.slice(0, 4).map(c => <CanchaCard key={c.id} cancha={adaptCancha(c)} />)}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay canchas disponibles por el momento.</p>
              <Link href="/canchas" className="mt-3 inline-block text-primary font-medium hover:underline">
                Ver todas las canchas
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ─────────────────────────────────────────── */}
      <section className="py-14 bg-gray-50 dark:bg-muted/20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-foreground mb-10">¿Cómo funciona?</h2>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0 max-w-3xl mx-auto">
            {[
              {
                icon: Search,
                step: '1. Busca tu cancha',
                desc: 'Explora canchas disponibles cerca de ti.',
                color: 'bg-[#dcfce7] dark:bg-[#16a34a]/20',
                iconColor: 'text-[#16a34a]',
              },
              {
                icon: Calendar,
                step: '2. Elige fecha y hora',
                desc: 'Selecciona el día y horario que más te convenga.',
                color: 'bg-[#dcfce7] dark:bg-[#16a34a]/20',
                iconColor: 'text-[#16a34a]',
              },
              {
                icon: CheckCircle,
                step: '3. Reserva y juega',
                desc: 'Confirma tu reserva y disfruta del juego.',
                color: 'bg-[#16a34a]',
                iconColor: 'text-white',
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-0">
                <div className="flex flex-col items-center text-center w-48">
                  <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-3 ${item.color}`}>
                    <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-foreground text-base">{item.step}</p>
                  <p className="text-sm text-gray-500 dark:text-muted-foreground mt-1">{item.desc}</p>
                </div>
                {idx < 2 && (
                  <ArrowRight className="h-5 w-5 text-gray-300 dark:text-muted-foreground mx-2 shrink-0 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFICIOS ────────────────────────────────────────────── */}
      <section className="py-16 bg-white dark:bg-background border-t border-gray-100 dark:border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-foreground mb-3">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-gray-500 dark:text-muted-foreground max-w-2xl mx-auto">
              Hacemos que reservar tu cancha sea rápido, seguro y sin complicaciones
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Zap,
                title: 'Reserva en tiempo real',
                desc: 'Consulta disponibilidad al instante y confirma tu reserva en segundos.',
                gradient: 'from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20',
                iconBg: 'bg-gradient-to-br from-yellow-400 to-orange-500',
                iconColor: 'text-white',
              },
              {
                icon: Phone,
                title: 'Sin llamadas',
                desc: 'Todo el proceso es 100% online. Olvídate de esperar respuestas.',
                gradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
                iconBg: 'bg-gradient-to-br from-blue-400 to-cyan-500',
                iconColor: 'text-white',
              },
              {
                icon: CreditCard,
                title: 'Pagos fáciles',
                desc: 'Paga de forma segura y rápida con múltiples métodos de pago.',
                gradient: 'from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20',
                iconBg: 'bg-gradient-to-br from-purple-400 to-pink-500',
                iconColor: 'text-white',
              },
              {
                icon: ShieldCheck,
                title: 'Canchas verificadas',
                desc: 'Todas las canchas pasan por un riguroso proceso de verificación.',
                gradient: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
                iconBg: 'bg-gradient-to-br from-green-400 to-emerald-500',
                iconColor: 'text-white',
              },
            ].map(b => (
              <div 
                key={b.title} 
                className={`relative group bg-gradient-to-br ${b.gradient} rounded-xl p-6 border border-gray-100 dark:border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
              >
                <div className={`h-12 w-12 rounded-lg ${b.iconBg} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <b.icon className={`h-6 w-6 ${b.iconColor}`} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-foreground text-base mb-2">{b.title}</h3>
                <p className="text-sm text-gray-600 dark:text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ¿TIENES UNA CANCHA? ───────────────────────────────────── */}
      <section className="py-14 bg-gray-50 dark:bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto rounded-md overflow-hidden bg-white dark:bg-card border border-gray-100 dark:border-border shadow-sm flex flex-col md:flex-row">
            {/* Texto */}
            <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-foreground mb-3">
                ¿Tienes una cancha?
              </h2>
              <p className="text-gray-500 dark:text-muted-foreground mb-5">
                Únete a nuestra plataforma y aumenta tus reservas.
              </p>
              <ul className="space-y-2 mb-7">
                {[
                  'Publica tu cancha gratis',
                  'Gestiona tus horarios',
                  'Aumenta tus reservas y ganancias',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-foreground">
                    <CheckCircle className="h-4 w-4 text-[#16a34a] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/admin-cancha/login">
                <button className="inline-flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold px-6 py-3 rounded-md transition-colors text-sm w-fit">
                  Publicar mi cancha
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>

            {/* Imagen + mockup */}
            <div className="relative flex-1 min-h-[280px] md:min-h-0 overflow-hidden">
              <Image
                src="/images/cancha-login.png"
                alt="Panel de administración"
                fill
                className="object-cover object-center"
              />
              {/* Overlay con mockup de stats */}
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute bottom-4 right-4 bg-white dark:bg-card rounded-md shadow-xl p-4 w-44">
                <p className="text-xs text-gray-500 dark:text-muted-foreground font-medium mb-2">Mis reservas</p>
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-foreground">Hoy 18:00 - 20:00</span>
                    <div className="h-4 w-4 rounded-full bg-[#16a34a] flex items-center justify-center">
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-foreground">Mañana 10:00 - 12:00</span>
                    <div className="h-4 w-4 rounded-full bg-[#16a34a] flex items-center justify-center">
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-border pt-2">
                  <p className="text-[10px] text-gray-400">Ganancias</p>
                  <p className="text-base font-bold text-gray-900 dark:text-foreground">S/ 1,250</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────── */}
      <section className="py-14 bg-gray-900 dark:bg-gray-950 relative overflow-hidden">
        <div className="absolute right-8 bottom-0 opacity-20 pointer-events-none select-none">
          <span className="text-[160px]">⚽</span>
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">¿Listo para jugar?</h2>
            <p className="text-gray-400 mb-7">Encuentra tu cancha ideal y reserva ahora.</p>
            <Link href="/canchas">
              <button className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm">
                Buscar canchas ahora
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 dark:border-border bg-white dark:bg-card py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center gap-5">
            <Image
              src="/images/logo.png"
              alt="CanchaGo"
              width={200}
              height={50}
              className="h-12 w-auto object-contain"
            />
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-muted-foreground">
              <Link href="/canchas" className="hover:text-gray-900 dark:hover:text-foreground transition-colors">Canchas</Link>
              <Link href="/mis-reservas" className="hover:text-gray-900 dark:hover:text-foreground transition-colors">Mis Reservas</Link>
              <Link href="/login" className="hover:text-gray-900 dark:hover:text-foreground transition-colors">Iniciar Sesión</Link>
              <Link href="/registro" className="hover:text-gray-900 dark:hover:text-foreground transition-colors">Registrarse</Link>
            </div>
            <p className="text-xs text-gray-400 dark:text-muted-foreground">&copy; 2026 CanchaGo. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
