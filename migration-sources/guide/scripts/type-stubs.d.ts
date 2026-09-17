declare namespace JSX {
  type Element = any
  interface IntrinsicElements { [elemName: string]: any }
}

declare module 'react' {
  export type ReactNode = any
  export type KeyboardEvent<T = any> = any
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((current: T) => T)) => void]
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void
  export function useMemo<T>(factory: () => T, deps: any[]): T
  const React: any
  export default React
}

declare module 'react/jsx-runtime' {
  export const jsx: any
  export const jsxs: any
  export const Fragment: any
}

declare module 'react-dom/client' {
  const ReactDOM: { createRoot(node: any): { render(children: any): void } }
  export default ReactDOM
}

declare module '@fluentui/react-components' {
  export const Badge: any
  export const Button: any
  export const Card: any
  export const Divider: any
  export const Dropdown: any
  export const FluentProvider: any
  export const Option: any
  export const ProgressBar: any
  export const SearchBox: any
  export const Switch: any
  export const Tab: any
  export const TabList: any
  export const Text: any
  export const Title1: any
  export const Title2: any
  export const Subtitle1: any
  export const Subtitle2: any
  export const Tooltip: any
  export const Tree: any
  export const TreeItem: any
  export const TreeItemLayout: any
  export const webDarkTheme: any
  export const webLightTheme: any
}

declare module '@fluentui/react-icons' {
  export const Apps24Regular: any
  export const BookOpen24Regular: any
  export const ChartMultiple24Regular: any
  export const DocumentBulletList24Regular: any
  export const Home24Regular: any
  export const Shield24Regular: any
}

declare module '*.css' { const value: string; export default value }
