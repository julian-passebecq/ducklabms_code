export type GuidePage = 'home' | 'concepts' | 'decisions' | 'certifications' | 'labs' | 'code' | 'sources'

export type GuideRoute = {
  page: GuidePage
  target?: string
}

export type GuideRoutePolicy = {
  validTargets: ReadonlySet<string>
  fallbackTarget?: string
}

export type GuideRoutePolicies = Partial<Record<GuidePage, GuideRoutePolicy>>

export const guidePages: GuidePage[] = ['home', 'concepts', 'decisions', 'certifications', 'labs', 'code', 'sources']

export function parseGuideHash(hash: string): GuideRoute {
  const [rawPage, ...rest] = hash.replace(/^#/, '').split('/')
  const page = guidePages.includes(rawPage as GuidePage) ? rawPage as GuidePage : 'home'
  let target: string | undefined
  if (rest.length) {
    try { target = decodeURIComponent(rest.join('/')) }
    catch { target = rest.join('/') }
  }
  return { page, target }
}

export function resolveGuideHash(hash: string, policies: GuideRoutePolicies = {}): GuideRoute {
  const parsed = parseGuideHash(hash)
  const policy = policies[parsed.page]

  // Pages without a target policy are canonical page-only routes. This also
  // strips stale fragments such as #home/old-target or #sources/anything.
  if (!policy) return { page: parsed.page }

  if (parsed.target && policy.validTargets.has(parsed.target)) return parsed
  if (policy.fallbackTarget && policy.validTargets.has(policy.fallbackTarget)) {
    return { page: parsed.page, target: policy.fallbackTarget }
  }
  return { page: parsed.page }
}

export function buildGuideHash(page: GuidePage, target?: string | null) {
  return `#${page}${target ? `/${encodeURIComponent(target)}` : ''}`
}
