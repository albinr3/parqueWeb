import { redirect } from 'next/navigation';

// Redirigir la raíz al dashboard o al login
export default function Home() {
  redirect('/login');
}
