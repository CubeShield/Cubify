import { instance } from 'wailsjs/go/models'
import { PackageIcon, TagIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { EditorPage } from '../editor/editor-page'
import { useState } from 'react'
import { useEditorData } from '../../hooks/use-editor-data'
import { DeleteInstanceButton } from './delete-instance-button'
import { EnableEditorButton } from './enable-editor-button'
import { OverviewContent } from './overview-content'
import fabric from '../../assets/images/fabric.png'
import forge from '../../assets/images/forge.png'

const LOADERS: Record<string, string> = { fabric, forge }

interface InstanceDetailProps {
	instance: instance.LocalInstance
	devMode: boolean
	onDeleted?: () => void
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

	const totalMods =
		meta?.containers?.reduce((sum, c) => sum + (c.content?.length ?? 0), 0) ?? 0

	return (
		<div className='flex flex-col h-full'>
			{/* ── Hero section ── */}
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
										src={
											LOADERS[
												meta.loader?.toLowerCase() as keyof typeof LOADERS
											]
										}
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
			<div className='py-5' />
		</div>
	)
}
