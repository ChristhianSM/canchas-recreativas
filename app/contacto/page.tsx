"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import {
  Mail,
  MapPin,
  Clock,
  Send,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TIPOS_CONSULTA = [
  "Reservar una cancha",
  "Registrar mi cancha en CanchaGo",
  "Problema con una reserva",
  "Consulta sobre pagos",
  "Información general",
  "Otro",
];

const INFO = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+51 940 394 075",
    href: "https://wa.me/51940394075",
    iconClass: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  {
    icon: Mail,
    label: "Correo",
    value: "admin@tucanchago.com",
    href: "mailto:admin@tucanchago.com",
    iconClass: "bg-primary/10 text-primary",
  },
  {
    icon: MapPin,
    label: "Ubicación",
    value: "Piura, Perú",
    href: null,
    iconClass: "bg-primary/10 text-primary",
  },
  {
    icon: Clock,
    label: "Horario de atención",
    value: "Lun – Sáb: 8:00 AM – 8:00 PM",
    href: null,
    iconClass: "bg-primary/10 text-primary",
  },
];

export default function ContactoPage() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    whatsapp: "",
    tipo: "",
    mensaje: "",
  });
  const [enviado, setEnviado] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const lines = [
      `Hola CanchaGo! Soy *${form.nombre}*.`,
      ``,
      `*Consulta:* ${form.tipo}`,
      form.mensaje,
      form.email ? `*Correo:* ${form.email}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    window.open(
      `https://wa.me/51940394075?text=${encodeURIComponent(lines)}`,
      "_blank",
    );
    setEnviado(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* ── Hero ── */}
      <section className="bg-brand-black text-white py-20 px-4">
        <div className="container mx-auto px-4 lg:px-12 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-4">
            Soporte
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            ¿En qué podemos
            <br />
            ayudarte?
          </h1>
          <p className="text-white/60 max-w-lg mx-auto mb-8 text-sm leading-relaxed">
            Estamos disponibles para resolver tus dudas sobre reservas, canchas
            y pagos. Respuesta garantizada en menos de 24 horas.
          </p>
          <a
            href="https://wa.me/51940394075"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-full transition-colors text-sm"
          >
            <MessageCircle className="h-5 w-5" />
            Escribir por WhatsApp
          </a>
        </div>
      </section>

      {/* ── Contenido principal ── */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
            {/* Formulario */}
            <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-1">
                Envíanos un mensaje
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Completa el formulario y te redirigiremos a WhatsApp con tu
                consulta lista.
              </p>

              {enviado ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    ¡Mensaje enviado!
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Te abrimos WhatsApp con tu consulta lista. Si no se abrió
                    automáticamente, escríbenos al{" "}
                    <span className="font-medium text-foreground">
                      +51 940 394 075
                    </span>
                    .
                  </p>
                  <Button variant="outline" onClick={() => setEnviado(false)}>
                    Enviar otra consulta
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        Nombre completo *
                      </label>
                      <Input
                        name="nombre"
                        placeholder="Juan Pérez"
                        value={form.nombre}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        Correo electrónico *
                      </label>
                      <Input
                        name="email"
                        type="email"
                        placeholder="juan@email.com"
                        value={form.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        WhatsApp
                      </label>
                      <Input
                        name="whatsapp"
                        type="tel"
                        placeholder="+51 999 000 000"
                        value={form.whatsapp}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        Tipo de consulta *
                      </label>
                      <select
                        name="tipo"
                        value={form.tipo}
                        onChange={handleChange}
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                      >
                        <option value="" disabled>
                          Selecciona una opción
                        </option>
                        {TIPOS_CONSULTA.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Mensaje *
                    </label>
                    <Textarea
                      name="mensaje"
                      rows={5}
                      placeholder="Cuéntanos en qué podemos ayudarte..."
                      value={form.mensaje}
                      onChange={handleChange}
                      required
                      className="resize-none"
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2" size="lg">
                    <Send className="h-4 w-4" />
                    Enviar mensaje
                  </Button>
                </form>
              )}
            </div>

            {/* Info lateral */}
            <div className="flex flex-col gap-4">
              {INFO.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-4 bg-card rounded-xl border border-border p-5 shadow-sm"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.iconClass}`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                      {item.label}
                    </p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={
                          item.href.startsWith("http") ? "_blank" : undefined
                        }
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-foreground">
                        {item.value}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* CTA WhatsApp */}
              <div className="mt-2 rounded-xl bg-brand-black text-white p-6">
                <h3 className="font-bold text-base mb-1">
                  ¿Necesitas respuesta inmediata?
                </h3>
                <p className="text-sm text-white/60 mb-4 leading-relaxed">
                  Escríbenos directo por WhatsApp y te atendemos al instante.
                </p>
                <a
                  href="https://wa.me/51940394075"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-4 py-3 rounded-xl transition-colors text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  Abrir WhatsApp
                </a>
              </div>

              {/* Operador */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Sobre la plataforma
                </p>
                <p className="text-sm text-foreground font-medium">CanchaGo</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Plataforma de reservas deportivas con base en Piura, Perú.
                </p>
              </div>

              {/* Redes */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Síguenos
                </p>
                <div className="flex items-center gap-3">
                  {[
                    {
                      href: "https://www.facebook.com/profile.php?id=61590374610935&locale=es_LA",
                      label: "Facebook",
                      path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
                    },
                    {
                      href: "https://www.instagram.com/tucanchago?igsh=MTZheXE0bnFhZmVpbg==",
                      label: "Instagram",
                      path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
                    },
                    {
                      href: "https://www.tiktok.com/@canchago1?_r=1&_t=ZS-97WYLM6JDIz",
                      label: "TikTok",
                      path: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z",
                    },
                  ].map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d={s.path} />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
