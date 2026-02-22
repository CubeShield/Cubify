import { useLogs } from '../context/log-context'
import { XIcon, TrashIcon, CopyIcon } from 'lucide-react'
import { Button } from './ui/button'
import { useEffect, useRef } from 'react'

export function LogViewer() {
	const { logs, isOpen, setIsOpen, clearLogs } = useLogs()
	const endRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isOpen && endRef.current) {
			endRef.current.scrollIntoView({ behavior: 'smooth' })
		}
	}, [logs, isOpen])

	if (!isOpen) return null

	const copyLogs = () => {
		navigator.clipboard.writeText(logs.join('\n'))
	}

	return (
		<div className='fixed inset-y-0 w-[600px] right-0 bg-background border-l shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300'>
			<div className='flex items-center justify-between p-4 border-b bg-muted/30'>
				<h2 className='font-semibold'>Консоль отладки</h2>
				<div className='flex gap-2'>
					<Button
						variant='ghost'
						size='icon'
						onClick={copyLogs}
						title='Копировать'
					>
						<CopyIcon className='h-4 w-4' />
					</Button>
					<Button
						variant='ghost'
						size='icon'
						onClick={clearLogs}
						title='Очистить'
					>
						<TrashIcon className='h-4 w-4' />
					</Button>
					<Button variant='ghost' size='icon' onClick={() => setIsOpen(false)}>
						<XIcon className='h-4 w-4' />
					</Button>
				</div>
			</div>

			<div className='flex-1 overflow-auto p-4 font-mono text-xs space-y-1 bg-black text-green-400'>
				{logs.length === 0 && (
					<span className='text-muted-foreground opacity-50'>
						Логи пусты...
					</span>
				)}
				{logs.map((log, i) => (
					<div
						key={i}
						className='break-words whitespace-pre-wrap border-b border-white/5 pb-0.5'
					>
						<span className='opacity-50 select-none mr-2'>[{i + 1}]</span>
						{log}
					</div>
				))}
				<div ref={endRef} />
			</div>
		</div>
	)
}
