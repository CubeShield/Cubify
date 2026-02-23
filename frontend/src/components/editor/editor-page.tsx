import { useEffect, useState } from 'react'
import {
	SaveProjectMeta,
	SyncProject,
	ReleaseProject,
	GetProjectHistory,
	CheckProjectStatus,
	GetContentFromURL, // <--- Добавил импорт
} from '../../../wailsjs/go/main/App'
import { editor, github } from '../../../wailsjs/go/models'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
	GitCommitVertical,
	SaveIcon,
	Tag,
	HistoryIcon,
	PlusIcon,
	Trash2,
	RefreshCcw,
	LinkIcon, // <--- Добавил иконку
	Loader2, // <--- Добавил иконку
} from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog'
import { Badge } from '../ui/badge'
import { Card } from '../ui/card'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Content } from './editor-content'

interface EditorPageProps {
	project: editor.Project
	onRefresh: () => void
}

export function EditorPage({ project, onRefresh }: EditorPageProps) {
	const [meta, setMeta] = useState<github.Meta>(project.meta)

	const [isGitDirty, setGitDirty] = useState(false)
	const [commits, setCommits] = useState<editor.Commit[]>([])
	const [tags, setTags] = useState<string[]>([])

	const [commitMsg, setCommitMsg] = useState('')
	const [tagName, setTagName] = useState('')
	const [isLoading, setLoading] = useState(false)
	const [activeTab, setActiveTab] = useState('general')

	const [initialJson, setInitialJson] = useState(JSON.stringify(project.meta))
	const isFileDirty = JSON.stringify(meta) !== initialJson

	const loadGitInfo = async () => {
		const status = await CheckProjectStatus(project.path)
		setGitDirty(status)
		const g = await GetProjectHistory(project.path)
		if (g) {
			setCommits(g.commits || [])
			setTags(g.tags || [])
		}
	}

	useEffect(() => {
		setMeta(project.meta)
		setInitialJson(JSON.stringify(project.meta))
		loadGitInfo()
	}, [project])

	const handleSaveFile = async () => {
		setLoading(true)
		try {
			await SaveProjectMeta(project.path, meta)
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
			await SyncProject(project.path, commitMsg)
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
			await ReleaseProject(project.path, tagName)
			setTagName('')
			await loadGitInfo()
			alert('Релиз создан!')
		} catch (e) {
			alert('Ошибка релиза: ' + e)
		} finally {
			setLoading(false)
		}
	}

	const updateMeta = (field: keyof github.Meta, value: any) => {
		setMeta(prev => {
			const newMeta = new github.Meta(prev)
			// @ts-ignore
			newMeta[field] = value
			return newMeta
		})
	}

	return (
		<div className='flex flex-col h-full gap-4'>
			<div className='flex items-center justify-between pb-4 border-b'>
				<div className='flex flex-col'>
					<h2 className='text-2xl font-bold flex items-center gap-2'>
						{meta.name}
						{isFileDirty && (
							<Badge variant='destructive' className='animate-pulse'>
								Не сохранено
							</Badge>
						)}
						{!isFileDirty && isGitDirty && (
							<Badge
								variant='outline'
								className='border-yellow-500 text-yellow-500'
							>
								Изменено (Git)
							</Badge>
						)}
					</h2>
					<span className='text-xs text-muted-foreground font-mono'>
						{project.path}
					</span>
				</div>

				<div className='flex items-center gap-2'>
					<Button
						onClick={handleSaveFile}
						disabled={!isFileDirty || isLoading}
						variant={isFileDirty ? 'default' : 'secondary'}
					>
						<SaveIcon className='mr-2 h-4 w-4' />
						Сохранить
					</Button>

					<Dialog>
						<DialogTrigger asChild>
							<Button variant='outline' disabled={isFileDirty || !isGitDirty}>
								<GitCommitVertical className='mr-2 h-4 w-4' />
								Push Changes
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
							<Button variant='ghost' size='icon'>
								<HistoryIcon className='h-5 w-5' />
							</Button>
						</DialogTrigger>
						<DialogContent className='max-w-2xl max-h-[80vh] overflow-auto'>
							<DialogHeader>
								<DialogTitle>История проекта</DialogTitle>
							</DialogHeader>
							<div className='grid gap-6'>
								<div className='flex gap-2 p-4 border rounded-lg bg-muted/20 items-end'>
									<div className='grid w-full gap-1.5'>
										<Label>Новый релиз</Label>
										<Input
											placeholder='v1.0.0'
											value={tagName}
											onChange={e => setTagName(e.target.value)}
										/>
									</div>
									<Button onClick={handleRelease} disabled={isLoading}>
										<Tag className='mr-2 h-4 w-4' /> Создать
									</Button>
								</div>

								<div>
									<h4 className='font-bold mb-2'>Теги</h4>
									<div className='flex flex-wrap gap-2'>
										{tags.map(t => (
											<Badge key={t} variant='secondary'>
												{t}
											</Badge>
										))}
										{tags.length === 0 && (
											<span className='text-muted-foreground text-sm'>
												Нет тегов
											</span>
										)}
									</div>
								</div>
								<div>
									<h4 className='font-bold mb-2'>Последние коммиты</h4>
									<div className='space-y-2'>
										{commits.map(c => (
											<div
												key={c.hash}
												className='flex justify-between text-sm border-b pb-2'
											>
												<span className='font-mono text-xs bg-muted px-1 rounded'>
													{c.hash}
												</span>
												<span className='truncate flex-1 mx-4'>
													{c.message}
												</span>
												<span className='text-muted-foreground text-xs whitespace-nowrap'>
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

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className='flex-1 flex flex-col'
			>
				<TabsList>
					<TabsTrigger value='general'>Основное</TabsTrigger>
					<TabsTrigger value='containers'>Контейнеры</TabsTrigger>
				</TabsList>

				<TabsContent value='general' className='space-y-4 pt-4'>
					<div className='grid grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label>Название</Label>
							<Input
								value={meta.name}
								onChange={e => updateMeta('name', e.target.value)}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Версия Minecraft</Label>
							<Input
								value={meta.minecraft_version}
								onChange={e => updateMeta('minecraft_version', e.target.value)}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Loader</Label>
							<Input
								value={meta.loader}
								onChange={e => updateMeta('loader', e.target.value)}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Loader Version</Label>
							<Input
								value={meta.loader_version}
								onChange={e => updateMeta('loader_version', e.target.value)}
							/>
						</div>
						<div className='col-span-2 space-y-2'>
							<Label>Описание</Label>
							<Textarea
								value={meta.description}
								onChange={e => updateMeta('description', e.target.value)}
							/>
						</div>
					</div>
				</TabsContent>

				<TabsContent value='containers' className='flex-1'>
					<ContainerEditor meta={meta} setMeta={setMeta} />
				</TabsContent>
			</Tabs>
		</div>
	)
}

function ContainerEditor({
	meta,
	setMeta,
}: {
	meta: github.Meta
	setMeta: (m: github.Meta) => void
}) {
	// Состояние для диалога добавления по URL
	const [openUrlDialog, setOpenUrlDialog] = useState<number | null>(null)
	const [urlToAdd, setUrlToAdd] = useState('')
	const [isUrlLoading, setUrlLoading] = useState(false)

	const addContainer = (type: string) => {
		const newMeta = new github.Meta(meta)
		newMeta.containers.push(
			new github.Container({
				content_type: type,
				content: [],
			}),
		)
		setMeta(newMeta)
	}

	const deleteContainer = (idx: number) => {
		const newMeta = new github.Meta(meta)
		newMeta.containers.splice(idx, 1)
		setMeta(newMeta)
	}

	const addContent = (containerIdx: number) => {
		const newMeta = new github.Meta(meta)
		newMeta.containers[containerIdx].content.push(
			new github.Content({
				name: 'New Mod',
				file: 'mod.jar',
				url: 'https://...',
				type: 'both',
			}),
		)
		setMeta(newMeta)
	}

	// Функция добавления контента по ссылке
	const handleAddFromUrl = async (cIdx: number) => {
		if (!urlToAdd) return
		setUrlLoading(true)
		try {
			const content = await GetContentFromURL(urlToAdd)
			const newMeta = new github.Meta(meta)

			// Если type пустой, ставим both
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
	}

	const updateContent = (
		cIdx: number,
		itemIdx: number,
		field: keyof github.Content,
		val: any,
	) => {
		const newMeta = new github.Meta(meta)
		// @ts-ignore
		newMeta.containers[cIdx].content[itemIdx][field] = val
		setMeta(newMeta)
	}

	const removeContent = (cIdx: number, itemIdx: number) => {
		const newMeta = new github.Meta(meta)
		newMeta.containers[cIdx].content.splice(itemIdx, 1)
		setMeta(newMeta)
	}

	return (
		<div className='flex flex-col gap-4 h-full'>
			<div className='flex gap-2'>
				<Button
					size='sm'
					variant='outline'
					onClick={() => addContainer('mods')}
				>
					+ Моды
				</Button>
				<Button
					size='sm'
					variant='outline'
					onClick={() => addContainer('resourcepacks')}
				>
					+ Ресурспаки
				</Button>
			</div>

			<div className='space-y-4 pb-10'>
				{meta.containers.map((container, cIdx) => (
					<Card key={cIdx} className='p-4 border-l-4 border-l-primary'>
						<div className='flex justify-between items-center mb-4'>
							<div className='flex items-center gap-2'>
								<h3 className='font-bold text-lg capitalize'>
									{container.content_type}
								</h3>
								<Badge variant='secondary'>
									{container.content.length} Элемент(ов)
								</Badge>
							</div>
							<Button
								size='icon'
								variant='ghost'
								onClick={() => deleteContainer(cIdx)}
							>
								<Trash2 className='text-destructive h-4 w-4' />
							</Button>
						</div>

						<div className='space-y-2'>
							{container.content.map((item, iIdx) => (
								<Content
									key={iIdx}
									updateContent={updateContent}
									removeContent={removeContent}
									cIdx={cIdx}
									iIdx={iIdx}
									item={item}
								/>
							))}

							<div className='flex gap-2 pt-2'>
								{/* Кнопка ручного добавления */}
								<Button
									variant='ghost'
									size='sm'
									className='flex-1 border-dashed border'
									onClick={() => addContent(cIdx)}
								>
									<PlusIcon className='h-4 w-4' /> Добавить вручную
								</Button>

								{/* Кнопка добавления по ссылке */}
								<Dialog
									open={openUrlDialog === cIdx}
									onOpenChange={open => {
										setOpenUrlDialog(open ? cIdx : null)
										if (!open) setUrlToAdd('')
									}}
								>
									<DialogTrigger asChild>
										<Button
											variant='outline'
											size='sm'
											className='flex-1 border-dashed border-primary/50 hover:bg-primary/10'
										>
											<LinkIcon className='h-4 w-4' /> Из URL
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>Добавить мод по ссылке</DialogTitle>
										</DialogHeader>
										<div className='space-y-4 py-2'>
											<Label>Ссылка на CurseForge / Modrinth / GitHub</Label>
											<Input
												placeholder='https://...'
												value={urlToAdd}
												onChange={e => setUrlToAdd(e.target.value)}
											/>
											<Button
												className='w-full'
												onClick={() => handleAddFromUrl(cIdx)}
												disabled={isUrlLoading || !urlToAdd}
											>
												{isUrlLoading ? (
													<Loader2 className='mr-2 h-4 w-4 animate-spin' />
												) : (
													<PlusIcon className='mr-2 h-4 w-4' />
												)}
												Добавить
											</Button>
										</div>
									</DialogContent>
								</Dialog>
							</div>
						</div>
					</Card>
				))}
				{meta.containers.length === 0 && (
					<div className='text-center text-muted-foreground py-10'>
						Нет контейнеров. Добавьте контейнер для модов или ресурспаков.
					</div>
				)}
			</div>
		</div>
	)
}
