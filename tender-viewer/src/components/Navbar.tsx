import React from 'react';
import { NavLink } from 'react-router-dom';

const Navbar: React.FC = () => {
    return (
        <nav style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '2rem' }}>
                <NavLink
                    to="/"
                    className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                    style={({ isActive }) => ({
                        color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
                        textDecoration: 'none',
                        fontSize: '1.1rem',
                        fontWeight: isActive ? 'bold' : 'normal',
                        borderBottom: isActive ? '2px solid var(--primary-color)' : 'none',
                        paddingBottom: '0.5rem'
                    })}
                >
                    Tenders
                </NavLink>
                {/* <NavLink
                    to="/contracts"
                    className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                    style={({ isActive }) => ({
                        color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
                        textDecoration: 'none',
                        fontSize: '1.1rem',
                        fontWeight: isActive ? 'bold' : 'normal',
                        borderBottom: isActive ? '2px solid var(--primary-color)' : 'none',
                        paddingBottom: '0.5rem'
                    })}
                >
                    Contracts
                </NavLink> */}
            </div>
        </nav>
    );
};

export default Navbar;
