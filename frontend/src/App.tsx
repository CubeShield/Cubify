import { useEffect, useState } from 'react'
import logo from './assets/images/logo-universal.png'
import './App.css'
import { FetchInstances } from '../wailsjs/go/main/App'
import { github } from '../wailsjs/go/models'

function App() {
	const [instances, setInstances] = useState<github.Instance[]>([])
	const getInstances = async () => {
		setInstances(await FetchInstances())
	}
	useEffect(() => {
		getInstances()
	}, [])

	return (
		<div id='App'>
			<img src={logo} id='logo' alt='logo' />
			<div id='result' className='result'>
				{instances.map(inst => (
					<div key={inst.releases[0].url}>
						{inst.releases[0].Meta.name} {inst.releases[0].name}
					</div>
				))}
			</div>
			<button
				onClick={() => {
					getInstances()
				}}
			>
				Обновить
			</button>
		</div>
	)
}

export default App
