import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
	SaveProjectMeta,
	SyncProject,
	ReleaseProject,
	GetProjectHistory,
	CheckProjectStatus,
	GetContentFromURL,
	AddProjectContentFromFile,
} from '../../../wailsjs/go/main/App'
import { git, instance } from '../../../wailsjs/go/models'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
	GitCommitVertical,
	SaveIcon,
	Tag,
	HistoryIcon,
	PackageIcon,
	PaletteIcon,
	PlusIcon,
	Trash2,
	LinkIcon,
	Loader2,
	SearchIcon,
	BoxIcon,
	FileIcon,
} from 'lucide-react'
import Fuse from 'fuse.js'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog'
import { Badge } from '../ui/badge'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Content } from './editor-content'
import { TooltipProvider } from '../ui/tooltip'
import { Separator } from '../ui/separator'

const CONTAINER_CFG: Record<string, { label: string; icon: typeof BoxIcon }> = {
	mods: { label: 'Моды', icon: PackageIcon },
	resourcepacks: { label: 'Ресурспаки', icon: PaletteIcon },
}

interface EditorPageProps {
	slug: string
	initialMeta: instance.Meta
	onRefresh: () => void
}

export function EditorPage({ slug, initialMeta, onRefresh }: EditorPageProps) {
	const [meta, setMeta] = useState<instance.Meta>(initialMeta)

	const [isGitDirty, setGitDirty] = useState(false)
	const [commits, setCommits] = useState<git.Commit[]>([])
	const [tags, setTags] = useState<string[]>([])

	const [commitMsg, setCommitMsg] = useState('')
	const [tagName, setTagName] = useState('')
	const [releaseMessage, setReleaseMessage] = useState('')
	const [isLoading, setLoading] = useState(false)
	const [activeTab, setActiveTab] = useState('general')

	const [initialJson, setInitialJson] = useState(JSON.stringify(initialMeta))
	const isFileDirty = JSON.stringify(meta) !== initialJson

	const loadGitInfo = async () => {
		const status = await CheckProjectStatus(slug)
		setGitDirty(status)
		const g = await GetProjectHistory(slug)
		if (g) {
			setCommits(g.commits || [])
			setTags(g.tags || [])
		}
	}

	useEffect(() => {
		setMeta(initialMeta)
		setInitialJson(JSON.stringify(initialMeta))
		loadGitInfo()
	}, [slug, initialMeta])

	const handleSaveFile = async () => {
		setLoading(true)
		try {
			await SaveProjectMeta(slug, meta)
			setInitialJson(JSON.stringify(meta))
			await loadGitInfo()
			onRefresh()
		} catch (e) {
			alert('Ошибка сохранения: ' + e)
		} finally {
			setLoading(false)
		}
	}

	const handleSync = async () => {
		if (!commitMsg) return alert('Введите сообщение коммита')
		setLoading(true)
		try {
			await SyncProject(slug, commitMsg)
			setCommitMsg('')
			await loadGitInfo()
			alert('Изменения отправлены!')
		} catch (e) {
			alert('Ошибка Git: ' + e)
		} finally {
			setLoading(false)
		}
	}

	const handleRelease = async () => {
		if (!tagName) return alert('Введите тег (например v1.0.1)')
		setLoading(true)
		try {
			await ReleaseProject(slug, tagName, releaseMessage)
			setTagName('')
			setReleaseMessage('')
			await loadGitInfo()
			alert('Релиз создан!')
		} catch (e) {
			alert('Ошибка релиза: ' + e)
		} finally {
			setLoading(false)
		}
	}

	const updateMeta = (field: keyof instance.Meta, value: any) => {
		setMeta(prev => {
			const newMeta = new instance.Meta(prev)
			// @ts-ignore
			newMeta[field] = value
			return newMeta
		})
	}

	return (
		<div className='flex flex-col h-full gap-4'>
			{/* ── Editor header ── */}
			<div className='relative overflow-hidden rounded-2xl border bg-card'>
				<div className='relative flex items-center justify-between gap-4 p-5'>
					<div className='min-w-0'>
						<div className='flex items-center gap-2.5'>
							<h2 className='text-xl font-bold tracking-tight truncate'>
								{meta.name}
							</h2>
							{isFileDirty && (
								<span className='inline-flex items-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-medium animate-pulse'>
									Не сохранено
								</span>
							)}
							{!isFileDirty && isGitDirty && (
								<span className='inline-flex items-center rounded-md border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 px-2 py-0.5 text-[10px] font-medium'>
									Изменено (Git)
								</span>
							)}
						</div>
						<span className='text-[11px] text-muted-foreground font-mono mt-0.5'>
							{slug}
						</span>
					</div>

					<div className='flex items-center gap-2 shrink-0'>
						<Button
							onClick={handleSaveFile}
							disabled={!isFileDirty || isLoading}
							className='rounded-lg cursor-pointer'
							variant={isFileDirty ? 'default' : 'outline'}
							size='sm'
						>
							<SaveIcon className='size-3.5' />
							Сохранить
						</Button>

						<Dialog>
							<DialogTrigger asChild>
								<Button
									variant='outline'
									disabled={isFileDirty || !isGitDirty}
									className='rounded-lg cursor-pointer'
									size='sm'
								>
									<GitCommitVertical className='size-3.5' />
									Push
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Отправить изменения</DialogTitle>
								</DialogHeader>
								<div className='space-y-4 py-4'>
									<Label>Сообщение коммита</Label>
									<Textarea
										placeholder='feat: added sodium mod'
										value={commitMsg}
										onChange={e => setCommitMsg(e.target.value)}
									/>
									<Button
										onClick={handleSync}
										disabled={isLoading}
										className='w-full'
									>
										Commit & Push
									</Button>
								</div>
							</DialogContent>
						</Dialog>

						<Dialog>
							<DialogTrigger asChild>
								<Button
									variant='ghost'
									size='icon'
									className='rounded-lg size-8 cursor-pointer'
								>
									<HistoryIcon className='size-4' />
								</Button>
							</DialogTrigger>
							<DialogContent className='max-w-2xl max-h-[80vh] overflow-auto'>
								<DialogHeader>
									<DialogTitle>История проекта</DialogTitle>
								</DialogHeader>
								<div className='grid gap-6'>
									<div className='flex flex-col gap-3 p-4 rounded-xl border bg-muted/20'>
										<Label>Новый релиз</Label>
										<div className='flex gap-2 items-end'>
											<div className='grid w-full gap-1.5'>
												<Input
													placeholder='v1.0.0'
													value={tagName}
													onChange={e => setTagName(e.target.value)}
												/>
											</div>
											<Button
												onClick={handleRelease}
												disabled={isLoading}
												className='rounded-lg cursor-pointer'
											>
												<Tag className='size-3.5' /> Создать
											</Button>
										</div>
										<Textarea
											placeholder='Сообщение к релизу (необязательно)'
											value={releaseMessage}
											onChange={e => setReleaseMessage(e.target.value)}
											className='text-sm'
											rows={2}
										/>
										<p className='text-xs text-muted-foreground'>
											Changelog генерируется автоматически. Сообщение будет
											добавлено в описание релиза.
										</p>
									</div>

									<div>
										<h4 className='text-sm font-semibold mb-2'>Теги</h4>
										<div className='flex flex-wrap gap-1.5'>
											{tags.map(t => (
												<span
													key={t}
													className='inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground'
												>
													{t}
												</span>
											))}
											{tags.length === 0 && (
												<span className='text-muted-foreground text-sm'>
													Нет тегов
												</span>
											)}
										</div>
									</div>
									<div>
										<h4 className='text-sm font-semibold mb-2'>
											Последние коммиты
										</h4>
										<div className='space-y-1'>
											{commits.map(c => (
												<div
													key={c.hash}
													className='flex justify-between items-center text-xs px-3 py-2 rounded-lg bg-muted/30 border'
												>
													<span className='font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground'>
														{c.hash}
													</span>
													<span className='truncate flex-1 mx-3 text-foreground'>
														{c.message}
													</span>
													<span className='text-muted-foreground text-[10px] whitespace-nowrap'>
														{c.date}
													</span>
												</div>
											))}
										</div>
									</div>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className='flex-1 flex flex-col'
			>
				<TabsList>
					<TabsTrigger value='general'>Основное</TabsTrigger>
					<TabsTrigger value='containers'>Контейнеры</TabsTrigger>
				</TabsList>

				<TabsContent value='general' className='pt-4'>
					<div className='border rounded-xl overflow-hidden bg-card'>
						<div className='px-4 py-3 bg-muted/40'>
							<span className='font-semibold text-sm'>Настройки сборки</span>
						</div>
						<Separator />
						<div className='p-4 grid grid-cols-2 gap-3'>
							<div className='space-y-1.5'>
								<Label className='text-xs text-muted-foreground'>
									Название
								</Label>
								<Input
									value={meta.name}
									onChange={e => updateMeta('name', e.target.value)}
									className='h-8 text-xs'
								/>
							</div>
							<div className='space-y-1.5'>
								<Label className='text-xs text-muted-foreground'>
									Версия Minecraft
								</Label>
								<Input
									value={meta.minecraft_version}
									onChange={e =>
										updateMeta('minecraft_version', e.target.value)
									}
									className='h-8 text-xs'
								/>
							</div>
							<div className='space-y-1.5'>
								<Label className='text-xs text-muted-foreground'>Loader</Label>
								<Input
									value={meta.loader}
									onChange={e => updateMeta('loader', e.target.value)}
									className='h-8 text-xs'
								/>
							</div>
							<div className='space-y-1.5'>
								<Label className='text-xs text-muted-foreground'>
									Loader Version
								</Label>
								<Input
									value={meta.loader_version}
									onChange={e => updateMeta('loader_version', e.target.value)}
									className='h-8 text-xs'
								/>
							</div>
							<div className='col-span-2 space-y-1.5'>
								<Label className='text-xs text-muted-foreground'>
									Описание
								</Label>
								<Textarea
									value={meta.description}
									onChange={e => updateMeta('description', e.target.value)}
									className='text-xs'
								/>
							</div>
						</div>
					</div>
				</TabsContent>

				<TabsContent value='containers' className='flex-1'>
					<ContainerEditor meta={meta} setMeta={setMeta} slug={slug} />
				</TabsContent>
			</Tabs>
		</div>
	)
}

