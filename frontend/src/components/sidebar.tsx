import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from '@/components/ui/sidebar'
import { Badge } from './ui/badge'
import {
	BoxesIcon,
	CodeIcon,
	DownloadCloudIcon,
	DownloadIcon,
	HammerIcon,
	LucideIcon,
	PencilIcon,
	PlayIcon,
	PlusIcon,
	RefreshCwIcon,
	SeparatorHorizontal,
	Settings2Icon,
} from 'lucide-react'
import { config as ConfigData, instance } from 'wailsjs/go/models'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { GetConfig, HasEditor, LoadProjectMeta, Run } from 'wailsjs/go/main/App'
import fabric from '../assets/images/fabric.png'
import forge from '../assets/images/forge.png'
import { CreateProjectModal } from './create-modal-project'

function capitalizeFirstLetter(val: string): string {
	return String(val).charAt(0).toUpperCase() + String(val).slice(1)
}

interface AppSidebarProps {
	instances: instance.LocalInstance[]
	selectedInstance: instance.LocalInstance | null
	onSelect: (instance: instance.LocalInstance) => void
	onRefresh?: () => void
	isRefreshing: boolean
	currentPage: 'detail' | 'settings' | 'account'
	setCurrentPage: (page: 'detail' | 'settings' | 'account') => void
}

interface InstanceCardProps {
	instance: instance.LocalInstance
	isSelected: boolean
	onClick: () => void
}

const LOADERS = {
	fabric: fabric,
	forge: forge,
}

type Status = 'not_installed' | 'update' | 'ready'

const COLORS = {
	not_installed: 'bg-zinc-500',
	update: 'bg-orange-400',
	ready: 'bg-primary',
}

const ICONS = {
	not_installed: DownloadCloudIcon,
	update: DownloadIcon,
	ready: PlayIcon,
}

const MicroBagde = ({ icon: Icon }: { icon: LucideIcon }) => (
	<div className='bg-accent p-1 rounded-2xl'>
		<Icon className='size-3' />
	</div>
)

function InstanceCard({ instance, isSelected, onClick }: InstanceCardProps) {
	const status: Status = !instance.release
		? 'not_installed'
		: instance.release &&
			  instance.release?.tag_name != instance.releases[0].tag_name
			? 'update'
			: 'ready'

	const color = COLORS[status]
	const [editor, setEditor] = useState<boolean>(false)

	const fetch = async () => {
		setEditor(await HasEditor(instance.slug))
	}

	useEffect(() => {
		fetch()
	}, [])

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
						<h1 className='font-bold text-l'>
							{instance.releases[0].Meta.name}
						</h1>
					</div>
					<div className='flex items-center gap-2'>
						<div className='flex items-center gap-1'>
							{editor && <MicroBagde icon={CodeIcon} />}
							<MicroBagde icon={ICONS[status]} />
							<Badge className={`${color}`}>{instance.releases[0].name}</Badge>
						</div>
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
	const [hasEditor, setHasEditor] = useState(false)
	const [devMeta, setDevMeta] = useState<instance.Meta | null>(null)

	const fetchUser = async () => {
		const config = await GetConfig()
		setCurrentUser(config.user)
	}

	const checkEditor = async () => {
		if (!selectedInstance) {
			setHasEditor(false)
			setDevMeta(null)
			return
		}
		try {
			const has = await HasEditor(selectedInstance.slug)
			setHasEditor(has)
			if (has) {
				const m = await LoadProjectMeta(selectedInstance.slug)
				setDevMeta(m)
			} else {
				setDevMeta(null)
			}
		} catch {
			setHasEditor(false)
			setDevMeta(null)
		}
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

	const runDev = async () => {
		if (!selectedInstance || !devMeta) return
		setRunning(true)
		const devRelease = new instance.Release({
			tag_name: 'dev',
			name: 'dev',
			body: '',
			Meta: devMeta,
		})
		await Run(devRelease)
		setRunning(false)
	}

	useEffect(() => {
		fetchUser()
	}, [])

	useEffect(() => {
		checkEditor()
	}, [selectedInstance])

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
				<div className='flex gap-2'>
					<Button
						className='cursor-pointer flex-1'
						onClick={run}
						disabled={isRunning || !selectedInstance || !currentUser}
					>
						<PlayIcon /> Играть
					</Button>
					{hasEditor && devMeta && (
						<Button
							className='cursor-pointer'
							variant='outline'
							onClick={runDev}
							disabled={isRunning || !currentUser}
						>
							<HammerIcon /> Dev
						</Button>
					)}
				</div>
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
				<CreateProjectModal />
			</SidebarFooter>
		</Sidebar>
	)
}
