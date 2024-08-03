import Footer from './components/Footer/Footer';
import { Outlet } from 'react-router-dom';

const App = () => {
    return (
        <div className="App">
          <main>
            <Outlet />
          </main>
            <Footer />
        </div>
    );
};

export default App;
