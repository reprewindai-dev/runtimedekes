export function featureEnabled(flags: unknown, key: string) {
  return (
    typeof flags === 'object' &&
    flags !== null &&
    key in flags &&
    Boolean((flags as Record<string, unknown>)[key])
  )
}

export function shouldUseEcobe(flags: unknown, isConfigured: boolean) {
  return featureEnabled(flags, 'ecobeRouting') && isConfigured
}

export function shouldUseControlPlane(flags: unknown, isConfigured: boolean) {
  return featureEnabled(flags, 'controlPlaneValidation') && isConfigured
}
