import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1115] text-white">
      <div className="text-center">
        <h2 className="text-3xl font-serif mb-4">Página não encontrada</h2>
        <Link href="/dashboard" className="text-rose-400 hover:text-rose-300">
          Voltar para o Dashboard
        </Link>
      </div>
    </div>
  );
}
