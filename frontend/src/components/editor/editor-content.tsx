import { github } from '../../../wailsjs/go/models' // Убедись в правильности пути
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import {
	EarthIcon,
	EditIcon,
	Link2Icon,
	LinkIcon,
	ListIcon,
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
	return (
		<div className='flex flex-col gap-3 bg-muted/40 p-2 rounded-md border border-transparent hover:border-border transition-colors'>
			<div className='flex items-center gap-3 justify-between'>
				{item.image_url != '' && (
					<img src={item.image_url} className='size-18 rounded-xl' />
				)}

				<div className='flex flex-col gap-2 w-full'>
					<div className='w-full flex gap-2 items-center'>
						<Input
							className='h-8'
							value={item.name}
							onChange={e => updateContent(cIdx, iIdx, 'name', e.target.value)}
							placeholder='Название'
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
						<div className=''>
							<Input
								className='h-8'
								value={item.file}
								onChange={e =>
									updateContent(cIdx, iIdx, 'file', e.target.value)
								}
								placeholder='Файл'
							/>
						</div>

						<Input
							className='h-8 font-mono text-xs'
							value={item.url}
							onChange={e => updateContent(cIdx, iIdx, 'url', e.target.value)}
							placeholder='Download URL'
						/>
					</div>
				</div>
			</div>
			<div className='flex w-full justify-between'>
				<div className='flex w-full gap-2 '>
					<Button>
						<LinkIcon />
					</Button>

					<Button>
						<LinkIcon />
					</Button>

					<Button>
						<ListIcon />
					</Button>

					<Button>
						<EditIcon />
					</Button>
				</div>
				<Button variant='destructive' onClick={() => removeContent(cIdx, iIdx)}>
					<Trash2 className='h-3 w-3' /> Удалить
				</Button>
			</div>
		</div>
	)
}
