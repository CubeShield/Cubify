import { useEffect, useState, useCallback } from 'react'
import { HasEditor, LoadProjectMeta } from '../../wailsjs/go/main/App'
import { instance } from '../../wailsjs/go/models'

interface EditorData {
	hasEditor: boolean
	editorMeta: instance.Meta | null
	reload: () => Promise<void>
}

export function useEditorData(slug: string | undefined): EditorData {
	const [hasEditor, setHasEditor] = useState(false)
	const [editorMeta, setEditorMeta] = useState<instance.Meta | null>(null)

	const reload = useCallback(async () => {
		if (!slug) {
			setHasEditor(false)
			setEditorMeta(null)
			return
		}
		try {
			const has = await HasEditor(slug)
			setHasEditor(has)
			if (has) {
				const m = await LoadProjectMeta(slug)
				setEditorMeta(m)
			} else {
				setEditorMeta(null)
			}
		} catch {
			setHasEditor(false)
			setEditorMeta(null)
		}
	}, [slug])

	useEffect(() => {
		reload()
	}, [reload])

	return { hasEditor, editorMeta, reload }
}
