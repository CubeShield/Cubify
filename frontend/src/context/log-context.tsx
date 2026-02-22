import {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from 'react'
import { EventsOn, EventsOff } from '../../wailsjs/runtime'

interface LogContextType {
	logs: string[]
	lastLog: string
	isOpen: boolean
	setIsOpen: (v: boolean) => void
	clearLogs: () => void
}

const LogContext = createContext<LogContextType>({
	logs: [],
	lastLog: '',
	isOpen: false,
	setIsOpen: () => {},
	clearLogs: () => {},
})

export const useLogs = () => useContext(LogContext)

export function LogProvider({ children }: { children: ReactNode }) {
	const [logs, setLogs] = useState<string[]>([])
	const [lastLog, setLastLog] = useState<string>('Готов к запуску')
	const [isOpen, setIsOpen] = useState(false)

	useEffect(() => {
		const handler = (message: string) => {
			setLogs(prev => {
				const newLogs = [...prev, message]
				if (newLogs.length > 5000) return newLogs.slice(-5000)
				return newLogs
			})
			setLastLog(message)
		}

		EventsOn('log:line', handler)

		return () => {
			EventsOff('log:line')
		}
	}, [])

	const clearLogs = () => {
		setLogs([])
		setLastLog('Логи очищены')
	}

	return (
		<LogContext.Provider
			value={{ logs, lastLog, isOpen, setIsOpen, clearLogs }}
		>
			{children}
		</LogContext.Provider>
	)
}
