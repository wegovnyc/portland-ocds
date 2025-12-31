import React, { useState } from 'react';
import useSWR from 'swr';
import TenderDetail from './TenderDetail';
import { formatTitle, formatAmount } from '../utils';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
    }
    return res.json();
};

const TenderList: React.FC = () => {
    const { data, error, isLoading } = useSWR('/api/2.4/tenders?mode=test&descending=1&opt_fields=title,status,value,tenderID,dateModified', fetcher);
    const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);

    if (error) return <div style={{ color: 'red', marginTop: '2rem' }}>Failed to load: {error.message}</div>;
    if (isLoading) return <div style={{ textAlign: 'center', marginTop: '4rem' }}>Loading tenders...</div>;

    return (
        <>
            <div className="tender-grid">
                {data.data.map((tender: any) => (
                    <div key={tender.id} className="card" onClick={() => setSelectedTenderId(tender.id)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span className={`status-badge ${tender.status === 'active' ? 'status-active' : 'status-complete'}`}>
                                {tender.status || 'Active'}
                            </span>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                            {formatTitle(tender.title || 'Untitled Tender')}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {tender.tenderID}
                        </p>
                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="amount" style={{ fontSize: '1.2rem' }}>
                                {formatAmount(tender.value)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <TenderDetail id={selectedTenderId} onClose={() => setSelectedTenderId(null)} />
        </>
    );
};

export default TenderList;
