import { useState } from 'react'
import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function App() {

  return (
    <section>
      <header>
        <div className="background" >
          <div className="header-container">
            <img src="https://res.cloudinary.com/db0315mif/image/upload/v1777184226/default_avatar_tqisty.jpg" className="avatar1" ></img>
            <div className="dropdown">
            <button className="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              MENU
            </button>
            <ul className="dropdown-menu">
              <li><a className="dropdown-item" href="#home">Home</a></li>
              <li><a className="dropdown-item" href="#about">Aboout</a></li>
            </ul>
          </div>
          
          </div>
          
        </div> 
        
      </header>
      <body>
Body
      </body>
      <footer>
Footer
      </footer>
    </section>
  )
}

export default App
