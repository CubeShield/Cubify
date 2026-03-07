import { instance } from 'wailsjs/go/models'
import dayjs from 'dayjs'
import {
	BoxIcon,
	CalendarIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	CodeIcon,
	CpuIcon,
	GamepadIcon,
	ImageIcon,
	Loader2,
	PackageIcon,
	PaletteIcon,
	RocketIcon,
	ServerIcon,
	SparklesIcon,
	TagIcon,
	Trash2Icon,
} from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { EditorPage } from './editor/editor-page'
import { useState, useEffect } from 'react'
import {
	CloneProject,
	DeleteInstance,
	DeployToServer,
	CancelDeploy,
} from '../../wailsjs/go/main/App'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogTrigger,
	DialogClose,
} from './ui/dialog'
import { useEditorData } from '../hooks/use-editor-data'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './ui/select'
import { Separator } from './ui/separator'
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime'
import fabric from '../assets/images/fabric.png'
import forge from '../assets/images/forge.png'

interface InstanceDetailProps {
	instance: instance.LocalInstance
	devMode: boolean
	onDeleted?: () => void
}

const CONTAINERS: Record<string, { label: string; icon: typeof BoxIcon }> = {
	mods: { label: 'Моды', icon: PackageIcon },
	resourcepacks: { label: 'Ресурспаки', icon: PaletteIcon },
}

