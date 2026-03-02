"use client"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold text-muted-foreground">Erro</h1>
      <p className="text-lg text-muted-foreground">
        Algo deu errado. Tente novamente.
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}
