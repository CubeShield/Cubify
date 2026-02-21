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

const CONTAINERS = {
	mods: 'Моды',
	resourcepacks: 'Ресурспаки',
}

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
				<main className='flex-1 p-6'>
					{selectedInstance ? (
						<div>
							<h2 className='text-3xl font-bold'>
								{selectedInstance.releases[0].Meta.name}
							</h2>
							<h3 className='text-l font-medium text-zinc-400'>
								{selectedInstance.releases[0].Meta.description}
							</h3>
							<div className='flex gap-2 mt-2'>
								{selectedInstance.releases[0].Meta.containers.map(container => (
									<div className='flex items-center gap-1 p-2 border rounded-xl'>
										<BoxIcon className='size-4' />
										{CONTAINERS[container.content_type]}
										<Badge className=''>{container.content.length}</Badge>
									</div>
								))}
							</div>
							<div className='flex flex-col gap-3 mt-4'>
								{selectedInstance.releases.map((release, index) => {
									return (
										<div className='border rounded-2xl p-3 flex flex-col gap-2'>
											<div className='flex flex-col gap-1'>
												<h1 className='font-semibold text-2xl'>
													Обновление {release.name}
												</h1>
												<Badge>
													{dayjs(release.created_at).format('D MMMM HH:MM')}
												</Badge>
											</div>
											<span>{release.body}</span>
										</div>
									)
								})}
							</div>
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
