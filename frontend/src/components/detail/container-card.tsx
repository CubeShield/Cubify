import { useState, useMemo, useCallback } from 'react'
import { instance } from 'wailsjs/go/models'
import {
	BoxIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	EarthIcon,
	ImageIcon,
	PackageIcon,
	PlusIcon,
	SearchIcon,
	SparkleIcon,
	XIcon,
} from 'lucide-react'
import Fuse from 'fuse.js'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Separator } from '../ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { CONTAINERS } from './constants'
import {
	GetContentSiteURL,
	RemoveExtraContent,
} from '../../../wailsjs/go/main/App'
import { BrowserOpenURL } from '../../../wailsjs/runtime/runtime'
import { AddContentDialog } from './add-content-dialog'

const FUSE_OPTIONS = {
	keys: ['name', 'file', 'source'],
	threshold: 0.3,
	distance: 100,
	minMatchCharLength: 1,
}

interface ContainerCardProps {
	container: instance.Container
	extraContent?: instance.Content[]
	slug: string
	onChanged?: () => void
}

export function ContainerCard({
	container,
	extraContent = [],
	slug,
	onChanged,
}: ContainerCardProps) {
	const [expanded, setExpanded] = useState(false)
	const [search, setSearch] = useState('')
	const [addDialogOpen, setAddDialogOpen] = useState(false)

	const cfg = CONTAINERS[container.content_type] ?? {
		label: container.content_type,
		icon: BoxIcon,
	}
	const Icon = cfg.icon
	const baseItems = container.content ?? []

	// Build a Set of extra file names for quick lookup
	const extraFileSet = useMemo(
		() => new Set(extraContent.map(e => e.file)),
		[extraContent],
	)

	// Combined items: base + extra
	const allItems = useMemo(
		() => [...baseItems, ...extraContent],
		[baseItems, extraContent],
	)

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
		<>
			<div className='border rounded-xl overflow-hidden bg-card'>
				{/* header */}
				<div className='flex items-center justify-between px-4 py-3 bg-muted/40'>
					<div className='flex items-center gap-2'>
						<div className='flex items-center justify-center size-8 rounded-lg bg-primary/15'>
							<Icon className='size-4 text-primary' />
						</div>
						<span className='font-semibold text-sm'>{cfg.label}</span>
					</div>
					<div className='flex items-center gap-1.5'>
						{extraContent.length > 0 && (
							<Badge
								variant='outline'
								className='text-[10px] tabular-nums border-violet-500/30 text-violet-400'
							>
								+{extraContent.length} своих
							</Badge>
						)}
						<Badge variant='secondary' className='text-xs tabular-nums'>
							{allItems.length}
						</Badge>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									onClick={() => setAddDialogOpen(true)}
									className='ml-1 flex items-center justify-center size-7 rounded-lg hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors cursor-pointer'
								>
									<PlusIcon className='size-4' />
								</button>
							</TooltipTrigger>
							<TooltipContent>Добавить свой контент</TooltipContent>
						</Tooltip>
					</div>
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
								key={item.file || idx}
								item={item}
								contentType={container.content_type}
								isExtra={extraFileSet.has(item.file)}
								slug={slug}
								onRemoved={onChanged}
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

			<AddContentDialog
				open={addDialogOpen}
				onOpenChange={setAddDialogOpen}
				slug={slug}
				contentType={container.content_type}
				onAdded={() => onChanged?.()}
			/>
		</>
	)
}

/* ── Single content row ── */
function ContentRow({
	item,
	contentType,
	isExtra,
	slug,
	onRemoved,
}: {
	item: instance.Content
	contentType: string
	isExtra: boolean
	slug: string
	onRemoved?: () => void
}) {
	const [removing, setRemoving] = useState(false)

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

	const handleRemove = useCallback(
		async (e: React.MouseEvent) => {
			e.stopPropagation()
			setRemoving(true)
			try {
				await RemoveExtraContent(slug, contentType, item.file)
				onRemoved?.()
			} catch (err) {
				console.error('Failed to remove extra content:', err)
			} finally {
				setRemoving(false)
			}
		},
		[slug, contentType, item.file, onRemoved],
	)

	return (
		<div
			className={`flex items-center gap-3 px-4 py-2.5 transition-colors group ${
				canOpenSite ? 'hover:bg-muted/30 cursor-pointer' : 'hover:bg-muted/20'
			} ${isExtra ? 'bg-violet-500/3' : ''}`}
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
				<div className='flex items-center gap-1.5'>
					<p className='text-sm font-medium truncate'>{item.name}</p>
					{isExtra && (
						<Badge
							variant='outline'
							className='text-[9px] px-1.5 py-0 border-violet-500/30 text-violet-400 shrink-0'
						>
							<SparkleIcon className='size-2.5 mr-0.5' />
							Своё
						</Badge>
					)}
				</div>
				{item.source && (
					<p className='text-xs text-muted-foreground capitalize'>
						{item.source}
					</p>
				)}
			</div>
			<div className='flex items-center gap-1'>
				{canOpenSite && (
					<EarthIcon className='size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0' />
				)}
				{isExtra && (
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={handleRemove}
								disabled={removing}
								className='flex items-center justify-center size-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-all cursor-pointer disabled:opacity-50'
							>
								<XIcon className='size-3.5' />
							</button>
						</TooltipTrigger>
						<TooltipContent>Удалить</TooltipContent>
					</Tooltip>
				)}
			</div>
		</div>
	)
}
