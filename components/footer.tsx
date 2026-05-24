import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className=" dark:border-border bg-white dark:bg-card py-10 mt-auto">
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
            <Link
              href="/"
              className="hover:text-gray-900 dark:hover:text-foreground transition-colors"
            >
              Inicio
            </Link>
            <Link
              href="/canchas"
              className="hover:text-gray-900 dark:hover:text-foreground transition-colors"
            >
              Canchas
            </Link>
            <Link
              href="/login"
              className="hover:text-gray-900 dark:hover:text-foreground transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/registro"
              className="hover:text-gray-900 dark:hover:text-foreground transition-colors"
            >
              Registrarse
            </Link>
          </div>
          <p className="text-xs text-gray-400 dark:text-muted-foreground">
            &copy; {new Date().getFullYear()} CanchaGo. Todos los derechos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
