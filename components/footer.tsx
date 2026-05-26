import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail, Instagram, Facebook } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-card border-t border-border text-muted-foreground mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">

          {/* Marca */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Image
              src="/images/logo.png"
              alt="CanchaGo"
              width={160}
              height={40}
              className="h-10 w-auto object-contain mb-4"
            />
            <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">
              La plataforma más fácil para reservar canchas deportivas en Piura. Sin llamadas, sin esperas.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://www.facebook.com/Canchago"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-[#16a34a] transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4 text-muted-foreground" />
              </a>
              <a
                href="https://www.instagram.com/tucanchago"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-[#16a34a] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Navegación */}
          <div>
            <h4 className="text-foreground font-semibold text-sm mb-4 uppercase tracking-wide">Plataforma</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-foreground transition-colors">Inicio</Link></li>
              <li><Link href="/canchas" className="hover:text-foreground transition-colors">Buscar canchas</Link></li>
              <li><Link href="/mis-reservas" className="hover:text-foreground transition-colors">Mis reservas</Link></li>
              <li><Link href="/login" className="hover:text-foreground transition-colors">Iniciar sesión</Link></li>
              <li><Link href="/registro" className="hover:text-foreground transition-colors">Crear cuenta</Link></li>
            </ul>
          </div>

          {/* Para dueños */}
          <div>
            <h4 className="text-foreground font-semibold text-sm mb-4 uppercase tracking-wide">Para dueños</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/admin" className="hover:text-foreground transition-colors">Panel de administración</Link></li>
              <li><Link href="/registro" className="hover:text-foreground transition-colors">Registrar mi cancha</Link></li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="text-foreground font-semibold text-sm mb-4 uppercase tracking-wide">Contacto</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[#16a34a] shrink-0 mt-0.5" />
                <span>Piura, Perú</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#16a34a] shrink-0" />
                <a href="tel:+51959686193" className="hover:text-foreground transition-colors">+51 959 686 193</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#16a34a] shrink-0" />
                <a href="mailto:hola@tucanchago.com" className="hover:text-foreground transition-colors">hola@tucanchago.com</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Línea inferior */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CanchaGo. Todos los derechos reservados.</p>
          <p>Hecho con ❤️ en Piura, Perú</p>
        </div>
      </div>
    </footer>
  );
}
