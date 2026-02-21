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

function App() {
	const [instances, setInstances] = useState<github.Instance[]>([])
	const [selectedInstance, setSelectedInstance] =
		useState<github.Instance | null>(null)

	const getInstances = async () => {
		setInstances(await FetchInstances())
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
				/>
				<main className='flex-1 p-8'>
					{selectedInstance ? (
						<div>
							<h2 className='text-3xl font-bold mb-4'>
								{selectedInstance.releases[0].Meta.name}
							</h2>
							{selectedInstance.releases.map((release, index) => {
								const date = Date.parse(release.created_at)
								return (
									<div className='border rounded-2xl p-3 flex flex-col gap-1'>
										<h1 className='font-semibold text-2xl'>
											Обновление {release.name}
										</h1>
										<Badge>{dayjs(release.created_at).format('D MMMM')}</Badge>
									</div>
								)
							})}
						</div>
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
