'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  loadingVariant?: 'spinner' | 'dots' | 'pulse' | 'progress';
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function LoadingButton({
  isLoading = false,
  loadingText,
  loadingVariant = 'spinner',
  children,
  className,
  disabled,
  variant = 'default',
  size = 'default',
  ...props
}: LoadingButtonProps) {
  const [dots, setDots] = useState('');

  // Animación de puntos
  useEffect(() => {
    if (!isLoading || loadingVariant !== 'dots') return;
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isLoading, loadingVariant]);

  const renderLoadingContent = () => {
    switch (loadingVariant) {
      case 'spinner':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || 'Cargando'}
          </>
        );

      case 'dots':
        return (
          <span className="flex items-center gap-1">
            {loadingText || 'Cargando'}
            <span className="inline-block w-6 text-left">{dots}</span>
          </span>
        );

      case 'pulse':
        return (
          <span className="flex items-center gap-2">
            <span className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" style={{ animationDelay: '300ms' }} />
            </span>
            {loadingText || 'Cargando'}
          </span>
        );

      case 'progress':
        return (
          <span className="relative flex items-center justify-center w-full">
            <span className="opacity-50">{loadingText || 'Procesando'}</span>
            <span className="absolute bottom-0 left-0 h-0.5 bg-current animate-progress" />
          </span>
        );

      default:
        return loadingText || 'Cargando';
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        'relative transition-all',
        isLoading && 'cursor-wait',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? renderLoadingContent() : children}
    </Button>
  );
}

// Variante con progreso animado
export function ProgressButton({
  isLoading = false,
  progress = 0,
  children,
  className,
  disabled,
  variant = 'default',
  size = 'default',
  ...props
}: LoadingButtonProps & { progress?: number }) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn('relative overflow-hidden', className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span
          className="absolute inset-0 bg-primary/20 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
        {isLoading && progress > 0 && (
          <span className="text-xs opacity-75">({progress}%)</span>
        )}
      </span>
    </Button>
  );
}

// Variante con texto que cambia
export function StepButton({
  isLoading = false,
  steps = ['Validando', 'Procesando', 'Finalizando'],
  currentStep = 0,
  children,
  className,
  disabled,
  variant = 'default',
  size = 'default',
  ...props
}: LoadingButtonProps & { steps?: string[]; currentStep?: number }) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn('relative transition-all', className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          {steps[currentStep] || steps[0]}
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
