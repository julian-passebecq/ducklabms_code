declare module 'react' {
  export function useState<T>(initial:T|(()=>T)):[T,(value:T|((previous:T)=>T))=>void];
  export function useMemo<T>(factory:()=>T,deps:unknown[]):T;
  export function useEffect(effect:()=>void|(()=>void),deps?:unknown[]):void;
  export function useCallback<T extends (...args:any[])=>any>(fn:T,deps:unknown[]):T;
  export function useRef<T>(value:T):{current:T};
  export function useId():string;
  export const Fragment:any;
}
declare module 'react-dom/client' { export const createRoot:any; }
declare module 'react/jsx-runtime' { export const jsx:any; export const jsxs:any; export const Fragment:any; }
declare module '@fluentui/react-components' {
  export const FluentProvider:any; export const webLightTheme:any; export const webDarkTheme:any; export const Button:any; export const Tab:any; export const TabList:any; export const Badge:any; export const Dropdown:any; export const Option:any; export const Tooltip:any; export const Card:any; export const CardHeader:any; export const Text:any; export const Title1:any; export const Title2:any; export const Subtitle1:any; export const Divider:any; export const Input:any; export const Accordion:any; export const AccordionItem:any; export const AccordionHeader:any; export const AccordionPanel:any; export const Menu:any; export const MenuTrigger:any; export const MenuPopover:any; export const MenuList:any; export const MenuItem:any; export const Dialog:any; export const DialogTrigger:any; export const DialogSurface:any; export const DialogBody:any; export const DialogTitle:any; export const DialogContent:any; export const DialogActions:any; export const Switch:any; export const Spinner:any; export const MessageBar:any; export const MessageBarBody:any; export const Select:any;
}
declare namespace JSX { interface IntrinsicElements { [elemName:string]: any; } }
