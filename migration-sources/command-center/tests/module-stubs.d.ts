declare namespace JSX {
  interface IntrinsicAttributes { key?: any }
  interface IntrinsicElements {
    [elemName: string]: any
  }
}

declare module 'react' {
  export type CSSProperties = Record<string, string | number | undefined>
  export type ReactNode = any
  export type SetStateAction<T> = T | ((previous: T) => T)
  export type Dispatch<A> = (value: A) => void
  export interface MouseEvent<T = HTMLElement> { currentTarget: T; stopPropagation(): void }
  export function useState<T>(initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>]
  export function useMemo<T>(factory: () => T, dependencies: readonly unknown[]): T
  export function useEffect(effect: () => void | (() => void), dependencies?: readonly unknown[]): void
  export const StrictMode: any
  const React: any
  export default React
}

declare module 'react/jsx-runtime' {
  export const Fragment: any
  export function jsx(type: any, props: any, key?: any): any
  export function jsxs(type: any, props: any, key?: any): any
}

declare module 'react-dom/client' {
  const ReactDOM: {
    createRoot(element: Element | DocumentFragment): { render(node: any): void }
  }
  export default ReactDOM
}

declare module '@fluentui/react-components' {
  import type { MouseEvent } from 'react'

  type LooseProps = { children?: any; [key: string]: any }
  type ButtonProps = LooseProps & { onClick?: (event: MouseEvent<HTMLElement>) => void }
  type InputProps = LooseProps & { onChange?: (event: unknown, data: { value: string }) => void }
  type SelectProps = LooseProps & { onChange?: (event: unknown, data: { value: string }) => void }
  type TabListProps = LooseProps & { onTabSelect?: (event: unknown, data: { value: string | number }) => void }
  type DrawerProps = LooseProps & { onOpenChange?: (event: unknown, data: { open: boolean }) => void }

  export const Badge: (props: LooseProps) => any
  export const Button: (props: ButtonProps) => any
  export const Card: (props: LooseProps) => any
  export const CardFooter: (props: LooseProps) => any
  export const CardHeader: (props: LooseProps) => any
  export const Divider: (props: LooseProps) => any
  export const DrawerBody: (props: LooseProps) => any
  export const DrawerHeader: (props: LooseProps) => any
  export const DrawerHeaderTitle: (props: LooseProps) => any
  export const FluentProvider: (props: LooseProps) => any
  export const Input: (props: InputProps) => any
  export const OverlayDrawer: (props: DrawerProps) => any
  export const ProgressBar: (props: LooseProps) => any
  export const Select: (props: SelectProps) => any
  export const Tab: (props: LooseProps) => any
  export const TabList: (props: TabListProps) => any
  export const Text: (props: LooseProps) => any
  export const Tooltip: (props: LooseProps) => any
  export const webDarkTheme: any
  export const webLightTheme: any
}
