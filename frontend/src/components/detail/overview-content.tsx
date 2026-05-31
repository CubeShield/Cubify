import { useCallback, useMemo, useState } from 'react'
import { instance } from 'wailsjs/go/models'
import { BoxIcon, LayersIcon } from 'lucide-react'
import { ContainerCard } from './container-card'
import { DeploySection } from './deploy-section'
import { ReleaseTimeline } from './release-timeline'
import { GetLocalInstances } from '../../../wailsjs/go/main/App'
import { useApp } from '../../context/app-context'
import { Separator } from '../ui/separator'

interface OverviewContentProps {
	instance: instance.LocalInstance
	devMode: boolean
	onInstanceUpdated?: (inst: instance.LocalInstance) => void
}

export function OverviewContent({
	instance: inst,
	devMode,
	onInstanceUpdated,
}: OverviewContentProps) {
	const { selectedProfile, setSelectedProfile } = useApp()
	const [localExtra, setLocalExtra] = useState<instance.Container[]>(
		inst.extra_containers ?? [],
	)

	const latestRelease = inst.releases?.[0]

	// Refresh extra containers from disk
	const handleExtraChanged = useCallback(async () => {
		try {
			const all = await GetLocalInstances()
			const updated = all.find(i => i.slug === inst.slug)
			if (updated) {
				setLocalExtra(updated.extra_containers ?? [])
				onInstanceUpdated?.(updated)
			}
		} catch (err) {
			console.error('Failed to refresh extra containers:', err)
		}
	}, [inst.slug, onInstanceUpdated])

	// Find extra content for a given content type
	const getExtra = useCallback(
		(contentType: string) =>
			localExtra.find(e => e.content_type === contentType)?.content ?? [],
		[localExtra],
	)

	// Extra containers with types not present in the release
	const releaseTypes = useMemo(
		() => new Set(latestRelease?.Meta?.containers?.map(c => c.content_type)),
		[latestRelease],
	)
	const extraOnlyContainers = useMemo(
		() => localExtra.filter(e => !releaseTypes.has(e.content_type)),
		[localExtra, releaseTypes],
	)

	if (!latestRelease) {
		return (
			<div className='flex flex-col items-center justify-center py-16 text-muted-foreground'>
				<BoxIcon className='size-10 mb-3 opacity-40' />
				<p className='text-sm'>Нет доступных релизов</p>
			</div>
		)
	}

	const profiles = latestRelease.Meta?.profiles ?? []
	const activeProfile = profiles.find(p => p.name === selectedProfile)

	return (
		<>
			{devMode && <DeploySection inst={inst} />}

			{/* Profile selector */}
			{profiles.length > 0 && (
				<div className='border rounded-xl overflow-hidden bg-card mb-4'>
					<div className='flex items-center gap-2 px-4 py-3 bg-muted/40'>
						<div className='flex items-center justify-center size-8 rounded-lg bg-primary/15'>
							<LayersIcon className='size-4 text-primary' />
						</div>
						<span className='font-semibold text-sm'>Профиль сборки</span>
					</div>
					<Separator />
					<div className='p-4 flex flex-col gap-3'>
						<div className='flex flex-wrap gap-2'>
							{profiles.map(p => (
								<button
									key={p.name}
									onClick={() =>
										setSelectedProfile(selectedProfile === p.name ? '' : p.name)
									}
									className={`inline-flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
										selectedProfile === p.name
											? 'border-primary/50 bg-primary/10 text-primary'
											: 'border-border hover:border-primary/30 hover:bg-primary/5 text-foreground'
									}`}
								>
									<span className='text-xs font-semibold'>{p.name}</span>
									{p.extends && (
										<span className='text-[10px] text-muted-foreground'>
											extends {p.extends}
										</span>
									)}
								</button>
							))}
						</div>
						{activeProfile?.description && (
							<p className='text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2'>
								{activeProfile.description}
							</p>
						)}
						{selectedProfile === '' && (
							<p className='text-xs text-muted-foreground opacity-60'>
								Профиль не выбран — будет загружен весь контент
							</p>
						)}
					</div>
				</div>
			)}

			{/* Container cards grid */}
			{((latestRelease.Meta.containers &&
				latestRelease.Meta.containers.length > 0) ||
				extraOnlyContainers.length > 0) && (
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					{latestRelease.Meta.containers?.map((container, idx) => (
						<ContainerCard
							key={idx}
							container={container}
							extraContent={getExtra(container.content_type)}
							slug={inst.slug}
							onChanged={handleExtraChanged}
						/>
					))}
					{extraOnlyContainers.map((ec, idx) => (
						<ContainerCard
							key={`extra-${idx}`}
							container={
								new instance.Container({
									content_type: ec.content_type,
									content: [],
								})
							}
							extraContent={ec.content ?? []}
							slug={inst.slug}
							onChanged={handleExtraChanged}
						/>
					))}
				</div>
			)}

			{/* Release timeline */}
			<ReleaseTimeline releases={inst.releases} />
		</>
	)
}
