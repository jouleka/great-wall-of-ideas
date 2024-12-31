import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { Toggle } from './toggle'
import { cn } from '@/lib/utils/utils'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
} from 'lucide-react'
import { Button } from './button'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  maxLength?: number
  className?: string
  error?: boolean
}

const editorStyles = `
  .ProseMirror {
    min-height: 150px;
    padding: 0.5rem;
    outline: none;
  }

  .ProseMirror > * + * {
    margin-top: 0.75em;
  }

  .ProseMirror ul,
  .ProseMirror ol {
    padding: 0 1rem;
  }

  .ProseMirror ul {
    list-style-type: disc;
  }

  .ProseMirror ol {
    list-style-type: decimal;
  }

  .ProseMirror ul[data-type="taskList"] {
    list-style: none;
    padding: 0;
  }

  .ProseMirror blockquote {
    border-left: 3px solid #e5e7eb;
    padding-left: 1rem;
    margin-left: 0;
    margin-right: 0;
    font-style: italic;
  }

  .ProseMirror p.is-editor-empty:first-child::before {
    color: #9ca3af;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
`

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  maxLength = 2000,
  className,
  error
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'list-disc ml-4 space-y-1',
          },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'list-decimal ml-4 space-y-1',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-2 border-l-primary pl-4 italic',
          },
        },
        heading: false,
        codeBlock: false,
      }),
      Link.configure({
        protocols: ['http', 'https'],
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-4 hover:text-primary/80',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      CharacterCount.configure({
        limit: maxLength
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
          error && 'prose-red'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const characterCount = editor.storage.characterCount.characters()
      if (characterCount <= maxLength) {
        onChange(html)
      }
    },
  })

  if (!editor) {
    return null
  }

  const addLink = () => {
    const url = window.prompt('Enter URL')
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run()
    }
  }

  return (
    <div className={cn('rounded-md border bg-transparent', error && 'border-destructive', className)}>
      <style>{editorStyles}</style>
      <div className="flex flex-wrap gap-1 border-b p-1">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Toggle bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Toggle italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Toggle bullet list"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Toggle ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Toggle blockquote"
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        <Button
          variant="ghost"
          size="sm"
          onClick={addLink}
          className={cn('p-2 h-8', editor.isActive('link') && 'bg-muted')}
          aria-label="Add link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <div className="ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 h-8"
            aria-label="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 h-8"
            aria-label="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-3">
        <EditorContent editor={editor} />
      </div>
      {maxLength && (
        <div className="text-xs text-muted-foreground text-right px-3 py-1 border-t">
          {editor.storage.characterCount.characters()}/{maxLength} characters
        </div>
      )}
    </div>
  )
} 