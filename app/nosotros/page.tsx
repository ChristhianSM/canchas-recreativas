import { Header } from "@/components/header";
import Image from "next/image";
import Link from "next/link";
import {
  Target,
  Eye,
  Zap,
  ShieldCheck,
  Users,
  Smartphone,
  MapPin,
  Star,
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Heart,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre Nosotros — CanchaGo | Reserva Canchas Deportivas en Piura",
  description:
    "Conoce a CanchaGo, la plataforma que conecta jugadores con las mejores canchas deportivas de Piura. Nuestra misión es hacer el deporte más accesible en Piura.",
  keywords: [
    "sobre canchago",
    "quienes somos canchago",
    "plataforma canchas piura",
    "reserva canchas deportivas piura",
    "equipo canchago",
  ],
  openGraph: {
    title: "Sobre Nosotros — CanchaGo | Reserva Canchas Deportivas en Piura",
    description:
      "Conoce a CanchaGo, la plataforma que conecta jugadores con las mejores canchas deportivas de Piura.",
    url: "https://www.tucanchago.com/nosotros",
    siteName: "CanchaGo",
    locale: "es_PE",
    type: "website",
  },
  alternates: {
    canonical: "https://www.tucanchago.com/nosotros",
  },
};

const VALORES = [
  {
    icon: ShieldCheck,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Rapidez",
    desc: "Queremos que reservar una cancha tome minutos, no horas. Menos llamadas, menos espera y más tiempo para jugar.",
  },
  {
    icon: Zap,
    color: "text-accent",
    bg: "bg-accent/15",
    title: "Confianza",
    desc: "Trabajamos para que cada reserva sea clara, segura y confirmada. La confianza es clave tanto para jugadores como para dueños de canchas.",
  },
  {
    icon: Users,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Transparencia",
    desc: "Mostramos información útil: ubicación, horarios, precios, disponibilidad y condiciones de reserva.",
  },
  {
    icon: Smartphone,
    color: "text-accent",
    bg: "bg-accent/15",
    title: "Innovación",
    desc: "Tecnología al servicio del deporte: disponibilidad en tiempo real, pagos digitales y notificaciones al instante.",
  },
];

const STATS = [
  { num: "+10", label: "Canchas registradas", icon: MapPin },
  { num: "+500", label: "Reservas realizadas", icon: CheckCircle },
  { num: "1", label: "Ciudad (y expandiéndonos)", icon: Star },
  { num: "0", label: "Llamadas necesarias", icon: Heart },
];

const PROMESAS = [
  "Reserva confirmada en segundos, no en horas",
  "Disponibilidad en tiempo real, sin sorpresas",
  "Pagos seguros con Yape, Plin o efectivo",
  "Soporte rápido por WhatsApp cuando lo necesites",
];

