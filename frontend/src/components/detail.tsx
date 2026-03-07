import { instance } from 'wailsjs/go/models'
import dayjs from 'dayjs'
import {
	BoxIcon,
	CodeIcon,
	Loader2,
	RocketIcon,
	ServerIcon,
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
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime'

interface InstanceDetailProps {
	instance: instance.LocalInstance
	devMode: boolean
	onDeleted?: () => void
}

const CONTAINERS: Record<string, string> = {
	mods: 'Моды',
	resourcepacks: 'Ресурспаки',
}

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

	return (
		<div className='flex flex-col h-full'>
			<div className='pb-4 border-b mb-4'>
				<div className='flex items-start justify-between'>
					<div>
						<img
							src={meta.image_url}
							className='size-32 rounded-3xl mb-4'
						></img>
						<h2 className='text-3xl font-bold'>{meta?.name ?? inst.slug}</h2>
						<h3 className='text-l font-medium text-zinc-400'>
							{meta?.description}
						</h3>
					</div>
					<DeleteInstanceButton
						slug={inst.slug}
						name={meta?.name ?? inst.slug}
						onDeleted={onDeleted}
					/>
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
					<Releases instance={inst} devMode={devMode} />
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
		<div className='flex flex-col items-start gap-2 mb-4 p-4 border rounded-xl bg-muted/30'>
			<div className='flex flex-col gap-1'>
				<span className='font-medium'>Режим разработки</span>
				<span className='text-sm text-muted-foreground'>
					Склонировать репозиторий, чтобы редактировать сборку, используйте это,
					только если у вас есть Git
				</span>
			</div>
			<Button onClick={handleClone} disabled={isCloning}>
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

function Releases({ instance: inst, devMode }: ReleasesProps) {
	const latestRelease = inst.releases?.[0]
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

	if (!latestRelease) {
		return (
			<div className='text-muted-foreground text-center py-10'>
				Нет доступных релизов
			</div>
		)
	}

	return (
		<>
			{devMode && (
				<div className='flex flex-col gap-3 p-4 border rounded-xl bg-muted/30 mb-4'>
					<div className='flex items-center gap-2'>
						<ServerIcon className='size-5' />
						<span className='font-medium'>Деплой на сервер</span>
					</div>
					<span className='text-sm text-muted-foreground'>
						Выберите версию для установки на сервер через FTP
					</span>
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
			)}
			<div className='flex gap-2 mt-2'>
				{latestRelease.Meta.containers?.map((container, idx) => (
					<div
						key={idx}
						className='flex items-center gap-1 p-2 border rounded-xl bg-muted/30'
					>
						<BoxIcon className='size-4' />
						{CONTAINERS[container.content_type] ?? container.content_type}
						<Badge>{container.content?.length ?? 0}</Badge>
					</div>
				))}
			</div>
			<div className='flex flex-col gap-3 mt-4'>
				{inst.releases.map((release, index) => (
					<div
						key={index}
						className='border rounded-2xl p-3 flex flex-col gap-2 bg-muted/30'
					>
						<div className='flex flex-col gap-1'>
							<h1 className='font-semibold text-2xl'>
								Обновление {release.name}
							</h1>
							<Badge>{dayjs(release.created_at).format('D MMMM HH:mm')}</Badge>
						</div>
						<span>{release.body}</span>
					</div>
				))}
			</div>
		</>
	)
}

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
