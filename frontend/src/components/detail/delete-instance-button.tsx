import { useState } from 'react'
import { Loader2, Trash2Icon } from 'lucide-react'
import { Button } from '../ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogTrigger,
	DialogClose,
} from '../ui/dialog'
import { DeleteInstance } from '../../../wailsjs/go/main/App'

export function DeleteInstanceButton({
	slug,
	name,
	onDeleted,
}: {
	slug: string
	name: string
	onDeleted?: () => void
}) {
	const [open, setOpen] = useState(false)
	const [isDeleting, setDeleting] = useState(false)

	const handleDelete = async () => {
		setDeleting(true)
		try {
			await DeleteInstance(slug)
			setOpen(false)
			onDeleted?.()
		} catch (e) {
			console.error(e)
		} finally {
			setDeleting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					size='icon'
					variant='outline'
					className='shrink-0 cursor-pointer text-destructive hover:bg-destructive hover:text-white'
				>
					<Trash2Icon className='size-4' />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Удалить сборку?</DialogTitle>
				</DialogHeader>
				<p className='text-sm text-muted-foreground'>
					Вы уверены, что хотите удалить <strong>{name}</strong>? Будут удалены
					все локальные данные сборки, включая файлы редактора. Это действие
					нельзя отменить.
				</p>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant='outline' className='cursor-pointer'>
							Отмена
						</Button>
					</DialogClose>
					<Button
						variant='destructive'
						onClick={handleDelete}
						disabled={isDeleting}
						className='cursor-pointer'
					>
						{isDeleting ? (
							<Loader2 className='size-4 animate-spin' />
						) : (
							<Trash2Icon className='size-4' />
						)}
						Удалить
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
