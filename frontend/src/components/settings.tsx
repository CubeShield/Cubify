import { config as ConfigModels } from 'wailsjs/go/models'
import { Input } from './ui/input'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Button } from './ui/button'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GetConfig, GetVersion, SaveConfig } from 'wailsjs/go/main/App'
import {
	CodeIcon,
	FolderIcon,
	GlobeIcon,
	CpuIcon,
	PackageIcon,
	PlusIcon,
	RotateCcwIcon,
	SaveIcon,
	ServerIcon,
	Settings2Icon,
	Trash2Icon,
} from 'lucide-react'
import { useApp } from '../context/app-context'
import { Separator } from './ui/separator'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './ui/select'

/* ── helpers ── */

function SectionCard({
	icon: Icon,
	title,
	children,
}: {
	icon: React.ElementType
	title: string
	children: React.ReactNode
}) {
	return (
		<div className='border rounded-xl overflow-hidden bg-card'>
			<div className='flex items-center gap-2.5 px-4 py-3 bg-muted/40'>
				<div className='flex h-6 w-6 items-center justify-center rounded-md bg-primary/15'>
					<Icon className='size-3.5 text-primary' />
				</div>
				<span className='font-semibold text-sm'>{title}</span>
			</div>
			<Separator />
			<div className='p-4 space-y-4'>{children}</div>
		</div>
	)
}

function SettingsField({
	label,
	description,
	children,
}: {
	label: string
	description?: string
	children: React.ReactNode
}) {
	return (
		<div className='space-y-1.5'>
			<Label className='text-xs text-muted-foreground'>{label}</Label>
			{children}
			{description && (
				<p className='text-[11px] text-muted-foreground'>{description}</p>
			)}
		</div>
	)
}

