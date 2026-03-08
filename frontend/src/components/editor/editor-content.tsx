import { memo, useState, useCallback } from 'react'
import { instance } from '../../../wailsjs/go/models'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import {
	CloudSyncIcon,
	ComputerIcon,
	EarthIcon,
	EditIcon,
	InfoIcon,
	LinkIcon,
	ListIcon,
	Loader2,
	LucideIcon,
	ServerIcon,
	Trash2,
} from 'lucide-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select'
import { Label } from '../ui/label'
import { BrowserOpenURL } from 'wailsjs/runtime/runtime'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from '@/components/ui/input-group'
import {
	GetContentSiteURL,
	GetContentVersionURL,
	GetContentVersionsURL,
	GetContentFromURL,
} from '../../../wailsjs/go/main/App'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog'

// --- Reusable small components ---

const SmallButton = ({
	icon: Icon,
	tooltip,
	onClick,
	disabled = false,
}: {
	icon: LucideIcon
	tooltip: string
	onClick?: () => void
	disabled?: boolean
}) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<button
				onClick={onClick}
				disabled={disabled}
				className='flex items-center justify-center size-7 rounded-lg border border-border hover:bg-primary/15 hover:border-primary/30 text-muted-foreground hover:text-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-border disabled:hover:text-muted-foreground'
			>
				<Icon className='size-3.5' />
			</button>
		</TooltipTrigger>
		<TooltipContent>
			<p>{tooltip}</p>
		</TooltipContent>
	</Tooltip>
)

const InfoInput = ({
	onChange,
	value,
	placeholder,
	mono = false,
	disabled = false,
	tooltip,
}: {
	onChange: (val: string) => void
	value: string
	placeholder: string
	mono?: boolean
	disabled?: boolean
	tooltip?: string
}) => (
	<InputGroup>
		<InputGroupInput
			className={`h-7 text-[11px] rounded-lg border-border bg-background ${mono ? 'font-mono' : ''}`}
			value={value}
			onChange={e => onChange(e.target.value)}
			placeholder={placeholder}
			disabled={disabled}
		/>
		{tooltip && (
			<InputGroupAddon align='inline-end'>
				<Tooltip>
					<TooltipTrigger>
						<InfoIcon className='size-3.5 text-muted-foreground/60' />
					</TooltipTrigger>
					<TooltipContent>
						<p>{tooltip}</p>
					</TooltipContent>
				</Tooltip>
			</InputGroupAddon>
		)}
	</InputGroup>
)

// --- Content item actions (extracted to reduce nesting) ---

function useContentActions(
	item: instance.Content,
	cIdx: number,
	iIdx: number,
	replaceContent: ContentProps['replaceContent'],
) {
	const isRaw = !['modrinth', 'curseforge'].includes(item.source)

	const handleOpenSite = useCallback(async () => {
		if (isRaw || !item.mod_id) return
		try {
			const url = await GetContentSiteURL(item.source, item.mod_id)
			if (url) BrowserOpenURL(url)
		} catch (err) {
			console.error('Failed to get content site URL:', err)
		}
	}, [isRaw, item.source, item.mod_id])

	const handleOpenVersion = useCallback(async () => {
		if (isRaw || !item.mod_id || !item.file_id) return
		try {
			const url = await GetContentVersionURL(
				item.source,
				item.mod_id,
				item.file_id,
			)
			if (url) BrowserOpenURL(url)
		} catch (err) {
			console.error('Failed to get content version URL:', err)
		}
	}, [isRaw, item.source, item.mod_id, item.file_id])

	const handleOpenVersions = useCallback(async () => {
		if (isRaw || !item.mod_id) return
		try {
			const url = await GetContentVersionsURL(item.source, item.mod_id)
			if (url) BrowserOpenURL(url)
		} catch (err) {
			console.error('Failed to get content versions URL:', err)
		}
	}, [isRaw, item.source, item.mod_id])

	return { isRaw, handleOpenSite, handleOpenVersion, handleOpenVersions }
}

// --- Edit dialog (extracted) ---

function EditContentDialog({
	item,
	cIdx,
	iIdx,
	replaceContent,
}: {
	item: instance.Content
	cIdx: number
	iIdx: number
	replaceContent: ContentProps['replaceContent']
}) {
	const [open, setOpen] = useState(false)
	const [newUrl, setNewUrl] = useState('')
	const [isUpdating, setIsUpdating] = useState(false)

	const handleUpdate = async () => {
		if (!newUrl.trim()) return
		setIsUpdating(true)
		try {
			const newContent = await GetContentFromURL(newUrl)
			replaceContent(cIdx, iIdx, {
				url: newContent.url,
				file: newContent.file,
				mod_id: newContent.mod_id,
				file_id: newContent.file_id,
				source: newContent.source,
				image_url: newContent.image_url,
				type: item.type,
				name: item.name,
			})
			setOpen(false)
			setNewUrl('')
		} catch (err) {
			alert('Ошибка при обновлении контента: ' + err)
		} finally {
			setIsUpdating(false)
		}
	}

	const typeLabel =
		item.type === 'both'
			? 'Общий'
			: item.type === 'client'
				? 'Клиент'
				: 'Сервер'

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Tooltip>
				<TooltipTrigger asChild>
					<DialogTrigger asChild>
						<Button variant='outline' size='icon'>
							<EditIcon />
						</Button>
					</DialogTrigger>
				</TooltipTrigger>
				<TooltipContent>
					<p>Изменить контент по URL</p>
				</TooltipContent>
			</Tooltip>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Изменить контент</DialogTitle>
				</DialogHeader>
				<div className='space-y-4 py-2'>
					<Label>
						Новая ссылка на контент (CurseForge / Modrinth / instance)
					</Label>
					<Input
						placeholder='https://...'
						value={newUrl}
						onChange={e => setNewUrl(e.target.value)}
					/>
					<p className='text-xs text-muted-foreground'>
						Тип ({typeLabel}) и название ({item.name}) будут сохранены
					</p>
					<Button
						type='button'
						className='w-full'
						onClick={handleUpdate}
						disabled={isUpdating || !newUrl.trim()}
					>
						{isUpdating ? (
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
						) : (
							<EditIcon className='mr-2 h-4 w-4' />
						)}
						Изменить контент
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}

