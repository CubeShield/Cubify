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
			<Button
				onClick={onClick}
				disabled={disabled}
				variant='outline'
				size='icon'
			>
				<Icon />
			</Button>
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
			className={`h-8 text-xs ${mono ? 'font-mono' : ''}`}
			value={value}
			onChange={e => onChange(e.target.value)}
			placeholder={placeholder}
			disabled={disabled}
		/>
		{tooltip && (
			<InputGroupAddon align='inline-end'>
				<Tooltip>
					<TooltipTrigger>
						<InfoIcon className='size-4' />
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
		<div className='flex flex-col gap-3 bg-muted/40 p-2 rounded-lg border border-transparent hover:border-border transition-colors'>
			{/* Header: image + name/type/file */}
			<div className='flex items-center gap-3 justify-between'>
				{item.image_url !== '' && (
					<img src={item.image_url} className='size-20 rounded-xl' />
				)}
				<div className='flex flex-col gap-2 w-full'>
					<div className='w-full flex gap-2 items-center'>
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
							<SelectTrigger className='h-8 w-full'>
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
				</div>
			</div>

			{/* URL / IDs row */}
			<div className='flex w-full justify-between gap-2'>
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
							tooltip='ModID контента на сайте (Чтобы изменить, воспользуйтесь кнопкой Изменить контент)'
						/>
						<InfoInput
							onChange={onFieldChange('file_id')}
							placeholder='mc-123'
							value={item.file_id}
							mono
							disabled
							tooltip='FileID контента на сайте (Чтобы изменить, воспользуйтесь кнопкой Изменить контент)'
						/>
					</>
				)}
			</div>

			{/* Actions row */}
			<div className='flex w-full justify-between'>
				<div className='flex w-full gap-2'>
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
				<Button variant='destructive' onClick={() => removeContent(cIdx, iIdx)}>
					<Trash2 /> Удалить
				</Button>
			</div>
		</div>
	)
})
