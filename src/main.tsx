import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LoginGate } from './components/LoginGate';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <LoginGate>
    <App />
  </LoginGate>
);
