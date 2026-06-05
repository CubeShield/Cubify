import { useCallback, useMemo, useState } from 'react'
import { instance } from 'wailsjs/go/models'
import { BoxIcon, CheckIcon, InfinityIcon, LayersIcon } from 'lucide-react'
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
					<div className='flex items-center gap-2.5 px-4 py-3 bg-linear-to-r from-primary/10 via-primary/5 to-transparent'>
						<div className='flex items-center justify-center size-8 rounded-lg bg-primary/20'>
							<LayersIcon className='size-4 text-primary' />
						</div>
						<div>
							<p className='font-semibold text-sm leading-none'>Профиль сборки</p>
							<p className='text-[11px] text-muted-foreground mt-0.5'>
								{selectedProfile ? `Активен: ${selectedProfile}` : 'Весь контент'}
							</p>
						</div>
					</div>
					<Separator />
					<div className='p-3 flex flex-col gap-1.5'>
						{/* Default — all content */}
						<ProfileCard
							icon={InfinityIcon}
							name='Полный'
							description='Полностью готовая сборка, можно просто нажать Играть'
							selected={selectedProfile === ''}
							onClick={() => setSelectedProfile('')}
						/>
						{profiles.map(p => (
							<ProfileCard
								key={p.name}
								icon={BoxIcon}
								name={p.name}
								description={p.description || (p.extends ? `extends ${p.extends}` : undefined)}
								selected={selectedProfile === p.name}
								onClick={() =>
									setSelectedProfile(selectedProfile === p.name ? '' : p.name)
								}
							/>
						))}
					</div>
				</div>
			)}

			{/* Container cards grid */}
			{((latestRelease.Meta.containers &&
				latestRelease.Meta.containers.length > 0) ||
				extraOnlyContainers.length > 0) && (
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					{latestRelease.Meta.containers?.filter(c => c.content_type !== 'config').map((container, idx) => (
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

function ProfileCard({
	icon: Icon,
	name,
	description,
	selected,
	onClick,
}: {
	icon: React.ElementType
	name: string
	description?: string
	selected: boolean
	onClick: () => void
}) {
	return (
		<button
			onClick={onClick}
			className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all cursor-pointer group ${
				selected
					? 'border-primary/40 bg-primary/8 ring-1 ring-primary/15'
					: 'border-border hover:border-primary/20 hover:bg-muted/30'
			}`}
		>
			<div
				className={`flex items-center justify-center size-8 rounded-md shrink-0 transition-colors ${
					selected ? 'bg-primary/20' : 'bg-muted group-hover:bg-muted/60'
				}`}
			>
				<Icon
					className={`size-4 transition-colors ${selected ? 'text-primary' : 'text-muted-foreground'}`}
				/>
			</div>
			<div className='flex-1 min-w-0'>
				<p
					className={`text-sm font-semibold leading-none truncate ${selected ? 'text-primary' : ''}`}
				>
					{name}
				</p>
				{description && (
					<p className='text-xs text-muted-foreground mt-0.5 truncate'>
						{description}
					</p>
				)}
			</div>
			{selected && <CheckIcon className='size-4 text-primary shrink-0' />}
		</button>
	)
}
