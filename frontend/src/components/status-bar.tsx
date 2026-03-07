import { TerminalSquare, ChevronUp } from 'lucide-react'
import { useLogs } from '../context/log-context'
import { useRun } from '../context/run-context'

export function StatusBar() {
	const { lastLog, setIsOpen, isOpen } = useLogs()
	const { isRunning, progress } = useRun()

	const percentage = progress
		? Math.round((progress.step / progress.total) * 100)
		: 0

	return (
		<div className='fixed bottom-0 left-0 right-0 z-40'>
			{isRunning && progress && (
				<div className='h-1 bg-zinc-800'>
					<div
						className='h-full bg-primary transition-all duration-500 ease-out'
						style={{ width: `${percentage}%` }}
					/>
				</div>
			)}
			<div
				onClick={() => setIsOpen(!isOpen)}
				className='h-8 bg-zinc-950 text-white text-xs flex items-center px-4 border-t border-white/10 cursor-pointer hover:bg-zinc-900 transition-colors'
			>
				<TerminalSquare className='w-3 h-3 mr-2 text-primary' />
				<span className='opacity-80 truncate flex-1 font-mono'>
					{isRunning && progress
						? `[${progress.step}/${progress.total}] ${progress.label}`
						: lastLog}
				</span>
				<ChevronUp
					className={`w-3 h-3 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
				/>
			</div>
		</div>
	)
}