function ContainerEditor({
	meta,
	setMeta,
	slug,
}: {
	meta: instance.Meta
	setMeta: React.Dispatch<React.SetStateAction<instance.Meta>>
	slug: string
}) {
	const [openUrlDialog, setOpenUrlDialog] = useState<number | null>(null)
	const [urlToAdd, setUrlToAdd] = useState('')
	const [isUrlLoading, setUrlLoading] = useState(false)
	const [searchQueries, setSearchQueries] = useState<Record<number, string>>({})

	// Debounced search: store the "committed" queries separately
	const [debouncedQueries, setDebouncedQueries] = useState<
		Record<number, string>
	>({})
	const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>(
		{},
	)

	const handleSearchChange = useCallback(
		(containerIdx: number, query: string) => {
			setSearchQueries(prev => ({ ...prev, [containerIdx]: query }))

			// Debounce the actual filter by 200ms
			clearTimeout(debounceTimers.current[containerIdx])
			debounceTimers.current[containerIdx] = setTimeout(() => {
				setDebouncedQueries(prev => ({ ...prev, [containerIdx]: query }))
			}, 200)
		},
		[],
	)

	const FUSE_OPTIONS = useMemo(
		() => ({
			keys: ['name', 'file', 'url', 'type'],
			threshold: 0.3,
			distance: 100,
			minMatchCharLength: 1,
			includeScore: true,
		}),
		[],
	)

	// Memoize Fuse indices per container
	const fuseIndices = useMemo(() => {
		return meta.containers.map(c => new Fuse(c.content, FUSE_OPTIONS))
	}, [meta.containers, FUSE_OPTIONS])

	const getFilteredContent = useCallback(
		(containerIdx: number, content: instance.Content[]) => {
			const query = debouncedQueries[containerIdx]?.trim()
			if (!query) return content
			const fuse = fuseIndices[containerIdx]
			if (!fuse) return content
			return fuse.search(query).map(r => r.item)
		},
		[debouncedQueries, fuseIndices],
	)

	const cloneMeta = useCallback(() => new instance.Meta(meta), [meta])

	const addContainer = useCallback(
		(type: string) => {
			const newMeta = cloneMeta()
			newMeta.containers.push(
				new instance.Container({ content_type: type, content: [] }),
			)
			setMeta(newMeta)
		},
		[cloneMeta, setMeta],
	)

	const deleteContainer = useCallback(
		(idx: number) => {
			const newMeta = cloneMeta()
			newMeta.containers.splice(idx, 1)
			setMeta(newMeta)
		},
		[cloneMeta, setMeta],
	)

	const addContent = useCallback(
		(containerIdx: number) => {
			const newMeta = cloneMeta()
			newMeta.containers[containerIdx].content.push(
				new instance.Content({
					name: 'New Mod',
					file: 'mod.jar',
					url: 'https://...',
					type: 'both',
				}),
			)
			setMeta(newMeta)
		},
		[cloneMeta, setMeta],
	)

	const handleAddFromUrl = useCallback(
		async (cIdx: number) => {
			if (!urlToAdd) return
			setUrlLoading(true)
			try {
				const content = await GetContentFromURL(urlToAdd)
				const newMeta = cloneMeta()
				if (!content.type) content.type = 'both'
				newMeta.containers[cIdx].content.push(content)
				setMeta(newMeta)
				setOpenUrlDialog(null)
				setUrlToAdd('')
			} catch (e) {
				alert('Ошибка получения данных по ссылке: ' + e)
			} finally {
				setUrlLoading(false)
			}
		},
		[urlToAdd, cloneMeta, setMeta],
	)

	const handleAddFromFile = useCallback(
		async (cIdx: number) => {
			try {
				const contentType = meta.containers[cIdx].content_type
				const content = await AddProjectContentFromFile(slug, contentType)
				const newMeta = cloneMeta()
				newMeta.containers[cIdx].content.push(content)
				setMeta(newMeta)
			} catch (e) {
				if (String(e).includes('no file selected')) return
				alert('Ошибка добавления файла: ' + e)
			}
		},
		[meta.containers, slug, cloneMeta, setMeta],
	)

	const updateContent = useCallback(
		(
			cIdx: number,
			itemIdx: number,
			field: keyof instance.Content,
			val: any,
		) => {
			setMeta(prev => {
				const newMeta = new instance.Meta(prev)
				// @ts-ignore
				newMeta.containers[cIdx].content[itemIdx][field] = val
				return newMeta
			})
		},
		[setMeta],
	)

	const replaceContent = useCallback(
		(cIdx: number, itemIdx: number, newContent: Partial<instance.Content>) => {
			setMeta(prev => {
				const newMeta = new instance.Meta(prev)
				Object.entries(newContent).forEach(([field, value]) => {
					// @ts-ignore
					newMeta.containers[cIdx].content[itemIdx][field] = value
				})
				return newMeta
			})
		},
		[setMeta],
	)

	const removeContent = useCallback(
		(cIdx: number, itemIdx: number) => {
			setMeta(prev => {
				const newMeta = new instance.Meta(prev)
				newMeta.containers[cIdx].content.splice(itemIdx, 1)
				return newMeta
			})
		},
		[setMeta],
	)

	return (
		<TooltipProvider>
			<div className='flex flex-col gap-4 h-full'>
				<div className='flex gap-2'>
					<button
						className='inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer'
						onClick={() => addContainer('mods')}
					>
						<PlusIcon className='size-3' />
						Моды
					</button>
					<button
						className='inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer'
						onClick={() => addContainer('resourcepacks')}
					>
						<PlusIcon className='size-3' />
						Ресурспаки
					</button>
				</div>

				<div className='space-y-4 pb-10'>
					{meta.containers.map((container, cIdx) => (
						<ContainerCard
							key={cIdx}
							container={container}
							cIdx={cIdx}
							searchQuery={searchQueries[cIdx] || ''}
							filteredContent={getFilteredContent(cIdx, container.content)}
							onSearchChange={handleSearchChange}
							onDeleteContainer={deleteContainer}
							onAddContent={addContent}
							updateContent={updateContent}
							replaceContent={replaceContent}
							removeContent={removeContent}
							openUrlDialog={openUrlDialog}
							setOpenUrlDialog={setOpenUrlDialog}
							urlToAdd={urlToAdd}
							setUrlToAdd={setUrlToAdd}
							isUrlLoading={isUrlLoading}
							onAddFromUrl={handleAddFromUrl}
							onAddFromFile={handleAddFromFile}
						/>
					))}
					{meta.containers.length === 0 && (
						<div className='flex flex-col items-center justify-center py-16 text-muted-foreground'>
							<BoxIcon className='size-10 mb-3 opacity-40' />
							<p className='text-sm'>Нет контейнеров</p>
							<p className='text-xs opacity-60 mt-1'>
								Добавьте контейнер для модов или ресурспаков
							</p>
						</div>
					)}
				</div>
			</div>
		</TooltipProvider>
	)
}

