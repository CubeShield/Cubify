import { BoxIcon, PackageIcon, PaletteIcon } from 'lucide-react'

export const CONTAINERS: Record<
	string,
	{ label: string; icon: typeof BoxIcon }
> = {
	mods: { label: 'Моды', icon: PackageIcon },
	resourcepacks: { label: 'Ресурспаки', icon: PaletteIcon },
}

export const LOADER_COLORS: Record<string, string> = {
	fabric: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
	forge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
	quilt: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
	neoforge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}
