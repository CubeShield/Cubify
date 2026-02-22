import { useEffect, useState } from 'react'
import { FetchInstances, FetchLocalProjects } from '../wailsjs/go/main/App'
import { editor, github } from '../wailsjs/go/models'
import { Button } from './components/ui/button'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarProvider,
	SidebarTrigger,
} from './components/ui/sidebar'
import { AppSidebar } from './components/sidebar'
import { Badge } from './components/ui/badge'
import dayjs from 'dayjs'
import { BoxIcon } from 'lucide-react'
import { InstanceDetail } from './components/detail'
import { Settings } from './components/settings'
import { User } from './components/user'
import { StatusBar } from './components/status-bar'
import { LogProvider } from './context/log-context'
import { LogViewer } from './components/log-viewer'
import { CreateProjectModal } from './components/create-modal-project'
import { EditorPage } from './components/editor/editor-page'

function App() {
	const [instances, setInstances] = useState<github.Instance[]>([])
	const [selectedInstance, setSelectedInstance] =
		useState<github.Instance | null>(null)

	const [localProjects, setLocalProjects] = useState<editor.Project[]>([])
	const [selectedProject, setSelectedProject] = useState<editor.Project | null>(
		null,
	)

	const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

	const [currentPage, setCurrentPage] = useState<
		'detail' | 'settings' | 'account' | 'editor'
	>('editor')

	const getInstances = async () => {
		setIsRefreshing(true)
		setInstances(await FetchInstances())
		setIsRefreshing(false)
	}

	const getProjects = async () => {
		setIsRefreshing(true)
		setLocalProjects(await FetchLocalProjects())
		setIsRefreshing(false)
	}

	useEffect(() => {
		getInstances()
		getProjects()
	}, [])

	return (
		<div id='App'>
			<LogProvider>
				<SidebarProvider>
					<AppSidebar
						instances={instances}
						selectedInstance={selectedInstance}
						onSelect={setSelectedInstance}
						onRefresh={() => {
							getInstances()
							getProjects()
						}}
						isRefreshing={isRefreshing}
						currentPage={currentPage}
						setCurrentPage={setCurrentPage}
						localProjects={localProjects}
						selectedProject={selectedProject}
						onSelectProject={setSelectedProject}
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
						{currentPage === 'editor' && selectedProject && (
							<EditorPage project={selectedProject} onRefresh={() => {}} />
						)}
					</main>
					<LogViewer />
					<StatusBar />
				</SidebarProvider>
			</LogProvider>
		</div>
	)
}

export default App
