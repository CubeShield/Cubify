import { useEffect, useState } from 'react'
import logo from './assets/images/logo-universal.png'
import './App.css'
import { GetInstances, Greet } from '../wailsjs/go/main/App'
import { github } from '../wailsjs/go/models'

function App() {
	const [resultText, setResultText] = useState(
		'Please enter your name below 👇',
	)
	const [name, setName] = useState('')
	const updateName = (e: any) => setName(e.target.value)
	const updateResultText = (result: string) => setResultText(result)

	function greet() {
		Greet(name).then(updateResultText)
	}

	const [instances, setInstances] = useState<github.Instance[]>([])
	const getInstances = async () => {
		setInstances(await GetInstances())
	}
	useEffect(() => {
		getInstances()
	}, [])

	return (
		<div id='App'>
			<img src={logo} id='logo' alt='logo' />
			<div id='result' className='result'>
				{instances.map(inst => (
					<div>{inst.releases[0].name}</div>
				))}
			</div>
		</div>
	)
}

export default App
