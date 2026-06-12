import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Política de Privacidad — CanchaGo",
  description: "Política de Privacidad de la plataforma CanchaGo.",
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <div className="mb-6">
          <Image
            src="/images/logo.png"
            alt="CanchaGo"
            width={120}
            height={42}
            className="object-contain mb-4"
          />
          <h1 className="text-2xl font-bold">Política de Privacidad</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Versión 1.0 — Junio 2025
          </p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground">
          <p>
            En CanchaGo nos tomamos en serio la privacidad de quienes usan
            nuestra plataforma. Este documento explica qué datos personales
            recopilamos, para qué los usamos, con quién los compartimos y
            cuáles son tus derechos sobre ellos.
          </p>
          <p>
            Esta Política se rige por la Ley N.° 29733, Ley de Protección de
            Datos Personales del Perú, y su reglamento aprobado por Decreto
            Supremo N.° 003-2013-JUS.
          </p>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              1. ¿Quién es responsable de tus datos?
            </h2>
            <p>
              El responsable del tratamiento de los datos personales recopilados
              a través de tucanchago.com es CanchaGo, plataforma operada por su
              fundador con base en Piura, Perú.
            </p>
            <p className="mt-1">
              Para cualquier consulta puedes contactarnos a través de los
              canales disponibles en tucanchago.com.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              2. ¿Qué datos recopilamos?
            </h2>
            <p className="font-medium text-foreground mt-1">
              Si reservas sin cuenta:
            </p>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>Correo electrónico</li>
              <li>Número de teléfono con WhatsApp</li>
            </ul>
            <p className="font-medium text-foreground mt-2">
              Si creas una cuenta:
            </p>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>Nombre completo</li>
              <li>Correo electrónico</li>
              <li>Número de teléfono</li>
              <li>Contraseña (almacenada cifrada, nunca en texto plano)</li>
            </ul>
            <p className="font-medium text-foreground mt-2">
              Si te registras con Google:
            </p>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>Nombre y correo electrónico de tu cuenta de Google</li>
              <li>No almacenamos tu contraseña de Google</li>
            </ul>
            <p className="font-medium text-foreground mt-2">
              Datos generados por el uso:
            </p>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>Historial de reservas realizadas</li>
              <li>Canchas marcadas como favoritas</li>
              <li>Fecha y hora de las interacciones con la plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              3. ¿Para qué usamos tus datos?
            </h2>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>Gestionar y confirmar tus reservas de canchas deportivas</li>
              <li>Enviarte notificaciones de confirmación por WhatsApp</li>
              <li>
                Enviarte el enlace de cancelación a tu correo (reservas sin
                cuenta)
              </li>
              <li>
                Permitirte acceder a tu historial y gestionar tu cuenta
              </li>
              <li>
                Mejorar el funcionamiento y la experiencia de la plataforma
              </li>
            </ul>
            <p className="mt-2">
              No usamos tus datos para publicidad de terceros ni para fines
              distintos a los descritos.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              4. ¿Con quién compartimos tus datos?
            </h2>
            <p>
              CanchaGo no vende ni cede tus datos a terceros. Para operar la
              plataforma usamos los siguientes servicios:
            </p>
            <div className="mt-2 space-y-2">
              <div>
                <p className="font-medium text-foreground">Supabase</p>
                <p>
                  Proveedor de base de datos y autenticación. Opera bajo
                  estándares de seguridad internacionales (SOC 2 Tipo II).
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Twilio</p>
                <p>
                  Servicio de mensajería para notificaciones por WhatsApp.
                  Recibe únicamente el número de teléfono y el contenido del
                  mensaje de confirmación.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Google (inicio de sesión)
                </p>
                <p>
                  Si te registras con Google, CanchaGo únicamente recibe tu
                  nombre y correo electrónico.
                </p>
              </div>
            </div>
            <p className="mt-2">
              También podríamos compartir tus datos ante obligación legal o
              requerimiento de autoridad competente en el Perú.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              5. ¿Cuánto tiempo guardamos tus datos?
            </h2>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>
                Datos de cuenta: mientras la cuenta esté activa. Se eliminan en
                máximo 30 días tras solicitar la baja.
              </li>
              <li>
                Datos de reservas sin cuenta: 90 días desde la fecha de reserva.
              </li>
              <li>
                Historial de reservas con cuenta: disponible mientras la cuenta
                esté activa.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              6. ¿Cómo protegemos tus datos?
            </h2>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>
                Contraseñas almacenadas con cifrado seguro; nadie en CanchaGo
                puede verlas en texto plano
              </li>
              <li>
                Acceso a la base de datos restringido al equipo de CanchaGo
              </li>
              <li>Comunicación cifrada mediante HTTPS</li>
              <li>
                Supabase aplica Row Level Security para que cada usuario acceda
                solo a sus datos
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              7. Tus derechos sobre tus datos
            </h2>
            <p>De acuerdo con la Ley N.° 29733, tienes derecho a:</p>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>
                <span className="font-medium text-foreground">Acceso:</span>{" "}
                conocer qué datos tuyos tenemos almacenados
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Rectificación:
                </span>{" "}
                corregir datos inexactos o incompletos
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Cancelación:
                </span>{" "}
                solicitar la eliminación de tus datos
              </li>
              <li>
                <span className="font-medium text-foreground">Oposición:</span>{" "}
                oponerte al tratamiento para determinados fines
              </li>
            </ul>
            <p className="mt-1">
              Atenderemos tu solicitud en un plazo máximo de 20 días hábiles.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              8. Cookies y datos de navegación
            </h2>
            <p>
              CanchaGo puede utilizar cookies técnicas necesarias para el
              funcionamiento de la plataforma (como mantener tu sesión). No
              usamos cookies de rastreo publicitario.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              9. Menores de edad
            </h2>
            <p>
              CanchaGo no está dirigida a menores de 14 años. Si tienes
              conocimiento de que un menor ha proporcionado datos sin
              autorización, contáctanos para proceder a su eliminación.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              10. Cambios a esta Política
            </h2>
            <p>
              CanchaGo puede actualizar esta Política cuando sea necesario. Los
              cambios relevantes serán notificados con al menos 15 días de
              anticipación al correo registrado. La versión vigente siempre
              estará disponible en tucanchago.com.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              11. Contacto
            </h2>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>Sitio web: tucanchago.com</li>
              <li>WhatsApp: disponible en la plataforma</li>
            </ul>
          </section>

          <p className="text-xs border-t pt-4 mt-2">
            Al usar CanchaGo, confirmas que has leído y comprendido esta
            Política de Privacidad.
          </p>
        </div>
      </div>
    </main>
  );
}
