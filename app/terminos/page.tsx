import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Términos y Condiciones — CanchaGo",
  description: "Términos y Condiciones de Uso de la plataforma CanchaGo.",
};

export default function TerminosPage() {
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
          <h1 className="text-2xl font-bold">Términos y Condiciones de Uso</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Versión 1.0 — Junio 2025
          </p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground">
          <section>
            <h2 className="font-semibold text-foreground mb-1">
              1. ¿Qué es CanchaGo?
            </h2>
            <p>
              CanchaGo es una plataforma digital disponible en tucanchago.com
              que permite a jugadores buscar, visualizar y reservar canchas
              deportivas en Piura, Perú. Es desarrollada y operada por{" "}
              <strong className="text-foreground">
                Christhian Juan Silupú Moscol
              </strong>
              , con base en Piura, Perú.
            </p>
            <p className="mt-1">
              CanchaGo actúa únicamente como intermediario entre los jugadores
              (usuarios) y los propietarios o administradores de las canchas
              (establecimientos). CanchaGo no es propietaria, operadora ni
              responsable de las instalaciones deportivas publicadas en la
              plataforma.
            </p>
            <p className="mt-1">
              Los establecimientos son responsables de la veracidad de la
              información publicada (precios, horarios, condiciones de la
              cancha) y de cumplir con las reservas confirmadas.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              2. Aceptación de estos Términos
            </h2>
            <p>
              Al crear una cuenta en CanchaGo, el usuario declara haber leído,
              entendido y aceptado estos Términos y Condiciones, así como la
              Política de Privacidad de la plataforma.
            </p>
            <p className="mt-1">
              Si el usuario no está de acuerdo con alguno de estos términos,
              debe abstenerse de usar la plataforma.
            </p>
            <p className="mt-1">
              CanchaGo se reserva el derecho de modificar estos términos en
              cualquier momento. Los cambios serán notificados con al menos 15
              días de anticipación mediante el correo electrónico registrado.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              3. Reservas y cuenta de usuario
            </h2>
            <p>En CanchaGo es posible realizar reservas de dos formas:</p>
            <p className="mt-2 font-medium text-foreground">
              Reserva sin cuenta (usuario invitado)
            </p>
            <p className="mt-1">
              El usuario puede reservar una cancha sin necesidad de crear una
              cuenta. Se solicitarán correo electrónico y número de teléfono
              con WhatsApp. Recibirá la confirmación por WhatsApp y podrá
              cancelar desde el enlace enviado a su correo.
            </p>
            <p className="mt-2 font-medium text-foreground">
              Reserva con cuenta registrada
            </p>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>Historial de reservas</li>
              <li>Canchas guardadas como favoritas</li>
              <li>Datos personales autocompletados al reservar</li>
              <li>Edición del perfil</li>
            </ul>
            <p className="mt-2 font-medium text-foreground">
              Creación de cuenta
            </p>
            <p className="mt-1">
              Para crear una cuenta se requiere: nombre completo, correo
              electrónico válido, número de teléfono y contraseña segura. El
              usuario es responsable de mantener la confidencialidad de sus
              credenciales.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              4. Proceso de reserva
            </h2>
            <p>
              Al realizar una reserva, el usuario selecciona cancha, fecha y
              horario disponible. La reserva queda confirmada una vez completado
              el proceso, y el usuario recibirá una notificación al WhatsApp
              registrado.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">5. Pagos</h2>
            <p>
              El pago se realiza directamente al establecimiento. CanchaGo no
              procesa ni retiene dinero. Los métodos aceptados son los que
              indique el establecimiento:
            </p>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>Yape (al número del administrador de cancha)</li>
              <li>Plin (al número del administrador de cancha)</li>
              <li>Efectivo en el local</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              6. Política de cancelaciones y reembolsos
            </h2>
            <p className="font-medium text-foreground mt-1">
              Cancelación por el usuario:
            </p>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>Más de 4 horas de anticipación: reembolso del 85%</li>
              <li>Entre 2 y 4 horas: reembolso del 60%</li>
              <li>Entre 1 y 2 horas: reembolso del 30%</li>
              <li>Menos de 1 hora: sin reembolso</li>
            </ul>
            <p className="font-medium text-foreground mt-2">
              Cancelación por el establecimiento:
            </p>
            <p className="mt-1">
              El usuario tiene derecho a la devolución total. El reembolso es
              responsabilidad directa del establecimiento.
            </p>
            <p className="font-medium text-foreground mt-2">Fuerza mayor:</p>
            <p className="mt-1">
              En casos de fuerza mayor (lluvias, cortes de luz, etc.), la
              política será definida directamente entre el usuario y el
              establecimiento.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              7. Responsabilidades del usuario
            </h2>
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
            <h2 className="font-semibold text-foreground mb-1">
              8. Limitación de responsabilidad
            </h2>
            <p>
              CanchaGo no será responsable por lesiones, daños físicos, pérdida
              de objetos, diferencias en la información publicada,
              incumplimientos del establecimiento ni fallas técnicas fuera de
              su control razonable.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              9. Comunicaciones por WhatsApp
            </h2>
            <p>
              Al registrarse y aceptar estos términos, el usuario autoriza a
              CanchaGo a enviar notificaciones al número de WhatsApp registrado:
              confirmaciones, recordatorios y avisos de cancelación.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              10. Privacidad y protección de datos
            </h2>
            <p>
              CanchaGo trata datos personales de conformidad con la Ley N.°
              29733 (Ley de Protección de Datos Personales del Perú). Los datos
              (nombre, correo, teléfono) se usan exclusivamente para gestionar
              la cuenta, enviar notificaciones y mejorar la plataforma. No se
              venden a terceros.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              11. Propiedad intelectual
            </h2>
            <p>
              El nombre CanchaGo, logotipo, diseño y contenidos son propiedad
              exclusiva de sus creadores y están protegidos por las leyes de
              propiedad intelectual del Perú.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              12. Ley aplicable y jurisdicción
            </h2>
            <p>
              Estos Términos se rigen por las leyes de la República del Perú.
              Cualquier controversia será sometida a los juzgados y tribunales
              competentes de la ciudad de Piura.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground mb-1">
              13. Contacto
            </h2>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>Sitio web: tucanchago.com</li>
              <li>WhatsApp: disponible en la plataforma</li>
            </ul>
          </section>

          <p className="text-xs border-t pt-4 mt-2">
            Al crear tu cuenta, confirmas que leíste y aceptas estos Términos y
            Condiciones.
          </p>
        </div>
      </div>
    </main>
  );
}
