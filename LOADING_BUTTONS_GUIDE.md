# Guía de Uso: Loading Buttons Dinámicos

## 📦 Componentes Disponibles

### 1. `LoadingButton` - Botón con múltiples variantes de carga

```tsx
import { LoadingButton } from '@/components/loading-button';

// Variante Spinner (clásico)
<LoadingButton
  isLoading={isLoading}
  loadingText="Iniciando sesión"
  loadingVariant="spinner"
  onClick={handleLogin}
>
  Iniciar Sesión
</LoadingButton>

// Variante Dots (puntos animados)
<LoadingButton
  isLoading={isLoading}
  loadingText="Procesando"
  loadingVariant="dots"
  onClick={handleSubmit}
>
  Confirmar
</LoadingButton>

// Variante Pulse (círculos pulsantes)
<LoadingButton
  isLoading={isLoading}
  loadingText="Guardando"
  loadingVariant="pulse"
  onClick={handleSave}
>
  Guardar Cambios
</LoadingButton>

// Variante Progress (barra animada)
<LoadingButton
  isLoading={isLoading}
  loadingText="Verificando"
  loadingVariant="progress"
  onClick={handleVerify}
>
  Verificar Disponibilidad
</LoadingButton>
```

### 2. `ProgressButton` - Botón con barra de progreso real

```tsx
import { ProgressButton } from '@/components/loading-button';

const [progress, setProgress] = useState(0);

<ProgressButton
  isLoading={progress > 0 && progress < 100}
  progress={progress}
  onClick={handleUpload}
>
  Subir Comprobante
</ProgressButton>
```

### 3. `StepButton` - Botón con pasos secuenciales

```tsx
import { StepButton } from '@/components/loading-button';

const [step, setStep] = useState(0);

<StepButton
  isLoading={step > 0}
  steps={['Validando datos', 'Creando bloqueo', 'Redirigiendo']}
  currentStep={step - 1}
  onClick={handleReservar}
>
  Ir a Pago
</StepButton>
```

## 🎯 Casos de Uso Recomendados

### Login / Registro
```tsx
<LoadingButton
  isLoading={isLoading}
  loadingText="Iniciando sesión"
  loadingVariant="dots"  // Más moderno y sutil
  size="lg"
  className="w-full"
>
  Iniciar Sesión
</LoadingButton>
```

### Confirmar Reserva
```tsx
<StepButton
  isLoading={reservando}
  steps={['Verificando disponibilidad', 'Redirigiendo al pago']}
  currentStep={reservaStep}
  size="lg"
>
  Confirmar Reserva
</StepButton>
```

### Subir Archivo
```tsx
<ProgressButton
  isLoading={uploading}
  progress={uploadProgress}
>
  Subir Comprobante
</ProgressButton>
```

### Guardar Cambios
```tsx
<LoadingButton
  isLoading={saving}
  loadingText="Guardando"
  loadingVariant="pulse"
  variant="default"
>
  Guardar Cambios
</LoadingButton>
```

### Verificar Disponibilidad
```tsx
<LoadingButton
  isLoading={checking}
  loadingText="Verificando"
  loadingVariant="spinner"
>
  Verificar Horario
</LoadingButton>
```

## 🎨 Variantes de Estilo

Todos los botones soportan las variantes estándar de shadcn/ui:

```tsx
<LoadingButton variant="default" />    // Primario
<LoadingButton variant="secondary" />  // Secundario
<LoadingButton variant="outline" />    // Con borde
<LoadingButton variant="destructive" /> // Rojo (eliminar, cancelar)
<LoadingButton variant="ghost" />      // Transparente
```

## 📏 Tamaños

```tsx
<LoadingButton size="sm" />      // Pequeño
<LoadingButton size="default" /> // Normal
<LoadingButton size="lg" />      // Grande
```

## ✨ Props Disponibles

### LoadingButton
| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `isLoading` | boolean | false | Estado de carga |
| `loadingText` | string | "Cargando" | Texto durante la carga |
| `loadingVariant` | 'spinner' \| 'dots' \| 'pulse' \| 'progress' | 'spinner' | Tipo de animación |
| `variant` | string | 'default' | Variante de estilo |
| `size` | string | 'default' | Tamaño del botón |

### ProgressButton
| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `isLoading` | boolean | false | Estado de carga |
| `progress` | number | 0 | Progreso (0-100) |

### StepButton
| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `isLoading` | boolean | false | Estado de carga |
| `steps` | string[] | [] | Array de mensajes por paso |
| `currentStep` | number | 0 | Índice del paso actual |

## 🔄 Ejemplo Completo: Flujo de Reserva

```tsx
'use client';

import { useState } from 'react';
import { StepButton } from '@/components/loading-button';

export function ReservaFlow() {
  const [reservando, setReservando] = useState(false);
  const [step, setStep] = useState(0);

  const handleReservar = async () => {
    setReservando(true);
    setStep(1); // Paso 1: Verificando

    // Verificar disponibilidad
    const check = await fetch('/api/bloqueos/check?...');
    const data = await check.json();

    if (!data.disponible) {
      setReservando(false);
      setStep(0);
      alert('Horario no disponible');
      return;
    }

    setStep(2); // Paso 2: Creando bloqueo
    await fetch('/api/bloqueos', { method: 'POST', ... });

    setStep(3); // Paso 3: Redirigiendo
    setTimeout(() => {
      router.push('/pago?...');
    }, 500);
  };

  return (
    <StepButton
      isLoading={reservando}
      steps={[
        'Verificando disponibilidad',
        'Creando bloqueo temporal',
        'Redirigiendo al pago'
      ]}
      currentStep={step - 1}
      onClick={handleReservar}
      size="lg"
      className="w-full"
    >
      Reservar Ahora
    </StepButton>
  );
}
```

## 🎭 Ver Ejemplos en Vivo

Para ver todos los ejemplos funcionando, importa el componente de demostración:

```tsx
import { LoadingButtonExamples } from '@/components/loading-button-examples';

// En tu página
<LoadingButtonExamples />
```

## 💡 Tips

1. **Usa `dots` para acciones rápidas** (< 2 segundos) - es más sutil
2. **Usa `spinner` para acciones medias** (2-5 segundos) - es familiar
3. **Usa `pulse` para acciones largas** (> 5 segundos) - es más visual
4. **Usa `StepButton` para procesos multi-etapa** - da feedback claro
5. **Usa `ProgressButton` para uploads** - muestra progreso real

## 🚀 Mejoras Implementadas

✅ Animaciones suaves y profesionales
✅ Múltiples variantes para diferentes contextos
✅ Feedback visual claro al usuario
✅ Soporte completo de accesibilidad
✅ Compatible con todas las variantes de shadcn/ui
✅ TypeScript con tipos completos
✅ Responsive y mobile-friendly
