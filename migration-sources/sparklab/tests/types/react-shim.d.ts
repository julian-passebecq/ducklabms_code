declare namespace JSX {
  interface IntrinsicElements { [elemName: string]: any }
}

declare module 'react' {
  export type ChangeEvent<T = Element> = { target: T }
  export type SetStateAction<S> = S | ((prev: S) => S)
  export type Dispatch<A> = (value: A) => void
  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>]
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void
  export function useRef<T>(initialValue: T): { current: T }
  export const StrictMode: any
}

declare module 'react/jsx-runtime' {
  export const Fragment: any
  export function jsx(type: any, props: any, key?: any): any
  export function jsxs(type: any, props: any, key?: any): any
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): { render(node: any): void }
}
