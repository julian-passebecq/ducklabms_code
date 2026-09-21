import React from 'react';
import {createRoot} from 'react-dom/client';
import {FluentProvider,webLightTheme} from '@fluentui/react-components';
import App from './App';
import {UiPreview} from './studio/UiPreview';
import './styles.css';
class ErrorBoundary extends React.Component<{children:React.ReactNode},{message:string}>{
 state={message:''};static getDerivedStateFromError(error:Error){return {message:error.message}}
 render(){return this.state.message?<main className="fatal-error"><h1>The workspace could not render</h1><p>{this.state.message}</p><p>Your saved workspace remains on the local backend. Reload to retry.</p><button onClick={()=>location.reload()}>Reload</button></main>:this.props.children}
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><FluentProvider theme={webLightTheme}><ErrorBoundary>{new URLSearchParams(window.location.search).get('preview')==='2'?<UiPreview analytics/>:new URLSearchParams(window.location.search).get('preview')==='1'?<UiPreview/>:<App/>}</ErrorBoundary></FluentProvider></React.StrictMode>);
