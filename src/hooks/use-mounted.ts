import { useEffect, useState } from 'react'

/**
 * Hook para evitar hydration mismatch
 * Retorna true apenas após o componente ser montado no cliente
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
} 