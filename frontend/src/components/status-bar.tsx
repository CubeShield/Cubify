import { useEffect, useState } from 'react'
import { EventsOn, EventsOff } from '../../wailsjs/runtime'
import { TerminalSquare } from 'lucide-react'

export function StatusBar() {
	const [lastLog, setLastLog] = useState<string>('Готов к запуску')
	const [isVisible, setIsVisible] = useState(false)

	useEffect(() => {
		const handler = (message: string) => {
			setLastLog(message)
			setIsVisible(true)
		}

		EventsOn('log:line', handler)

		return () => {
			EventsOff('log:line')
		}
	}, [])

	return (
		<div className='fixed bottom-0 left-0 right-0 h-8 bg-black/80 text-white text-xs flex items-center px-4 border-t border-white/10 truncate font-mono'>
			<TerminalSquare className='w-3 h-3 mr-2 opacity-50' />
			<span className='opacity-80 truncate w-full'>{lastLog}</span>
		</div>
	)
}
