import { config as ConfigData } from '../../wailsjs/go/models'
import { Field, FieldDescription, FieldLabel } from './ui/field'
import { Button } from './ui/button'
import { LinkIcon, SaveIcon, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import {
	GetConfig,
	SaveConfig,
	StartMicrosoftLogin,
} from '../../wailsjs/go/main/App'
import { EventsOn, EventsOff } from '../../wailsjs/runtime'

interface UserProps {
	setCurrentPage: (page: 'detail' | 'settings' | 'account') => void
}

type AuthState = 'idle' | 'waiting_code' | 'waiting_auth' | 'success'

export function User({ setCurrentPage }: UserProps) {
	const [configData, setConfigData] = useState<ConfigData.Config | null>(null)
	const [username, setUsername] = useState<string>('')
	const [authType, setAuthType] = useState<string>('offline')

	const [msAuthState, setMsAuthState] = useState<AuthState>('idle')
	const [deviceCode, setDeviceCode] = useState<string>('')
	const [verificationUrl, setVerificationUrl] = useState<string>('')

	const fetchUser = async () => {
		const config = await GetConfig()
		setConfigData(config)
		setUsername(config.user.username)
		setAuthType(config.user.auth_type || 'offline')
	}

	useEffect(() => {
		fetchUser()

		const cleanupCode = EventsOn('auth:code', (data: any) => {
			setVerificationUrl(data.url)
			setDeviceCode(data.code)
			setMsAuthState('waiting_auth')
		})

		const cleanupSuccess = EventsOn('auth:success', (data: any) => {
			setUsername(data.username)
			setMsAuthState('success')

			setConfigData(prev => {
				if (!prev) return null
				const newCfg = new ConfigData.Config(prev)
				newCfg.user.username = data.username
				newCfg.user.uuid = data.uuid
				newCfg.user.auth_type = 'microsoft'
				return newCfg
			})
		})

		const cleanupError = EventsOn('auth:error', (err: string) => {
			alert('Ошибка авторизации: ' + err)
			setMsAuthState('idle')
		})

		return () => {
			EventsOff('auth:code')
			EventsOff('auth:success')
			EventsOff('auth:error')
		}
	}, [])

	const saveOfflineUser = async () => {
		if (!configData) return

		const newConfig = new ConfigData.Config(configData)

		newConfig.user.username = username
		newConfig.user.uuid = '00000000-0000-0000-0000-000000000000'
		newConfig.user.auth_type = 'offline'

		setConfigData(newConfig)
		await SaveConfig(newConfig)
		setAuthType('offline')
	}

	const startMicrosoftAuth = async () => {
		setMsAuthState('waiting_code')
		await StartMicrosoftLogin()
	}

	return (
		<div className='p-6 max-w-2xl'>
			<div className='flex justify-between items-center mb-6'>
				<h2 className='text-3xl font-bold'>
					Аккаунт{' '}
					<span className='text-sm text-muted-foreground font-normal'>
						({authType === 'microsoft' ? 'Лицензия' : 'Оффлайн'})
					</span>
				</h2>
			</div>
			<div>
				<Tabs
					value={authType}
					onValueChange={v => setAuthType(v)}
					className='w-full'
				>
					<TabsList className='w-full'>
						<TabsTrigger value='offline' className='cursor-pointer w-1/2'>
							Оффлайн (Пиратка)
						</TabsTrigger>
						<TabsTrigger value='microsoft' className='cursor-pointer w-1/2'>
							Microsoft
						</TabsTrigger>
					</TabsList>

					<TabsContent value='offline'>
						<Field className='mb-4 mt-4'>
							<FieldLabel>Никнейм</FieldLabel>
							<Input
								type='text'
								placeholder='Стив'
								value={username}
								onChange={v => setUsername(v.target.value)}
							/>
							<FieldDescription>
								Никнейм для игры на пиратских серверах
							</FieldDescription>
						</Field>
						<Button className='cursor-pointer' onClick={saveOfflineUser}>
							<SaveIcon className='mr-2 h-4 w-4' />
							Сохранить
						</Button>
					</TabsContent>

					<TabsContent value='microsoft' className='mt-4 space-y-4'>
						{authType === 'microsoft' && msAuthState === 'idle' && (
							<div className='bg-green-500/10 border border-green-500/20 p-4 rounded-lg text-green-600 mb-4'>
								Вы авторизованы как <strong>{username}</strong>
							</div>
						)}

						{msAuthState === 'idle' || msAuthState === 'success' ? (
							<div>
								<p className='text-muted-foreground mb-4'>
									Используйте этот метод для игры на лицензионных серверах.
								</p>
								<Button className='cursor-pointer' onClick={startMicrosoftAuth}>
									<LinkIcon className='mr-2 h-4 w-4' />
									{authType === 'microsoft'
										? 'Сменить аккаунт'
										: 'Привязать аккаунт'}
								</Button>
							</div>
						) : (
							<div className='border rounded-lg p-6 flex flex-col items-center text-center animate-in fade-in'>
								{msAuthState === 'waiting_code' && (
									<div className='flex flex-col items-center'>
										<Loader2 className='h-8 w-8 animate-spin mb-2 text-primary' />
										<p>Получение кода авторизации...</p>
									</div>
								)}

								{msAuthState === 'waiting_auth' && (
									<>
										<span className='mb-2 text-muted-foreground'>
											Перейдите по ссылке и введите код:
										</span>
										<a
											href={verificationUrl}
											target='_blank'
											rel='noreferrer'
											className='text-xl font-bold text-blue-500 hover:underline mb-4'
										>
											{verificationUrl}
										</a>

										<div className='bg-secondary p-4 rounded-xl mb-4 w-full max-w-xs'>
											<h1
												className='font-mono font-bold text-4xl tracking-widest text-center select-all cursor-pointer'
												onClick={() =>
													navigator.clipboard.writeText(deviceCode)
												}
											>
												{deviceCode}
											</h1>
											<p className='text-xs text-muted-foreground mt-2 text-center'>
												(Нажмите, чтобы скопировать)
											</p>
										</div>

										<div className='flex items-center text-sm text-muted-foreground'>
											<Loader2 className='h-3 w-3 animate-spin mr-2' />
											Ожидание действий в браузере...
										</div>
									</>
								)}
							</div>
						)}
					</TabsContent>
				</Tabs>
			</div>
		</div>
	)
}
