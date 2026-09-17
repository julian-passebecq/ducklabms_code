import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'

export function CodeEditor({ language, value, onChange, onRun }: {
  language: string
  value: string
  onChange: (value: string) => void
  onRun?: () => void
}) {
  const [dark, setDark] = useState(() => document.querySelector('.mosaic-theme')?.classList.contains('dark') ?? false)

  useEffect(() => {
    const root = document.querySelector('.mosaic-theme')
    if (!root) return
    const sync = () => setDark(root.classList.contains('dark'))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(next) => onChange(next ?? '')}
      onMount={(editor, monaco) => {
        if (onRun) editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onRun)
      }}
      theme={dark ? 'vs-dark' : 'vs'}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 20,
        fontFamily: 'Cascadia Code, SFMono-Regular, Consolas, monospace',
        folding: false,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        padding: { top: 10, bottom: 10 },
        overviewRulerBorder: false,
        renderLineHighlight: 'gutter',
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
      }}
    />
  )
}
