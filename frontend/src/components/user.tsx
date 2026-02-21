import { config as ConfigData } from 'wailsjs/go/models'
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
} from './ui/field'
import { Button } from './ui/button'
import { LinkIcon, SaveIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { GetConfig } from 'wailsjs/go/main/App'

interface UserProps {
	setCurrentPage: (page: 'detail' | 'settings' | 'account') => void
}

export function User({ setCurrentPage }: UserProps) {
	const [configData, setConfigData] = useState<ConfigData.Config | null>(null)
	const [username, setUsername] = useState<string>('')

	const fetchUser = async () => {
		const config = await GetConfig()
		setConfigData(config)
		setUsername(config.user.username)
	}

	useEffect(() => {
		fetchUser()
	}, [])

	const saveUser = async () => {
		const newConfigData = configData
		if (newConfigData == null) {
			return
		}
		newConfigData.user.username = username
		newConfigData.user.uuid = '00000000-0000-0000-0000-000000000000'
		setConfigData(newConfigData)
	}

	return (
		<div className='p-6 max-w-2xl'>
			<div className='flex justify-between items-center mb-6'>
				<h2 className='text-3xl font-bold'>
					{configData?.user == null ? 'Настройка аккаунта' : 'Аккаунт'}
				</h2>
			</div>
			<div>
				<Tabs defaultValue='unofficial' className='w-full'>
					<TabsList className='w-full'>
						<TabsTrigger value='unofficial' className='cursor-pointer'>
							Неоффициальный
						</TabsTrigger>
						<TabsTrigger value='microsoft' className='cursor-pointer'>
							Microsoft
						</TabsTrigger>
					</TabsList>
					<TabsContent value='unofficial'>
						<Field className='mb-4'>
							<FieldLabel>Никнейм</FieldLabel>
							<Input
								type='text'
								placeholder='Введите никнейм'
								value={username}
								onChange={v => {
									setUsername(v.target.value)
								}}
							/>
							<FieldDescription>
								Никнейм, который будет виден другим игрокам
							</FieldDescription>
						</Field>
						<Button className='cursor-pointer' onClick={saveUser}>
							<SaveIcon />
							Сохранить
						</Button>
					</TabsContent>
					<TabsContent value='microsoft'>
						<span>
							Вам будет необходимо перейти по ссылке{' '}
							<a
								href='https://www.microsoft.com/link'
								className='font-bold underline'
							>
								microsoft.com/link
							</a>{' '}
							и ввести код ниже, нажмите кнопку начать, как будете готовы
						</span>
						<br></br>
						<Button className='mt-2 cursor-pointer'>
							<LinkIcon /> Привязать аккаунт
						</Button>
						<h1 className='mt-4 font-bold text-4xl w-fit border p-5 rounded-3xl'>
							H1MKS
						</h1>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	)
}
