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
	Settings2Icon,
	XIcon,
	LoaderIcon,
} from 'lucide-react'
import { instance } from 'wailsjs/go/models'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { HasEditor } from 'wailsjs/go/main/App'
import fabric from '../assets/images/fabric.png'
import forge from '../assets/images/forge.png'
import { CreateProjectModal } from './create-modal-project'
import { MarketplaceModal } from './marketplace'
import { useApp } from '../context/app-context'
import { useEditorData } from '../hooks/use-editor-data'
import { useRun } from '../context/run-context'

const LOADERS: Record<string, string> = { fabric, forge }

type Status = 'not_installed' | 'update' | 'ready'

const STATUS_COLORS: Record<Status, string> = {
	not_installed: 'bg-zinc-500',
	update: 'bg-orange-400',
	ready: 'bg-primary',
}

const STATUS_ICONS: Record<Status, LucideIcon> = {
	not_installed: DownloadCloudIcon,
	update: DownloadIcon,
	ready: PlayIcon,
}

const STATUS_LABELS: Record<Status, string> = {
	not_installed: 'Установить',
	update: 'Обновить',
	ready: 'Играть',
}

function getInstanceStatus(inst: instance.LocalInstance): Status {
	if (!inst.release) return 'not_installed'
	if (inst.release.tag_name !== inst.releases[0].tag_name) return 'update'
	return 'ready'
}

const MicroBadge = ({ icon: Icon }: { icon: LucideIcon }) => (
	<div className='bg-accent p-1 rounded-2xl'>
		<Icon className='size-3' />
	</div>
)

function InstanceCard({
	instance: inst,
	isSelected,
	onClick,
}: {
	instance: instance.LocalInstance
	isSelected: boolean
	onClick: () => void
}) {
	const status = getInstanceStatus(inst)
	const [hasEditorIcon, setHasEditorIcon] = useState(false)
	const latest = inst.releases[0]

	useEffect(() => {
		HasEditor(inst.slug).then(setHasEditorIcon)
	}, [inst.slug])

	return (
		<div onClick={onClick} className='cursor-pointer'>
			<div
				className={
					'flex px-3 items-center gap-2 py-3 bg-linear-to-r hover:from-accent/50 hover:to-accent/0 transition-all ' +
					(isSelected ? 'bg-linear-to-r from-accent to-accent/0' : '')
				}
			>
				<img src={latest.Meta.image_url} className='size-16 rounded-2xl' />
				<div className='flex flex-col gap-1'>
					<h1 className='font-bold text-l'>{latest.Meta.name}</h1>
					<div className='flex items-center gap-2'>
						<div className='flex items-center gap-1'>
							{hasEditorIcon && <MicroBadge icon={CodeIcon} />}
							<MicroBadge icon={STATUS_ICONS[status]} />
							<Badge className={STATUS_COLORS[status]}>{latest.name}</Badge>
						</div>
						<div className='flex items-center gap-1'>
							<img
								src={LOADERS[latest.Meta.loader as keyof typeof LOADERS]}
								className='size-4 object-contain'
							/>
							<span className='text-zinc-400 font-medium text-[15px]'>
								{latest.Meta.minecraft_version}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

function UserSection() {
	const { currentUser, setCurrentPage } = useApp()

	if (!currentUser) {
		return (
			<div className='flex items-center gap-2'>
				<Button
					size='icon'
					className='rounded-xl cursor-pointer'
					variant='outline'
					onClick={() => setCurrentPage('account')}
				>
					<PlusIcon className='stroke-zinc-500' />
				</Button>
				<h4 className='text-sm font-medium text-zinc-500'>
					Настройте аккаунт, чтобы играть...
				</h4>
			</div>
		)
	}

	return (
		<>
			<div className='flex items-center gap-2'>
				<img
					src={`https://minotar.net/helm/${currentUser.username}/512.png`}
					className='size-8 aspect-square rounded-lg'
				/>
				<div className='flex flex-col justify-center'>
					<h4 className='text-md font-bold'>{currentUser.username}</h4>
					<span className='text-xs font-medium text-primary'>
						{currentUser.auth_type === 'offline'
							? 'Неоффициальный Аккаунт'
							: 'Microsoft Аккаунт'}
					</span>
				</div>
			</div>
			<Button
				size='icon'
				className='rounded-xl cursor-pointer'
				onClick={() => setCurrentPage('account')}
			>
				<PencilIcon />
			</Button>
		</>
	)
}

export function AppSidebar() {
	const {
		instances,
		selectedInstance,
		selectInstance,
		currentPage,
		setCurrentPage,
		currentUser,
		devMode,
		isRefreshing,
		refreshInstances,
	} = useApp()

	const { hasEditor, editorMeta } = useEditorData(selectedInstance?.slug)

	const { isRunning, progress, startRun, cancelRun } = useRun()

	const instanceStatus: Status = selectedInstance
		? getInstanceStatus(selectedInstance)
		: 'not_installed'
	const StatusIcon = STATUS_ICONS[instanceStatus]

	const run = async () => {
		if (!selectedInstance || selectedInstance.releases.length < 1) return
		await startRun(selectedInstance.releases[0])
	}

	const runDev = async () => {
		if (!selectedInstance || !editorMeta) return
		const devRelease = new instance.Release({
			tag_name: 'dev',
			name: 'dev',
			body: '',
			Meta: editorMeta,
		})
		await startRun(devRelease)
	}

	const buttonLabel = isRunning && progress
		? progress.label
		: STATUS_LABELS[instanceStatus]

	const ButtonIcon = isRunning ? LoaderIcon : StatusIcon

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
				{instances.map((inst, index) => (
					<InstanceCard
						key={index}
						instance={inst}
						isSelected={selectedInstance === inst}
						onClick={() => selectInstance(inst)}
					/>
				))}
			</SidebarContent>

			<SidebarFooter>
				<div className='flex items-center justify-between'>
					<UserSection />
				</div>

				<div className='flex gap-2'>
					<Button
						className='cursor-pointer flex-1'
						onClick={run}
						disabled={isRunning || !selectedInstance || !currentUser}
					>
						<ButtonIcon className={isRunning ? 'animate-spin' : ''} /> {buttonLabel}
					</Button>
					{isRunning && (
						<Button
							className='cursor-pointer'
							variant='destructive'
							size='icon'
							onClick={cancelRun}
						>
							<XIcon />
						</Button>
					)}
					{devMode && hasEditor && editorMeta && (
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
						onClick={() => setCurrentPage('settings')}
						disabled={isRunning}
					>
						<Settings2Icon /> Настройки
					</Button>
				)}

				<Button
					className='cursor-pointer'
					onClick={refreshInstances}
					disabled={isRefreshing || isRunning}
				>
					<RefreshCwIcon /> Обновить список
				</Button>

				<MarketplaceModal onImported={() => refreshInstances()} />
				{devMode && <CreateProjectModal />}
			</SidebarFooter>
		</Sidebar>
	)
}
