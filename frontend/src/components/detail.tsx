import { editor, instance } from 'wailsjs/go/models'
import dayjs from 'dayjs'
import { BoxIcon } from 'lucide-react'
import { Badge } from './ui/badge'
import { EditorPage } from './editor/editor-page'

interface InstanceDetailProps {
	instance: instance.LocalInstance
	project?: instance.Project
}

const CONTAINERS = {
	mods: 'Моды',
	resourcepacks: 'Ресурспаки',
}

export function InstanceDetail({ instance, project }: InstanceDetailProps) {
	return (
		<div>
			<h2 className='text-3xl font-bold'>{instance.releases[0].Meta.name}</h2>
			<h3 className='text-l font-medium text-zinc-400'>
				{instance.releases[0].Meta.description}
			</h3>
			{/*<Releases instance={instance} />*/}
			{project && <EditorPage project={project} onRefresh={() => {}} />}
		</div>
	)
}

interface ReleasesProps {
	instance: instance.LocalInstance
}

function Releases({ instance }: ReleasesProps) {
	return (
		<>
			<div className='flex gap-2 mt-2'>
				{instance.releases[0].Meta.containers.map(container => (
					<div className='flex items-center gap-1 p-2 border rounded-xl'>
						<BoxIcon className='size-4' />
						{CONTAINERS[container.content_type as keyof typeof CONTAINERS]}
						<Badge className=''>{container.content.length}</Badge>
					</div>
				))}
			</div>
			<div className='flex flex-col gap-3 mt-4'>
				{instance.releases.map((release, index) => {
					return (
						<div className='border rounded-2xl p-3 flex flex-col gap-2'>
							<div className='flex flex-col gap-1'>
								<h1 className='font-semibold text-2xl'>
									Обновление {release.name}
								</h1>
								<Badge>
									{dayjs(release.created_at).format('D MMMM HH:mm')}
								</Badge>
							</div>
							<span>{release.body}</span>
						</div>
					)
				})}
			</div>
		</>
	)
}
