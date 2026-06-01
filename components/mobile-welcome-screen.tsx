"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface MobileWelcomeScreenProps {
  onDismiss?: () => void;
}

export function MobileWelcomeScreen({ onDismiss }: MobileWelcomeScreenProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Solo mostrar en mobile
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    // Solo mostrar si el usuario no la ha visto antes
    const seen = localStorage.getItem("cp_welcome_seen");
    if (!seen) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("cp_welcome_seen", "1");
    setVisible(false);
    onDismiss?.();
  };

  const handleLogin = () => {
    dismiss();
    router.push("/login");
  };

  const handleRegister = () => {
    dismiss();
    router.push("/registro");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col md:hidden overflow-hidden"
      style={{ background: "#f0f7f0" }}
    >
      {/* Texto superior con padding */}
      <div className="px-7 pt-12 pb-4 shrink-0">
        {/* Logo */}
        <div className="mb-6">
          <Image
            src="/images/logo-new.svg"
            alt="CanchaGo"
            width={200}
            height={52}
            className="h-14 w-auto object-contain"
            priority
          />
        </div>
        {/* Título */}
        <div className="mb-3">
          <h1
            className="text-4xl font-black leading-tight tracking-tight"
            style={{ color: "#1a3d1a" }}
          >
            Reserva
            <br />
            <span style={{ color: "#2d7a2d" }}>tu cancha</span>
            <br />
            de forma fácil
            <br />y rápida
          </h1>
        </div>

        {/* Subtítulo */}
        <p className="text-base leading-relaxed" style={{ color: "#6b7280" }}>
          Encuentra y reserva canchas
          <br />
          deportivas cerca de ti.
        </p>
      </div>

      {/* Imagen a full width, ocupa el espacio restante */}
      <div className="flex-1 relative min-h-0">
        <Image
          src="/images/cancha-login.png"
          alt="Cancha deportiva"
          fill
          className="object-cover object-top"
          priority
        />
      </div>

      {/* Botones inferiores */}
      <div
        className="px-6 pb-10 pt-4 flex flex-col gap-3 shrink-0"
        style={{ background: "#f0f7f0" }}
      >
        <button
          onClick={handleLogin}
          className="w-full py-4 rounded-xl text-white font-semibold text-base transition-opacity active:opacity-80"
          style={{ background: "#2d7a2d" }}
        >
          Iniciar sesión
        </button>

        <button
          onClick={handleRegister}
          className="w-full py-4 rounded-xl font-semibold text-base border-2 transition-opacity active:opacity-80"
          style={{
            borderColor: "#e0e0e0",
            color: "#1a3d1a",
            background: "white",
          }}
        >
          Crear cuenta
        </button>

        <button
          onClick={dismiss}
          className="w-full py-3 text-sm font-medium transition-opacity active:opacity-60"
          style={{ color: "#2d7a2d" }}
        >
          Continuar como invitado
        </button>
      </div>
    </div>
  );
}
