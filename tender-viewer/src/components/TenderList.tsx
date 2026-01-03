import React, { useState } from 'react';
import useSWR from 'swr';
import TenderDetail from './TenderDetail';
import { formatTitle, formatAmount } from '../utils';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`API Error ${res.status}`);
    }
    return res.json();
};

const TenderList: React.FC = () => {
    // State for Link-based API Params
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'dateModified', direction: 'desc' });
    const [statusFilter, setStatusFilter] = useState<string>('all');


    // Construct Query URL
    // Endpoint: /api/2.4/tenders (proxied to FastAPI /tenders)
    // FastAPI params: search, sort_by, descending (bool), limit, status
    const sortParam = sortConfig.key;
    const descParam = sortConfig.direction === 'desc';
    const limit = 50; // Page size

    const query = new URLSearchParams({
        limit: limit.toString(),
        sort_by: sortParam,
        descending: descParam ? 'true' : 'false'
    });

    if (searchTerm) {
        query.append('search', searchTerm);
    }

    if (statusFilter && statusFilter !== 'all') {
        query.append('status', statusFilter);
    }

    // Todo: Implement Filters (status, entity, method) in FastAPI if needed.
    // Ideally we pass them as well if API supports. 
    // Currently API supports: search (text), sort_by, status.
    // Filters need to be added to Main.py if we want server-side filtering.
    // For now, let's keep search/sort server-side, and maybe simple status filter if easy.
    // Assuming API only does search/sort for now based on main.py content.

    const { data, error, isLoading } = useSWR(`/api/2.4/tenders?${query.toString()}`, fetcher, {
        keepPreviousData: true
    });

    const { data: statusCounts } = useSWR('/api/2.4/tenders/meta/statuses', fetcher);

    // Fetch Recent Tenders (Top 3, Val > 0)
    const recentQuery = new URLSearchParams({
        limit: '3',
        sort_by: 'dateModified',
        descending: 'true',
        min_value: '1'
    });
    const { data: recentData } = useSWR(`/api/2.4/tenders?${recentQuery.toString()}`, fetcher);
    const recentTenders = recentData?.data || [];
    const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        } else {
            // Default direction for new sort keys
            if (key === 'dateModified' || key === 'value' || key === 'startDate' || key === 'endDate') {
                direction = 'desc';
            }
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    if (error) return <div style={{ color: 'red', marginTop: '2rem' }}>Failed to load: {error.message}</div>;

    // ... existing data ...
    const tenders = data?.data || [];
    const totalTenders = data?.meta?.total || 0;

    const renderCard = (item: any) => {
        const tender = item.tender || {};
        return (
            <div key={item.id} className="card" onClick={() => setSelectedTenderId(item.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span className={`status-badge ${tender.status === 'active' ? 'status-active' : 'status-complete'}`}>
                        {tender.status || 'Active'}
                    </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                    {formatTitle(tender.title || 'Untitled Tender')}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {tender.tenderID || item.id}
                </p>
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="amount" style={{ fontSize: '1.2rem' }}>
                        {formatAmount(tender.value)}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Recent Tenders Section */}
            {recentTenders.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--accent)', paddingLeft: '1rem' }}>
                        Recent Tenders
                    </h2>
                    <div className="tender-grid">
                        {recentTenders.map(renderCard)}
                    </div>
                </div>
            )}

            {/* Dashboard Metrics (Calculated from separate "stats" endpoint ideally, or estimated from metadata) */}
            {/* For now, we only have total count from search result. 
                Ideally we fetch global stats once. */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Tenders Found</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalTenders.toLocaleString()}</div>
                </div>
            </div>

            {/* Control Bar */}
            <div style={{
                marginBottom: '2rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: '1rem',
                alignItems: 'center'
            }}>
                <input
                    type="text"
                    placeholder="Search by Title or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        padding: '0.8rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.2)',
                        color: 'white',
                        width: '100%',
                        boxSizing: 'border-box'
                    }}
                />

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '0.8rem', borderRadius: '4px', background: '#222', color: 'white', border: '1px solid rgba(255,255,255,0.1)', minWidth: '150px' }}
                >
                    <option value="all">All Statuses</option>
                    {statusCounts && Object.entries(statusCounts).map(([status, count]) => (
                        <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                        </option>
                    ))}
                </select>

                <select
                    value={`${sortConfig.key}-${sortConfig.direction}`}
                    onChange={(e) => {
                        const [key, direction] = e.target.value.split('-');
                        setSortConfig({ key, direction: direction as 'asc' | 'desc' });
                    }}
                    style={{ padding: '0.8rem', borderRadius: '4px', background: '#222', color: 'white', border: '1px solid rgba(255,255,255,0.1)', minWidth: '200px' }}
                >
                    <option value="dateModified-desc">Newest First</option>
                    <option value="dateModified-asc">Oldest First</option>
                    <option value="value-desc">Highest Value</option>
                    <option value="value-asc">Lowest Value</option>
                </select>
            </div >

            {isLoading && <div style={{ textAlign: 'center', color: '#888' }}>Searching...</div>
            }

            <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Status</th>
                            <th
                                style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => handleSort('title')}
                            >
                                Title {getSortIndicator('title')}
                            </th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>ID</th>
                            <th
                                style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => handleSort('value')}
                            >
                                Amount {getSortIndicator('value')}
                            </th>
                            <th
                                style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => handleSort('startDate')}
                            >
                                Start Date {getSortIndicator('startDate')}
                            </th>
                            <th
                                style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => handleSort('endDate')}
                            >
                                End Date {getSortIndicator('endDate')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {tenders.map((item: any) => {
                            const tender = item.tender || {};
                            return (
                                <tr
                                    key={item.id}
                                    onClick={() => setSelectedTenderId(item.id)}
                                    style={{ cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                    className="table-row"
                                >
                                    <td style={{ padding: '1rem' }}>
                                        <span className={`status-badge ${tender.status === 'active' ? 'status-active' : 'status-complete'}`} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>
                                            {tender.status || 'Active'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: '500', maxWidth: '400px' }}>
                                        {formatTitle(tender.title || 'Untitled Tender')}
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{tender.tenderID || item.id}</td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{formatAmount(tender.value)}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                        {tender.tenderPeriod?.startDate ? new Date(tender.tenderPeriod.startDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                        {tender.tenderPeriod?.endDate ? new Date(tender.tenderPeriod.endDate).toLocaleDateString() : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <TenderDetail id={selectedTenderId} onClose={() => setSelectedTenderId(null)} />
        </>
    );
};

export default TenderList;
