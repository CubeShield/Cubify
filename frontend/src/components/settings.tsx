import { config as ConfigModels } from 'wailsjs/go/models'
import { Input } from './ui/input'
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
} from './ui/field'
import { Button } from './ui/button'
import { useEffect, useState } from 'react'
import { GetConfig, SaveConfig } from 'wailsjs/go/main/App'
import { SaveIcon } from 'lucide-react'

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
					fieldKey='cache_directory'
					label='Директория Cache'
					value={cfgData.cache_directory}
					description='Путь до директории с кэшированными данными'
					onChange={handleUpdate}
				/>

				<ConfigInput
					fieldKey='instances_directory'
					label='Директория Instances'
					value={cfgData.instances_directory}
					description='Путь до директории со сборками'
					onChange={handleUpdate}
				/>

				<ConfigInput
					fieldKey='bin_directory'
					label='Директория Bin'
					value={cfgData.bin_directory}
					description='Путь до директории с исполняемыми утилитами'
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

				<ConfigInput
					fieldKey='index_url'
					label='Index URL'
					value={cfgData.index_url}
					description='Ссылка на репозиторий с манифестом'
					onChange={handleUpdate}
				/>

				<ConfigInput
					fieldKey='auth_token'
					label='GitHub Token'
					value={cfgData.auth_token}
					description='Токен для увеличения лимитов API'
					onChange={handleUpdate}
				/>
			</FieldGroup>
		</div>
	)
}
