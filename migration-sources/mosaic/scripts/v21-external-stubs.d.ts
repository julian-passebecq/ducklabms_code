declare namespace JSX { interface IntrinsicAttributes { key?: any } interface IntrinsicElements { [elemName: string]: any } }
declare module 'react' {
  export type PropsWithChildren<P = unknown> = P & { children?: any }
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((previous: T) => T)) => void]
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly unknown[]): T
  export function useRef<T>(initial: T): { current: T }
  export function useRef<T>(initial: null): { current: T | null }
  export const StrictMode: any
}
declare module 'react/jsx-runtime' { export const jsx: any; export const jsxs: any; export const Fragment: any }
declare module 'react-dom/client' { export const createRoot: any }
declare module '@fluentui/react-components' {
  export const Badge: any; export const Button: any; export const Caption1: any; export const Divider: any; export const FluentProvider: any;
  export const Tab: any; export const TabList: any; export const Text: any; export const Tooltip: any; export const webDarkTheme: any; export const webLightTheme: any;
  export const Checkbox: any; export const Spinner: any; export const Dropdown: any; export const Option: any; export const Card: any; export const Textarea: any;
}
declare module '@fluentui/react-icons' {
  export const AddRegular: any; export const ArrowDownloadRegular: any; export const ArrowResetRegular: any; export const ChevronRightRegular: any;
  export const DatabaseRegular: any; export const NavigationRegular: any; export const SparkleRegular: any; export const PlayRegular: any;
  export const WeatherMoonRegular: any; export const WeatherSunnyRegular: any; export const DismissRegular: any; export const ArrowUploadRegular: any;
}
declare module '@monaco-editor/react' { const Editor: any; export default Editor }
declare module 'react-grid-layout' {
  export type LayoutItem = { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number; [key: string]: any }
  export type Layout = LayoutItem[]
  const ReactGridLayout: any
  export default ReactGridLayout
  export function useContainerWidth(): { width: number; containerRef: any; mounted: boolean }
  export const verticalCompactor: any
}
declare module '*.css' {}
declare module '*?url' { const url: string; export default url }
declare module '@duckdb/duckdb-wasm' {
  export type AsyncDuckDB = any
  export type DuckDBBundles = any
  export const selectBundle: any; export const ConsoleLogger: any; export const LogLevel: any; export const AsyncDuckDB: any
}
declare module 'apache-arrow' { export const tableToIPC: any }