export default function NosotrosPage() {
  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-background">
      <Header />

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="relative min-h-[52vh] flex items-center overflow-hidden bg-primary">
        <Image
          src="/images/nosotros_hero.jpg.jpeg"
          alt="Cancha deportiva en Piura"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-primary/70" />
        <div className="absolute -left-24 bottom-0 w-96 h-96 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/3 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        <div className="relative container mx-auto px-4 lg:px-12 py-14">
          <span className="inline-block bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wide">
            Sobre nosotros
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-5 max-w-2xl tracking-tight">
            Hacemos el deporte
            <br />
            <span className="text-accent">más accesible</span>
          </h1>
          <p className="text-white/70 text-base md:text-lg max-w-xl leading-relaxed">
            Nacimos en Piura con una sola misión: que reservar una cancha sea
            tan fácil como enviar un mensaje.
          </p>
        </div>
      </section>

      {/* ── HISTORIA ──────────────────────────────────────── */}
      <section className="bg-white dark:bg-background">
        <div className="container mx-auto px-4 lg:px-12 py-16">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            {/* Texto */}
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Nuestra historia
              </span>
              <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-foreground leading-tight tracking-tight">
                Cansados de llamar
                <br />y no obtener respuesta
              </h2>
              <p className="mt-5 text-gray-500 dark:text-muted-foreground leading-relaxed">
                Todo empezó con una frustración simple: llamar a una cancha,
                nadie contesta y perder el partido del fin de semana. Nos
                preguntamos: ¿por qué en pleno 2026 seguimos reservando canchas
                por llamada?
              </p>
              <p className="mt-3 text-gray-500 dark:text-muted-foreground leading-relaxed">
                Así nació{" "}
                <strong className="text-gray-900 dark:text-foreground font-bold">
                  CanchaGo
                </strong>
                : una plataforma 100% digital que conecta a jugadores con las
                mejores canchas de su ciudad en segundos, sin llamadas, sin
                esperas y con pago inmediato.
              </p>

              <ul className="mt-6 space-y-2.5">
                {PROMESAS.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-foreground"
                  >
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {p}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  href="/canchas"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-bold px-6 py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-primary/20"
                >
                  Ver canchas disponibles
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Imagen + badge */}
            <div className="relative rounded-xl overflow-hidden aspect-[4/3] shadow-xl">
              <Image
                src="/images/hero-futbol.jpg"
                alt="Jugadores en cancha deportiva"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-primary/25" />

              {/* Badge flotante */}
              <div className="absolute bottom-4 left-4 bg-white dark:bg-card rounded-xl shadow-2xl p-4 w-48">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
                  CanchaGo hoy
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Reservas</span>
                    <span className="font-bold text-gray-900 dark:text-foreground">
                      +500
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Canchas activas</span>
                    <span className="font-bold text-gray-900 dark:text-foreground">
                      +10
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Llamadas necesarias</span>
                    <span className="font-bold text-destructive line-through">
                      ∞
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-border">
                  <p className="text-[10px] text-gray-400">Satisfacción</p>
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="h-3.5 w-3.5 fill-accent text-accent"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MISIÓN Y VISIÓN ───────────────────────────────── */}
      <section className="py-16 bg-brand-green-light dark:bg-muted/20">
        <div className="container mx-auto px-4 lg:px-12">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Nuestra identidad
            </span>
            <h2 className="mt-3 text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-foreground tracking-tight">
              Lo que nos mueve cada día
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Misión */}
            <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-6">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-foreground mb-3">
                Misión
              </h3>
              <p className="text-gray-500 dark:text-muted-foreground leading-relaxed text-sm">
                Facilitar el acceso a canchas deportivas en Piura mediante una
                plataforma simple, rápida y confiable, donde los jugadores
                puedan reservar sin complicaciones y los dueños puedan gestionar
                mejor sus horarios.
              </p>
            </div>

            {/* Visión */}
            <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border p-8 shadow-sm relative overflow-hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-6">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-foreground mb-3">
                Visión
              </h3>
              <p className="text-gray-500 dark:text-muted-foreground leading-relaxed text-sm">
                Ser la plataforma líder de reservas deportivas en Piura y
                expandirnos a más ciudades del Perú, impulsando una comunidad
                deportiva más conectada, ordenada y digital.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALORES ───────────────────────────────────────── */}
      <section className="py-16 bg-white dark:bg-background">
        <div className="container mx-auto px-4 lg:px-12">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Nuestros pilares
            </span>
            <h2 className="mt-3 text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-foreground tracking-tight">
              Los valores que nos definen
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {VALORES.map((v) => (
              <div
                key={v.title}
                className="bg-gray-50 dark:bg-muted/30 rounded-xl p-6 border border-gray-100 dark:border-border hover:shadow-md transition-shadow"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${v.bg} mb-5`}
                >
                  <v.icon className={`h-5 w-5 ${v.color}`} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-foreground mb-2">
                  {v.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-muted-foreground leading-relaxed">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────── */}
      <section className="py-16 bg-primary relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full flex items-center pr-12 opacity-[0.05] pointer-events-none select-none">
          <span className="text-[260px] leading-none">🏟️</span>
        </div>
        <div className="absolute -left-16 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 lg:px-12 relative">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-primary-foreground tracking-tight">
              CanchaGo en números
            </h2>
            <p className="text-primary-foreground/60 mt-2 text-sm">
              Creciendo junto a la comunidad deportiva de Piura
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                    <s.icon className="h-5 w-5 text-accent" />
                  </div>
                </div>
                <p className="text-4xl md:text-5xl font-extrabold text-primary-foreground tracking-tight">
                  {s.num}
                </p>
                <p className="text-primary-foreground/60 text-xs mt-2 leading-snug max-w-[100px] mx-auto">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="py-16 bg-gray-50 dark:bg-muted/20">
        <div className="container mx-auto px-4 lg:px-12">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full mb-5">
              <MessageCircle className="h-3.5 w-3.5" />
              Únete a CanchaGo
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-foreground mb-4 leading-tight tracking-tight">
              ¿Tienes una cancha deportiva?
            </h2>
            <p className="text-gray-500 dark:text-muted-foreground mb-8 text-sm leading-relaxed max-w-md mx-auto">
              Publica tu cancha y llega a cientos de jugadores en Piura. Te
              ayudamos a configurar todo desde cero, sin costo inicial y sin
              complicaciones.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://wa.me/51940394075?text=Hola%2C%20me%20interesa%20publicar%20mi%20cancha%20en%20CanchaGo."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-bold px-6 py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-primary/20"
              >
                <MessageCircle className="h-4 w-4" />
                Publicar mi cancha
              </a>
              <Link
                href="/canchas"
                className="inline-flex items-center justify-center gap-2 border-2 border-primary text-primary hover:bg-primary/5 active:scale-[0.98] font-bold px-6 py-3.5 rounded-xl transition-all text-sm"
              >
                Buscar canchas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
