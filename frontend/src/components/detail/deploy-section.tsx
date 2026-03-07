import { useState, useEffect } from 'react'
import { instance } from 'wailsjs/go/models'
import dayjs from 'dayjs'
import { Loader2, RocketIcon, ServerIcon, Trash2Icon } from 'lucide-react'
import { Button } from '../ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select'
import { Separator } from '../ui/separator'
import { DeployToServer, CancelDeploy } from '../../../wailsjs/go/main/App'
import { EventsOn, EventsOff } from '../../../wailsjs/runtime/runtime'

export function DeploySection({ inst }: { inst: instance.LocalInstance }) {
	const [selectedDeployVersion, setSelectedDeployVersion] = useState<string>('')
	const [isDeploying, setDeploying] = useState(false)
	const [deployError, setDeployError] = useState<string | null>(null)
	const [deploySuccess, setDeploySuccess] = useState(false)

	useEffect(() => {
		const onDone = () => {
			setDeploying(false)
			setDeploySuccess(true)
		}
		const onError = (msg: string) => {
			setDeploying(false)
			setDeployError(msg || 'Неизвестная ошибка')
		}
		const onCancelled = () => {
			setDeploying(false)
			setDeployError('Деплой отменён')
		}

		EventsOn('deploy:done', onDone)
		EventsOn('deploy:error', onError)
		EventsOn('deploy:cancelled', onCancelled)

		return () => {
			EventsOff('deploy:done')
			EventsOff('deploy:error')
			EventsOff('deploy:cancelled')
		}
	}, [])

	const handleDeploy = () => {
		const release = inst.releases.find(
			r => r.tag_name === selectedDeployVersion,
		)
		if (!release) return

		setDeploying(true)
		setDeployError(null)
		setDeploySuccess(false)
		DeployToServer(release)
	}

	const handleCancelDeploy = () => {
		CancelDeploy()
	}

	return (
		<div className='border rounded-xl overflow-hidden bg-card mb-5'>
			<div className='flex items-center gap-2 px-4 py-3 bg-linear-to-r from-sky-500/10 via-sky-500/5 to-transparent'>
				<div className='flex items-center justify-center size-8 rounded-lg bg-sky-500/15'>
					<ServerIcon className='size-4 text-sky-400' />
				</div>
				<div>
					<span className='font-semibold text-sm'>Деплой на сервер</span>
					<p className='text-xs text-muted-foreground'>
						Выберите версию для установки через FTP
					</p>
				</div>
			</div>
			<Separator />
			<div className='p-4 flex flex-col gap-3'>
				<div className='flex gap-2'>
					<Select
						value={selectedDeployVersion}
						onValueChange={setSelectedDeployVersion}
					>
						<SelectTrigger className='flex-1'>
							<SelectValue placeholder='Выберите версию' />
						</SelectTrigger>
						<SelectContent>
							{inst.releases.map((release, idx) => (
								<SelectItem key={idx} value={release.tag_name}>
									{release.name} (
									{dayjs(release.created_at).format('D MMM YYYY')})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						onClick={handleDeploy}
						disabled={!selectedDeployVersion || isDeploying}
						className='cursor-pointer'
					>
						{isDeploying ? (
							<Loader2 className='size-4 animate-spin' />
						) : (
							<RocketIcon className='size-4' />
						)}
						{isDeploying ? 'Деплой...' : 'Выкатить'}
					</Button>
					{isDeploying && (
						<Button
							variant='destructive'
							size='icon'
							onClick={handleCancelDeploy}
							className='cursor-pointer'
						>
							<Trash2Icon className='size-4' />
						</Button>
					)}
				</div>
				{deployError && (
					<span className='text-sm text-destructive'>{deployError}</span>
				)}
				{deploySuccess && (
					<span className='text-sm text-green-500'>
						Деплой завершён успешно!
					</span>
				)}
			</div>
		</div>
	)
}
