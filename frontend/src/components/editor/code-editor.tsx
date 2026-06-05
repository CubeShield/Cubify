import { useEffect, useRef, useState } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

const LANG_EXTS: Record<string, () => any> = {
	json: json,
	yaml: yaml,
	yml: yaml,
	toml: () => [], // no official TOML extension, plain text
}

function detectLang(filename: string): (() => any) | null {
	const ext = filename.split('.').pop()?.toLowerCase() ?? ''
	return LANG_EXTS[ext] ?? null
}

interface CodeEditorProps {
	value: string
	onChange: (v: string) => void
	filename?: string
	collapsible?: boolean
}

export function CodeEditor({
	value,
	onChange,
	filename = '',
	collapsible = true,
}: CodeEditorProps) {
	const editorRef = useRef<HTMLDivElement>(null)
	const viewRef = useRef<EditorView | null>(null)
	const [collapsed, setCollapsed] = useState(false)

	useEffect(() => {
		if (!editorRef.current) return

		const langExt = detectLang(filename)
		const extensions = [
			basicSetup,
			oneDark,
			EditorView.updateListener.of(update => {
				if (update.docChanged) {
					onChange(update.state.doc.toString())
				}
			}),
			EditorView.theme({
				'&': { fontSize: '11px', maxHeight: '320px' },
				'.cm-scroller': { overflow: 'auto', fontFamily: 'monospace' },
			}),
		]

		if (langExt) {
			extensions.push(langExt())
		}

		const state = EditorState.create({
			doc: value,
			extensions,
		})

		const view = new EditorView({
			state,
			parent: editorRef.current,
		})
		viewRef.current = view

		return () => {
			view.destroy()
			viewRef.current = null
		}
	}, [filename]) // reinit only when filename (language) changes

	// Sync external value changes without reinitializing the editor
	useEffect(() => {
		const view = viewRef.current
		if (!view) return
		const current = view.state.doc.toString()
		if (current !== value) {
			view.dispatch({
				changes: { from: 0, to: current.length, insert: value },
			})
		}
	}, [value])

	return (
		<div className='rounded-xl border border-border overflow-hidden'>
			{collapsible && (
				<button
					type='button'
					onClick={() => setCollapsed(c => !c)}
					className='w-full flex items-center justify-between px-3 py-1.5 bg-muted/40 hover:bg-muted/60 transition-colors text-xs text-muted-foreground'
				>
					<span className='font-mono'>{filename || 'Содержимое файла'}</span>
					{collapsed ? (
						<ChevronDownIcon className='size-3.5' />
					) : (
						<ChevronUpIcon className='size-3.5' />
					)}
				</button>
			)}
			{!collapsed && (
				<div ref={editorRef} className='min-h-[80px]' />
			)}
		</div>
	)
}
