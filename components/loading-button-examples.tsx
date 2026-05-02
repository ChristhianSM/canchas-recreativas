'use client';

import { useState } from 'react';
import { LoadingButton, ProgressButton, StepButton } from './loading-button';
import { Card } from './ui/card';

/**
 * Ejemplos de uso de LoadingButton
 * 
 * Este componente muestra diferentes variantes de botones con estados de carga
 */
export function LoadingButtonExamples() {
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [loading3, setLoading3] = useState(false);
  const [loading4, setLoading4] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);

  const simulateLoading = (setter: (val: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 3000);
  };

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 0;
        }
        return prev + 10;
      });
    }, 300);
  };

  const simulateSteps = () => {
    setStep(0);
    const steps = [0, 1, 2];
    let current = 0;
    const interval = setInterval(() => {
      current++;
      if (current > steps.length) {
        clearInterval(interval);
        setStep(0);
      } else {
        setStep(current);
      }
    }, 1000);
  };

  return (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Variantes de Loading Button</h2>
        <p className="text-muted-foreground mb-6">
          Diferentes estilos de indicadores de carga para mejorar la experiencia del usuario
        </p>
      </div>

      {/* Spinner (Default) */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">1. Spinner (Clásico)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Icono giratorio - ideal para acciones rápidas
        </p>
        <LoadingButton
          isLoading={loading1}
          loadingText="Validando"
          loadingVariant="spinner"
          onClick={() => simulateLoading(setLoading1)}
        >
          Iniciar Sesión
        </LoadingButton>
      </Card>

      {/* Dots */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">2. Dots (Puntos Animados)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Puntos que aparecen progresivamente - más sutil y moderno
        </p>
        <LoadingButton
          isLoading={loading2}
          loadingText="Procesando"
          loadingVariant="dots"
          onClick={() => simulateLoading(setLoading2)}
        >
          Confirmar Reserva
        </LoadingButton>
      </Card>

      {/* Pulse */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">3. Pulse (Círculos Pulsantes)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Tres círculos con animación escalonada - muy visual
        </p>
        <LoadingButton
          isLoading={loading3}
          loadingText="Guardando"
          loadingVariant="pulse"
          onClick={() => simulateLoading(setLoading3)}
        >
          Guardar Cambios
        </LoadingButton>
      </Card>

      {/* Progress */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">4. Progress (Barra de Progreso)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Barra animada en la parte inferior - indica actividad continua
        </p>
        <LoadingButton
          isLoading={loading4}
          loadingText="Verificando"
          loadingVariant="progress"
          onClick={() => simulateLoading(setLoading4)}
        >
          Verificar Disponibilidad
        </LoadingButton>
      </Card>

      {/* Progress Button con porcentaje */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">5. Progress Button (Con Porcentaje)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Muestra el progreso real de la operación - ideal para uploads
        </p>
        <ProgressButton
          isLoading={progress > 0 && progress < 100}
          progress={progress}
          onClick={simulateProgress}
        >
          Subir Comprobante
        </ProgressButton>
      </Card>

      {/* Step Button */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">6. Step Button (Pasos Secuenciales)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Muestra diferentes mensajes según el paso - perfecto para procesos multi-etapa
        </p>
        <StepButton
          isLoading={step > 0}
          steps={['Validando datos', 'Creando bloqueo', 'Redirigiendo']}
          currentStep={step - 1}
          onClick={simulateSteps}
        >
          Ir a Pago
        </StepButton>
      </Card>

      {/* Comparación de tamaños */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">7. Diferentes Tamaños</h3>
        <div className="flex flex-wrap gap-3">
          <LoadingButton size="sm" isLoading={loading1} loadingVariant="spinner">
            Pequeño
          </LoadingButton>
          <LoadingButton size="default" isLoading={loading1} loadingVariant="spinner">
            Normal
          </LoadingButton>
          <LoadingButton size="lg" isLoading={loading1} loadingVariant="spinner">
            Grande
          </LoadingButton>
        </div>
      </Card>

      {/* Diferentes variantes de color */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">8. Diferentes Estilos</h3>
        <div className="flex flex-wrap gap-3">
          <LoadingButton variant="default" isLoading={loading2} loadingVariant="dots">
            Default
          </LoadingButton>
          <LoadingButton variant="secondary" isLoading={loading2} loadingVariant="dots">
            Secondary
          </LoadingButton>
          <LoadingButton variant="outline" isLoading={loading2} loadingVariant="dots">
            Outline
          </LoadingButton>
          <LoadingButton variant="destructive" isLoading={loading2} loadingVariant="dots">
            Destructive
          </LoadingButton>
        </div>
      </Card>
    </div>
  );
}
