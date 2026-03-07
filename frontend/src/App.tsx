import { useEffect, useState } from 'react'
import { GetLocalInstances, RefreshLocalReleases } from '../wailsjs/go/main/App'
import { instance } from '../wailsjs/go/models'
import { SidebarProvider } from './components/ui/sidebar'
import { AppSidebar } from './components/sidebar'
import { InstanceDetail } from './components/detail'
import { Settings } from './components/settings'
import { User } from './components/user'
import { StatusBar } from './components/status-bar'
import { LogProvider } from './context/log-context'
import { LogViewer } from './components/log-viewer'

type Page = 'detail' | 'settings' | 'account'

function App() {
	const [instances, setInstances] = useState<instance.LocalInstance[]>([])
	const [selectedInstance, setSelectedInstance] =
		useState<instance.LocalInstance | null>(null)

	const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
	const [currentPage, setCurrentPage] = useState<Page>('detail')

	const getInstances = async () => {
		setIsRefreshing(true)
		await RefreshLocalReleases()
		setInstances(await GetLocalInstances())
		setIsRefreshing(false)
	}

	useEffect(() => {
		getInstances()
	}, [])

	return (
		<div id='App'>
			<LogProvider>
				<SidebarProvider>
					<AppSidebar
						instances={instances}
						selectedInstance={selectedInstance}
						onSelect={setSelectedInstance}
						onRefresh={getInstances}
						isRefreshing={isRefreshing}
						currentPage={currentPage}
						setCurrentPage={setCurrentPage}
					/>
					<main className='flex-1 p-6'>
						{currentPage === 'settings' && <Settings />}
						{currentPage === 'account' && (
							<User setCurrentPage={setCurrentPage} />
						)}
						{currentPage === 'detail' &&
							(selectedInstance ? (
								<InstanceDetail instance={selectedInstance} />
							) : (
								<div className='text-muted-foreground flex items-center justify-center h-full'>
									Выберите инстанс в меню слева
								</div>
							))}
					</main>
					<LogViewer />
					<StatusBar />
				</SidebarProvider>
			</LogProvider>
		</div>
	)
}

export default App
