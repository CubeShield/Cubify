import { useState } from 'react'
import { CodeIcon, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { CloneProject } from '../../../wailsjs/go/main/App'

export function EnableEditorButton({
	slug,
	onDone,
}: {
	slug: string
	onDone: () => void
}) {
	const [isCloning, setCloning] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleClone = async () => {
		setCloning(true)
		setError(null)
		try {
			await CloneProject(slug)
			onDone()
		} catch (e) {
			setError(String(e))
		} finally {
			setCloning(false)
		}
	}

	return (
		<div className='flex flex-col items-start gap-3 mb-5 p-4 border rounded-xl bg-linear-to-r from-indigo-500/10 via-purple-500/5 to-transparent'>
			<div className='flex flex-col gap-1'>
				<span className='font-medium flex items-center gap-2'>
					<CodeIcon className='size-4 text-indigo-400' />
					Режим разработки
				</span>
				<span className='text-sm text-muted-foreground'>
					Склонировать репозиторий, чтобы редактировать сборку, используйте это,
					только если у вас есть Git
				</span>
			</div>
			<Button
				onClick={handleClone}
				disabled={isCloning}
				className='cursor-pointer'
			>
				{isCloning ? (
					<Loader2 className='size-3 animate-spin' />
				) : (
					<CodeIcon className='size-4' />
				)}
				{isCloning ? 'Клонирование...' : 'Включить режим разработки'}
			</Button>
			{error && <span className='text-sm text-destructive'>{error}</span>}
		</div>
	)
}
