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
	PackageIcon,
	PencilIcon,
	PlayIcon,
	PlusIcon,
	RefreshCwIcon,
	Settings2Icon,
	TagIcon,
	XIcon,
	LoaderIcon,
} from 'lucide-react'
import { instance } from 'wailsjs/go/models'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { HasEditor, LoadProjectMeta } from 'wailsjs/go/main/App'
import fabric from '../assets/images/fabric.png'
import forge from '../assets/images/forge.png'
import { CreateProjectModal } from './create-modal-project'
import { MarketplaceModal } from './marketplace'
import { useApp } from '../context/app-context'
import { useEditorData } from '../hooks/use-editor-data'
import { useRun } from '../context/run-context'

const LOADERS: Record<string, string> = { fabric, forge }

type Status = 'not_installed' | 'update' | 'ready'

const STATUS_BADGE: Record<Status, string> = {
	not_installed: 'border-zinc-500/30 text-zinc-400',
	update: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
	ready: 'border-primary/30 text-primary bg-primary/10',
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
	const meta = latest?.Meta

	const totalMods =
		meta?.containers?.reduce((sum, c) => sum + (c.content?.length ?? 0), 0) ?? 0

	useEffect(() => {
		HasEditor(inst.slug).then(setHasEditorIcon)
	}, [inst.slug])

	return (
		<div onClick={onClick} className='cursor-pointer px-2 py-1'>
			<div
				className={`relative overflow-hidden rounded-xl border p-3 transition-all ${
					isSelected
						? 'bg-primary/5 border-primary/20 shadow-[0_0_12px_-4px] shadow-primary/20'
						: 'bg-card hover:bg-muted/30 border-border'
				}`}
			>
				{/* Blurred background */}
				{isSelected && meta?.image_url && (
					<div
						className='absolute inset-0 opacity-[0.06] blur-2xl scale-150 pointer-events-none'
						style={{
							backgroundImage: `url(${meta.image_url})`,
							backgroundSize: 'cover',
							backgroundPosition: 'center',
						}}
					/>
				)}

				<div className='relative flex items-center gap-3'>
					<img
						src={meta?.image_url}
						className='size-12 rounded-xl shadow-md ring-1 ring-white/10 shrink-0 object-cover'
						alt={meta?.name ?? inst.slug}
					/>
					<div className='flex-1 min-w-0'>
						<div className='flex items-center gap-1.5'>
							<h3 className='font-semibold text-sm truncate'>
								{meta?.name ?? inst.slug}
							</h3>
							{hasEditorIcon && (
								<div className='flex items-center justify-center size-4 rounded bg-primary/15 shrink-0'>
									<CodeIcon className='size-2.5 text-primary' />
								</div>
							)}
						</div>

						{/* Info pills */}
						<div className='flex flex-wrap items-center gap-1 mt-1.5'>
							{meta?.minecraft_version && (
								<span className='inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium'>
									<img
										src={
											LOADERS[
												meta.loader?.toLowerCase() as keyof typeof LOADERS
											]
										}
										className='size-2.5'
									/>
									{meta.minecraft_version}
								</span>
							)}
							<span
								className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE[status]}`}
							>
								<TagIcon className='size-2.5' />
								{latest.name}
							</span>
							{totalMods > 0 && (
								<span className='inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 text-muted-foreground px-1.5 py-0.5 text-[10px] font-medium'>
									<PackageIcon className='size-2.5' />
									{totalMods}
								</span>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

function UserSection() {
	const { currentUser, setCurrentPage } = useApp()

	if (!currentUser || currentUser?.username == '') {
		return (
			<div className='flex items-center gap-3 w-full'>
				<button
					className='flex items-center justify-center size-9 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer'
					onClick={() => setCurrentPage('account')}
				>
					<PlusIcon className='size-4 text-muted-foreground' />
				</button>
				<span className='text-xs text-muted-foreground'>
					Настройте аккаунт, чтобы играть...
				</span>
			</div>
		)
	}

	return (
		<div className='flex items-center justify-between w-full'>
			<div className='flex items-center gap-2.5 min-w-0'>
				<img
					src={`https://minotar.net/helm/${currentUser.username}/512.png`}
					className='size-9 rounded-lg shadow-sm ring-1 ring-white/10 shrink-0'
				/>
				<div className='flex flex-col min-w-0'>
					<h4 className='text-sm font-semibold truncate'>
						{currentUser.username}
					</h4>
					<span className='text-[10px] font-medium text-primary'>
						{currentUser.auth_type === 'offline'
							? 'Неоффициальный'
							: 'Microsoft'}
					</span>
				</div>
			</div>
			<button
				className='flex items-center justify-center size-8 rounded-lg hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors cursor-pointer'
				onClick={() => setCurrentPage('account')}
			>
				<PencilIcon className='size-3.5' />
			</button>
		</div>
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
		if (!selectedInstance || !hasEditor) return
		const freshMeta = await LoadProjectMeta(selectedInstance.slug)
		if (!freshMeta) return
		const devRelease = new instance.Release({
			tag_name: 'dev',
			name: 'dev',
			body: '',
			Meta: freshMeta,
		})
		await startRun(devRelease)
	}

	const buttonLabel =
		isRunning && progress ? progress.label : STATUS_LABELS[instanceStatus]

	const ButtonIcon = isRunning ? LoaderIcon : StatusIcon

	return (
		<Sidebar variant='floating' className='h-22/23'>
			<SidebarHeader>
				<div className='flex items-center gap-2.5 px-1'>
					<div className='flex items-center justify-center size-9 rounded-lg bg-primary/15'>
						<BoxesIcon className='size-4 text-primary' />
					</div>
					<div>
						<h1 className='text-sm font-semibold tracking-tight'>
							Доступные сборки
						</h1>
						<p className='text-[10px] text-muted-foreground'>
							{instances.length}{' '}
							{instances.length === 1
								? 'сборка'
								: instances.length < 5
									? 'сборки'
									: 'сборок'}
						</p>
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent className='flex flex-col gap-0'>
				{instances.map((inst, index) => (
					<InstanceCard
						key={index}
						instance={inst}
						isSelected={selectedInstance === inst}
						onClick={() => selectInstance(inst)}
					/>
				))}
			</SidebarContent>

			<SidebarFooter className='gap-3'>
				{/* User card */}
				<div className='rounded-xl border bg-card p-3'>
					<UserSection />
				</div>

				{/* Action buttons */}
				<div className='flex flex-col gap-2'>
					<div className='flex gap-2'>
						{selectedInstance && (
							<Button
								className='cursor-pointer flex-1 rounded-lg'
								onClick={run}
								disabled={
									isRunning ||
									!selectedInstance ||
									!currentUser ||
									currentUser?.username == ''
								}
							>
								<ButtonIcon className={isRunning ? 'animate-spin' : ''} />{' '}
								{buttonLabel}
							</Button>
						)}
						{isRunning && (
							<Button
								className='cursor-pointer rounded-lg'
								variant='destructive'
								size='icon'
								onClick={cancelRun}
							>
								<XIcon />
							</Button>
						)}
						{devMode && hasEditor && editorMeta && (
							<Button
								className='cursor-pointer rounded-lg'
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
							className='cursor-pointer rounded-lg'
							variant='outline'
							onClick={() => setCurrentPage('settings')}
							disabled={isRunning}
						>
							<Settings2Icon /> Настройки
						</Button>
					)}

					<Button
						className='cursor-pointer rounded-lg'
						variant='outline'
						onClick={refreshInstances}
						disabled={isRefreshing || isRunning}
					>
						<RefreshCwIcon /> Обновить список
					</Button>

					{devMode && <CreateProjectModal />}
					<MarketplaceModal onImported={() => refreshInstances()} />
				</div>
			</SidebarFooter>
		</Sidebar>
	)
}
