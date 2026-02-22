import { useEffect, useState } from 'react'
import {
	SaveProjectMeta,
	SyncProject,
	ReleaseProject,
	GetProjectHistory,
	CheckProjectStatus,
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

interface EditorPageProps {
	project: editor.Project
	onRefresh: () => void // Чтобы обновить сайдбар при смене имени
}

export function EditorPage({ project, onRefresh }: EditorPageProps) {
	// Состояние меты (редактируемое)
	const [meta, setMeta] = useState<github.Meta>(project.meta)

	// Гит состояние
	const [isGitDirty, setGitDirty] = useState(false)
	const [commits, setCommits] = useState<editor.Commit[]>([])
	const [tags, setTags] = useState<string[]>([])

	// UI состояние
	const [commitMsg, setCommitMsg] = useState('')
	const [tagName, setTagName] = useState('')
	const [isLoading, setLoading] = useState(false)
	const [activeTab, setActiveTab] = useState('general')

	// Проверка на несохраненные изменения на диск
	// Сравниваем JSON текущего стейта с JSON при загрузке
	const [initialJson, setInitialJson] = useState(JSON.stringify(project.meta))
	const isFileDirty = JSON.stringify(meta) !== initialJson

	const loadGitInfo = async () => {
		const status = await CheckProjectStatus(project.path)
		setGitDirty(status)
		const g = await GetProjectHistory(project.path)
		setCommits(g.commits)
		setTags(g.tags)
	}

	useEffect(() => {
		// При смене проекта сбрасываем стейт
		setMeta(project.meta)
		setInitialJson(JSON.stringify(project.meta))
		loadGitInfo()
	}, [project])

	// 1. Сохранение на диск (instance.json)
	const handleSaveFile = async () => {
		setLoading(true)
		try {
			await SaveProjectMeta(project.path, meta)
			setInitialJson(JSON.stringify(meta))
			await loadGitInfo() // Статус гита должен стать dirty
			onRefresh() // Если поменяли имя
		} catch (e) {
			alert('Ошибка сохранения: ' + e)
		} finally {
			setLoading(false)
		}
	}

	// 2. Git Commit & Push
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

	// 3. Git Release
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

	// Хелпер для обновления полей меты
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
			{/* Верхняя панель: Название и Git статус */}
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
					{/* Кнопка "Сохранить файл" */}
					<Button
						onClick={handleSaveFile}
						disabled={!isFileDirty || isLoading}
						variant={isFileDirty ? 'default' : 'secondary'}
					>
						<SaveIcon className='mr-2 h-4 w-4' />
						Сохранить
					</Button>

					{/* Кнопка "Коммит" (только если файл сохранен, но гит грязный) */}
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

					{/* История и Релизы */}
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
								{/* Форма релиза */}
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

			{/* Основной контент */}
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className='flex-1 flex flex-col'
			>
				<TabsList>
					<TabsTrigger value='general'>Основное</TabsTrigger>
					<TabsTrigger value='containers'>Контент (Моды/Ресурсы)</TabsTrigger>
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

// Компонент редактора контейнеров (вынесен отдельно)
function ContainerEditor({
	meta,
	setMeta,
}: {
	meta: github.Meta
	setMeta: (m: github.Meta) => void
}) {
	// Хелпер для добавления/удаления
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

	// Хелпер для контента внутри контейнера
	const addContent = (containerIdx: number) => {
		const newMeta = new github.Meta(meta)
		// Добавляем заглушку, пользователь отредактирует
		newMeta.containers[containerIdx].content.push(
			new github.Content({
				name: 'New Mod',
				file: 'mod.jar',
				url: 'https://...',
				type: 'both', // client/server/both
			}),
		)
		setMeta(newMeta)
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
					+ Mods Container
				</Button>
				<Button
					size='sm'
					variant='outline'
					onClick={() => addContainer('resourcepacks')}
				>
					+ Resourcepacks
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
									{container.content.length} items
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

						{/* Таблица контента */}
						<div className='space-y-2'>
							{container.content.map((item, iIdx) => (
								<div
									key={iIdx}
									className='grid grid-cols-12 gap-2 items-center bg-muted/40 p-2 rounded-md'
								>
									<Input
										className='col-span-3 h-8'
										value={item.name}
										onChange={e =>
											updateContent(cIdx, iIdx, 'name', e.target.value)
										}
										placeholder='Name'
									/>
									<Input
										className='col-span-3 h-8'
										value={item.file}
										onChange={e =>
											updateContent(cIdx, iIdx, 'file', e.target.value)
										}
										placeholder='filename.jar'
									/>
									<Input
										className='col-span-5 h-8 font-mono text-xs'
										value={item.url}
										onChange={e =>
											updateContent(cIdx, iIdx, 'url', e.target.value)
										}
										placeholder='Download URL'
									/>
									<Button
										size='icon'
										variant='ghost'
										className='col-span-1 h-8 w-8'
										onClick={() => removeContent(cIdx, iIdx)}
									>
										<Trash2 className='h-4 w-4 opacity-50 hover:opacity-100' />
									</Button>
								</div>
							))}
							<Button
								variant='ghost'
								size='sm'
								className='w-full border-dashed border'
								onClick={() => addContent(cIdx)}
							>
								<PlusIcon className='mr-2 h-4 w-4' /> Add File
							</Button>
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
