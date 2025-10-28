import React from 'react';

const ServiceIconPlaceholder = () => (
    <div className="service-icon-placeholder">
        <svg viewBox="0 0 100 80">
            <path d="M7.5 70 l 25-30 l 15 10 l 20-25 l 25 35 Z" fill="#cccccc"/>
            <circle cx="80" cy="25" r="8" fill="#cccccc" />
        </svg>
    </div>
);

const ServiceCard = ({ title }) => (
    <div className="service-card">
        <ServiceIconPlaceholder />
        <h3>{title}</h3>
        <p>
            Lorem ipsum dolor sit amet, 
            consectetur adipiscing elit. Sed non 
            risus.
        </p>
    </div>
);

function ServicesPage() {
    const services = [
        { id: 1, title: 'General Dentistry' },
        { id: 2, title: 'Cosmetic Dentistry' },
        { id: 3, title: 'Orthodontics' },
        { id: 4, title: 'Dental Implants' },
        { id: 5, title: 'Teeth Whitening' },
        { id: 6, title: 'Root Canals' },
        { id: 7, title: 'Pediatric Dentistry' },
        { id: 8, title: 'Emergency Care' },
    ];

    return (
        <section className="services-section">
            <div className="container">
                <div className="services-header">
                    <h2>Services</h2>
                    <p>
                        Lorem ipsum dolor sit amet, 
                        consectetur adipiscing elit. Sed non 
                        risus.
                    </p>
                </div>
                <div className="services-grid">
                    {services.map(service => (
                        <ServiceCard key={service.id} title={service.title} />
                    ))}
                </div>
            </div>
        </section>
    );
}

export default ServicesPage;