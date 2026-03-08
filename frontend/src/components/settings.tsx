import { config as ConfigModels } from 'wailsjs/go/models'
import { Input } from './ui/input'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Field, FieldDescription, FieldGroup, FieldLabel } from './ui/field'
import { Button } from './ui/button'
import { useEffect, useState } from 'react'
import { GetConfig, SaveConfig } from 'wailsjs/go/main/App'
import { PlusIcon, SaveIcon, Trash2Icon } from 'lucide-react'
import { useApp } from '../context/app-context'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './ui/select'

interface ConfigInputProps {
	value: string | number | undefined
	fieldKey: keyof ConfigModels.Config
	label: string
	type?: string
	description?: string
	onChange: (key: keyof ConfigModels.Config, value: any) => void
}

function ConfigInput({
	value,
	fieldKey,
	label,
	type = 'text',
	description,
	onChange,
}: ConfigInputProps) {
	return (
		<Field className='mb-4'>
			{' '}
			<FieldLabel>{label}</FieldLabel>
			<Input
				type={type}
				placeholder={`Введите ${label}`}
				value={value ?? ''}
				onChange={e => {
					const val =
						type === 'number' ? Number(e.target.value) : e.target.value
					onChange(fieldKey, val)
				}}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
		</Field>
	)
}

