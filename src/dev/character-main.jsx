import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '../context/AuthContext.jsx';
import CharacterPlayground from './CharacterPlayground.jsx';
import './character-playground.css';

createRoot(document.getElementById('character-root')).render(<React.StrictMode><AuthProvider><CharacterPlayground /></AuthProvider></React.StrictMode>);
