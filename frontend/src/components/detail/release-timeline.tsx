import { instance } from 'wailsjs/go/models'
import dayjs from 'dayjs'
import { CalendarIcon, SparklesIcon } from 'lucide-react'
import { Badge } from '../ui/badge'

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
									<div className='flex items-center gap-1.5 text-xs text-muted-foreground mb-2'>
										<CalendarIcon className='size-3' />
										{dayjs(release.created_at).format('D MMMM YYYY, HH:mm')}
									</div>
									{release.body && (
										<p className='text-sm text-muted-foreground whitespace-pre-line leading-relaxed'>
											{release.body}
										</p>
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
