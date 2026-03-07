import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	ReactNode,
} from 'react'
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime'
import { Run, CancelRun } from '../../wailsjs/go/main/App'
import { instance } from '../../wailsjs/go/models'

export interface RunProgress {
	step: number
	total: number
	label: string
}

interface RunContextType {
	isRunning: boolean
	progress: RunProgress | null
	startRun: (release: instance.Release) => Promise<void>
	cancelRun: () => void
}

const RunContext = createContext<RunContextType | null>(null)

export function useRun() {
	const ctx = useContext(RunContext)
	if (!ctx) throw new Error('useRun must be used within RunProvider')
	return ctx
}

export function RunProvider({ children }: { children: ReactNode }) {
	const [isRunning, setIsRunning] = useState(false)
	const [progress, setProgress] = useState<RunProgress | null>(null)

	useEffect(() => {
		const onProgress = (data: RunProgress) => {
			setProgress(data)
		}
		const onDone = () => {
			setIsRunning(false)
			setProgress(null)
		}
		const onError = () => {
			setIsRunning(false)
			setProgress(null)
		}
		const onCancelled = () => {
			setIsRunning(false)
			setProgress(null)
		}

		EventsOn('run:progress', onProgress)
		EventsOn('run:done', onDone)
		EventsOn('run:error', onError)
		EventsOn('run:cancelled', onCancelled)

		return () => {
			EventsOff('run:progress')
			EventsOff('run:done')
			EventsOff('run:error')
			EventsOff('run:cancelled')
		}
	}, [])

	const startRun = useCallback(async (release: instance.Release) => {
		setIsRunning(true)
		setProgress({ step: 0, total: 4, label: 'Запуск...' })
		await Run(release)
	}, [])

	const cancelRun = useCallback(() => {
		CancelRun()
	}, [])

	return (
		<RunContext.Provider value={{ isRunning, progress, startRun, cancelRun }}>
			{children}
		</RunContext.Provider>
	)
}
