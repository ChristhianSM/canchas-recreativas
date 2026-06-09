"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  ArrowLeft,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/loading-button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveUser } from "@/lib/auth";
import { apiRegistro, apiLogin, apiLoginWithOAuth } from "@/lib/api";

function RegistroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [registroExitoso, setRegistroExitoso] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.name) {
      newErrors.name = "El nombre es requerido";
    } else if (formData.name.trim().length < 6) {
      newErrors.name = "El nombre debe tener al menos 6 caracteres";
    }

    if (!formData.email) {
      newErrors.email = "El correo es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Ingresa un correo válido";
    }

    if (!formData.phone) {
      newErrors.phone = "El teléfono es requerido";
    } else if (!/^9\d{8}$/.test(formData.phone)) {
      newErrors.phone = "Ingresa un número válido (9 dígitos)";
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = "La contraseña debe contener al menos una mayúscula";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirma tu contraseña";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    if (!acceptTerms) {
      newErrors.terms = "Debes aceptar los términos y condiciones";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    // Registro real con Supabase
    const result = await apiRegistro({
      nombre: formData.name,
      email: formData.email,
      password: formData.password,
      telefono: formData.phone,
    });

    if (result.error) {
      setErrors({ email: result.error });
      setIsLoading(false);
      return;
    }

    // Auto-login después del registro
    const loginResult = await apiLogin(formData.email, formData.password);
    if (loginResult.token) {
      saveUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      });
      window.dispatchEvent(new Event("user-login"));
    }

    setIsLoading(false);
    router.push(redirectTo);
  };

  const passwordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, label: "" };

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const labels = [
      "",
      "Muy débil",
      "Débil",
      "Regular",
      "Fuerte",
      "Muy fuerte",
    ];
    const colors = [
      "",
      "bg-destructive",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-primary",
      "bg-primary",
    ];

    return { strength, label: labels[strength], color: colors[strength] };
  };

  const { strength, label, color } = passwordStrength();

  // Pantalla de confirmación de email
  if (registroExitoso) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-futbol.jpg"
            alt="Cancha"
            fill
            className="object-cover object-center scale-105 blur-sm"
            priority
          />
          <div className="absolute inset-0 bg-black/55" />
        </div>
        <div className="relative z-10 mx-auto max-w-md text-center space-y-6 bg-white dark:bg-card rounded-xl p-8 shadow-2xl w-full">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              ¡Revisa tu correo!
            </h1>
            <p className="mt-2 text-muted-foreground">
              Enviamos un link de confirmación a{" "}
              <span className="font-medium text-foreground">
                {formData.email}
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Haz clic en el link del correo para activar tu cuenta y poder
              iniciar sesión. Si no lo ves, revisa tu carpeta de spam.
            </p>
          </div>
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm text-primary">
            Una vez confirmado tu correo, ya podrás iniciar sesión normalmente.
          </div>
          <Button asChild className="w-full" size="lg">
            <Link href="/login">Ir al inicio de sesión</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Fondo: imagen de cancha difuminada */}
      <div className="absolute inset-0">
        <Image
          src="/images/login.jpg"
          alt="Cancha deportiva"
          fill
          className="object-cover object-center scale-105 blur-sm"
          priority
        />
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* Header transparente */}
      <header className="sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Link
            href="/"
            className="flex cursor-pointer items-center gap-4 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Volver a Inicio</h1>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white dark:bg-card rounded-xl shadow-2xl p-8">
          {/* Logo */}
          <div className="mb-6 text-center">
            <Image
              src="/images/logo.png"
              alt="CanchaPiura"
              width={200}
              height={70}
              className="mx-auto mb-3 h-14 w-auto object-contain"
            />
            <h2 className="text-2xl font-bold text-foreground">
              Crea tu cuenta
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Nombre completo"
                  className={`pl-10 ${errors.name ? "border-destructive" : ""}`}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Correo electrónico"
                  className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Teléfono"
                  className={`pl-10 ${errors.phone ? "border-destructive" : ""}`}
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {formData.password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full ${
                          i <= strength ? color : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              )}
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmar contraseña"
                  className={`pl-10 pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Terms */}
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3">
                <button
                  type="button"
                  onClick={() => setAcceptTerms(!acceptTerms)}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                    acceptTerms
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background"
                  }`}
                >
                  {acceptTerms && <Check className="h-3 w-3" />}
                </button>
                <span className="text-sm text-muted-foreground">
                  Acepto los{" "}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-primary hover:underline font-medium"
                  >
                    Términos y Condiciones
                  </button>{" "}
                  y la{" "}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-primary hover:underline font-medium"
                  >
                    Política de Privacidad
                  </button>
                </span>
              </label>
              {errors.terms && (
                <p className="text-sm text-destructive">{errors.terms}</p>
              )}
            </div>

            {/* Aviso de email real */}
            <div className="flex items-start gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
              <span className="text-yellow-600 text-base shrink-0">⚠️</span>
              <p className="text-xs text-yellow-700 dark:text-yellow-500">
                Usa un correo real — lo necesitarás para recuperar tu cuenta.
              </p>
            </div>

            {/* Submit */}
            <LoadingButton
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              loadingText="Creando cuenta"
              loadingVariant="pulse"
            >
              Crear Cuenta
            </LoadingButton>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm text-muted-foreground">
              o regístrate con
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Social Register */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => apiLoginWithOAuth("google")}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </Button>

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </main>

      {/* Modal Términos y Condiciones */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center gap-3 mb-1">
              <Image
                src="/images/logo.png"
                alt="CanchaGo"
                width={120}
                height={42}
                className="object-contain"
              />
            </div>
            <DialogTitle className="text-xl font-bold">
              Términos y Condiciones de Uso
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Versión 1.0 — Junio 2025
            </p>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1 space-y-5 text-sm text-muted-foreground">
            <section>
              <h3 className="font-semibold text-foreground mb-1">1. ¿Qué es CanchaGo?</h3>
              <p>CanchaGo es una plataforma digital disponible en tucanchago.com que permite a jugadores buscar, visualizar y reservar canchas deportivas en Piura, Perú.</p>
              <p className="mt-1">CanchaGo actúa únicamente como intermediario entre los jugadores (usuarios) y los propietarios o administradores de las canchas (establecimientos). CanchaGo no es propietaria, operadora ni responsable de las instalaciones deportivas publicadas en la plataforma.</p>
              <p className="mt-1">Los establecimientos son responsables de la veracidad de la información publicada (precios, horarios, condiciones de la cancha) y de cumplir con las reservas confirmadas.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">2. Aceptación de estos Términos</h3>
              <p>Al crear una cuenta en CanchaGo, el usuario declara haber leído, entendido y aceptado estos Términos y Condiciones, así como la Política de Privacidad de la plataforma.</p>
              <p className="mt-1">Si el usuario no está de acuerdo con alguno de estos términos, debe abstenerse de usar la plataforma.</p>
              <p className="mt-1">CanchaGo se reserva el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados con al menos 15 días de anticipación mediante el correo electrónico registrado.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">3. Reservas y cuenta de usuario</h3>
              <p>En CanchaGo es posible realizar reservas de dos formas:</p>
              <p className="mt-2 font-medium text-foreground">Reserva sin cuenta (usuario invitado)</p>
              <p className="mt-1">El usuario puede reservar una cancha sin necesidad de crear una cuenta. Se solicitarán correo electrónico y número de teléfono con WhatsApp. Recibirá la confirmación por WhatsApp y podrá cancelar desde el enlace enviado a su correo.</p>
              <p className="mt-2 font-medium text-foreground">Reserva con cuenta registrada</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Historial de reservas</li>
                <li>Canchas guardadas como favoritas</li>
                <li>Datos personales autocompletados al reservar</li>
                <li>Edición del perfil</li>
              </ul>
              <p className="mt-2 font-medium text-foreground">Creación de cuenta</p>
              <p className="mt-1">Para crear una cuenta se requiere: nombre completo, correo electrónico válido, número de teléfono y contraseña segura. El usuario es responsable de mantener la confidencialidad de sus credenciales.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">4. Proceso de reserva</h3>
              <p>Al realizar una reserva, el usuario selecciona cancha, fecha y horario disponible. La reserva queda confirmada una vez completado el proceso, y el usuario recibirá una notificación al WhatsApp registrado.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">5. Pagos</h3>
              <p>El pago se realiza directamente al establecimiento. CanchaGo no procesa ni retiene dinero. Los métodos aceptados son los que indique el establecimiento:</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Yape (al número del administrador de cancha)</li>
                <li>Plin (al número del administrador de cancha)</li>
                <li>Efectivo en el local</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">6. Política de cancelaciones y reembolsos</h3>
              <p className="font-medium text-foreground mt-1">Cancelación por el usuario:</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Más de 4 horas de anticipación: reembolso del 85%</li>
                <li>Entre 2 y 4 horas: reembolso del 60%</li>
                <li>Entre 1 y 2 horas: reembolso del 30%</li>
                <li>Menos de 1 hora: sin reembolso</li>
              </ul>
              <p className="font-medium text-foreground mt-2">Cancelación por el establecimiento:</p>
              <p className="mt-1">El usuario tiene derecho a la devolución total. El reembolso es responsabilidad directa del establecimiento.</p>
              <p className="font-medium text-foreground mt-2">Fuerza mayor:</p>
              <p className="mt-1">En casos de fuerza mayor (lluvias, cortes de luz, etc.), la política será definida directamente entre el usuario y el establecimiento.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">7. Responsabilidades del usuario</h3>
              <p>Al usar CanchaGo, el usuario se compromete a:</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Proporcionar información veraz al registrarse</li>
                <li>Presentarse puntualmente a las reservas confirmadas</li>
                <li>Respetar las instalaciones y normas del establecimiento</li>
                <li>No realizar reservas fraudulentas</li>
                <li>No revender ni ceder horarios a terceros a cambio de dinero</li>
                <li>No usar la plataforma para actividades ilegales</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">8. Limitación de responsabilidad</h3>
              <p>CanchaGo no será responsable por lesiones, daños físicos, pérdida de objetos, diferencias en la información publicada, incumplimientos del establecimiento ni fallas técnicas fuera de su control razonable.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">9. Comunicaciones por WhatsApp</h3>
              <p>Al registrarse y aceptar estos términos, el usuario autoriza a CanchaGo a enviar notificaciones al número de WhatsApp registrado: confirmaciones, recordatorios y avisos de cancelación.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">10. Privacidad y protección de datos</h3>
              <p>CanchaGo trata datos personales de conformidad con la Ley N.° 29733 (Ley de Protección de Datos Personales del Perú). Los datos (nombre, correo, teléfono) se usan exclusivamente para gestionar la cuenta, enviar notificaciones y mejorar la plataforma. No se venden a terceros.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">11. Propiedad intelectual</h3>
              <p>El nombre CanchaGo, logotipo, diseño y contenidos son propiedad exclusiva de sus creadores y están protegidos por las leyes de propiedad intelectual del Perú.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">12. Ley aplicable y jurisdicción</h3>
              <p>Estos Términos se rigen por las leyes de la República del Perú. Cualquier controversia será sometida a los juzgados y tribunales competentes de la ciudad de Piura.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">13. Contacto</h3>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Sitio web: tucanchago.com</li>
                <li>WhatsApp: disponible en la plataforma</li>
              </ul>
            </section>

            <p className="text-xs text-muted-foreground border-t pt-3 mt-2">
              Al crear tu cuenta, confirmas que leíste y aceptas estos Términos y Condiciones.
            </p>
          </div>

          <div className="shrink-0 pt-4 border-t flex justify-end">
            <Button onClick={() => setShowTermsModal(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Política de Privacidad */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center gap-3 mb-1">
              <Image
                src="/images/logo.png"
                alt="CanchaGo"
                width={120}
                height={42}
                className="object-contain"
              />
            </div>
            <DialogTitle className="text-xl font-bold">
              Política de Privacidad
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Versión 1.0 — Junio 2025
            </p>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1 space-y-5 text-sm text-muted-foreground">
            <p>En CanchaGo nos tomamos en serio la privacidad de quienes usan nuestra plataforma. Este documento explica qué datos personales recopilamos, para qué los usamos, con quién los compartimos y cuáles son tus derechos sobre ellos.</p>
            <p>Esta Política se rige por la Ley N.° 29733, Ley de Protección de Datos Personales del Perú, y su reglamento aprobado por Decreto Supremo N.° 003-2013-JUS.</p>

            <section>
              <h3 className="font-semibold text-foreground mb-1">1. ¿Quién es responsable de tus datos?</h3>
              <p>El responsable del tratamiento de los datos personales recopilados a través de tucanchago.com es CanchaGo, plataforma operada por su fundador con base en Piura, Perú.</p>
              <p className="mt-1">Para cualquier consulta puedes contactarnos a través de los canales disponibles en tucanchago.com.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">2. ¿Qué datos recopilamos?</h3>
              <p className="font-medium text-foreground mt-1">Si reservas sin cuenta:</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Correo electrónico</li>
                <li>Número de teléfono con WhatsApp</li>
              </ul>
              <p className="font-medium text-foreground mt-2">Si creas una cuenta:</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Nombre completo</li>
                <li>Correo electrónico</li>
                <li>Número de teléfono</li>
                <li>Contraseña (almacenada cifrada, nunca en texto plano)</li>
              </ul>
              <p className="font-medium text-foreground mt-2">Si te registras con Google:</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Nombre y correo electrónico de tu cuenta de Google</li>
                <li>No almacenamos tu contraseña de Google</li>
              </ul>
              <p className="font-medium text-foreground mt-2">Datos generados por el uso:</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Historial de reservas realizadas</li>
                <li>Canchas marcadas como favoritas</li>
                <li>Fecha y hora de las interacciones con la plataforma</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">3. ¿Para qué usamos tus datos?</h3>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Gestionar y confirmar tus reservas de canchas deportivas</li>
                <li>Enviarte notificaciones de confirmación por WhatsApp</li>
                <li>Enviarte el enlace de cancelación a tu correo (reservas sin cuenta)</li>
                <li>Permitirte acceder a tu historial y gestionar tu cuenta</li>
                <li>Mejorar el funcionamiento y la experiencia de la plataforma</li>
              </ul>
              <p className="mt-2">No usamos tus datos para publicidad de terceros ni para fines distintos a los descritos.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">4. ¿Con quién compartimos tus datos?</h3>
              <p>CanchaGo no vende ni cede tus datos a terceros. Para operar la plataforma usamos los siguientes servicios:</p>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="font-medium text-foreground">Supabase</p>
                  <p>Proveedor de base de datos y autenticación. Opera bajo estándares de seguridad internacionales (SOC 2 Tipo II).</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Twilio</p>
                  <p>Servicio de mensajería para notificaciones por WhatsApp. Recibe únicamente el número de teléfono y el contenido del mensaje de confirmación.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Google (inicio de sesión)</p>
                  <p>Si te registras con Google, CanchaGo únicamente recibe tu nombre y correo electrónico.</p>
                </div>
              </div>
              <p className="mt-2">También podríamos compartir tus datos ante obligación legal o requerimiento de autoridad competente en el Perú.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">5. ¿Cuánto tiempo guardamos tus datos?</h3>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Datos de cuenta: mientras la cuenta esté activa. Se eliminan en máximo 30 días tras solicitar la baja.</li>
                <li>Datos de reservas sin cuenta: 90 días desde la fecha de reserva.</li>
                <li>Historial de reservas con cuenta: disponible mientras la cuenta esté activa.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">6. ¿Cómo protegemos tus datos?</h3>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Contraseñas almacenadas con cifrado seguro; nadie en CanchaGo puede verlas en texto plano</li>
                <li>Acceso a la base de datos restringido al equipo de CanchaGo</li>
                <li>Comunicación cifrada mediante HTTPS</li>
                <li>Supabase aplica Row Level Security para que cada usuario acceda solo a sus datos</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">7. Tus derechos sobre tus datos</h3>
              <p>De acuerdo con la Ley N.° 29733, tienes derecho a:</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li><span className="font-medium text-foreground">Acceso:</span> conocer qué datos tuyos tenemos almacenados</li>
                <li><span className="font-medium text-foreground">Rectificación:</span> corregir datos inexactos o incompletos</li>
                <li><span className="font-medium text-foreground">Cancelación:</span> solicitar la eliminación de tus datos</li>
                <li><span className="font-medium text-foreground">Oposición:</span> oponerte al tratamiento para determinados fines</li>
              </ul>
              <p className="mt-1">Atenderemos tu solicitud en un plazo máximo de 20 días hábiles.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">8. Cookies y datos de navegación</h3>
              <p>CanchaGo puede utilizar cookies técnicas necesarias para el funcionamiento de la plataforma (como mantener tu sesión). No usamos cookies de rastreo publicitario.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">9. Menores de edad</h3>
              <p>CanchaGo no está dirigida a menores de 14 años. Si tienes conocimiento de que un menor ha proporcionado datos sin autorización, contáctanos para proceder a su eliminación.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">10. Cambios a esta Política</h3>
              <p>CanchaGo puede actualizar esta Política cuando sea necesario. Los cambios relevantes serán notificados con al menos 15 días de anticipación al correo registrado. La versión vigente siempre estará disponible en tucanchago.com.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">11. Contacto</h3>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Sitio web: tucanchago.com</li>
                <li>WhatsApp: disponible en la plataforma</li>
              </ul>
            </section>

            <p className="text-xs text-muted-foreground border-t pt-3 mt-2">
              Al usar CanchaGo, confirmas que has leído y comprendido esta Política de Privacidad.
            </p>
          </div>

          <div className="shrink-0 pt-4 border-t flex justify-end">
            <Button onClick={() => setShowPrivacyModal(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RegistroContent />
    </Suspense>
  );
}
