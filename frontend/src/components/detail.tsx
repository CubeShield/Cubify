import { instance } from 'wailsjs/go/models'
import dayjs from 'dayjs'
import { BoxIcon, CodeIcon, Loader2 } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { EditorPage } from './editor/editor-page'
import { useEffect, useState } from 'react'
import {
	HasEditor,
	LoadProjectMeta,
	CloneProject,
} from '../../wailsjs/go/main/App'

interface InstanceDetailProps {
	instance: instance.LocalInstance
}

const CONTAINERS: Record<string, string> = {
	mods: 'Моды',
	resourcepacks: 'Ресурспаки',
}

export function InstanceDetail({ instance: inst }: InstanceDetailProps) {
	const [hasEditor, setHasEditor] = useState(false)
	const [editorMeta, setEditorMeta] = useState<instance.Meta | null>(null)
	const [activeTab, setActiveTab] = useState('overview')

	const latestRelease = inst.releases?.[0]
	const meta = latestRelease?.Meta

	const loadEditorData = async () => {
		try {
			const has = await HasEditor(inst.slug)
			setHasEditor(has)
			if (has) {
				const m = await LoadProjectMeta(inst.slug)
				setEditorMeta(m)
			} else {
				setEditorMeta(null)
			}
		} catch {
			setHasEditor(false)
			setEditorMeta(null)
		}
	}

	useEffect(() => {
		loadEditorData()
		setActiveTab('overview')
	}, [inst.slug])

	return (
		<div className='flex flex-col h-full'>
			<div className='pb-4 border-b mb-4'>
				<h2 className='text-3xl font-bold'>{meta?.name ?? inst.slug}</h2>
				<h3 className='text-l font-medium text-zinc-400'>
					{meta?.description}
				</h3>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className='flex-1 flex flex-col'
			>
				<TabsList>
					<TabsTrigger value='overview'>Обзор</TabsTrigger>
					{hasEditor && <TabsTrigger value='editor'>Редактор</TabsTrigger>}
				</TabsList>

				<TabsContent value='overview' className='flex-1 pt-4'>
					{!hasEditor && inst.repo && (
						<EnableEditorButton
							slug={inst.slug}
							onDone={() => {
								loadEditorData().then(() => setActiveTab('editor'))
							}}
						/>
					)}
					<Releases instance={inst} />
				</TabsContent>

				{hasEditor && editorMeta && (
					<TabsContent value='editor' className='flex-1 pt-4'>
						<EditorPage
							slug={inst.slug}
							initialMeta={editorMeta}
							onRefresh={loadEditorData}
						/>
					</TabsContent>
				)}
			</Tabs>
		</div>
	)
}

interface ReleasesProps {
	instance: instance.LocalInstance
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
					Склонировать репозиторий, чтобы редактировать сборку
				</span>
			</div>
			<Button onClick={handleClone} disabled={isCloning}>
				{isCloning ? (
					<Loader2 className='mr-2 h-4 w-4 animate-spin' />
				) : (
					<CodeIcon className='mr-2 h-4 w-4' />
				)}
				{isCloning ? 'Клонирование...' : 'Включить режим разработки'}
			</Button>
			{error && <span className='text-sm text-destructive'>{error}</span>}
		</div>
	)
}

function Releases({ instance: inst }: ReleasesProps) {
	const latestRelease = inst.releases?.[0]

	if (!latestRelease) {
		return (
			<div className='text-muted-foreground text-center py-10'>
				Нет доступных релизов
			</div>
		)
	}

	return (
		<>
			<div className='flex gap-2 mt-2'>
				{latestRelease.Meta.containers?.map((container, idx) => (
					<div
						key={idx}
						className='flex items-center gap-1 p-2 border rounded-xl'
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
						className='border rounded-2xl p-3 flex flex-col gap-2'
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
