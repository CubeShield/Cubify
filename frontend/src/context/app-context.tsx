import {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
	ReactNode,
} from 'react'
import {
	GetConfig,
	GetLocalInstances,
	RefreshLocalReleases,
	SaveConfig,
} from '../../wailsjs/go/main/App'
import { config as ConfigData, instance } from '../../wailsjs/go/models'

export type Page = 'detail' | 'settings' | 'account'

interface AppContextType {
	instances: instance.LocalInstance[]
	selectedInstance: instance.LocalInstance | null
	selectInstance: (inst: instance.LocalInstance | null) => void

	currentPage: Page
	setCurrentPage: (page: Page) => void

	devMode: boolean
	setDevMode: (v: boolean) => void

	isRefreshing: boolean
	refreshInstances: () => Promise<void>

	config: ConfigData.Config | null
	currentUser: ConfigData.User | null
	reloadConfig: () => Promise<void>
	saveConfig: (cfg: ConfigData.Config) => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function useApp() {
	const ctx = useContext(AppContext)
	if (!ctx) throw new Error('useApp must be used within AppProvider')
	return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
	const [instances, setInstances] = useState<instance.LocalInstance[]>([])
	const [selectedInstance, setSelectedInstance] =
		useState<instance.LocalInstance | null>(null)
	const [currentPage, setCurrentPage] = useState<Page>('detail')
	const [devMode, setDevMode] = useState(false)
	const [isRefreshing, setIsRefreshing] = useState(false)
	const [config, setConfig] = useState<ConfigData.Config | null>(null)

	const reloadConfig = useCallback(async () => {
		const cfg = await GetConfig()
		setConfig(cfg)
		setDevMode(cfg.dev_mode ?? false)
	}, [])

	const saveConfig = useCallback(async (cfg: ConfigData.Config) => {
		await SaveConfig(cfg)
		setConfig(cfg)
	}, [])

	const refreshInstances = useCallback(async () => {
		setIsRefreshing(true)
		try {
			await RefreshLocalReleases()
			setInstances(await GetLocalInstances())
		} finally {
			setIsRefreshing(false)
		}
	}, [])

	const selectInstance = useCallback((inst: instance.LocalInstance | null) => {
		setSelectedInstance(inst)
		if (inst) setCurrentPage('detail')
	}, [])

	useEffect(() => {
		refreshInstances()
		reloadConfig()
	}, [])

	const currentUser = config?.user ?? null

	return (
		<AppContext.Provider
			value={{
				instances,
				selectedInstance,
				selectInstance,
				currentPage,
				setCurrentPage,
				devMode,
				setDevMode,
				isRefreshing,
				refreshInstances,
				config,
				currentUser,
				reloadConfig,
				saveConfig,
			}}
		>
			{children}
		</AppContext.Provider>
	)
}
