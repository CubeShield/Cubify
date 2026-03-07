import { SidebarProvider } from './components/ui/sidebar'
import { AppSidebar } from './components/sidebar'
import { InstanceDetail } from './components/detail'
import { Settings } from './components/settings'
import { User } from './components/user'
import { StatusBar } from './components/status-bar'
import { LogProvider } from './context/log-context'
import { LogViewer } from './components/log-viewer'
import { AppProvider, useApp } from './context/app-context'
import { RunProvider } from './context/run-context'

function MainContent() {
	const {
		currentPage,
		selectedInstance,
		devMode,
		selectInstance,
		refreshInstances,
	} = useApp()

	return (
		<main className='flex-1 p-6'>
			{currentPage === 'settings' && <Settings />}
			{currentPage === 'account' && <User />}
			{currentPage === 'detail' &&
				(selectedInstance ? (
					<InstanceDetail
						instance={selectedInstance}
						devMode={devMode}
						onDeleted={() => {
							selectInstance(null)
							refreshInstances()
						}}
					/>
				) : (
					<div className='text-muted-foreground flex items-center justify-center h-full'>
						Выберите инстанс в меню слева
					</div>
				))}
		</main>
	)
}

function App() {
	return (
		<div id='App'>
			<LogProvider>
				<AppProvider>
					<RunProvider>
						<SidebarProvider>
							<AppSidebar />
							<MainContent />
							<LogViewer />
							<StatusBar />
						</SidebarProvider>
					</RunProvider>
				</AppProvider>
			</LogProvider>
		</div>
	)
}

export default App
