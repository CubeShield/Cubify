import { ArrowUpCircle, ExternalLink, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { CheckForUpdates } from '../../wailsjs/go/main/App'
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime'

interface UpdateInfo {
	available: boolean
	version: string
	current_version: string
	url: string
}

export function UpdateBanner() {
	const [update, setUpdate] = useState<UpdateInfo | null>(null)
	const [dismissed, setDismissed] = useState(false)

	useEffect(() => {
		CheckForUpdates().then((info: UpdateInfo) => {
			if (info.available) setUpdate(info)
		})
	}, [])

	if (!update || dismissed) return null

	return (
		<div className='fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300'>
			<div className='flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg'>
				<div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15'>
					<ArrowUpCircle className='h-4 w-4 text-primary' />
				</div>
				<div className='flex flex-col gap-0.5'>
					<span className='text-sm font-medium'>Доступна новая версия</span>
					<div className='flex items-center gap-2'>
						<span className='rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground'>
							{update.current_version}
						</span>
						<span className='text-[10px] text-muted-foreground'>→</span>
						<span className='rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary'>
							{update.version}
						</span>
					</div>
				</div>
				<button
					onClick={() => BrowserOpenURL(update.url)}
					className='ml-2 flex h-7 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90'
				>
					Скачать
					<ExternalLink className='h-3 w-3' />
				</button>
				<button
					onClick={() => setDismissed(true)}
					className='ml-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
				>
					<X className='h-3.5 w-3.5' />
				</button>
			</div>
		</div>
	)
}
