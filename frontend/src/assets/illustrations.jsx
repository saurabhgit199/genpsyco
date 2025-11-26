import React from 'react';

export const LoginBackground = () => (
    <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
        <svg width="100%" height="100%" viewBox="0 0 1440 900" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a18cd1" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#fbc2eb" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#84fab0" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#8fd3f4" stopOpacity="0.2" />
                </linearGradient>
            </defs>
            <path fill="url(#grad1)" d="M0,256L48,261.3C96,267,192,277,288,293.3C384,309,480,331,576,314.7C672,299,768,245,864,229.3C960,213,1056,235,1152,240C1248,245,1344,235,1392,229.3L1440,224L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
            <path fill="url(#grad2)" d="M0,640L48,624C96,608,192,576,288,576C384,576,480,608,576,629.3C672,651,768,661,864,640C960,619,1056,565,1152,554.7C1248,544,1344,576,1392,592L1440,608L1440,900L1392,900C1344,900,1248,900,1152,900C1056,900,960,900,864,900C768,900,672,900,576,900C480,900,384,900,288,900C192,900,96,900,48,900L0,900Z"></path>
            <circle cx="10%" cy="20%" r="50" fill="rgba(255, 255, 255, 0.5)" />
            <circle cx="90%" cy="80%" r="80" fill="rgba(255, 255, 255, 0.4)" />
            <circle cx="50%" cy="50%" r="120" fill="rgba(255, 255, 255, 0.3)" />
        </svg>
    </div>
);

export const DashboardHero = () => (
    <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e0c3fc" />
                    <stop offset="100%" stopColor="#8ec5fc" />
                </linearGradient>
            </defs>
            {/* Abstract person sitting */}
            <circle cx="200" cy="100" r="30" fill="#a18cd1" />
            <path d="M170,140 Q200,180 230,140 Q260,200 200,250 Q140,200 170,140" fill="#a18cd1" />

            {/* Background elements */}
            <circle cx="50" cy="50" r="20" fill="url(#heroGrad)" opacity="0.6" />
            <circle cx="350" cy="80" r="15" fill="url(#heroGrad)" opacity="0.5" />
            <path d="M0,250 Q200,300 400,250 L400,300 L0,300 Z" fill="url(#heroGrad)" opacity="0.3" />

            {/* Leaves/Nature */}
            <path d="M50,200 Q70,180 90,200 Q70,220 50,200" fill="#84fab0" />
            <path d="M350,180 Q330,160 310,180 Q330,200 350,180" fill="#84fab0" />
        </svg>
    </div>
);

export const TherapyIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="12" fill="#e0c3fc" fillOpacity="0.3" />
        <path d="M12 7V17M7 12H17" stroke="#8e44ad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 9L15 15M15 9L9 15" stroke="#8e44ad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
);

export const AudioIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="12" fill="#84fab0" fillOpacity="0.3" />
        <path d="M12 6V18M8 9V15M16 9V15" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const NewSessionIcon = () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="url(#newSessionGrad)" />
        <defs>
            <linearGradient id="newSessionGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a18cd1" />
                <stop offset="1" stopColor="#fbc2eb" />
            </linearGradient>
        </defs>
        <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