export function Settings() {
	const { setDevMode } = useApp()
	const [cfgData, setConfigData] = useState<ConfigModels.Config | null>(null)
	const [savedData, setSavedData] = useState<ConfigModels.Config | null>(null)
	const [isLoading, setLoading] = useState(false)
	const [version, setVersion] = useState('')

	const hasChanges =
		cfgData &&
		savedData &&
		JSON.stringify(cfgData) !== JSON.stringify(savedData)

	const fetchConfig = async () => {
		setLoading(true)
		try {
			const data = await GetConfig()
			setConfigData(data)
			setSavedData(data)
		} catch (err) {
			console.error('Failed to load config', err)
		} finally {
			setLoading(false)
		}
	}

	const handleUpdate = useCallback(
		(key: keyof ConfigModels.Config, value: any) => {
			setConfigData(prev => {
				if (!prev) return prev
				return new ConfigModels.Config({ ...prev, [key]: value })
			})

			if (key === 'dev_mode') {
				setDevMode(value as boolean)
			}
		},
		[setDevMode],
	)

	const handleSave = async () => {
		if (!cfgData) return
		setLoading(true)
		await SaveConfig(cfgData)
		setSavedData(cfgData)
		setLoading(false)
	}

	const handleReset = () => {
		if (!savedData) return
		setConfigData(new ConfigModels.Config(savedData))
	}

	useEffect(() => {
		fetchConfig()
		GetVersion().then(setVersion)
	}, [])

	if (isLoading || !cfgData) {
		return <div className='p-4'>Загрузка настроек...</div>
	}

	return (
		<div className='flex flex-col h-full'>
			{/* ── Hero section ── */}
			<div className='relative overflow-hidden rounded-2xl border bg-card mb-6'>
				<div className='relative flex items-center gap-4 p-6'>
					<div className='flex items-center justify-center size-16 rounded-xl bg-primary/15 shadow-lg shrink-0'>
						<Settings2Icon className='size-7 text-primary' />
					</div>
					<div className='flex-1 min-w-0'>
						<h2 className='text-2xl font-bold tracking-tight'>Настройки</h2>
						<div className='flex items-center gap-2 mt-1.5'>
							{version && (
								<span className='inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground font-medium'>
									<CodeIcon className='size-3' />
									{version}
								</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* ── Settings sections (scrollable) ── */}
			<div className='flex-1 overflow-y-auto space-y-4 pb-20 max-w-2xl'>
				{/* General */}
				<SectionCard icon={FolderIcon} title='Общие'>
					<SettingsField
						label='Директория Cubify'
						description='Путь до директории с данными, сборками, кэшем Cubify'
					>
						<Input
							placeholder='Введите путь'
							value={cfgData.cubify_directory ?? ''}
							onChange={e => handleUpdate('cubify_directory', e.target.value)}
							className='h-9'
						/>
					</SettingsField>
					<SettingsField
						label='Тип сборки'
						description='Определяет какой контент скачивать: клиентский, серверный или общий'
					>
						<Select
							value={cfgData.build_type || 'client'}
							onValueChange={v => handleUpdate('build_type', v)}
						>
							<SelectTrigger className='h-9'>
								<SelectValue placeholder='Выберите тип сборки' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='client'>Клиент</SelectItem>
								<SelectItem value='common'>Общая</SelectItem>
								<SelectItem value='server'>Сервер</SelectItem>
							</SelectContent>
						</Select>
					</SettingsField>
				</SectionCard>

				{/* API */}
				<SectionCard icon={GlobeIcon} title='API'>
					<SettingsField label='Base URL' description='Ссылка на GitHub API'>
						<Input
							placeholder='https://api.github.com'
							value={cfgData.base_url ?? ''}
							onChange={e => handleUpdate('base_url', e.target.value)}
							className='h-9'
						/>
					</SettingsField>
					<SettingsField
						label='GitHub Token'
						description='Токен для увеличения лимитов API'
					>
						<Input
							placeholder='ghp_...'
							value={cfgData.auth_token ?? ''}
							onChange={e => handleUpdate('auth_token', e.target.value)}
							className='h-9'
						/>
					</SettingsField>
					<SettingsField
						label='Индексы сборок'
						description='Ссылки на JSON-манифесты со списками сборок'
					>
						<div className='flex flex-col gap-2'>
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
										className='h-9'
									/>
									<button
										className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
										onClick={() => {
											const updated = (cfgData.index_urls ?? []).filter(
												(_, i) => i !== idx,
											)
											handleUpdate('index_urls', updated)
										}}
									>
										<Trash2Icon className='size-3.5' />
									</button>
								</div>
							))}
							<button
								className='flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground'
								onClick={() =>
									handleUpdate('index_urls', [
										...(cfgData.index_urls ?? []),
										'',
									])
								}
							>
								<PlusIcon className='size-3.5' />
								Добавить индекс
							</button>
						</div>
					</SettingsField>
				</SectionCard>

				{/* Java */}
				<SectionCard icon={CpuIcon} title='Java'>
					<SettingsField
						label='Путь до Java'
						description='Кастомный путь до исполняемого файла Java (оставьте пустым для автоопределения)'
					>
						<Input
							placeholder='Автоопределение'
							value={cfgData.jvm_path ?? ''}
							onChange={e => handleUpdate('jvm_path', e.target.value)}
							className='h-9'
						/>
					</SettingsField>
					<div className='grid grid-cols-2 gap-3'>
						<SettingsField
							label='Минимум ОЗУ (МБ)'
							description='-Xms, например 512'
						>
							<Input
								type='number'
								placeholder='512'
								value={cfgData.jvm_min_ram || ''}
								onChange={e =>
									handleUpdate('jvm_min_ram', Number(e.target.value))
								}
								className='h-9'
							/>
						</SettingsField>
						<SettingsField
							label='Максимум ОЗУ (МБ)'
							description='-Xmx, например 4096'
						>
							<Input
								type='number'
								placeholder='4096'
								value={cfgData.jvm_max_ram || ''}
								onChange={e =>
									handleUpdate('jvm_max_ram', Number(e.target.value))
								}
								className='h-9'
							/>
						</SettingsField>
					</div>
				</SectionCard>

				{/* Developer mode */}
				<SectionCard icon={PackageIcon} title='Разработка'>
					<div className='flex items-center justify-between'>
						<div className='flex flex-col gap-0.5'>
							<Label className='text-sm'>Режим разработчика</Label>
							<p className='text-[11px] text-muted-foreground'>
								Включает редактор сборок, кнопку создания проекта и запуск
								Dev-версии
							</p>
						</div>
						<Switch
							checked={cfgData.dev_mode ?? false}
							onCheckedChange={checked => handleUpdate('dev_mode', checked)}
						/>
					</div>
				</SectionCard>

				{/* FTP (dev only) */}
				{cfgData.dev_mode && (
					<SectionCard icon={ServerIcon} title='FTP'>
						<div className='grid grid-cols-2 gap-3'>
							<SettingsField label='Хост'>
								<Input
									placeholder='ftp.example.com'
									value={cfgData.ftp?.host ?? ''}
									onChange={e =>
										handleUpdate('ftp', {
											...(cfgData.ftp ?? {}),
											host: e.target.value,
										})
									}
									className='h-9'
								/>
							</SettingsField>
							<SettingsField label='Порт'>
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
									className='h-9'
								/>
							</SettingsField>
						</div>
						<div className='grid grid-cols-2 gap-3'>
							<SettingsField label='Пользователь'>
								<Input
									placeholder='ftp_user'
									value={cfgData.ftp?.user ?? ''}
									onChange={e =>
										handleUpdate('ftp', {
											...(cfgData.ftp ?? {}),
											user: e.target.value,
										})
									}
									className='h-9'
								/>
							</SettingsField>
							<SettingsField label='Пароль'>
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
									className='h-9'
								/>
							</SettingsField>
						</div>
						<SettingsField
							label='Корневой путь'
							description='Путь на FTP сервере, куда будет загружаться контент'
						>
							<Input
								placeholder='/server/mods'
								value={cfgData.ftp?.root_path ?? ''}
								onChange={e =>
									handleUpdate('ftp', {
										...(cfgData.ftp ?? {}),
										root_path: e.target.value,
									})
								}
								className='h-9'
							/>
						</SettingsField>
					</SectionCard>
				)}
			</div>

			{/* ── Discord-style unsaved changes bar ── */}
			{hasChanges && (
				<div className='fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300'>
					<div className='flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-lg'>
						<span className='text-sm text-muted-foreground'>
							Есть несохранённые изменения
						</span>
						<button
							onClick={handleReset}
							className='flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
						>
							<RotateCcwIcon className='size-3' />
							Сбросить
						</button>
						<button
							onClick={handleSave}
							className='flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90'
						>
							<SaveIcon className='size-3' />
							Сохранить
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
