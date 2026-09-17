import React from 'react';

const paths = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></>,
  learn: <><path d="M4 5.5h6a3 3 0 0 1 3 3V20a3 3 0 0 0-3-3H4z"/><path d="M20 5.5h-6a3 3 0 0 0-3 3V20a3 3 0 0 1 3-3h6z"/></>,
  report: <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M7 16v-4M11 16V8M15 16v-6M18 16V6"/></>,
  data: <><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></>,
  model: <><rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="4" width="6" height="5" rx="1"/><rect x="9" y="15" width="6" height="5" rx="1"/><path d="M9 6.5h6M6 9v3h6v3M18 9v3h-6"/></>,
  dax: <><path d="M4 5h16v14H4z"/><path d="m8 10-2 2 2 2M16 10l2 2-2 2M13.5 8l-3 8"/></>,
  query: <><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  refresh: <><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 9M5.5 15A7 7 0 0 0 18 17.5L20 15"/></>,
  service: <><path d="M7 18h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 8.5 4.5 4.5 0 0 0 7 18z"/></>,
  case: <><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 5V3h6v2M4 10h16M10 13h4"/></>,
  visual: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M6 16h3v2H6zM11 11h3v7h-3zM16 7h3v11h-3z"/></>,
  security: <><path d="M12 3 5 6v5c0 4.7 2.7 8.2 7 10 4.3-1.8 7-5.3 7-10V6z"/><path d="m9.5 12 1.7 1.7 3.6-4"/></>,
  speed: <><path d="M5 18a8 8 0 1 1 14 0"/><path d="m12 13 4-4"/><path d="M8 18h8"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  chevron: <path d="m9 6 6 6-6 6"/>,
  search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 3a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3h5l.3-3a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/></>,
  filter: <path d="M4 5h16l-6 7v5l-4 2v-7z"/>,
};

export default function Icon({ name, size = 18, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] ?? paths.info}
    </svg>
  );
}
