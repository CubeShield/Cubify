import { useLogs } from '../context/log-context'
import { XIcon, TrashIcon, CopyIcon, ArrowDownIcon } from 'lucide-react'
import { Button } from './ui/button'
import { useEffect, useRef, useState } from 'react'

export function LogViewer() {
	const { logs, isOpen, setIsOpen, clearLogs } = useLogs()
	const scrollRef = useRef<HTMLDivElement>(null)
	const [snapToBottom, setSnapToBottom] = useState(true)

	const handleScroll = () => {
		const target = scrollRef.current
		if (!target) return

		const difference =
			target.scrollHeight - (target.scrollTop + target.clientHeight)
		const isAtBottom = difference <= 50

		setSnapToBottom(isAtBottom)
	}

	useEffect(() => {
		if (isOpen && snapToBottom && scrollRef.current) {
			setTimeout(() => {
				if (scrollRef.current) {
					scrollRef.current.scrollTo({
						top: scrollRef.current.scrollHeight,
						behavior: 'smooth',
					})
				}
			}, 0)
		}
	}, [logs, isOpen, snapToBottom])

	useEffect(() => {
		if (isOpen && scrollRef.current) {
			setSnapToBottom(true)
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight
		}
	}, [isOpen])

	if (!isOpen) return null

	const copyLogs = () => {
		navigator.clipboard.writeText(logs.join('\n'))
	}

	const scrollToBottom = () => {
		setSnapToBottom(true)
		if (scrollRef.current) {
			scrollRef.current.scrollTo({
				top: scrollRef.current.scrollHeight,
				behavior: 'smooth',
			})
		}
	}

	return (
		<div className='fixed inset-y-0 right-0 w-[600px] bg-background border-l shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300'>
			<div className='flex items-center justify-between p-4 border-b bg-muted/30'>
				<h2 className='font-semibold flex items-center gap-2'>
					Консоль отладки
					{!snapToBottom && (
						<span className='text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20'>
							Автоскролл приостановлен
						</span>
					)}
				</h2>
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

			<div className='relative flex-1 overflow-hidden flex flex-col'>
				<div
					ref={scrollRef}
					onScroll={handleScroll}
					className='flex-1 overflow-auto p-4 font-mono text-xs space-y-0.5 bg-black text-green-400/90'
				>
					{logs.length === 0 && (
						<span className='text-muted-foreground opacity-50 select-none'>
							Логи пусты...
						</span>
					)}
					{logs.map((log, i) => (
						<div
							key={i}
							className='break-words whitespace-pre-wrap border-b border-white/5 pb-0.5 hover:bg-white/5 transition-colors'
						>
							<span className='opacity-30 select-none mr-3 w-8 inline-block text-right'>
								{i + 1}
							</span>
							{log}
						</div>
					))}
				</div>

				{!snapToBottom && (
					<div className='absolute bottom-4 right-4'>
						<Button
							size='sm'
							className='rounded-xl shadow-lg bg-primary text-primary-foreground hover:bg-primary/90'
							onClick={scrollToBottom}
						>
							<ArrowDownIcon className='w-4 h-4' />
							Вниз
						</Button>
					</div>
				)}
			</div>
		</div>
	)
}
