// src/app/create/page.tsx
import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import CreateForm from './CreateForm';

export default async function CreatePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return <CreateForm />;
}