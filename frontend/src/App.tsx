import { useEffect, useState } from 'react'
import { FetchInstances } from '../wailsjs/go/main/App'
import { github } from '../wailsjs/go/models'
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

function App() {
	const [instances, setInstances] = useState<github.Instance[]>([])
	const [selectedInstance, setSelectedInstance] =
		useState<github.Instance | null>(null)
	const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

	const [currentPage, setCurrentPage] = useState<'detail' | 'settings'>(
		'detail',
	)

	const getInstances = async () => {
		setIsRefreshing(true)
		setInstances(await FetchInstances())
		setIsRefreshing(false)
	}
	useEffect(() => {
		getInstances()
	}, [])

	return (
		<div id='App'>
			<SidebarProvider>
				<AppSidebar
					instances={instances}
					selectedInstance={selectedInstance}
					onSelect={setSelectedInstance}
					onRefresh={getInstances}
					isRefreshing={isRefreshing}
				/>
				<main className='flex-1 p-6'>
					{selectedInstance ? (
						<InstanceDetail instance={selectedInstance} />
					) : (
						<div className='text-muted-foreground flex items-center justify-center h-full'>
							Выберите инстанс в меню слева
						</div>
					)}
				</main>
			</SidebarProvider>
		</div>
	)
}

export default App
