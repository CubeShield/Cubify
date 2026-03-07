import { useState, useCallback } from 'react'
import {
	AddExtraContent,
	AddExtraContentFromFile,
	GetContentFromURL,
} from '../../../wailsjs/go/main/App'
import { instance } from '../../../wailsjs/go/models'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
	FileIcon,
	LinkIcon,
	LoaderIcon,
	PackageIcon,
	PaletteIcon,
} from 'lucide-react'

const CONTENT_LABELS: Record<
	string,
	{ label: string; singular: string; icon: typeof PackageIcon }
> = {
	mods: { label: 'мод', singular: 'мод', icon: PackageIcon },
	resourcepacks: {
		label: 'ресурспак',
		singular: 'ресурспак',
		icon: PaletteIcon,
	},
}

interface AddContentDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	slug: string
	contentType: string
	onAdded: () => void
}

export function AddContentDialog({
	open,
	onOpenChange,
	slug,
	contentType,
	onAdded,
}: AddContentDialogProps) {
	const [url, setUrl] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [resolvedContent, setResolvedContent] =
		useState<instance.Content | null>(null)

	const cfg = CONTENT_LABELS[contentType] ?? {
		label: contentType,
		singular: contentType,
		icon: PackageIcon,
	}

	const resetState = useCallback(() => {
		setUrl('')
		setError('')
		setLoading(false)
		setResolvedContent(null)
	}, [])

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) resetState()
			onOpenChange(open)
		},
		[onOpenChange, resetState],
	)

	/* ── URL flow ── */
	const handleResolveURL = useCallback(async () => {
		const trimmed = url.trim()
		if (!trimmed) return
		setError('')
		setLoading(true)
		try {
			const content = await GetContentFromURL(trimmed)
			setResolvedContent(content)
		} catch (err) {
			setError('Не удалось распознать ссылку. Проверьте URL.')
			console.error(err)
		} finally {
			setLoading(false)
		}
	}, [url])

	const handleAddFromURL = useCallback(async () => {
		if (!resolvedContent) return
		setLoading(true)
		try {
			await AddExtraContent(slug, contentType, resolvedContent)
			onAdded()
			handleOpenChange(false)
		} catch (err) {
			setError('Не удалось добавить контент.')
			console.error(err)
		} finally {
			setLoading(false)
		}
	}, [resolvedContent, slug, contentType, onAdded, handleOpenChange])

	/* ── File flow ── */
	const handleAddFromFile = useCallback(async () => {
		setError('')
		setLoading(true)
		try {
			await AddExtraContentFromFile(slug, contentType)
			onAdded()
			handleOpenChange(false)
		} catch (err: any) {
			if (err?.message?.includes('no file selected')) {
				// User cancelled — do nothing
			} else {
				setError('Не удалось добавить файл.')
				console.error(err)
			}
		} finally {
			setLoading(false)
		}
	}, [slug, contentType, onAdded, handleOpenChange])

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<cfg.icon className='size-5' />
						Добавить {cfg.label}
					</DialogTitle>
					<DialogDescription>
						Добавьте свой {cfg.singular} к сборке. Он будет применён при
						следующем запуске.
					</DialogDescription>
				</DialogHeader>

				<Tabs defaultValue='url' className='mt-2'>
					<TabsList className='w-full'>
						<TabsTrigger value='url' className='flex-1 gap-1.5'>
							<LinkIcon className='size-3.5' />
							Ссылка
						</TabsTrigger>
						<TabsTrigger value='file' className='flex-1 gap-1.5'>
							<FileIcon className='size-3.5' />
							Файл
						</TabsTrigger>
					</TabsList>

					{/* ── URL tab ── */}
					<TabsContent value='url' className='mt-4 space-y-3'>
						<p className='text-xs text-muted-foreground'>
							Вставьте ссылку с Modrinth, CurseForge или прямую ссылку на
							скачивание.
						</p>
						<div className='flex gap-2'>
							<Input
								placeholder='https://modrinth.com/mod/...'
								value={url}
								onChange={e => {
									setUrl(e.target.value)
									setResolvedContent(null)
									setError('')
								}}
								className='flex-1 text-sm'
								disabled={loading}
								onKeyDown={e => {
									if (e.key === 'Enter') handleResolveURL()
								}}
							/>
							{!resolvedContent ? (
								<Button
									size='sm'
									variant='secondary'
									onClick={handleResolveURL}
									disabled={loading || !url.trim()}
								>
									{loading ? (
										<LoaderIcon className='size-4 animate-spin' />
									) : (
										'Найти'
									)}
								</Button>
							) : (
								<Button size='sm' onClick={handleAddFromURL} disabled={loading}>
									{loading ? (
										<LoaderIcon className='size-4 animate-spin' />
									) : (
										'Добавить'
									)}
								</Button>
							)}
						</div>

						{/* Resolved content preview */}
						{resolvedContent && (
							<div className='flex items-center gap-3 rounded-lg border bg-muted/30 p-3'>
								{resolvedContent.image_url ? (
									<img
										src={resolvedContent.image_url}
										className='size-10 rounded-lg object-cover shrink-0'
										alt={resolvedContent.name}
									/>
								) : (
									<div className='size-10 rounded-lg bg-muted flex items-center justify-center shrink-0'>
										<cfg.icon className='size-5 text-muted-foreground' />
									</div>
								)}
								<div className='flex-1 min-w-0'>
									<p className='text-sm font-medium truncate'>
										{resolvedContent.name}
									</p>
									<p className='text-xs text-muted-foreground capitalize'>
										{resolvedContent.source}
									</p>
								</div>
							</div>
						)}
					</TabsContent>

					{/* ── File tab ── */}
					<TabsContent value='file' className='mt-4 space-y-3'>
						<p className='text-xs text-muted-foreground'>
							Выберите файл ({contentType === 'resourcepacks' ? '.zip' : '.jar'}
							) из вашего компьютера.
						</p>
						<Button
							variant='outline'
							className='w-full h-20 border-dashed flex flex-col gap-1.5'
							onClick={handleAddFromFile}
							disabled={loading}
						>
							{loading ? (
								<LoaderIcon className='size-5 animate-spin text-muted-foreground' />
							) : (
								<>
									<FileIcon className='size-5 text-muted-foreground' />
									<span className='text-sm text-muted-foreground'>
										Выбрать файл
									</span>
								</>
							)}
						</Button>
						<p className='text-[11px] text-muted-foreground/60 text-center'>
							Файл будет скопирован в папку сборки
						</p>
					</TabsContent>
				</Tabs>

				{error && (
					<p className='text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2 mt-1'>
						{error}
					</p>
				)}
			</DialogContent>
		</Dialog>
	)
}
