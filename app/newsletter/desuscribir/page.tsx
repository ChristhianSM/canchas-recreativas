"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";
import { Suspense } from "react";

function Content() {
  const params = useSearchParams();
  const ok = params.get("ok");
  const error = params.get("error");

  const isSuccess = ok === "1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
        {isSuccess ? (
          <>
            <div className="flex justify-center mb-4">
              <div className="bg-green-50 rounded-full p-4">
                <CheckCircle className="h-10 w-10 text-[#16a34a]" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Suscripción cancelada
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Ya no recibirás más correos de novedades de CanchaGo.
              Puedes volver a suscribirte cuando quieras desde la página principal.
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="bg-red-50 rounded-full p-4">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Enlace inválido
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              No pudimos procesar tu solicitud. Es posible que el enlace haya
              expirado o ya no sea válido.
            </p>
          </>
        )}

        <Link
          href="/"
          className="inline-block bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

export default function DesuscribirPage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
