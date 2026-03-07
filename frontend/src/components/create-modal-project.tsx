import { useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './ui/select'
import { PlusIcon, UploadIcon } from 'lucide-react'
import { CreateProject, SelectLogoFile } from 'wailsjs/go/main/App'
import { instance } from 'wailsjs/go/models'

export function CreateProjectModal() {
	const [name, setName] = useState('')
	const [desc, setDesc] = useState('')
	const [mcVer, setMcVer] = useState('1.20.1')
	const [loader, setLoader] = useState('fabric')
	const [loaderVer, setLoaderVer] = useState('')
	const [repo, setRepo] = useState('')
	const [logoPath, setLogoPath] = useState('')
	const [isLoading, setLoading] = useState(false)

	const handleSelectLogo = async () => {
		const path = await SelectLogoFile()
		if (path) setLogoPath(path)
	}

	const handleCreate = async () => {
		setLoading(true)
		try {
			await CreateProject({
				Name: name,
				Description: desc,
				MinecraftVersion: mcVer,
				Loader: loader,
				LoaderVersion: loaderVer,
				RepoLink: repo,
				LogoPath: logoPath,
			})
			alert('Проект создан и инициализирован!')
		} catch (e) {
			alert('Ошибка: ' + e)
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button className='w-full'>
					<PlusIcon className='mr-2 h-4 w-4' /> Новая сборка
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>Создание сборки (Source)</DialogTitle>
				</DialogHeader>
				<div className='grid gap-4 py-4'>
					<div className='grid grid-cols-4 items-center gap-4'>
						<Label className='text-right'>Название</Label>
						<Input
							value={name}
							onChange={e => setName(e.target.value)}
							className='col-span-3'
							placeholder='My Super RPG'
						/>
					</div>
					<div className='grid grid-cols-4 items-center gap-4'>
						<Label className='text-right'>GitHub</Label>
						<Input
							value={repo}
							onChange={e => setRepo(e.target.value)}
							className='col-span-3'
							placeholder='username/repo-name'
						/>
					</div>
					<div className='grid grid-cols-4 items-center gap-4'>
						<Label className='text-right'>MC Ver</Label>
						<Input
							value={mcVer}
							onChange={e => setMcVer(e.target.value)}
							className='col-span-3'
						/>
					</div>
					<div className='grid grid-cols-4 items-center gap-4'>
						<Label className='text-right'>Loader</Label>
						<Select value={loader} onValueChange={setLoader}>
							<SelectTrigger className='col-span-3'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='fabric'>Fabric</SelectItem>
								<SelectItem value='forge'>Forge</SelectItem>
								<SelectItem value='quilt'>Quilt</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className='grid grid-cols-4 items-center gap-4'>
						<Label className='text-right'>Loader Ver</Label>
						<Input
							value={loaderVer}
							onChange={e => setLoaderVer(e.target.value)}
							className='col-span-3'
							placeholder='0.15.11 (пусто = latest)'
						/>
					</div>
					<div className='grid grid-cols-4 items-center gap-4'>
						<Label className='text-right'>Лого</Label>
						<div className='col-span-3 flex gap-2'>
							<Input value={logoPath} readOnly placeholder='Путь к файлу...' />
							<Button size='icon' onClick={handleSelectLogo}>
								<UploadIcon className='h-4 w-4' />
							</Button>
						</div>
					</div>
				</div>
				<Button onClick={handleCreate} disabled={isLoading}>
					{isLoading ? 'Создание и Git Init...' : 'Создать проект'}
				</Button>
			</DialogContent>
		</Dialog>
	)
}
