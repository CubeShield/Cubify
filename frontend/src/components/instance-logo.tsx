import { useState, useEffect } from 'react'
import { GetInstanceLogoDataURL } from '../../wailsjs/go/main/App'

interface InstanceLogoProps {
	src: string | undefined
	slug: string
	alt?: string
	className?: string
}

export function InstanceLogo({ src, slug, alt, className }: InstanceLogoProps) {
	const [localDataURL, setLocalDataURL] = useState<string | null>(null)
	const [remoteFailed, setRemoteFailed] = useState(false)

	useEffect(() => {
		setLocalDataURL(null)
		setRemoteFailed(false)
	}, [slug, src])

	const handleError = async () => {
		if (localDataURL !== null) return
		setRemoteFailed(true)
		try {
			const dataURL = await GetInstanceLogoDataURL(slug)
			setLocalDataURL(dataURL || '')
		} catch {
			setLocalDataURL('')
		}
	}

	const displaySrc = remoteFailed
		? (localDataURL ?? undefined)
		: src

	if (!displaySrc) return null

	return (
		<img
			src={displaySrc}
			alt={alt}
			className={className}
			onError={!remoteFailed ? handleError : undefined}
		/>
	)
}
