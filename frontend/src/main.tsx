import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App'
import dayjs from 'dayjs'

const container = document.getElementById('root')
dayjs.locale('ru')
const root = createRoot(container!)

root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)
