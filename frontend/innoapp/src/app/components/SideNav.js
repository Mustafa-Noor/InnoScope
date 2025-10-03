'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { name: 'Layman chat', link: '/layman-chat' },
    { name: 'History', link: '/history' },
    { name: 'Files chat', link: '/files-chat' },
    { name: 'Collaborate', link: '/collaborate' },
    { name: 'Feasibility', link: '/feasibility' },
    { name: 'Roadmap', link: '/Roadmap' },
    { name: 'Recommendations', link: '/recommendations' },
    { name: 'Settings', link: '/settings' },
];

const SideNav = () => {
    const pathname = usePathname();

    return (
        <nav style={styles.sidebar}>
            <div style={styles.logo}>
                <Link href="/" style={{ textDecoration: 'none', color: '#083d44' }}>
                    <h2>InnoScope</h2>
                </Link>
            </div>
            <ul style={styles.navList}>
                {navItems.map((item) => {
                    const isActive = pathname === item.link;
                    return (
                        <li key={item.name} style={styles.navItem}>
                            <Link 
                                href={item.link} 
                                style={{
                                    ...styles.navLink,
                                    backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                    color: isActive ? '#059669' : '#374151',
                                    fontWeight: isActive ? '600' : '500'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
                                        e.target.style.color = '#059669';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.target.style.backgroundColor = 'transparent';
                                        e.target.style.color = '#374151';
                                    }
                                }}
                            >
                                {item.name}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

const styles = {
    sidebar: {
        position: 'fixed',
        left: 0,
        top: 15,
        width: '220px',
        minHeight: '95vh',
        background: '#f1ededff',
        border: '10px solid #e5e7eb',
        borderRadius: '15px',
        color: '#374151',
        padding: '20px 0',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        border: '1px solid #e5e7eb',
    },
    logo: {
        textAlign: 'center',
        marginBottom: '40px',
        fontWeight: 'bold',
        letterSpacing: '2px',
        fontFamily: 'Poppins, sans-serif',
        color: '#059669',
    },
    navList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        flex: 1,
    },
    navItem: {
        marginBottom: '3px',
    },
    navLink: {
        color: '#374151',
        textDecoration: 'none',
        fontSize: '16px',
        padding: '12px 24px',
        display: 'block',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        fontFamily: 'Poppins, sans-serif',
        fontWeight: '500',
        margin: '0 12px',
    },
};

export default SideNav;