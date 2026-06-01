'use client';

import { usePathname } from 'next/navigation';
import { Footer } from '@/components/footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  const noFooter = ['/admin', '/login', '/registro', '/recuperar-contrasena', '/pago'];
  if (noFooter.some((p) => pathname.startsWith(p))) return null;
  return <Footer />;
}
