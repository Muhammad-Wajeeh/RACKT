import { useState } from 'react'
import Sidebar from './components/Sidebar' 
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
  <>
  <Sidebar></Sidebar>
    </>
  )
}

export default App
