import { instance } from 'wailsjs/go/models'
import { BoxIcon } from 'lucide-react'
import { ContainerCard } from './container-card'
import { DeploySection } from './deploy-section'
import { ReleaseTimeline } from './release-timeline'

interface OverviewContentProps {
	instance: instance.LocalInstance
	devMode: boolean
}

export function OverviewContent({
	instance: inst,
	devMode,
}: OverviewContentProps) {
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
