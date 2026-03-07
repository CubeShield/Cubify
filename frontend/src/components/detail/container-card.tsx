import { useState, useMemo, useCallback } from 'react'
import { instance } from 'wailsjs/go/models'
import {
	BoxIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	EarthIcon,
	ImageIcon,
	PackageIcon,
	SearchIcon,
} from 'lucide-react'
import Fuse from 'fuse.js'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Separator } from '../ui/separator'
import { CONTAINERS } from './constants'
import { GetContentSiteURL } from '../../../wailsjs/go/main/App'
import { BrowserOpenURL } from '../../../wailsjs/runtime/runtime'

const FUSE_OPTIONS = {
	keys: ['name', 'file', 'source'],
	threshold: 0.3,
	distance: 100,
	minMatchCharLength: 1,
}

export function ContainerCard({
	container,
}: {
	container: instance.Container
}) {
	const [expanded, setExpanded] = useState(false)
	const [search, setSearch] = useState('')

	const cfg = CONTAINERS[container.content_type] ?? {
		label: container.content_type,
		icon: BoxIcon,
	}
	const Icon = cfg.icon
	const allItems = container.content ?? []

	const fuse = useMemo(() => new Fuse(allItems, FUSE_OPTIONS), [allItems])

	const filtered = useMemo(() => {
		const q = search.trim()
		if (!q) return allItems
		return fuse.search(q).map(r => r.item)
	}, [search, allItems, fuse])

	const previewCount = 5
	const hasMore = filtered.length > previewCount
	const visible = expanded ? filtered : filtered.slice(0, previewCount)

	return (
		<div className='border rounded-xl overflow-hidden bg-card'>
			{/* header */}
			<div className='flex items-center justify-between px-4 py-3 bg-muted/40'>
				<div className='flex items-center gap-2'>
					<div className='flex items-center justify-center size-8 rounded-lg bg-primary/15'>
						<Icon className='size-4 text-primary' />
					</div>
					<span className='font-semibold text-sm'>{cfg.label}</span>
				</div>
				<Badge variant='secondary' className='text-xs tabular-nums'>
					{allItems.length}
				</Badge>
			</div>
			<Separator />

			{/* search */}
			{allItems.length > 3 && (
				<div className='px-4 pt-3'>
					<div className='relative'>
						<SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground' />
						<Input
							type='text'
							placeholder='Поиск по названию...'
							value={search}
							onChange={e => setSearch(e.target.value)}
							className='pl-9 h-8 text-xs'
						/>
					</div>
				</div>
			)}

			{/* items */}
			{filtered.length === 0 ? (
				<div className='px-4 py-6 flex flex-col items-center text-sm text-muted-foreground'>
					{search ? (
						<>
							<SearchIcon className='size-8 opacity-30 mb-2' />
							<p>Ничего не найдено</p>
							<p className='text-xs opacity-60 mt-0.5'>«{search}»</p>
						</>
					) : (
						'Пусто'
					)}
				</div>
			) : (
				<div className='divide-y divide-border'>
					{visible.map((item, idx) => (
						<ContentRow
							key={idx}
							item={item}
							contentType={container.content_type}
						/>
					))}
					{hasMore && (
						<button
							onClick={() => setExpanded(e => !e)}
							className='w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer'
						>
							{expanded ? (
								<>
									<ChevronUpIcon className='size-3.5' />
									Свернуть
								</>
							) : (
								<>
									<ChevronDownIcon className='size-3.5' />
									Ещё {filtered.length - previewCount}
								</>
							)}
						</button>
					)}
				</div>
			)}
		</div>
	)
}

/* ── Single content row ── */
function ContentRow({
	item,
	contentType,
}: {
	item: instance.Content
	contentType: string
}) {
	const canOpenSite =
		['modrinth', 'curseforge'].includes(item.source) && item.mod_id

	const handleOpenSite = useCallback(async () => {
		if (!canOpenSite) return
		try {
			const url = await GetContentSiteURL(item.source, item.mod_id)
			if (url) BrowserOpenURL(url)
		} catch (err) {
			console.error('Failed to open content site:', err)
		}
	}, [canOpenSite, item.source, item.mod_id])

	return (
		<div
			className={`flex items-center gap-3 px-4 py-2.5 transition-colors group ${
				canOpenSite ? 'hover:bg-muted/30 cursor-pointer' : 'hover:bg-muted/20'
			}`}
			onClick={canOpenSite ? handleOpenSite : undefined}
		>
			{item.image_url ? (
				<img
					src={item.image_url}
					className='size-9 rounded-lg object-cover ring-1 ring-white/10 shrink-0'
					alt={item.name}
				/>
			) : (
				<div className='size-9 rounded-lg bg-muted flex items-center justify-center shrink-0'>
					{contentType === 'resourcepacks' ? (
						<ImageIcon className='size-4 text-muted-foreground' />
					) : (
						<PackageIcon className='size-4 text-muted-foreground' />
					)}
				</div>
			)}
			<div className='flex-1 min-w-0'>
				<p className='text-sm font-medium truncate'>{item.name}</p>
				{item.source && (
					<p className='text-xs text-muted-foreground capitalize'>
						{item.source}
					</p>
				)}
			</div>
			{canOpenSite && (
				<EarthIcon className='size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0' />
			)}
		</div>
	)
}
