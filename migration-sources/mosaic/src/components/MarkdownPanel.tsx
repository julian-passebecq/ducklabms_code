import { useMemo, useRef, useState } from 'react'
import { Button, Caption1, Text, Textarea } from '@fluentui/react-components'
import { ArrowResetRegular } from '@fluentui/react-icons'
import { usePersistentState } from '../hooks/usePersistentState'

const starter = `# Analysis notes

Use this block for hypotheses, assumptions and conclusions.

- Data source:
- Grain:
- Quality checks:
- Follow-up:
`

type MarkdownChunk =
  | { kind: 'code'; language?: string; text: string }
  | { kind: 'line'; text: string }

function chunks(value: string): MarkdownChunk[] {
  const lines = value.split('\n')
  const result: MarkdownChunk[] = []
  let inCode = false
  let language = ''
  let buffer: string[] = []
  for (const line of lines) {
    const fence = line.match(/^```\s*([^\s]*)/)
    if (fence) {
      if (!inCode) {
        inCode = true
        language = fence[1] ?? ''
        buffer = []
      } else {
        result.push({ kind: 'code', language, text: buffer.join('\n') })
        inCode = false
        language = ''
        buffer = []
      }
      continue
    }
    if (inCode) buffer.push(line)
    else result.push({ kind: 'line', text: line })
  }
  if (inCode) result.push({ kind: 'code', language, text: buffer.join('\n') })
  return result
}

function inlineText(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean)
  return parts.map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      const href = link[2].trim()
      const safe = /^(https?:|mailto:|#)/i.test(href)
      return safe
        ? <a key={index} className="markdown-link" href={href} target={href.startsWith('#') ? undefined : '_blank'} rel="noreferrer">{link[1]}</a>
        : <span key={index}>{link[1]}</span>
    }
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="markdown-inline-code">{part.slice(1, -1)}</code>
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    return <span key={index}>{part}</span>
  })
}

function renderLine(line: string, index: number) {
  const trimmed = line.trim()
  const image = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
  if (image) return <img key={index} className="markdown-image" src={image[2]} alt={image[1]} />
  if (trimmed.startsWith('### ')) return <Text key={index} size={300} weight="semibold">{inlineText(trimmed.slice(4))}</Text>
  if (trimmed.startsWith('## ')) return <Text key={index} size={400} weight="semibold">{inlineText(trimmed.slice(3))}</Text>
  if (trimmed.startsWith('# ')) return <Text key={index} size={500} weight="semibold">{inlineText(trimmed.slice(2))}</Text>
  if (trimmed.startsWith('> ')) return <blockquote className="markdown-quote" key={index}>{inlineText(trimmed.slice(2))}</blockquote>
  if (trimmed.startsWith('- ')) return <div className="markdown-bullet" key={index}><span>•</span><Text size={200}>{inlineText(trimmed.slice(2))}</Text></div>
  const ordered = trimmed.match(/^(\d+)\.\s+(.+)$/)
  if (ordered) return <div className="markdown-bullet" key={index}><span>{ordered[1]}.</span><Text size={200}>{inlineText(ordered[2])}</Text></div>
  if (!trimmed) return <div className="markdown-spacer" key={index} />
  return <Text key={index} size={200}>{inlineText(line)}</Text>
}

export function MarkdownPanel({ panelId, imported = false, readOnly = false }: { panelId: string; imported?: boolean; readOnly?: boolean }) {
  const [value, setValue] = usePersistentState(`mosaic:v2:markdown:${panelId}`, starter)
  const importedSource = useRef(value)
  const [mode, setMode] = useState<'edit' | 'preview'>(readOnly ? 'preview' : 'edit')
  const parsed = useMemo(() => chunks(value), [value])

  return (
    <div className="markdown-panel">
      <div className="markdown-toolbar">
        {!readOnly && <Button size="small" appearance={mode === 'edit' ? 'primary' : 'subtle'} onClick={() => setMode('edit')}>Edit</Button>}
        <Button size="small" appearance={mode === 'preview' ? 'primary' : 'subtle'} onClick={() => setMode('preview')}>Preview</Button>
        <div className="toolbar-spacer" />
        {imported && !readOnly && <Button size="small" appearance="subtle" icon={<ArrowResetRegular />} onClick={() => setValue(importedSource.current)}>Restore</Button>}
        <Caption1>{readOnly ? 'Read-only imported code' : imported ? 'Imported Markdown' : 'Persistent notes'}</Caption1>
      </div>
      {mode === 'edit' && !readOnly ? (
        <Textarea className="markdown-textarea" resize="none" value={value} onChange={(_, data) => setValue(data.value)} />
      ) : (
        <div className="markdown-preview">
          {parsed.map((chunk, index) => chunk.kind === 'code'
            ? <pre key={index} className="markdown-code-block"><code>{chunk.text}</code></pre>
            : renderLine(chunk.text, index))}
        </div>
      )}
    </div>
  )
}
