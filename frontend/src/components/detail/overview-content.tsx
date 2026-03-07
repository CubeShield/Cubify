import { useCallback, useMemo, useState } from 'react'
import { instance } from 'wailsjs/go/models'
import { BoxIcon } from 'lucide-react'
import { ContainerCard } from './container-card'
import { DeploySection } from './deploy-section'
import { ReleaseTimeline } from './release-timeline'
import { GetLocalInstances } from '../../../wailsjs/go/main/App'

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

	return (
		<>
			{devMode && <DeploySection inst={inst} />}

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