// Extracted to reduce ContainerEditor nesting
function ContainerCard({
	container,
	cIdx,
	searchQuery,
	filteredContent,
	onSearchChange,
	onDeleteContainer,
	onAddContent,
	updateContent,
	replaceContent,
	removeContent,
	openUrlDialog,
	setOpenUrlDialog,
	urlToAdd,
	setUrlToAdd,
	isUrlLoading,
	onAddFromUrl,
	onAddFromFile,
}: {
	container: instance.Container
	cIdx: number
	searchQuery: string
	filteredContent: instance.Content[]
	onSearchChange: (idx: number, q: string) => void
	onDeleteContainer: (idx: number) => void
	onAddContent: (idx: number) => void
	updateContent: (
		cIdx: number,
		itemIdx: number,
		field: keyof instance.Content,
		val: any,
	) => void
	replaceContent: (
		cIdx: number,
		itemIdx: number,
		newContent: Partial<instance.Content>,
	) => void
	removeContent: (cIdx: number, itemIdx: number) => void
	openUrlDialog: number | null
	setOpenUrlDialog: (v: number | null) => void
	urlToAdd: string
	setUrlToAdd: (v: string) => void
	isUrlLoading: boolean
	onAddFromUrl: (cIdx: number) => void
	onAddFromFile: (cIdx: number) => void
}) {
	const cfg = CONTAINER_CFG[container.content_type] ?? {
		label: container.content_type,
		icon: BoxIcon,
	}
	const Icon = cfg.icon

	return (
		<div className='border rounded-xl overflow-hidden bg-card'>
			{/* header */}
			<div className='flex items-center justify-between px-4 py-3 bg-muted/40'>
				<div className='flex items-center gap-2'>
					<div className='flex items-center justify-center size-8 rounded-lg bg-primary/15'>
						<Icon className='size-4 text-primary' />
					</div>
					<span className='font-semibold text-sm'>{cfg.label}</span>
				</div>
				<div className='flex items-center gap-1.5'>
					{searchQuery &&
						filteredContent.length !== container.content.length && (
							<span className='inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium'>
								{filteredContent.length} найдено
							</span>
						)}
					<Badge variant='secondary' className='text-xs tabular-nums'>
						{container.content.length}
					</Badge>
					<button
						onClick={() => onDeleteContainer(cIdx)}
						className='ml-1 flex items-center justify-center size-7 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors cursor-pointer'
					>
						<Trash2 className='size-3.5' />
					</button>
				</div>
			</div>
			<Separator />

			{/* search */}
			{container.content.length > 3 && (
				<div className='px-4 pt-3'>
					<div className='relative'>
						<SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground' />
						<Input
							type='text'
							placeholder='Поиск по названию, файлу, URL...'
							value={searchQuery}
							onChange={e => onSearchChange(cIdx, e.target.value)}
							className='pl-9 h-8 text-xs'
						/>
					</div>
				</div>
			)}

			{/* empty search state */}
			{searchQuery && filteredContent.length === 0 && (
				<div className='px-4 py-6 flex flex-col items-center text-sm text-muted-foreground'>
					<SearchIcon className='size-8 opacity-30 mb-2' />
					<p>Ничего не найдено</p>
					<p className='text-xs opacity-60 mt-0.5'>«{searchQuery}»</p>
				</div>
			)}

			{/* items */}
			<div className='p-3 space-y-2'>
				{filteredContent.map(item => {
					const originalIdx = container.content.indexOf(item)
					return (
						<Content
							key={originalIdx}
							updateContent={updateContent}
							replaceContent={replaceContent}
							removeContent={removeContent}
							cIdx={cIdx}
							iIdx={originalIdx}
							item={item}
						/>
					)
				})}
			</div>

			{/* add actions */}
			<div className='flex gap-2 px-4 pb-3'>
				<button
					className='flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer'
					onClick={() => onAddContent(cIdx)}
				>
					<PlusIcon className='size-3.5' /> Добавить вручную
				</button>

				<Dialog
					open={openUrlDialog === cIdx}
					onOpenChange={open => {
						setOpenUrlDialog(open ? cIdx : null)
						if (!open) setUrlToAdd('')
					}}
				>
					<DialogTrigger asChild>
						<button className='flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 px-3 py-2 text-xs text-primary/70 hover:text-primary transition-colors cursor-pointer'>
							<LinkIcon className='size-3.5' /> Из URL
						</button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Добавить мод по ссылке</DialogTitle>
						</DialogHeader>
						<div className='space-y-4 py-2'>
							<Label>Ссылка на CurseForge / Modrinth / instance</Label>
							<Input
								placeholder='https://...'
								value={urlToAdd}
								onChange={e => setUrlToAdd(e.target.value)}
							/>
							<Button
								className='w-full rounded-lg cursor-pointer'
								onClick={() => onAddFromUrl(cIdx)}
								disabled={isUrlLoading || !urlToAdd}
							>
								{isUrlLoading ? (
									<Loader2 className='size-3.5 animate-spin' />
								) : (
									<PlusIcon className='size-3.5' />
								)}
								Добавить
							</Button>
						</div>
					</DialogContent>
				</Dialog>

				<button
					className='flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer'
					onClick={() => onAddFromFile(cIdx)}
				>
					<FileIcon className='size-3.5' /> Из файла
				</button>
			</div>
		</div>
	)
}
