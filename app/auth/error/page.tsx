import Link from "next/link"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6">
      <div className="relative w-full max-w-md">
        <div className="bg-[#111111] border border-[rgba(212,175,55,0.15)] rounded-2xl p-8 text-center">
          <h1 className="font-serif text-2xl font-semibold text-[#f5f0e8] mb-4">
            Ops! Algo deu errado
          </h1>
          
          {params?.error ? (
            <p className="text-sm text-[#8a8070] mb-6">
              Erro: {params.error}
            </p>
          ) : (
            <p className="text-sm text-[#8a8070] mb-6">
              Ocorreu um erro inesperado.
            </p>
          )}
          
          <Link
            href="/auth/login"
            className="inline-block px-6 py-3 bg-gradient-to-r from-[#b8960c] via-[#d4af37] to-[#f0d060] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Voltar ao Login
          </Link>
        </div>
      </div>
    </div>
  )
}
