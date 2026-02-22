import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from '@/components/ui/sidebar'
import { Badge } from './ui/badge'
import {
	BoxesIcon,
	PencilIcon,
	PlayIcon,
	PlusIcon,
	RefreshCwIcon,
	Settings2Icon,
} from 'lucide-react'
import { config as ConfigData, github } from 'wailsjs/go/models'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { GetConfig, Run } from 'wailsjs/go/main/App'
import fabric from '../assets/images/fabric.png'
import forge from '../assets/images/forge.png'

function capitalizeFirstLetter(val: string): string {
	return String(val).charAt(0).toUpperCase() + String(val).slice(1)
}

interface AppSidebarProps {
	instances: github.Instance[]
	selectedInstance: github.Instance | null
	onSelect: (instance: github.Instance) => void
	onRefresh?: () => void
	isRefreshing: boolean
	currentPage: 'detail' | 'settings' | 'account'
	setCurrentPage: (page: 'detail' | 'settings' | 'account') => void
}

interface InstanceCardProps {
	instance: github.Instance
	isSelected: boolean
	onClick: () => void
}

const LOADERS = {
	fabric: fabric,
	forge: forge,
}

function InstanceCard({ instance, isSelected, onClick }: InstanceCardProps) {
	return (
		<div onClick={onClick} className='cursor-pointer'>
			<div
				className={
					'flex px-3 items-center gap-2 py-3 bg-linear-to-r hover:from-accent/50 hover:to-accent/0 transition-all ' +
					(isSelected ? 'bg-linear-to-r from-accent to-accent/0' : '')
				}
			>
				<img
					src={instance.releases[0].Meta.image_url}
					className='size-16 rounded-2xl'
				/>
				<div className='flex flex-col gap-1'>
					<div className='flex items-center gap-1'>
						<div className='size-2 bg-lime-300 rounded-4xl'></div>
						<h1 className='font-bold text-l'>
							{instance.releases[0].Meta.name}
						</h1>
					</div>
					<div className='flex items-center gap-2'>
						<Badge>{instance.releases[0].name}</Badge>
						<div className='flex items-center gap-1'>
							<img
								src={
									LOADERS[
										instance.releases[0].Meta.loader as keyof typeof LOADERS
									]
								}
								className='size-4 object-contain'
							></img>
							<span className='text-zinc-400 font-medium text-[15px]'>
								{instance.releases[0].Meta.minecraft_version}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export function AppSidebar({
	instances,
	selectedInstance,
	onSelect,
	onRefresh,
	isRefreshing,
	currentPage,
	setCurrentPage,
}: AppSidebarProps) {
	const [currentUser, setCurrentUser] = useState<ConfigData.User | null>(null)
	const [isRunning, setRunning] = useState<boolean>(false)

	const fetchUser = async () => {
		const config = await GetConfig()
		setCurrentUser(config.user)
	}

	const run = async () => {
		setRunning(true)
		if (!selectedInstance || selectedInstance.releases.length < 1) {
			setRunning(false)
			return
		}
		await Run(selectedInstance?.releases[0])
		setRunning(false)
	}

	useEffect(() => {
		fetchUser()
	}, [])

	return (
		<Sidebar variant='floating' className='h-22/23'>
			<SidebarHeader>
				<div className='flex items-center justify-center gap-2'>
					<div className='flex border min-h-10 min-w-10 size-10 rounded-xl items-center justify-center'>
						<BoxesIcon />
					</div>

					<h1 className='font-bold'>Доступные сборки</h1>
				</div>
			</SidebarHeader>
			<SidebarContent className='flex gap-0'>
				{instances.map((instance, index) => {
					return (
						<InstanceCard
							key={index}
							instance={instance}
							isSelected={selectedInstance === instance}
							onClick={() => {
								setCurrentPage('detail')
								onSelect(instance)
							}}
						/>
					)
				})}
			</SidebarContent>
			<SidebarFooter>
				<div className='flex items-center justify-between'>
					{currentUser == null ? (
						<div className='flex items-center gap-2'>
							<Button
								size='icon'
								className='rounded-xl cursor-pointer'
								variant='outline'
								onClick={() => {
									setCurrentPage('account')
								}}
							>
								<PlusIcon className='stroke-zinc-500' />
							</Button>
							<div className='flex flex-col justify-center'>
								<h4 className='text-sm font-medium text-zinc-500'>
									Настройте аккаунт, чтобы играть...
								</h4>
							</div>
						</div>
					) : (
						<>
							<div className='flex items-center gap-2'>
								<img
									src={`https://minotar.net/helm/${currentUser.username}/512.png`}
									className='size-8 aspect-square rounded-lg'
								></img>
								<div className='flex flex-col justify-center'>
									<h4 className='text-md font-bold'>{currentUser.username}</h4>
									<span className='text-xs font-medium text-primary'>
										{currentUser.auth_type == 'offline'
											? 'Неоффициальный Аккаунт'
											: 'Microsoft Аккаунт'}
									</span>
								</div>
							</div>
							<Button
								size='icon'
								className='rounded-xl cursor-pointer'
								onClick={() => {
									setCurrentPage('account')
								}}
							>
								<PencilIcon />
							</Button>
						</>
					)}
				</div>
				<Button
					className='cursor-pointer'
					onClick={run}
					disabled={isRunning || !selectedInstance || !currentUser}
				>
					<PlayIcon /> Играть
				</Button>
				{currentPage === 'detail' && (
					<Button
						className='cursor-pointer'
						onClick={() => {
							setCurrentPage('settings')
						}}
						disabled={isRunning}
					>
						<Settings2Icon /> Настройки
					</Button>
				)}
				<Button
					className='cursor-pointer'
					onClick={onRefresh}
					disabled={isRefreshing || isRunning}
				>
					<RefreshCwIcon /> Обновить список
				</Button>
			</SidebarFooter>
		</Sidebar>
	)
}
