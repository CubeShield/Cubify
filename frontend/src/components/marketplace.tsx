import { useState, useEffect } from 'react'
import { instance } from 'wailsjs/go/models'
import {
	FetchInstances,
	GetLocalInstances,
	ImportInstance,
} from 'wailsjs/go/main/App'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import {
	DownloadIcon,
	Loader2,
	CheckIcon,
	StoreIcon,
	LinkIcon,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

interface MarketplaceProps {
	onImported: () => void
}

export function MarketplaceModal({ onImported }: MarketplaceProps) {
	const [open, setOpen] = useState(false)
	const [remoteInstances, setRemoteInstances] = useState<instance.Instance[]>(
		[],
	)
	const [localSlugs, setLocalSlugs] = useState<Set<string>>(new Set())
	const [loading, setLoading] = useState(false)
	const [importing, setImporting] = useState<string | null>(null)
	const [repoInput, setRepoInput] = useState('')
	const [repoError, setRepoError] = useState<string | null>(null)
	const [repoImporting, setRepoImporting] = useState(false)

	const fetchData = async () => {
		setLoading(true)
		try {
			const [remote, local] = await Promise.all([
				FetchInstances(),
				GetLocalInstances(),
			])
			setRemoteInstances(remote ?? [])
			setLocalSlugs(new Set((local ?? []).map(l => l.repo)))
		} catch (e) {
			console.error(e)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		if (open) fetchData()
	}, [open])

	const handleImport = async (repo: string) => {
		setImporting(repo)
		try {
			await ImportInstance(repo)
			setLocalSlugs(prev => new Set([...prev, repo]))
			onImported()
		} catch (e) {
			console.error(e)
		} finally {
			setImporting(null)
		}
	}

	const handleRepoImport = async () => {
		const trimmed = repoInput.trim()
		if (!trimmed || !trimmed.includes('/')) {
			setRepoError('Формат: owner/repo')
			return
		}
		setRepoError(null)
		setRepoImporting(true)
		try {
			await ImportInstance(trimmed)
			setRepoInput('')
			onImported()
			setOpen(false)
		} catch (e) {
			setRepoError(String(e))
		} finally {
			setRepoImporting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant='outline' className='w-full cursor-pointer'>
					<StoreIcon className='size-4' /> Добавить сборку
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-lg max-h-[80vh] flex flex-col'>
				<DialogHeader>
					<DialogTitle>Добавить сборку</DialogTitle>
				</DialogHeader>

				<Tabs defaultValue='index' className='flex-1 flex flex-col min-h-0'>
					<TabsList>
						<TabsTrigger value='index'>Из индекса</TabsTrigger>
						<TabsTrigger value='direct'>По ссылке</TabsTrigger>
					</TabsList>

					<TabsContent
						value='index'
						className='flex-1 overflow-y-auto min-h-0 pr-1'
					>
						{loading ? (
							<div className='flex items-center justify-center py-10'>
								<Loader2 className='size-5 animate-spin text-muted-foreground' />
							</div>
						) : remoteInstances.length === 0 ? (
							<div className='text-muted-foreground text-center py-10'>
								Нет доступных сборок в индексах
							</div>
						) : (
							<div className='flex flex-col gap-2'>
								{remoteInstances.map(inst => {
									const meta = inst.releases?.[0]?.Meta
									const isLocal = localSlugs.has(inst.repo)
									const isImportingThis = importing === inst.repo

									return (
										<div
											key={inst.repo}
											className='flex items-center gap-3 p-3 border rounded-xl bg-muted/30'
										>
											{meta?.image_url && (
												<img
													src={meta.image_url}
													className='size-12 rounded-xl shrink-0'
												/>
											)}
											<div className='flex-1 min-w-0'>
												<h4 className='font-semibold truncate'>
													{meta?.name ?? inst.repo}
												</h4>
												<span className='text-sm text-muted-foreground truncate block'>
													{meta?.description}
												</span>
												<div className='flex gap-1 mt-1'>
													{meta?.minecraft_version && (
														<Badge variant='outline'>
															{meta.minecraft_version}
														</Badge>
													)}
													{meta?.loader && (
														<Badge variant='outline'>{meta.loader}</Badge>
													)}
												</div>
											</div>
											<Button
												size='sm'
												variant={isLocal ? 'outline' : 'default'}
												disabled={isLocal || isImportingThis}
												className='shrink-0 cursor-pointer'
												onClick={() => handleImport(inst.repo)}
											>
												{isImportingThis ? (
													<Loader2 className='size-4 animate-spin' />
												) : isLocal ? (
													<>
														<CheckIcon className='size-4' /> Добавлено
													</>
												) : (
													<>
														<DownloadIcon className='size-4' /> Добавить
													</>
												)}
											</Button>
										</div>
									)
								})}
							</div>
						)}
					</TabsContent>

					<TabsContent value='direct' className='pt-2'>
						<div className='flex flex-col gap-3'>
							<p className='text-sm text-muted-foreground'>
								Введите путь к GitHub-репозиторию сборки в формате{' '}
								<code className='text-foreground'>owner/repo</code>
							</p>
							<div className='flex gap-2'>
								<Input
									value={repoInput}
									onChange={e => setRepoInput(e.target.value)}
									placeholder='fadegor05/legendochka'
									onKeyDown={e => e.key === 'Enter' && handleRepoImport()}
								/>
								<Button
									onClick={handleRepoImport}
									disabled={repoImporting}
									className='shrink-0 cursor-pointer'
								>
									{repoImporting ? (
										<Loader2 className='size-4 animate-spin' />
									) : (
										<>
											<LinkIcon className='size-4' /> Добавить
										</>
									)}
								</Button>
							</div>
							{repoError && (
								<span className='text-sm text-destructive'>{repoError}</span>
							)}
						</div>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}
