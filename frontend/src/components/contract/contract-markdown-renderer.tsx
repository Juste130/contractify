"use client"

/**
 * ContractMarkdownRenderer
 * Renders AI-generated Markdown contract content with proper legal document styling.
 * Handles: headings, bold/italic, lists, horizontal rules, paragraphs.
 */
export function ContractMarkdownRenderer({ content }: { content: string }) {
  if (!content) {
    return (
      <p className="text-muted-foreground italic text-sm">
        Chargement du contenu...
      </p>
    )
  }

  // Parse markdown to React elements without external lib to avoid SSR issues
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // H1
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-2xl font-bold text-gray-900 mt-10 mb-4 pb-3 border-b-2 border-gray-200 uppercase tracking-wide text-center">
          {formatInline(line.slice(2).trim())}
        </h1>
      )
    }
    // H2
    else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-gray-800 mt-8 mb-3 pb-1 border-b border-gray-200 uppercase tracking-wide">
          {formatInline(line.slice(3).trim())}
        </h2>
      )
    }
    // H3
    else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base font-semibold text-gray-700 mt-6 mb-2">
          {formatInline(line.slice(4).trim())}
        </h3>
      )
    }
    // Horizontal rule
    else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-gray-200 my-6" />)
    }
    // Unordered list item
    else if (/^[-*•]\s/.test(line)) {
      const listItems: React.ReactNode[] = []
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        listItems.push(
          <li key={i} className="text-gray-700 leading-relaxed">
            {formatInline(lines[i].replace(/^[-*•]\s/, '').trim())}
          </li>
        )
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-3 pl-4">
          {listItems}
        </ul>
      )
      continue
    }
    // Ordered list item
    else if (/^\d+\.\s/.test(line)) {
      const listItems: React.ReactNode[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(
          <li key={i} className="text-gray-700 leading-relaxed">
            {formatInline(lines[i].replace(/^\d+\.\s/, '').trim())}
          </li>
        )
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-3 pl-4">
          {listItems}
        </ol>
      )
      continue
    }
    // Blockquote
    else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-gray-300 pl-4 py-1 my-3 text-gray-600 italic bg-gray-50 rounded-r">
          {formatInline(line.slice(2).trim())}
        </blockquote>
      )
    }
    // Empty line - spacing
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={i} className="text-gray-800 leading-relaxed text-justify my-1">
          {formatInline(line)}
        </p>
      )
    }

    i++
  }

  return (
    <div className="contract-content font-serif text-[15px]">
      {elements}
    </div>
  )
}

/**
 * Format inline markdown: **bold**, *italic*, `code`, __bold__
 */
function formatInline(text: string): React.ReactNode {
  if (!text) return null

  const parts: React.ReactNode[] = []
  // Regex to find **bold**, *italic*, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|__[^_]+__)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const raw = match[0]
    if (raw.startsWith('**') || raw.startsWith('__')) {
      // Bold
      parts.push(
        <strong key={match.index} className="font-bold text-gray-900">
          {raw.slice(2, -2)}
        </strong>
      )
    } else if (raw.startsWith('*')) {
      // Italic
      parts.push(
        <em key={match.index} className="italic">
          {raw.slice(1, -1)}
        </em>
      )
    } else if (raw.startsWith('`')) {
      // Code
      parts.push(
        <code key={match.index} className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">
          {raw.slice(1, -1)}
        </code>
      )
    }

    lastIndex = match.index + raw.length
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length === 1 ? parts[0] : parts
}
