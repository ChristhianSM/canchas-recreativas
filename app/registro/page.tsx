"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
import { saveUser } from "@/lib/auth";
import { apiRegistro, apiLogin, apiLoginWithOAuth } from "@/lib/api";

export default function RegistroPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
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
    } else if (formData.name.length < 3) {
      newErrors.name = "El nombre debe tener al menos 3 caracteres";
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
    router.push("/");
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
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="fixed inset-0 -z-10">
          <Image
            src="/images/cancha-login.png"
            alt="Cancha"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="mx-auto max-w-md text-center space-y-6 bg-white dark:bg-card rounded-2xl p-8 shadow-2xl w-full">
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
    <div className="relative min-h-screen flex flex-col">
      {/* Fondo: imagen de cancha */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/images/cancha-login.png"
          alt="Cancha deportiva"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Header transparente */}
      <header className="border-b border-gray-200 bg-white backdrop-blur-sm sticky top-0 z-10">
        <div className="container  mx-auto flex items-center gap-4 px-4 py-4">
          <Link
            href="/"
            className="flex cursor-pointer items-center text-dark/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-dark">Crear Cuenta</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-2xl p-8">
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
            <p className="mt-1.5 text-sm text-muted-foreground">
              Únete y reserva las mejores canchas de Piura
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Juan Pérez"
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
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
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
            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="text-sm font-medium text-foreground"
              >
                Teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="987654321"
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
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
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
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-foreground"
              >
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repite tu contraseña"
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
                  <Link
                    href="/terminos"
                    className="text-primary hover:underline"
                  >
                    Términos y Condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link
                    href="/privacidad"
                    className="text-primary hover:underline"
                  >
                    Política de Privacidad
                  </Link>
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
                Usa un correo al que tengas acceso. Si olvidas tu contraseña, te
                enviaremos un link de recuperación a esta dirección. Con un
                correo falso no podrás recuperar tu cuenta.
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
          <div className="grid grid-cols-2 gap-3">
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
              Google
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => apiLoginWithOAuth("facebook")}
            >
              <svg className="mr-2 h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </Button>
          </div>

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
    </div>
  );
}
