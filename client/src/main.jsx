import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import SocketProvider from './components/SocketProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Provider store={store}>
            <SocketProvider>
                <App />
            </SocketProvider>
        </Provider>
    </React.StrictMode>
);
