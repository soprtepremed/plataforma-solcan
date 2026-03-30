import React from 'react';
import { Link } from 'react-router-dom';

const TopNavbar = () => {
    return (
        <nav>
            <div>
                <h1>Plataforma Solcan</h1>
                <Link to="/sucursales">Sucursales</Link>
                <Link to="/usuarios">Usuarios</Link>
            </div>
        </nav>
    );
};

export default TopNavbar;