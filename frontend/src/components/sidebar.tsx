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
import {
	ArrowLeft,
	ArrowRight,
	BoxesIcon,
	BoxIcon,
	ChevronDown,
	ChevronsUpDown,
	ListIcon,
	PlayIcon,
	Plus,
	RefreshCwIcon,
	Settings2Icon,
	User2,
} from 'lucide-react'
import {
	DropdownMenuTrigger,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuGroup,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuLabel,
} from './ui/dropdown-menu'
import { github } from 'wailsjs/go/models'
import { useState } from 'react'
import { Button } from './ui/button'

interface AppSidebarProps {
	instances: github.Instance[]
	selectedInstance: github.Instance | null
	onSelect: (instance: github.Instance) => void
	onRefresh?: () => void
	isRefreshing: boolean
	currentPage: 'detail' | 'settings'
	setCurrentPage: (page: 'detail' | 'settings') => void
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
					'flex px-3 items-center gap-2 py-3 bg-linear-to-r hover:from-accent/50 hover:to-accent/0 transition-all ' +
					(isSelected ? 'bg-linear-to-r from-accent to-accent/0' : '')
				}
			>
				<img
					src={instance.releases[0].Meta.image_url}
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
	isRefreshing,
	currentPage,
	setCurrentPage,
}: AppSidebarProps) {
	return (
		<Sidebar variant='floating' className=''>
			<SidebarHeader>
				<div className='flex items-center justify-center gap-2'>
					<div className='flex border min-h-10 min-w-10 size-10 rounded-xl items-center justify-center'>
						<BoxesIcon />
					</div>

					<h1 className='font-bold'>Доступные сборки</h1>
				</div>
			</SidebarHeader>
			<SidebarContent className='flex gap-0'>
				{instances.map((instance, index) => {
					return (
						<InstanceCard
							key={index}
							instance={instance}
							isSelected={selectedInstance === instance}
							onClick={() => {
								setCurrentPage('detail')
								onSelect(instance)
							}}
						/>
					)
				})}
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size='lg'
									className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
								>
									<img
										src='https://minotar.net/helm/9a076b22676f4273837fded9696875db/512.png'
										className='size-8 aspect-square rounded-lg'
									></img>
									<div className='grid flex-1 text-left text-sm leading-tight'>
										<span className='truncate font-bold'>Lyroq1s</span>
										<span className='truncate text-xs font-medium'>
											CubeShield Аккаунт
										</span>
									</div>
									<ChevronsUpDown className='ml-auto' />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
								align='start'
								sideOffset={4}
							>
								<DropdownMenuGroup>
									<DropdownMenuLabel className='text-muted-foreground text-xs'>
										Аккаунты
									</DropdownMenuLabel>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem className='gap-2 p-2'>
										<div className='flex size-6 items-center justify-center rounded-md border bg-transparent'>
											<Plus className='size-4' />
										</div>
										<div className='text-muted-foreground font-medium'>
											Добавить аккаунт
										</div>
									</DropdownMenuItem>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
				<Button className='cursor-pointer'>
					<PlayIcon /> Играть
				</Button>
				{currentPage === 'detail' && (
					<Button
						className='cursor-pointer'
						onClick={() => {
							setCurrentPage('settings')
						}}
					>
						<Settings2Icon /> Настройки
					</Button>
				)}
				<Button
					className='cursor-pointer'
					onClick={onRefresh}
					disabled={isRefreshing}
				>
					<RefreshCwIcon /> Обновить список
				</Button>
			</SidebarFooter>
		</Sidebar>
	)
}