// --- Main Content component (memoized) ---

interface ContentProps {
	updateContent: (
		cIdx: number,
		itemIdx: number,
		field: keyof instance.Content,
		val: any,
	) => void
	replaceContent: (
		cIdx: number,
		itemIdx: number,
		newContent: Partial<instance.Content>,
	) => void
	removeContent: (cIdx: number, itemIdx: number) => void
	cIdx: number
	iIdx: number
	item: instance.Content
}

export const Content = memo(function Content({
	updateContent,
	replaceContent,
	removeContent,
	cIdx,
	iIdx,
	item,
}: ContentProps) {
	const { isRaw, handleOpenSite, handleOpenVersion, handleOpenVersions } =
		useContentActions(item, cIdx, iIdx, replaceContent)

	const onFieldChange = useCallback(
		(field: keyof instance.Content) => (val: string) => {
			updateContent(cIdx, iIdx, field, val)
		},
		[updateContent, cIdx, iIdx],
	)

	return (
		<div className='rounded-xl border bg-card overflow-hidden transition-colors hover:border-primary/20'>
			{/* Header: image + name/source badge */}
			<div className='flex items-center gap-3 px-3 py-2.5 bg-muted/30'>
				{item.image_url !== '' && (
					<img
						src={item.image_url}
						className='size-10 rounded-lg shadow-sm ring-1 ring-white/10 shrink-0 object-cover'
					/>
				)}
				<div className='flex-1 min-w-0'>
					<div className='flex items-center gap-2'>
						<span className='text-sm font-semibold truncate'>
							{item.name || 'Без названия'}
						</span>
						{!isRaw && (
							<span className='inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium shrink-0'>
								{item.source}
							</span>
						)}
					</div>
					<p className='text-[10px] text-muted-foreground font-mono truncate mt-0.5'>
						{item.file}
					</p>
				</div>
				<div className='flex items-center gap-1 shrink-0'>
					<SmallButton
						icon={EarthIcon}
						tooltip='Сайт контента'
						onClick={handleOpenSite}
						disabled={isRaw}
					/>
					<SmallButton
						icon={ListIcon}
						tooltip='Сайт с версиями контента'
						onClick={handleOpenVersions}
						disabled={isRaw}
					/>
					<SmallButton
						icon={LinkIcon}
						tooltip='Сайт с текущей версией'
						onClick={handleOpenVersion}
						disabled={isRaw}
					/>
					<EditContentDialog
						item={item}
						cIdx={cIdx}
						iIdx={iIdx}
						replaceContent={replaceContent}
					/>
				</div>
			</div>

			{/* Editable fields */}
			<div className='px-3 py-2.5 space-y-2'>
				<div className='flex gap-2 items-center'>
					<InfoInput
						onChange={onFieldChange('name')}
						placeholder='Имя'
						value={item.name}
						tooltip='Название, отображается у клиентов в лаунчере'
					/>
					<Select
						value={item.type}
						onValueChange={val => updateContent(cIdx, iIdx, 'type', val)}
					>
						<SelectTrigger className='h-7 w-full text-[11px] rounded-lg'>
							<SelectValue placeholder='Тип' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='both'>
								<CloudSyncIcon /> Общий
							</SelectItem>
							<SelectItem value='client'>
								<ComputerIcon /> Клиент
							</SelectItem>
							<SelectItem value='server'>
								<ServerIcon /> Сервер
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<InfoInput
					onChange={onFieldChange('file')}
					placeholder='Файл'
					value={item.file}
					tooltip='Название файла, в котором будет сохранен контент'
				/>
				<div className='flex gap-2'>
					{isRaw ? (
						<InfoInput
							onChange={onFieldChange('url')}
							placeholder='Download URL'
							value={item.url}
							mono
							tooltip='Ссылка на контент'
						/>
					) : (
						<>
							<InfoInput
								onChange={onFieldChange('mod_id')}
								placeholder='Abxd123'
								value={item.mod_id}
								mono
								disabled
								tooltip='ModID контента на сайте'
							/>
							<InfoInput
								onChange={onFieldChange('file_id')}
								placeholder='mc-123'
								value={item.file_id}
								mono
								disabled
								tooltip='FileID контента на сайте'
							/>
						</>
					)}
				</div>
			</div>

			{/* Delete action */}
			<div className='flex items-center justify-end px-3 py-2 border-t border-border bg-muted/20'>
				<button
					onClick={() => removeContent(cIdx, iIdx)}
					className='inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer'
				>
					<Trash2 className='size-3' /> Удалить
				</button>
			</div>
		</div>
	)
})