const LOADER_COLORS: Record<string, string> = {
	fabric: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
	forge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
	quilt: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
	neoforge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

const LOADERS: Record<string, string> = { fabric, forge }

export function InstanceDetail({
	instance: inst,
	devMode,
	onDeleted,
}: InstanceDetailProps) {
	const {
		hasEditor,
		editorMeta,
		reload: reloadEditor,
	} = useEditorData(inst.slug)
	const [activeTab, setActiveTab] = useState('overview')

	const latestRelease = inst.releases?.[0]
	const meta = latestRelease?.Meta

	const totalMods =
		meta?.containers?.reduce((sum, c) => sum + (c.content?.length ?? 0), 0) ?? 0

	return (
		<div className='flex flex-col h-full'>
			<div className='relative overflow-hidden rounded-2xl border bg-card mb-6'>
				{meta?.image_url && (
					<div
						className='absolute inset-0 opacity-[0.08] blur-2xl scale-125 pointer-events-none'
						style={{
							backgroundImage: `url(${meta.image_url})`,
							backgroundSize: 'cover',
							backgroundPosition: 'center',
						}}
					/>
				)}
				<div className='relative flex items-start gap-6 p-6'>
					<img
						src={meta?.image_url}
						className='size-28 rounded-2xl shadow-lg ring-1 ring-white/10 shrink-0 object-cover'
						alt={meta?.name ?? inst.slug}
					/>
					<div className='flex-1 min-w-0'>
						<div className='flex items-start justify-between gap-4'>
							<div className='min-w-0'>
								<h2 className='text-2xl font-bold tracking-tight truncate'>
									{meta?.name ?? inst.slug}
								</h2>
								{meta?.description && (
									<p className='text-sm text-muted-foreground mt-1 line-clamp-2'>
										{meta.description}
									</p>
								)}
							</div>
							<DeleteInstanceButton
								slug={inst.slug}
								name={meta?.name ?? inst.slug}
								onDeleted={onDeleted}
							/>
						</div>

						{/* Info pills */}
						<div className='flex flex-wrap items-center gap-2 mt-4'>
							{meta?.minecraft_version && (
								<span className='inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground font-medium'>
									<img
										src={LOADERS[meta.loader as keyof typeof LOADERS]}
										className='size-3'
									/>
									{meta.minecraft_version}
								</span>
							)}

							{totalMods > 0 && (
								<span className='inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 text-muted-foreground border-border px-2.5 py-1 text-xs font-medium'>
									<PackageIcon className='size-3.5' />
									{totalMods} контент
								</span>
							)}
							{inst.releases?.length > 0 && (
								<span className='inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 text-muted-foreground border-border px-2.5 py-1 text-xs font-medium'>
									<TagIcon className='size-3.5' />
									{inst.releases.length}{' '}
									{inst.releases.length === 1
										? 'релиз'
										: inst.releases.length < 5
											? 'релиза'
											: 'релизов'}
								</span>
							)}
						</div>
					</div>
				</div>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className='flex-1 flex flex-col'
			>
				<TabsList>
					<TabsTrigger value='overview'>Обзор</TabsTrigger>
					{devMode && hasEditor && (
						<TabsTrigger value='editor'>Редактор</TabsTrigger>
					)}
				</TabsList>

				<TabsContent value='overview' className='flex-1 pt-4'>
					{devMode && !hasEditor && inst.repo && (
						<EnableEditorButton
							slug={inst.slug}
							onDone={() => {
								reloadEditor().then(() => setActiveTab('editor'))
							}}
						/>
					)}
					<OverviewContent instance={inst} devMode={devMode} />
				</TabsContent>

				{devMode && hasEditor && editorMeta && (
					<TabsContent value='editor' className='flex-1 pt-4'>
						<EditorPage
							slug={inst.slug}
							initialMeta={editorMeta}
							onRefresh={reloadEditor}
						/>
					</TabsContent>
				)}
			</Tabs>
		</div>
	)
}

interface ReleasesProps {
	instance: instance.LocalInstance
	devMode: boolean
}

/* ── Enable editor (clone) button ── */
function EnableEditorButton({
	slug,
	onDone,
}: {
	slug: string
	onDone: () => void
}) {
	const [isCloning, setCloning] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleClone = async () => {
		setCloning(true)
		setError(null)
		try {
			await CloneProject(slug)
			onDone()
		} catch (e) {
			setError(String(e))
		} finally {
			setCloning(false)
		}
	}

	return (
		<div className='flex flex-col items-start gap-3 mb-5 p-4 border rounded-xl bg-linear-to-r from-indigo-500/10 via-purple-500/5 to-transparent'>
			<div className='flex flex-col gap-1'>
				<span className='font-medium flex items-center gap-2'>
					<CodeIcon className='size-4 text-indigo-400' />
					Режим разработки
				</span>
				<span className='text-sm text-muted-foreground'>
					Склонировать репозиторий, чтобы редактировать сборку, используйте это,
					только если у вас есть Git
				</span>
			</div>
			<Button
				onClick={handleClone}
				disabled={isCloning}
				className='cursor-pointer'
			>
				{isCloning ? (
					<Loader2 className='size-3 animate-spin' />
				) : (
					<CodeIcon className='size-4' />
				)}
				{isCloning ? 'Клонирование...' : 'Включить режим разработки'}
			</Button>
			{error && <span className='text-sm text-destructive'>{error}</span>}
		</div>
	)
}

function ContainerCard({ container }: { container: instance.Container }) {
	const [expanded, setExpanded] = useState(false)
	const cfg = CONTAINERS[container.content_type] ?? {
		label: container.content_type,
		icon: BoxIcon,
	}
	const Icon = cfg.icon
	const items = container.content ?? []
	const previewCount = 5
	const hasMore = items.length > previewCount
	const visible = expanded ? items : items.slice(0, previewCount)

	return (
		<div className='border rounded-xl overflow-hidden bg-card'>
			<div className='flex items-center justify-between px-4 py-3 bg-muted/40'>
				<div className='flex items-center gap-2'>
					<div className='flex items-center justify-center size-8 rounded-lg bg-primary/15'>
						<Icon className='size-4 text-primary' />
					</div>
					<span className='font-semibold text-sm'>{cfg.label}</span>
				</div>
				<Badge variant='secondary' className='text-xs tabular-nums'>
					{items.length}
				</Badge>
			</div>
			<Separator />
			{/* items */}
			{items.length === 0 ? (
				<div className='px-4 py-6 text-center text-sm text-muted-foreground'>
					Пусто
				</div>
			) : (
				<div className='divide-y divide-border'>
					{visible.map((item, idx) => (
						<div
							key={idx}
							className='flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors'
						>
							{item.image_url ? (
								<img
									src={item.image_url}
									className='size-8 rounded-lg object-cover ring-1 ring-white/10 shrink-0'
									alt={item.name}
								/>
							) : (
								<div className='size-8 rounded-lg bg-muted flex items-center justify-center shrink-0'>
									{container.content_type === 'resourcepacks' ? (
										<ImageIcon className='size-4 text-muted-foreground' />
									) : (
										<PackageIcon className='size-4 text-muted-foreground' />
									)}
								</div>
							)}
							<div className='flex-1 min-w-0'>
								<p className='text-sm font-medium truncate'>{item.name}</p>
								{item.source && (
									<p className='text-xs text-muted-foreground capitalize'>
										{item.source}
									</p>
								)}
							</div>
						</div>
					))}
					{hasMore && (
						<button
							onClick={() => setExpanded(e => !e)}
							className='w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer'
						>
							{expanded ? (
								<>
									<ChevronUpIcon className='size-3.5' />
									Свернуть
								</>
							) : (
								<>
									<ChevronDownIcon className='size-3.5' />
									Ещё {items.length - previewCount}
								</>
							)}
						</button>
					)}
				</div>
			)}
		</div>
	)
}

/* ── Deploy section ── */
function DeploySection({ inst }: { inst: instance.LocalInstance }) {
	const [selectedDeployVersion, setSelectedDeployVersion] = useState<string>('')
	const [isDeploying, setDeploying] = useState(false)
	const [deployError, setDeployError] = useState<string | null>(null)
	const [deploySuccess, setDeploySuccess] = useState(false)

	useEffect(() => {
		const onDone = () => {
			setDeploying(false)
			setDeploySuccess(true)
		}
		const onError = (msg: string) => {
			setDeploying(false)
			setDeployError(msg || 'Неизвестная ошибка')
		}
		const onCancelled = () => {
			setDeploying(false)
			setDeployError('Деплой отменён')
		}

		EventsOn('deploy:done', onDone)
		EventsOn('deploy:error', onError)
		EventsOn('deploy:cancelled', onCancelled)

		return () => {
			EventsOff('deploy:done')
			EventsOff('deploy:error')
			EventsOff('deploy:cancelled')
		}
	}, [])

	const handleDeploy = () => {
		const release = inst.releases.find(
			r => r.tag_name === selectedDeployVersion,
		)
		if (!release) return

		setDeploying(true)
		setDeployError(null)
		setDeploySuccess(false)
		DeployToServer(release)
	}

	const handleCancelDeploy = () => {
		CancelDeploy()
	}

	return (
		<div className='border rounded-xl overflow-hidden bg-card mb-5'>
			<div className='flex items-center gap-2 px-4 py-3 bg-linear-to-r from-sky-500/10 via-sky-500/5 to-transparent'>
				<div className='flex items-center justify-center size-8 rounded-lg bg-sky-500/15'>
					<ServerIcon className='size-4 text-sky-400' />
				</div>
				<div>
					<span className='font-semibold text-sm'>Деплой на сервер</span>
					<p className='text-xs text-muted-foreground'>
						Выберите версию для установки через FTP
					</p>
				</div>
			</div>
			<Separator />
			<div className='p-4 flex flex-col gap-3'>
				<div className='flex gap-2'>
					<Select
						value={selectedDeployVersion}
						onValueChange={setSelectedDeployVersion}
					>
						<SelectTrigger className='flex-1'>
							<SelectValue placeholder='Выберите версию' />
						</SelectTrigger>
						<SelectContent>
							{inst.releases.map((release, idx) => (
								<SelectItem key={idx} value={release.tag_name}>
									{release.name} (
									{dayjs(release.created_at).format('D MMM YYYY')})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						onClick={handleDeploy}
						disabled={!selectedDeployVersion || isDeploying}
						className='cursor-pointer'
					>
						{isDeploying ? (
							<Loader2 className='size-4 animate-spin' />
						) : (
							<RocketIcon className='size-4' />
						)}
						{isDeploying ? 'Деплой...' : 'Выкатить'}
					</Button>
					{isDeploying && (
						<Button
							variant='destructive'
							size='icon'
							onClick={handleCancelDeploy}
							className='cursor-pointer'
						>
							<Trash2Icon className='size-4' />
						</Button>
					)}
				</div>
				{deployError && (
					<span className='text-sm text-destructive'>{deployError}</span>
				)}
				{deploySuccess && (
					<span className='text-sm text-green-500'>
						Деплой завершён успешно!
					</span>
				)}
			</div>
		</div>
	)
}

/* ── Release timeline ── */
function ReleaseTimeline({ releases }: { releases: instance.Release[] }) {
	if (!releases?.length) return null

	return (
		<div className='mt-6'>
			<h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2'>
				<SparklesIcon className='size-4' />
				История обновлений
			</h3>
			<div className='relative'>
				{/* timeline line */}
				<div className='absolute left-3.75 top-3 bottom-3 w-px bg-border' />

				<div className='flex flex-col gap-0'>
					{releases.map((release, index) => {
						const isLatest = index === 0
						return (
							<div key={index} className='relative flex gap-4 pb-6 last:pb-0'>
								{/* dot */}
								<div className='relative z-10 flex items-center justify-center shrink-0'>
									<div
										className={`size-2.5 rounded-full ring-4 ring-background mt-1.5 ${
											isLatest
												? 'bg-primary shadow-[0_0_8px_2px] shadow-primary/40'
												: 'bg-muted-foreground/40'
										}`}
									/>
								</div>

								{/* content */}
								<div
									className={`flex-1 rounded-xl border p-4 transition-colors ${
										isLatest
											? 'bg-primary/5 border-primary/20'
											: 'bg-card hover:bg-muted/30'
									}`}
								>
									<div className='flex items-center justify-between gap-2 mb-1'>
										<div className='flex items-center gap-2'>
											<h4 className='font-semibold'>{release.name}</h4>
											{isLatest && (
												<Badge
													variant='default'
													className='text-[10px] px-1.5 py-0'
												>
													Новое
												</Badge>
											)}
										</div>
										<Badge
											variant='outline'
											className='text-[10px] font-mono shrink-0'
										>
											{release.tag_name}
										</Badge>
									</div>
									<div className='flex items-center gap-1.5 text-xs text-muted-foreground mb-2'>
										<CalendarIcon className='size-3' />
										{dayjs(release.created_at).format('D MMMM YYYY, HH:mm')}
									</div>
									{release.body && (
										<p className='text-sm text-muted-foreground whitespace-pre-line leading-relaxed'>
											{release.body}
										</p>
									)}
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}

/* ── Main overview content ── */
function OverviewContent({ instance: inst, devMode }: ReleasesProps) {
	const latestRelease = inst.releases?.[0]

	if (!latestRelease) {
		return (
			<div className='flex flex-col items-center justify-center py-16 text-muted-foreground'>
				<BoxIcon className='size-10 mb-3 opacity-40' />
				<p className='text-sm'>Нет доступных релизов</p>
			</div>
		)
	}

	return (
		<>
			{devMode && <DeploySection inst={inst} />}

			{/* Container cards grid */}
			{latestRelease.Meta.containers &&
				latestRelease.Meta.containers.length > 0 && (
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{latestRelease.Meta.containers.map((container, idx) => (
							<ContainerCard key={idx} container={container} />
						))}
					</div>
				)}

			{/* Release timeline */}
			<ReleaseTimeline releases={inst.releases} />
		</>
	)
}

/* ── Delete instance dialog ── */
function DeleteInstanceButton({
	slug,
	name,
	onDeleted,
}: {
	slug: string
	name: string
	onDeleted?: () => void
}) {
	const [open, setOpen] = useState(false)
	const [isDeleting, setDeleting] = useState(false)

	const handleDelete = async () => {
		setDeleting(true)
		try {
			await DeleteInstance(slug)
			setOpen(false)
			onDeleted?.()
		} catch (e) {
			console.error(e)
		} finally {
			setDeleting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					size='icon'
					variant='outline'
					className='shrink-0 cursor-pointer text-destructive hover:bg-destructive hover:text-white'
				>
					<Trash2Icon className='size-4' />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Удалить сборку?</DialogTitle>
				</DialogHeader>
				<p className='text-sm text-muted-foreground'>
					Вы уверены, что хотите удалить <strong>{name}</strong>? Будут удалены
					все локальные данные сборки, включая файлы редактора. Это действие
					нельзя отменить.
				</p>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant='outline' className='cursor-pointer'>
							Отмена
						</Button>
					</DialogClose>
					<Button
						variant='destructive'
						onClick={handleDelete}
						disabled={isDeleting}
						className='cursor-pointer'
					>
						{isDeleting ? (
							<Loader2 className='size-4 animate-spin' />
						) : (
							<Trash2Icon className='size-4' />
						)}
						Удалить
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
