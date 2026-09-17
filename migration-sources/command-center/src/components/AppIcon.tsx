import type { CSSProperties, ReactNode } from 'react'

type IconName =
  | 'home'
  | 'cloud'
  | 'code'
  | 'database'
  | 'briefcase'
  | 'learning'
  | 'drop'
  | 'tools'
  | 'roadmap'
  | 'stack'
  | 'info'
  | 'mail'
  | 'search'
  | 'github'
  | 'external'
  | 'calendar'
  | 'play'
  | 'cube'
  | 'chart'
  | 'document'
  | 'spark'
  | 'check'
  | 'close'
  | 'arrow'
  | 'filter'
  | 'sun'
  | 'moon'
  | 'grid'
  | 'user'
  | 'clock'
  | 'link'

export function AppIcon({
  name,
  size = 20,
  style,
}: {
  name: IconName
  size?: number
  style?: CSSProperties
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
    'aria-hidden': true,
  }

  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3.5 10.6 12 3.8l8.5 6.8"/><path d="M5.5 9.8V20h5v-6h3v6h5V9.8"/></>,
    cloud: <path d="M6.3 18.5h11.1a4.1 4.1 0 0 0 .5-8.2A6.2 6.2 0 0 0 6.2 8.8a4.9 4.9 0 0 0 .1 9.7Z"/>,
    code: <><path d="m8.2 6-5 6 5 6"/><path d="m15.8 6 5 6-5 6"/><path d="m13.7 4-3.4 16"/></>,
    database: <><ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/><path d="M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/></>,
    briefcase: <><rect x="3.5" y="7" width="17" height="12.5" rx="2"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="M3.5 12.5h17"/></>,
    learning: <><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12.2V17c2.9 2 7.1 2 10 0v-4.8"/></>,
    drop: <path d="M12 3.2s6.2 6.8 6.2 11.2a6.2 6.2 0 1 1-12.4 0C5.8 10 12 3.2 12 3.2Z"/>,
    tools: <><path d="M14.2 5.1a4.2 4.2 0 0 0-5.4 5.4L3.6 15.7a2.1 2.1 0 0 0 3 3l5.2-5.2a4.2 4.2 0 0 0 5.4-5.4l-2.7 2.7-2.3-2.3 2-3.4Z"/></>,
    roadmap: <><path d="M5 4v16"/><path d="M19 4v16"/><path d="M5 7c4-3 10 3 14 0"/><path d="M5 17c4-3 10 3 14 0"/></>,
    stack: <><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 17 8 4 8-4"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 10.5v6"/><path d="M12 7.5h.01"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></>,
    github: <><path d="M9 19c-4 .8-4-2-5-2.5"/><path d="M15 22v-3.4c0-1 .1-1.7-.5-2.4 3.2-.4 6.5-1.6 6.5-7.1A5.6 5.6 0 0 0 19.5 5 5.2 5.2 0 0 0 19.3 1S18.1.6 15 2.5a13.4 13.4 0 0 0-6 0C5.9.6 4.7 1 4.7 1a5.2 5.2 0 0 0-.2 4A5.6 5.6 0 0 0 3 9.1c0 5.5 3.3 6.7 6.5 7.1-.5.5-.7 1.1-.6 1.8V22"/></>,
    external: <><path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7 3v4M17 3v4M3.5 9.5h17"/></>,
    play: <><circle cx="12" cy="12" r="9"/><path d="m10 8.5 6 3.5-6 3.5v-7Z"/></>,
    cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.3 7.7 7.7 4.4 7.7-4.4M12 12.1V21"/></>,
    chart: <><path d="M5 20V10M12 20V4M19 20v-7"/></>,
    document: <><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    spark: <><path d="m12 3 1.5 4.7L18 9.2l-4.5 1.5L12 15.4l-1.5-4.7L6 9.2l4.5-1.5L12 3Z"/><path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></>,
    check: <path d="m5 12.5 4.2 4.2L19 7"/>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
    filter: <path d="M4 5h16l-6.4 7.3V19l-3.2 1v-7.7L4 5Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon: <path d="M20 15.4A8.2 8.2 0 0 1 8.6 4a8.2 8.2 0 1 0 11.4 11.4Z"/>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-4.3 3.1-6.5 7.5-6.5s6.8 2.2 7.5 6.5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    link: <><path d="M10.2 13.8a4 4 0 0 0 5.7 0l2.5-2.5a4 4 0 0 0-5.7-5.7l-1.4 1.4"/><path d="M13.8 10.2a4 4 0 0 0-5.7 0l-2.5 2.5a4 4 0 0 0 5.7 5.7l1.4-1.4"/></>,
  }

  return <svg {...common}>{paths[name]}</svg>
}
