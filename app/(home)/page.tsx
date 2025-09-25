import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/docs/overview');
  // return <div>Home</div>;
}
