import { github } from '../../../wailsjs/go/models' // Убедись в правильности пути
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import {
	CloudSyncIcon,
	ComputerIcon,
	EarthIcon,
	EditIcon,
	GitCommitIcon,
	InfoIcon,
	Link2Icon,
	LinkIcon,
	ListIcon,
	LucideIcon,
	PinIcon,
	PointerIcon,
	RefreshCcw,
	RefreshCcwIcon,
	ServerIcon,
	Trash2,
	TrashIcon,
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
	InputGroupText,
} from '@/components/ui/input-group'
import {
	GetContentSiteURL,
	GetContentVersionURL,
	GetContentVersionsURL,
} from '../../../wailsjs/go/main/App'

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
}) => {
	return (
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
}

const InfoInput = ({
	updateContentByField,
	key,
	value,
	placeholder,
	mono = false,
	disabled = false,
	tooltip,
}: {
	updateContentByField: (field: keyof github.Content, val: any) => void
	key: keyof github.Content
	value: any
	placeholder: string
	mono?: boolean
	disabled?: boolean
	tooltip?: string
}) => {
	const font = mono ? 'font-mono' : ''
	return (
		<InputGroup>
			<InputGroupInput
				className={`h-8 text-xs ${font}`}
				value={value}
				onChange={e => updateContentByField(key, e.target.value)}
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
}

export function Content({
	updateContent,
	removeContent,
	cIdx,
	iIdx,
	item,
}: {
	updateContent: (
		cIdx: number,
		itemIdx: number,
		field: keyof github.Content,
		val: any,
	) => void
	removeContent: (cIdx: number, itemIdx: number) => void
	cIdx: number
	iIdx: number
	item: github.Content
}) {
	const updateContentByField = (field: keyof github.Content, val: any) => {
		updateContent(cIdx, iIdx, field, val)
	}

	const isRaw = !['modrinth', 'curseforge'].includes(item.source)

	// Обработчики для кнопок
	const handleOpenSite = async () => {
		if (isRaw || !item.mod_id) return
		try {
			const url = await GetContentSiteURL(item.source, item.mod_id)
			if (url) {
				BrowserOpenURL(url)
			}
		} catch (err) {
			console.error('Failed to get content site URL:', err)
		}
	}

	const handleOpenVersion = async () => {
		if (isRaw || !item.mod_id || !item.file_id) return
		try {
			const url = await GetContentVersionURL(
				item.source,
				item.mod_id,
				item.file_id,
			)
			if (url) {
				BrowserOpenURL(url)
			}
		} catch (err) {
			console.error('Failed to get content version URL:', err)
		}
	}

	const handleOpenVersions = async () => {
		if (isRaw || !item.mod_id) return
		try {
			const url = await GetContentVersionsURL(item.source, item.mod_id)
			if (url) {
				BrowserOpenURL(url)
			}
		} catch (err) {
			console.error('Failed to get content versions URL:', err)
		}
	}

	return (
		<div className='flex flex-col gap-3 bg-muted/40 p-2 rounded-lg border border-transparent hover:border-border transition-colors'>
			<div className='flex items-center gap-3 justify-between'>
				{item.image_url != '' && (
					<img src={item.image_url} className='size-20 rounded-xl' />
				)}

				<div className='flex flex-col gap-2 w-full'>
					<div className='w-full flex gap-2 items-center'>
						<InfoInput
							key='name'
							updateContentByField={updateContentByField}
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
									<CloudSyncIcon />
									Общий
								</SelectItem>
								<SelectItem value='client'>
									<ComputerIcon /> Клиент
								</SelectItem>
								<SelectItem value='server'>
									<ServerIcon />
									Сервер
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className='w-full flex gap-2'>
						<InfoInput
							key='file'
							updateContentByField={updateContentByField}
							placeholder='Файл'
							value={item.file}
							tooltip='Название файла, в котором будет сохранен контент'
						/>
					</div>
				</div>
			</div>
			<div className='flex w-full justify-between gap-2'>
				{isRaw && (
					<InfoInput
						key='url'
						updateContentByField={updateContentByField}
						placeholder='Download URL'
						value={item.url}
						mono={true}
						tooltip='Ссылка на контент'
					/>
				)}
				{!isRaw && (
					<>
						<InfoInput
							key='mod_id'
							updateContentByField={updateContentByField}
							placeholder='Abxd123'
							value={item.mod_id}
							mono={true}
							tooltip='ModID контента на сайте (Чтобы изменить, воспользуйтесь кнопкой Изменить контент)'
							disabled={true}
						/>
						<InfoInput
							key='file_id'
							updateContentByField={updateContentByField}
							placeholder='mc-123'
							value={item.file_id}
							mono={true}
							tooltip='FileID контента на сайте (Чтобы изменить, воспользуйтесь кнопкой Изменить контент)'
							disabled={true}
						/>
					</>
				)}
			</div>
			<div className='flex w-full justify-between'>
				<div className='flex w-full gap-2 '>
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
					<SmallButton
						icon={RefreshCcwIcon}
						tooltip='Обновить URL контента'
						disabled={true}
					/>
					<SmallButton
						icon={EditIcon}
						tooltip='Изменить контент'
						disabled={true}
					/>
				</div>
				<Button variant='destructive' onClick={() => removeContent(cIdx, iIdx)}>
					<Trash2 /> Удалить
				</Button>
			</div>
		</div>
	)
}
