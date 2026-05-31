import { useEffect, useState, useMemo, useCallback, useRef, CSSProperties } from 'react'
import {
	DndContext,
	closestCenter,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from '@dnd-kit/core'
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
	arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
import { useApp } from '../../context/app-context'
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
	LayersIcon,
	ArrowRightIcon,
	RotateCcwIcon,
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select'

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
	const { selectedProfile, setSelectedProfile } = useApp()
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

	const handleReset = () => {
		setMeta(initialMeta)
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

				{/* Profile selector strip — only shown when profiles are defined */}
				{meta.profiles && meta.profiles.length > 0 && (
					<div className='flex items-center gap-2 px-5 py-2.5 border-t border-border bg-muted/20'>
						<LayersIcon className='size-3.5 text-muted-foreground/60 shrink-0' />
						<span className='text-[10px] text-muted-foreground/60 font-medium shrink-0'>
							Профиль запуска:
						</span>
						<div className='flex flex-wrap gap-1.5'>
							{meta.profiles.map(p => (
								<button
									key={p.name}
									onClick={() =>
										setSelectedProfile(selectedProfile === p.name ? '' : p.name)
									}
									className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
										selectedProfile === p.name
											? 'border-primary/50 bg-primary/15 text-primary'
											: 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
									}`}
								>
									{p.name}
								</button>
							))}
							{selectedProfile !== '' && (
								<button
									onClick={() => setSelectedProfile('')}
									className='inline-flex items-center rounded-md border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer'
								>
									× сбросить
								</button>
							)}
						</div>
					</div>
				)}
			</div>

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className='flex-1 flex flex-col'
			>
				<TabsList>
					<TabsTrigger value='general'>Основное</TabsTrigger>
					<TabsTrigger value='profiles'>Профили</TabsTrigger>
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

				<TabsContent value='profiles' className='pt-4'>
					<ProfileEditor
						profiles={meta.profiles ?? []}
						onChange={profiles => updateMeta('profiles', profiles)}
					/>
				</TabsContent>

				<TabsContent value='containers' className='flex-1'>
					<ContainerEditor meta={meta} setMeta={setMeta} slug={slug} />
				</TabsContent>
			</Tabs>

			{/* ── Unsaved changes bar ── */}
			{isFileDirty && (
				<div className='fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300'>
					<div className='flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-lg'>
						<span className='text-sm text-muted-foreground'>
							Есть несохранённые изменения
						</span>
						<button
							onClick={handleReset}
							disabled={isLoading}
							className='flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50'
						>
							<RotateCcwIcon className='size-3' />
							Сбросить
						</button>
						<button
							onClick={handleSaveFile}
							disabled={isLoading}
							className='flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50'
						>
							{isLoading ? (
								<Loader2 className='size-3 animate-spin' />
							) : (
								<SaveIcon className='size-3' />
							)}
							Сохранить
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

function ProfileEditor({
	profiles,
	onChange,
}: {
	profiles: instance.Profile[]
	onChange: (profiles: instance.Profile[]) => void
}) {
	const [editingIdx, setEditingIdx] = useState<number | null>(null)
	const [newName, setNewName] = useState('')
	const [newDesc, setNewDesc] = useState('')
	const [newExtends, setNewExtends] = useState('')

	const profileNames = profiles.map(p => p.name)

	const addProfile = () => {
		if (!newName.trim()) return
		onChange([
			...profiles,
			new instance.Profile({
				name: newName.trim(),
				description: newDesc.trim(),
				extends: newExtends || undefined,
			}),
		])
		setNewName('')
		setNewDesc('')
		setNewExtends('')
	}

	const removeProfile = (idx: number) => {
		onChange(profiles.filter((_, i) => i !== idx))
		if (editingIdx === idx) setEditingIdx(null)
	}

	const updateProfile = (
		idx: number,
		field: keyof instance.Profile,
		val: string,
	) => {
		onChange(
			profiles.map((p, i) =>
				i === idx ? new instance.Profile({ ...p, [field]: val || undefined }) : p,
			),
		)
	}

	return (
		<div className='flex flex-col gap-4'>
			{/* Inheritance diagram */}
			{profiles.length > 0 && (
				<div className='border rounded-xl overflow-hidden bg-card'>
					<div className='px-4 py-3 bg-muted/40 flex items-center gap-2'>
						<LayersIcon className='size-4 text-primary' />
						<span className='font-semibold text-sm'>Дерево наследования</span>
					</div>
					<Separator />
					<div className='p-4 flex flex-wrap items-center gap-2'>
						{profiles.map((p, idx) => (
							<div key={idx} className='flex items-center gap-2'>
								{idx > 0 && (
									<ArrowRightIcon className='size-3.5 text-muted-foreground/40' />
								)}
								<div
									className={`flex flex-col rounded-lg border px-3 py-2 text-xs ${
										p.extends
											? 'border-primary/30 bg-primary/5'
											: 'border-border bg-muted/20'
									}`}
								>
									<span className='font-semibold'>{p.name}</span>
									{p.extends && (
										<span className='text-[10px] text-muted-foreground'>
											↑ {p.extends}
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Profile list */}
			<div className='border rounded-xl overflow-hidden bg-card'>
				<div className='px-4 py-3 bg-muted/40'>
					<span className='font-semibold text-sm'>Профили</span>
				</div>
				<Separator />
				<div className='divide-y divide-border'>
					{profiles.length === 0 && (
						<div className='flex flex-col items-center justify-center py-10 text-muted-foreground'>
							<LayersIcon className='size-8 mb-2 opacity-40' />
							<p className='text-sm'>Нет профилей</p>
							<p className='text-xs opacity-60 mt-0.5'>Добавьте профиль ниже</p>
						</div>
					)}
					{profiles.map((p, idx) => (
						<div key={idx} className='p-4'>
							{editingIdx === idx ? (
								<div className='flex flex-col gap-2'>
									<div className='grid grid-cols-2 gap-2'>
										<div className='space-y-1'>
											<Label className='text-[10px] text-muted-foreground'>
												Название
											</Label>
											<Input
												value={p.name}
												onChange={e => updateProfile(idx, 'name', e.target.value)}
												className='h-7 text-xs'
											/>
										</div>
										<div className='space-y-1'>
											<Label className='text-[10px] text-muted-foreground'>
												Наследует от
											</Label>
											<Select
												value={p.extends ?? ''}
												onValueChange={val =>
													updateProfile(idx, 'extends', val === '__none__' ? '' : val)
												}
											>
												<SelectTrigger size='sm' className='h-7 text-xs w-full'>
													<SelectValue placeholder='— нет —' />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value='__none__'>
														<span className='text-muted-foreground'>— нет —</span>
													</SelectItem>
													{profileNames
														.filter(n => n !== p.name)
														.map(n => (
															<SelectItem key={n} value={n}>
																{n}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
										</div>
									</div>
									<div className='space-y-1'>
										<Label className='text-[10px] text-muted-foreground'>
											Описание
										</Label>
										<Textarea
											value={p.description}
											onChange={e =>
												updateProfile(idx, 'description', e.target.value)
											}
											className='text-xs min-h-0'
											rows={2}
											placeholder='Что входит в этот профиль...'
										/>
									</div>
									<div className='flex justify-end'>
										<Button
											size='sm'
											variant='outline'
											className='text-xs h-7'
											onClick={() => setEditingIdx(null)}
										>
											Готово
										</Button>
									</div>
								</div>
							) : (
								<div className='flex items-start justify-between gap-2'>
									<div className='flex-1 min-w-0'>
										<div className='flex items-center gap-2 flex-wrap'>
											<span className='text-sm font-semibold'>{p.name}</span>
											{p.extends && (
												<span className='inline-flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5'>
													<ArrowRightIcon className='size-2.5' /> {p.extends}
												</span>
											)}
										</div>
										{p.description && (
											<p className='text-xs text-muted-foreground mt-0.5 line-clamp-2'>
												{p.description}
											</p>
										)}
									</div>
									<div className='flex gap-1 shrink-0'>
										<button
											onClick={() => setEditingIdx(idx)}
											className='flex items-center justify-center size-7 rounded-lg border border-border hover:bg-primary/15 hover:border-primary/30 text-muted-foreground hover:text-primary transition-colors cursor-pointer text-[11px]'
										>
											✏
										</button>
										<button
											onClick={() => removeProfile(idx)}
											className='flex items-center justify-center size-7 rounded-lg border border-border hover:bg-destructive/15 hover:border-destructive/30 text-muted-foreground hover:text-destructive transition-colors cursor-pointer'
										>
											<Trash2 className='size-3.5' />
										</button>
									</div>
								</div>
							)}
						</div>
					))}
				</div>

				{/* Add new profile */}
				<div className='p-4 border-t border-border bg-muted/10'>
					<p className='text-xs font-semibold text-muted-foreground mb-3'>
						Добавить профиль
					</p>
					<div className='grid grid-cols-2 gap-2 mb-2'>
						<div className='space-y-1'>
							<Label className='text-[10px] text-muted-foreground'>Название</Label>
							<Input
								value={newName}
								onChange={e => setNewName(e.target.value)}
								placeholder='Minimum'
								className='h-7 text-xs'
							/>
						</div>
						<div className='space-y-1'>
							<Label className='text-[10px] text-muted-foreground'>
								Наследует от
							</Label>
							<Select
								value={newExtends}
								onValueChange={val => setNewExtends(val === '__none__' ? '' : val)}
							>
								<SelectTrigger size='sm' className='h-7 text-xs w-full'>
									<SelectValue placeholder='— нет —' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='__none__'>
										<span className='text-muted-foreground'>— нет —</span>
									</SelectItem>
									{profileNames.map(n => (
										<SelectItem key={n} value={n}>
											{n}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className='space-y-1 mb-3'>
						<Label className='text-[10px] text-muted-foreground'>Описание</Label>
						<Textarea
							value={newDesc}
							onChange={e => setNewDesc(e.target.value)}
							placeholder='Минимальный набор модов...'
							className='text-xs min-h-0'
							rows={2}
						/>
					</div>
					<Button
						size='sm'
						className='w-full text-xs h-8'
						onClick={addProfile}
						disabled={!newName.trim()}
					>
						<PlusIcon className='size-3.5' /> Добавить профиль
					</Button>
				</div>
			</div>
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

	const moveContent = useCallback(
		(cIdx: number, fromIdx: number, toIdx: number) => {
			setMeta(prev => {
				const newMeta = new instance.Meta(prev)
				newMeta.containers[cIdx].content = arrayMove(
					newMeta.containers[cIdx].content,
					fromIdx,
					toIdx,
				)
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
							availableProfiles={meta.profiles ?? []}
							onMoveContent={moveContent}
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

function SortableItem({
	id,
	cIdx,
	iIdx,
	item,
	updateContent,
	replaceContent,
	removeContent,
	availableProfiles,
}: {
	id: string
	cIdx: number
	iIdx: number
	item: instance.Content
	updateContent: (cIdx: number, iIdx: number, field: keyof instance.Content, val: any) => void
	replaceContent: (cIdx: number, iIdx: number, c: Partial<instance.Content>) => void
	removeContent: (cIdx: number, iIdx: number) => void
	availableProfiles: instance.Profile[]
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id })

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
		zIndex: isDragging ? 10 : undefined,
		position: 'relative',
	}

	return (
		<div ref={setNodeRef} style={style}>
			<Content
				updateContent={updateContent}
				replaceContent={replaceContent}
				removeContent={removeContent}
				cIdx={cIdx}
				iIdx={iIdx}
				item={item}
				availableProfiles={availableProfiles}
				dragHandleListeners={listeners}
				dragHandleAttributes={attributes}
			/>
		</div>
	)
}

function SortableContentList({
	container,
	cIdx,
	filteredContent,
	searchActive,
	updateContent,
	replaceContent,
	removeContent,
	availableProfiles,
	onMoveContent,
}: {
	container: instance.Container
	cIdx: number
	filteredContent: instance.Content[]
	searchActive: boolean
	updateContent: (cIdx: number, iIdx: number, field: keyof instance.Content, val: any) => void
	replaceContent: (cIdx: number, iIdx: number, c: Partial<instance.Content>) => void
	removeContent: (cIdx: number, iIdx: number) => void
	availableProfiles: instance.Profile[]
	onMoveContent: (cIdx: number, fromIdx: number, toIdx: number) => void
}) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
	)

	const ids = container.content.map((_, i) => String(i))

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event
		if (over && active.id !== over.id) {
			onMoveContent(cIdx, Number(active.id), Number(over.id))
		}
	}

	if (searchActive) {
		return (
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
							availableProfiles={availableProfiles}
						/>
					)
				})}
			</div>
		)
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
		>
			<SortableContext items={ids} strategy={verticalListSortingStrategy}>
				<div className='p-3 space-y-2'>
					{container.content.map((item, i) => (
						<SortableItem
							key={i}
							id={String(i)}
							cIdx={cIdx}
							iIdx={i}
							item={item}
							updateContent={updateContent}
							replaceContent={replaceContent}
							removeContent={removeContent}
							availableProfiles={availableProfiles}
						/>
					))}
				</div>
			</SortableContext>
		</DndContext>
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
	availableProfiles,
	onMoveContent,
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
	availableProfiles: instance.Profile[]
	onMoveContent: (cIdx: number, fromIdx: number, toIdx: number) => void
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
			<SortableContentList
				container={container}
				cIdx={cIdx}
				filteredContent={filteredContent}
				searchActive={!!searchQuery}
				updateContent={updateContent}
				replaceContent={replaceContent}
				removeContent={removeContent}
				availableProfiles={availableProfiles}
				onMoveContent={onMoveContent}
			/>

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
