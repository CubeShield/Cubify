import { github } from '../../../wailsjs/go/models' // Убедись в правильности пути
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import {
	EarthIcon,
	EditIcon,
	Link2Icon,
	LinkIcon,
	ListIcon,
	LucideIcon,
	PinIcon,
	PointerIcon,
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

const SmallButton = ({
	icon: Icon,
	tooltip,
	onClick,
}: {
	icon: LucideIcon
	tooltip: string
	onClick?: () => void
}) => {
	return (
		<Tooltip>
			<TooltipTrigger>
				<Button>
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
}: {
	updateContentByField: (field: keyof github.Content, val: any) => void
	key: keyof github.Content
	value: any
	placeholder: string
	mono?: boolean
}) => {
	const font = mono ? 'font-mono' : ''
	return (
		<Input
			className={`h-8 text-xs ${font}`}
			value={value}
			onChange={e => updateContentByField(key, e.target.value)}
			placeholder={placeholder}
		/>
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

	return (
		<div className='flex flex-col gap-3 bg-muted/40 p-2 rounded-md border border-transparent hover:border-border transition-colors'>
			<div className='flex items-center gap-3 justify-between'>
				{item.image_url != '' && (
					<img src={item.image_url} className='size-18 rounded-xl' />
				)}

				<div className='flex flex-col gap-2 w-full'>
					<div className='w-full flex gap-2 items-center'>
						<InfoInput
							key='name'
							updateContentByField={updateContentByField}
							placeholder='Имя'
							value={item.name}
						/>
						<Select
							value={item.type}
							onValueChange={val => updateContent(cIdx, iIdx, 'type', val)}
						>
							<SelectTrigger className='h-8 w-full'>
								<SelectValue placeholder='Тип' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='both'>Общий</SelectItem>
								<SelectItem value='client'>Клиент</SelectItem>
								<SelectItem value='server'>Сервер</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className='w-full flex gap-2'>
						<InfoInput
							key='file'
							updateContentByField={updateContentByField}
							placeholder='Файл'
							value={item.file}
						/>

						<InfoInput
							key='url'
							updateContentByField={updateContentByField}
							placeholder='Download URL'
							value={item.url}
							mono={true}
						/>
					</div>
				</div>
			</div>
			<div className='flex w-full justify-between'>
				<div className='flex w-full gap-2 '>
					<SmallButton icon={LinkIcon} tooltip='Сайт контента' />
					<SmallButton icon={PinIcon} tooltip='Сайт с текущей версией' />
					<SmallButton icon={ListIcon} tooltip='Сайт с версиями контента' />
					<SmallButton icon={EditIcon} tooltip='Обновить контент' />
				</div>
				<Button variant='destructive' onClick={() => removeContent(cIdx, iIdx)}>
					<Trash2 /> Удалить
				</Button>
			</div>
		</div>
	)
}
