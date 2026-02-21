import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Card, CardContent, CardHeader } from './ui/card'
import { Badge } from './ui/badge'
import { ChevronDown, RefreshCwIcon } from 'lucide-react'
import {
	DropdownMenuTrigger,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
} from './ui/dropdown-menu'
import { github } from 'wailsjs/go/models'
import { useState } from 'react'
import { Button } from './ui/button'

interface AppSidebarProps {
	instances: github.Instance[]
	selectedInstance: github.Instance | null
	onSelect: (instance: github.Instance) => void
	onRefresh?: () => void
}

interface InstanceCardProps {
	instance: github.Instance
	isSelected: boolean
	onClick: () => void
}

function InstanceCard({ instance, isSelected, onClick }: InstanceCardProps) {
	return (
		<div onClick={onClick} className='cursor-pointer'>
			<div
				className={
					'flex px-3 items-center gap-2 py-3 hover:bg-accent/50 transition-all ' +
					(isSelected ? 'bg-accent' : '')
				}
			>
				<img
					src='https://avatars.githubusercontent.com/u/207460496?s=200&v=4'
					className='size-16 rounded-2xl'
				/>
				<div className='flex flex-col gap-1'>
					<div className='flex items-center gap-1'>
						<div className='size-2 bg-lime-300 rounded-4xl'></div>
						<h1 className='font-bold text-l'>
							{instance.releases[0].Meta.name}
						</h1>
					</div>
					<div className='flex items-center gap-1'>
						<Badge>{instance.releases[0].name}</Badge>
					</div>
				</div>
			</div>
		</div>
	)
}

export function AppSidebar({
	instances,
	selectedInstance,
	onSelect,
	onRefresh,
}: AppSidebarProps) {
	return (
		<Sidebar>
			<SidebarHeader>
				<Button className='cursor-pointer' onClick={onRefresh}>
					<RefreshCwIcon /> Обновить
				</Button>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton>
									CubeStudio
									<ChevronDown className='ml-auto' />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent className='w-[--radix-popper-anchor-width]'>
								<DropdownMenuItem>
									<span>Acme Inc</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent className='flex gap-0'>
				{instances.map((instance, index) => {
					const uniqueKey = instance.releases[0].Meta.name
					return (
						<InstanceCard
							key={index}
							instance={instance}
							isSelected={selectedInstance === instance}
							onClick={() => onSelect(instance)}
						/>
					)
				})}
			</SidebarContent>
			<SidebarFooter />
		</Sidebar>
	)
}
