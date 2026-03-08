import { config as ConfigData } from '../../wailsjs/go/models'
import { Button } from './ui/button'
import {
	CheckCircle2Icon,
	LinkIcon,
	Loader2,
	SaveIcon,
	ShieldIcon,
	UserIcon,
	WifiOffIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Separator } from './ui/separator'
import {
	GetConfig,
	SaveConfig,
	StartMicrosoftLogin,
} from '../../wailsjs/go/main/App'
import { EventsOn, EventsOff } from '../../wailsjs/runtime'
import { useApp } from '../context/app-context'

export function User() {
	const { setCurrentPage, reloadConfig } = useApp()

	type AuthState = 'idle' | 'waiting_code' | 'waiting_auth' | 'success'

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
			setAuthType('microsoft')

			setConfigData(prev => {
				if (!prev) return null
				const newCfg = new ConfigData.Config(prev)
				newCfg.user.username = data.username
				newCfg.user.uuid = data.uuid
				newCfg.user.auth_type = 'microsoft'
				return newCfg
			})

			reloadConfig()
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
		await reloadConfig()
		setAuthType('offline')
	}

	const startMicrosoftAuth = async () => {
		setMsAuthState('waiting_code')
		await StartMicrosoftLogin()
	}

	return (
		<div className='max-w-2xl'>
			{/* Hero header */}
			<div className='relative overflow-hidden rounded-2xl border bg-card mb-6'>
				<div className='relative flex items-center gap-4 p-6'>
					{username ? (
						<img
							src={`https://minotar.net/helm/${username}/512.png`}
							className='size-16 rounded-xl shadow-lg ring-1 ring-white/10 shrink-0'
							alt={username}
						/>
					) : (
						<div className='flex items-center justify-center size-16 rounded-xl bg-primary/15 shadow-lg shrink-0'>
							<UserIcon className='size-7 text-primary' />
						</div>
					)}
					<div className='flex-1 min-w-0'>
						<h2 className='text-2xl font-bold tracking-tight'>
							{username || 'Аккаунт'}
						</h2>
						<div className='flex items-center gap-2 mt-1.5'>
							<span
								className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
									authType === 'microsoft'
										? 'border-primary/30 bg-primary/10 text-primary'
										: 'border-border text-muted-foreground'
								}`}
							>
								{authType === 'microsoft' ? (
									<ShieldIcon className='size-3' />
								) : (
									<WifiOffIcon className='size-3' />
								)}
								{authType === 'microsoft' ? 'Microsoft' : 'Неоффициальный'}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Auth tabs */}
			<Tabs
				value={authType}
				onValueChange={v => setAuthType(v)}
				className='w-full'
			>
				<TabsList className='w-full'>
					<TabsTrigger value='offline' className='cursor-pointer w-1/2'>
						<WifiOffIcon className='size-3.5' />
						Неоффициальный
					</TabsTrigger>
					<TabsTrigger value='microsoft' className='cursor-pointer w-1/2'>
						<ShieldIcon className='size-3.5' />
						Microsoft
					</TabsTrigger>
				</TabsList>

				{/* Offline tab */}
				<TabsContent value='offline' className='pt-4'>
					<div className='border rounded-xl overflow-hidden bg-card'>
						<div className='px-4 py-3 bg-muted/40'>
							<span className='font-semibold text-sm'>
								Неоффициальный аккаунт
							</span>
						</div>
						<Separator />
						<div className='p-4 space-y-4'>
							<div className='space-y-1.5'>
								<Label className='text-xs text-muted-foreground'>Никнейм</Label>
								<Input
									type='text'
									placeholder='Стив'
									value={username}
									onChange={v => setUsername(v.target.value)}
									className='h-9'
								/>
								<p className='text-[11px] text-muted-foreground'>
									Никнейм для игры на пиратских серверах
								</p>
							</div>
							<Button
								className='cursor-pointer rounded-lg w-full'
								onClick={saveOfflineUser}
							>
								<SaveIcon className='size-3.5' />
								Сохранить
							</Button>
						</div>
					</div>
				</TabsContent>

				{/* Microsoft tab */}
				<TabsContent value='microsoft' className='pt-4'>
					<div className='border rounded-xl overflow-hidden bg-card'>
						<div className='px-4 py-3 bg-muted/40'>
							<span className='font-semibold text-sm'>Аккаунт Microsoft</span>
						</div>
						<Separator />
						<div className='p-4 space-y-4'>
							{/* Already authenticated */}
							{authType === 'microsoft' && msAuthState === 'idle' && (
								<div className='flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4'>
									<CheckCircle2Icon className='size-5 text-primary shrink-0' />
									<div>
										<p className='text-sm font-semibold'>
											Авторизован как{' '}
											<span className='text-primary'>{username}</span>
										</p>
										<p className='text-[11px] text-muted-foreground mt-0.5'>
											Доступ к лицензионным серверам
										</p>
									</div>
								</div>
							)}

							{(msAuthState === 'idle' || msAuthState === 'success') && (
								<div className='space-y-3'>
									<p className='text-xs text-muted-foreground'>
										Привяжите аккаунт Microsoft для игры на лицензионных
										серверах.
									</p>
									<Button
										className='cursor-pointer rounded-lg w-full'
										variant={authType === 'microsoft' ? 'outline' : 'default'}
										onClick={startMicrosoftAuth}
									>
										<LinkIcon className='size-3.5' />
										{authType === 'microsoft'
											? 'Сменить аккаунт'
											: 'Привязать аккаунт'}
									</Button>
								</div>
							)}

							{/* Waiting states */}
							{msAuthState === 'waiting_code' && (
								<div className='flex flex-col items-center py-8'>
									<Loader2 className='size-8 animate-spin text-primary mb-3' />
									<p className='text-sm text-muted-foreground'>
										Получение кода авторизации...
									</p>
								</div>
							)}

							{msAuthState === 'waiting_auth' && (
								<div className='flex flex-col items-center py-4 space-y-4'>
									<p className='text-xs text-muted-foreground'>
										Перейдите по ссылке и введите код:
									</p>

									<a
										href={verificationUrl}
										target='_blank'
										rel='noreferrer'
										className='inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors'
									>
										<LinkIcon className='size-3.5' />
										{verificationUrl}
									</a>

									<div className='rounded-xl border bg-muted/30 p-5 w-full max-w-xs'>
										<h1
											className='font-mono font-bold text-4xl tracking-widest text-center select-all cursor-pointer text-foreground'
											onClick={() => navigator.clipboard.writeText(deviceCode)}
										>
											{deviceCode}
										</h1>
										<p className='text-[10px] text-muted-foreground mt-2 text-center'>
											Нажмите, чтобы скопировать
										</p>
									</div>

									<div className='flex items-center gap-2 text-xs text-muted-foreground'>
										<Loader2 className='size-3 animate-spin' />
										Ожидание действий в браузере...
									</div>
								</div>
							)}
						</div>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	)
}
