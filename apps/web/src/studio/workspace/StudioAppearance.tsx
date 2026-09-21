import type {ReactNode} from 'react';
import {FluentProvider,webLightTheme,webDarkTheme} from '@fluentui/react-components';
import type {StudioUI} from '../../../../../packages/contracts/src/foundation.ts';
import './studio.css';
export function StudioAppearance({ui,children}:{ui?:StudioUI;children:ReactNode}) {
 const theme=ui?.theme??'fluent';
 return <FluentProvider theme={theme==='dark'?webDarkTheme:webLightTheme} className="dp-appearance" data-theme={theme} data-skin={ui?.skin??'studio'}>{children}</FluentProvider>;
}