export function Settings() {
	const { setDevMode } = useApp()
	const [cfgData, setConfigData] = useState<ConfigModels.Config | null>(null)
	const [isLoading, setLoading] = useState(false)

	const fetchConfig = async () => {
		setLoading(true)
		try {
			const data = await GetConfig()
			setConfigData(data)
		} catch (err) {
			console.error('Failed to load config', err)
		} finally {
			setLoading(false)
		}
	}

	const handleUpdate = (key: keyof ConfigModels.Config, value: any) => {
		if (!cfgData) return

		setConfigData(
			new ConfigModels.Config({
				...cfgData,
				[key]: value,
			}),
		)

		if (key === 'dev_mode') {
			setDevMode(value as boolean)
		}
	}

	const handleSave = async () => {
		if (!cfgData) return
		setLoading(true)
		await SaveConfig(cfgData)
		setLoading(false)
	}

	useEffect(() => {
		fetchConfig()
	}, [])

	if (isLoading || !cfgData) {
		return <div className='p-4'>Загрузка настроек...</div>
	}

	return (
		<div className='p-6 max-w-2xl'>
			<div className='flex justify-between items-center mb-6'>
				<h2 className='text-3xl font-bold'>Настройки</h2>
				<Button
					onClick={handleSave}
					className='cursor-pointer'
					disabled={isLoading}
				>
					<SaveIcon />
					Сохранить
				</Button>
			</div>

			<FieldGroup className='gap-2'>
				<ConfigInput
					fieldKey='cubify_directory'
					label='Директория Cubify'
					value={cfgData.cubify_directory}
					description='Путь до директории с данными, сборками, кэшем Cubify'
					onChange={handleUpdate}
				/>
			</FieldGroup>

			<FieldGroup className='gap-2'>
				<ConfigInput
					fieldKey='base_url'
					label='Base URL'
					value={cfgData.base_url}
					description='Ссылка на GitHub API'
					onChange={handleUpdate}
				/>

				<Field className='mb-4'>
					<FieldLabel>Индексы сборок</FieldLabel>
					<FieldDescription>
						Ссылки на JSON-манифесты со списками сборок
					</FieldDescription>
					<div className='flex flex-col gap-2 mt-2'>
						{(cfgData.index_urls ?? []).map((url, idx) => (
							<div key={idx} className='flex gap-2'>
								<Input
									value={url}
									placeholder='https://...index.json'
									onChange={e => {
										const updated = [...(cfgData.index_urls ?? [])]
										updated[idx] = e.target.value
										handleUpdate('index_urls', updated)
									}}
								/>
								<Button
									size='icon'
									variant='outline'
									className='shrink-0 cursor-pointer'
									onClick={() => {
										const updated = (cfgData.index_urls ?? []).filter(
											(_, i) => i !== idx,
										)
										handleUpdate('index_urls', updated)
									}}
								>
									<Trash2Icon className='size-4' />
								</Button>
							</div>
						))}
						<Button
							variant='outline'
							className='cursor-pointer'
							onClick={() => {
								handleUpdate('index_urls', [...(cfgData.index_urls ?? []), ''])
							}}
						>
							<PlusIcon className='size-4' /> Добавить индекс
						</Button>
					</div>
				</Field>

				<ConfigInput
					fieldKey='auth_token'
					label='GitHub Token'
					value={cfgData.auth_token}
					description='Токен для увеличения лимитов API'
					onChange={handleUpdate}
				/>
			</FieldGroup>

			<FieldGroup className='gap-2'>
				<h3 className='text-xl font-bold mb-2'>Java</h3>
				<FieldDescription className='mb-4'>
					Настройки Java для запуска Minecraft
				</FieldDescription>

				<ConfigInput
					fieldKey='jvm_path'
					label='Путь до Java'
					value={cfgData.jvm_path}
					description='Кастомный путь до исполняемого файла Java (оставьте пустым для автоопределения)'
					onChange={handleUpdate}
				/>

				<ConfigInput
					fieldKey='jvm_min_ram'
					label='Минимум ОЗУ (МБ)'
					type='number'
					value={cfgData.jvm_min_ram || ''}
					description='Минимальное количество оперативной памяти для Minecraft (-Xms), например 512'
					onChange={handleUpdate}
				/>

				<ConfigInput
					fieldKey='jvm_max_ram'
					label='Максимум ОЗУ (МБ)'
					type='number'
					value={cfgData.jvm_max_ram || ''}
					description='Максимальное количество оперативной памяти для Minecraft (-Xmx), например 4096'
					onChange={handleUpdate}
				/>
			</FieldGroup>

			<FieldGroup className='gap-2'>
				<Field className='mb-4'>
					<FieldLabel>Тип сборки</FieldLabel>
					<FieldDescription>
						Определяет какой контент скачивать: клиентский, серверный или общий
					</FieldDescription>
					<Select
						value={cfgData.build_type || 'client'}
						onValueChange={v => handleUpdate('build_type', v)}
					>
						<SelectTrigger className='mt-2'>
							<SelectValue placeholder='Выберите тип сборки' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='client'>Клиент</SelectItem>
							<SelectItem value='common'>Общая</SelectItem>
							<SelectItem value='server'>Сервер</SelectItem>
						</SelectContent>
					</Select>
				</Field>
			</FieldGroup>

			<FieldGroup className='gap-2'>
				<Field className='mb-4'>
					<div className='flex items-center justify-between'>
						<div className='flex flex-col gap-1'>
							<Label>Режим разработчика</Label>
							<FieldDescription>
								Включает редактор сборок, кнопку создания проекта и запуск
								Dev-версии
							</FieldDescription>
						</div>
						<Switch
							checked={cfgData.dev_mode ?? false}
							onCheckedChange={checked => handleUpdate('dev_mode', checked)}
						/>
					</div>
				</Field>
			</FieldGroup>

			{cfgData.dev_mode && (
				<FieldGroup className='gap-2'>
					<h3 className='text-xl font-bold mb-2'>FTP Настройки</h3>
					<FieldDescription className='mb-4'>
						Настройки подключения к FTP серверу для деплоя серверной сборки
					</FieldDescription>

					<Field className='mb-4'>
						<FieldLabel>Хост</FieldLabel>
						<Input
							placeholder='ftp.example.com'
							value={cfgData.ftp?.host ?? ''}
							onChange={e =>
								handleUpdate('ftp', {
									...(cfgData.ftp ?? {}),
									host: e.target.value,
								})
							}
						/>
					</Field>

					<Field className='mb-4'>
						<FieldLabel>Порт</FieldLabel>
						<Input
							type='number'
							placeholder='21'
							value={cfgData.ftp?.port ?? 21}
							onChange={e =>
								handleUpdate('ftp', {
									...(cfgData.ftp ?? {}),
									port: Number(e.target.value),
								})
							}
						/>
					</Field>

					<Field className='mb-4'>
						<FieldLabel>Пользователь</FieldLabel>
						<Input
							placeholder='ftp_user'
							value={cfgData.ftp?.user ?? ''}
							onChange={e =>
								handleUpdate('ftp', {
									...(cfgData.ftp ?? {}),
									user: e.target.value,
								})
							}
						/>
					</Field>

					<Field className='mb-4'>
						<FieldLabel>Пароль</FieldLabel>
						<Input
							type='password'
							placeholder='••••••••'
							value={cfgData.ftp?.password ?? ''}
							onChange={e =>
								handleUpdate('ftp', {
									...(cfgData.ftp ?? {}),
									password: e.target.value,
								})
							}
						/>
					</Field>

					<Field className='mb-4'>
						<FieldLabel>Корневой путь</FieldLabel>
						<Input
							placeholder='/server/mods'
							value={cfgData.ftp?.root_path ?? ''}
							onChange={e =>
								handleUpdate('ftp', {
									...(cfgData.ftp ?? {}),
									root_path: e.target.value,
								})
							}
						/>
						<FieldDescription>
							Путь на FTP сервере, куда будет загружаться контент
						</FieldDescription>
					</Field>
				</FieldGroup>
			)}
		</div>
	)
}
