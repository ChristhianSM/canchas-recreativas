import { redirect } from 'next/navigation';

export default function MisReservasRedirect() {
  redirect('/mi-cuenta?tab=reservas');
}
