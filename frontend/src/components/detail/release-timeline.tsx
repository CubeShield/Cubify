import { instance } from 'wailsjs/go/models'
import dayjs from 'dayjs'
import {
	ArrowRightIcon,
	CalendarIcon,
	MinusIcon,
	PackageIcon,
	PaletteIcon,
	PlusIcon,
	RefreshCwIcon,
	SettingsIcon,
	SparklesIcon,
} from 'lucide-react'
import { Badge } from '../ui/badge'

const CONTAINER_LABELS: Record<
	string,
	{ label: string; icon: typeof PackageIcon }
> = {
	mods: { label: 'Моды', icon: PackageIcon },
	resourcepacks: { label: 'Ресурспаки', icon: PaletteIcon },
}

export function ReleaseTimeline({
	releases,
}: {
	releases: instance.Release[]
}) {
	if (!releases?.length) return null

	return (
		<div className='mt-6'>
			<h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2'>
				<SparklesIcon className='size-4' />
				История обновлений
			</h3>
			<div className='relative'>
				{/* timeline line */}
				<div className='absolute left-3.75 top-3 bottom-3 w-px bg-border' />

				<div className='flex flex-col gap-0'>
					{releases.map((release, index) => {
						const isLatest = index === 0
						const cl = release.changelog
						const hasChangelog =
							cl &&
							((cl.meta_changes && cl.meta_changes.length > 0) ||
								(cl.containers && cl.containers.length > 0))

						return (
							<div key={index} className='relative flex gap-4 pb-6 last:pb-0'>
								{/* dot */}
								<div className='relative z-10 flex items-center justify-center shrink-0'>
									<div
										className={`size-2.5 rounded-full ring-4 ring-background mt-1.5 ${
											isLatest
												? 'bg-primary shadow-[0_0_8px_2px] shadow-primary/40'
												: 'bg-muted-foreground/40'
										}`}
									/>
								</div>

								{/* content */}
								<div
									className={`flex-1 rounded-xl border p-4 transition-colors ${
										isLatest
											? 'bg-primary/5 border-primary/20'
											: 'bg-card hover:bg-muted/30'
									}`}
								>
									{/* header */}
									<div className='flex items-center justify-between gap-2 mb-1'>
										<div className='flex items-center gap-2'>
											<h4 className='font-semibold'>{release.name}</h4>
											{isLatest && (
												<Badge
													variant='default'
													className='text-[10px] px-1.5 py-0'
												>
													Новое
												</Badge>
											)}
										</div>
										<Badge
											variant='outline'
											className='text-[10px] font-mono shrink-0'
										>
											{release.tag_name}
										</Badge>
									</div>
									<div className='flex items-center gap-1.5 text-xs text-muted-foreground mb-3'>
										<CalendarIcon className='size-3' />
										{dayjs(release.created_at).format('D MMMM YYYY, HH:mm')}
									</div>

									{/* message (from changelog or body) */}
									{(cl?.message || release.body) && (
										<p className='text-sm text-muted-foreground whitespace-pre-line leading-relaxed mb-3'>
											{cl?.message || release.body}
										</p>
									)}

									{/* changelog details */}
									{hasChangelog && (
										<div className='flex flex-col gap-3'>
											{/* meta changes */}
											{cl.meta_changes && cl.meta_changes.length > 0 && (
												<MetaChangesBlock changes={cl.meta_changes} />
											)}

											{/* container changes */}
											{cl.containers &&
												cl.containers.map((cc, ccIdx) => (
													<ContainerChangesBlock key={ccIdx} changes={cc} />
												))}
										</div>
									)}
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}

/* ── Meta changes (version, loader, etc.) ── */
function MetaChangesBlock({ changes }: { changes: instance.MetaChange[] }) {
	return (
		<div className='rounded-lg border bg-muted/20 overflow-hidden'>
			<div className='flex items-center gap-2 px-3 py-2 bg-muted/30 border-b'>
				<SettingsIcon className='size-3.5 text-muted-foreground' />
				<span className='text-xs font-semibold text-muted-foreground'>
					Настройки
				</span>
			</div>
			<div className='divide-y divide-border'>
				{changes.map((change, idx) => (
					<div key={idx} className='flex items-center gap-2 px-3 py-2 text-xs'>
						<span className='text-muted-foreground font-medium min-w-24'>
							{change.label}
						</span>
						{change.old_value && (
							<>
								<Badge
									variant='outline'
									className='text-[10px] font-mono line-through opacity-60'
								>
									{change.old_value}
								</Badge>
								<ArrowRightIcon className='size-3 text-muted-foreground shrink-0' />
							</>
						)}
						<Badge variant='secondary' className='text-[10px] font-mono'>
							{change.new_value}
						</Badge>
					</div>
				))}
			</div>
		</div>
	)
}

/* ── Container changes (mods added/removed/updated) ── */
function ContainerChangesBlock({
	changes,
}: {
	changes: instance.ContainerChanges
}) {
	const cfg = CONTAINER_LABELS[changes.content_type] ?? {
		label: changes.content_type,
		icon: PackageIcon,
	}
	const Icon = cfg.icon

	const added = changes.added ?? []
	const removed = changes.removed ?? []
	const updated = changes.updated ?? []
	const total = added.length + removed.length + updated.length

	if (total === 0) return null

	return (
		<div className='rounded-lg border bg-muted/20 overflow-hidden'>
			<div className='flex items-center justify-between px-3 py-2 bg-muted/30 border-b'>
				<div className='flex items-center gap-2'>
					<Icon className='size-3.5 text-muted-foreground' />
					<span className='text-xs font-semibold text-muted-foreground'>
						{cfg.label}
					</span>
				</div>
				<div className='flex items-center gap-1.5'>
					{added.length > 0 && (
						<span className='text-[10px] text-emerald-400 font-medium'>
							+{added.length}
						</span>
					)}
					{updated.length > 0 && (
						<span className='text-[10px] text-amber-400 font-medium'>
							~{updated.length}
						</span>
					)}
					{removed.length > 0 && (
						<span className='text-[10px] text-red-400 font-medium'>
							-{removed.length}
						</span>
					)}
				</div>
			</div>
			<div className='divide-y divide-border'>
				{added.map((item, idx) => (
					<ChangelogRow key={`a-${idx}`} item={item} type='added' />
				))}
				{updated.map((item, idx) => (
					<ChangelogRow key={`u-${idx}`} item={item} type='updated' />
				))}
				{removed.map((item, idx) => (
					<ChangelogRow key={`r-${idx}`} item={item} type='removed' />
				))}
			</div>
		</div>
	)
}

/* ── Single changelog row ── */
function ChangelogRow({
	item,
	type,
}: {
	item: instance.ChangelogContentRef
	type: 'added' | 'removed' | 'updated'
}) {
	const styles = {
		added: {
			icon: PlusIcon,
			color: 'text-emerald-400',
			bg: 'bg-emerald-500/10',
		},
		removed: {
			icon: MinusIcon,
			color: 'text-red-400',
			bg: 'bg-red-500/10',
		},
		updated: {
			icon: RefreshCwIcon,
			color: 'text-amber-400',
			bg: 'bg-amber-500/10',
		},
	}

	const s = styles[type]
	const IconComp = s.icon

	return (
		<div className='flex items-center gap-2.5 px-3 py-1.5'>
			<div
				className={`flex items-center justify-center size-5 rounded ${s.bg} shrink-0`}
			>
				<IconComp className={`size-3 ${s.color}`} />
			</div>
			{item.image_url && (
				<img
					src={item.image_url}
					className='size-5 rounded object-cover shrink-0'
					alt={item.name}
				/>
			)}
			<span
				className={`text-xs font-medium ${type === 'removed' ? 'line-through opacity-60' : ''}`}
			>
				{item.name}
			</span>
		</div>
	)
}
