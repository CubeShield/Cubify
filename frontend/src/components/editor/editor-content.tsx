import { github } from 'wailsjs/go/models'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Trash2 } from 'lucide-react'

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
		<div className='flex flex-col gap-2 items-center bg-muted/40 p-2 rounded-md'>
			<Input
				className='col-span-3 h-8'
				value={item.name}
				onChange={e => updateContent(cIdx, iIdx, 'name', e.target.value)}
				placeholder='Name'
			/>
			<Input
				className='col-span-3 h-8'
				value={item.file}
				onChange={e => updateContent(cIdx, iIdx, 'file', e.target.value)}
				placeholder='filename.jar'
			/>
			<Input
				className='col-span-3 h-8'
				value={item.type}
				onChange={e => updateContent(cIdx, iIdx, 'type', e.target.value)}
				placeholder='Type'
			/>
			<Input
				className='col-span-5 h-8 font-mono text-xs'
				value={item.url}
				onChange={e => updateContent(cIdx, iIdx, 'url', e.target.value)}
				placeholder='Download URL'
			/>
			<Button
				size='icon'
				variant='ghost'
				className='col-span-1 h-8 w-8'
				onClick={() => removeContent(cIdx, iIdx)}
			>
				<Trash2 className='h-4 w-4 opacity-50 hover:opacity-100' />
			</Button>
		</div>
	)
}
