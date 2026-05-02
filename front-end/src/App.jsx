
import './App.css'
import Home from '../page/Home/Home';
import About from '../page/About/About';
import Search from '../page/Search/Search';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/about' element={ <About/>} />
        <Route path='/search' element={ <Search/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
