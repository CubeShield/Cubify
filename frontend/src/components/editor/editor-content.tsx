import { github } from '../../../wailsjs/go/models' // Убедись в правильности пути
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Trash2 } from 'lucide-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select'
import { Label } from '../ui/label'

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
		<div className='flex flex-col gap-2 items-center bg-muted/40 p-2 rounded-md border border-transparent hover:border-border transition-colors'>
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

			<div className='w-full grid grid-cols-4 gap-2'>
				<div className='col-span-1'>
					<Input
						className='h-8'
						value={item.file}
						onChange={e => updateContent(cIdx, iIdx, 'file', e.target.value)}
						placeholder='Файл'
					/>
				</div>

				<Input
					className='col-span-3 h-8 font-mono text-xs'
					value={item.url}
					onChange={e => updateContent(cIdx, iIdx, 'url', e.target.value)}
					placeholder='Download URL'
				/>
			</div>

			<Button
				size='lg'
				variant='destructive'
				className='w-full h-8 text-xs mt-1'
				onClick={() => removeContent(cIdx, iIdx)}
			>
				<Trash2 className='h-3 w-3' /> Удалить контент
			</Button>
		</div>
	)
}
