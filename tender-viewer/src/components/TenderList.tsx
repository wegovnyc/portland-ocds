import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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

const SkeletonCard = () => (
    <div className="card" style={{ height: '200px', display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'pulse 1.5s infinite' }}>
        <div style={{ width: '30%', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
        <div style={{ width: '80%', height: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
        <div style={{ width: '50%', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
        <div style={{ marginTop: 'auto', width: '40%', height: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
        <style>{`
            @keyframes pulse {
                0% { opacity: 0.6; }
                50% { opacity: 0.3; }
                100% { opacity: 0.6; }
            }
        `}</style>
    </div>
);

const TenderList: React.FC = () => {
    // State for Link-based API Params
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'startDate', direction: 'desc' });
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [hasDate, setHasDate] = useState<string>('yes');
    const [page, setPage] = useState(1);

    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams<{ id: string }>();


    // Construct Query URL
    // Endpoint: /api/2.4/tenders (proxied to FastAPI /tenders)
    // FastAPI params: search, sort_by, descending (bool), limit, status
    const sortParam = sortConfig.key;
    const descParam = sortConfig.direction === 'desc';
    const limit = 50; // Page size

    const query = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(), // Calculate Offset
        sort_by: sortParam,
        descending: descParam ? 'true' : 'false'
    });

    if (searchTerm) {
        query.append('search', searchTerm);
    }

    if (statusFilter && statusFilter !== 'all') {
        query.append('status', statusFilter);
    }

    if (hasDate && hasDate !== 'all') {
        query.append('has_date', hasDate);
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
        min_value: '1',
        has_date: 'yes'
    });
    const { data: recentData } = useSWR(`/api/2.4/tenders?${recentQuery.toString()}`, fetcher);
    const recentTenders = recentData?.data || [];

    // Fetch Detailed Tenders (Top 3 by complexity)
    const detailedQuery = new URLSearchParams({
        limit: '3',
        sort_by: 'complexity',
        descending: 'true',
        min_value: '1'
    });
    const { data: detailedData } = useSWR(`/api/2.4/tenders?${detailedQuery.toString()}`, fetcher);
    const detailedTenders = detailedData?.data || [];

    // Fetch Summary Stats
    const { data: statsData } = useSWR('/api/2.4/tenders/stats', fetcher);

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

    // Pagination Logic
    const totalPages = Math.ceil(totalTenders / limit);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const renderCard = (item: any) => {
        const tender = item.tender || {};
        return (
            <div key={item.id} className="card" onClick={() => navigate(`/tenders/${item.id}`)}>
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

    const renderDetailedCard = (item: any) => {
        const tender = item.tender || {};
        const awardCount = (tender.awards || []).length;
        const contractCount = (item.contracts || []).length; // Contracts are top-level in internal DB structure, but mapped to tender usually. Check API response. Actually API returns .data which is the whole JSON. `contracts` usually at root in OCDS 1.1 records or linked. Let's check tender.contracts fallback.
        // Our backend stores flattened? No, data column.
        // API response: data list. Each item is the full JSON.
        // In OCDS, contracts are at root of Record, but embedded in Tender for Release?
        // Let's safely check both or assume structure. Main.py sorts by `data->'contracts'`.
        const rootContracts = item.contracts || [];
        const tenderContracts = tender.contracts || [];
        const totalContracts = rootContracts.length > 0 ? rootContracts.length : tenderContracts.length;

        const docCount = (tender.documents || []).length;
        const itemCount = (tender.items || []).length;
        const milestoneCount = (tender.milestones || []).length;

        return (
            <div key={item.id} className="card" onClick={() => navigate(`/tenders/${item.id}`)} style={{ borderColor: 'rgba(187, 134, 252, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span className={`status-badge ${tender.status === 'active' ? 'status-active' : 'status-complete'}`}>
                        {tender.status || 'Active'}
                    </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                    {formatTitle(tender.title || 'Untitled Tender')}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {tender.tenderID || item.id}
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                    {awardCount > 0 && <span className="status-badge" style={{ background: 'rgba(3, 218, 198, 0.1)', color: '#03dac6', fontSize: '0.75rem' }}>{awardCount} Awards</span>}
                    {totalContracts > 0 && <span className="status-badge" style={{ background: 'rgba(187, 134, 252, 0.1)', color: '#bb86fc', fontSize: '0.75rem' }}>{totalContracts} Contracts</span>}
                    {docCount > 0 && <span className="status-badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '0.75rem' }}>{docCount} Docs</span>}
                    {itemCount > 0 && <span className="status-badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '0.75rem' }}>{itemCount} Items</span>}
                    {milestoneCount > 0 && <span className="status-badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '0.75rem' }}>{milestoneCount} Milestones</span>}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Dataset Summary Stats */}
            {statsData && (
                <div style={{
                    marginBottom: '2rem',
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(187, 134, 252, 0.1), rgba(3, 218, 198, 0.1))',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent)' }}>
                        Dataset Overview
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                {statsData.tenders?.toLocaleString() || 0}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tenders</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--secondary-color)' }}>
                                {statsData.contracts?.toLocaleString() || 0}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contracts</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff' }}>
                                {statsData.items?.toLocaleString() || 0}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Items</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff' }}>
                                {statsData.milestones?.toLocaleString() || 0}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Milestones</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff' }}>
                                {statsData.transactions?.toLocaleString() || 0}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Transactions</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff' }}>
                                {statsData.purchaseOrders?.toLocaleString() || 0}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Purchase Orders</div>
                        </div>
                    </div>
                    <div style={{
                        marginTop: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Award Value: </span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--secondary-color)' }}>
                                ${(statsData.totalAwardValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', textAlign: 'right' }}>
                            {statsData.minDate && statsData.maxDate && (
                                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                    <span>Dataset Period: </span>
                                    <span style={{ color: '#fff' }}>
                                        {new Date(statsData.minDate).toLocaleDateString()} — {new Date(statsData.maxDate).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                            <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Data Source: </span>
                                <a
                                    href="https://www.portland.gov/business-opportunities/ocds"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--accent)', textDecoration: 'none' }}
                                >
                                    City of Portland, Oregon
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Tenders Section */}
            <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--accent)', paddingLeft: '1rem' }}>
                    Recent Tenders
                </h2>
                <div className="tender-grid">
                    {/* Use SWR's isValidating or data check for skeletons if needed, but recentData is separate */}
                    {!recentData && !recentTenders.length ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : (
                        recentTenders.map(renderCard)
                    )}
                </div>
            </div>

            {/* Dashboard Metrics Removed as per request */}

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
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} // Reset to page 1 on search
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
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} // Reset to page 1 on filter
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
                    value={hasDate}
                    onChange={(e) => { setHasDate(e.target.value); setPage(1); }}
                    style={{ padding: '0.8rem', borderRadius: '4px', background: '#222', color: 'white', border: '1px solid rgba(255,255,255,0.1)', minWidth: '180px' }}
                >
                    <option value="all">Date Present: All</option>
                    <option value="yes">Date Present: Yes</option>
                    <option value="no">Date Present: No</option>
                </select>
            </div >

            {isLoading && (
                <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                    {/* Table Skeleton - simplified as just rows of blocks or using transparency */}
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }}>
                        <div style={{ height: '40px', background: 'rgba(255,255,255,0.05)', marginBottom: '1rem', borderRadius: '4px' }}></div>
                        <div style={{ height: '300px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}></div>
                    </div>
                </div>
            )}

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
                                    onClick={() => navigate(`/tenders/${item.id}`)}
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

            {/* Pagination Controls */}
            {totalTenders > limit && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '2rem', gap: '1rem' }}>
                    <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        style={{
                            padding: '0.8rem 1.2rem',
                            background: page === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            color: page === 1 ? '#666' : 'white',
                            cursor: page === 1 ? 'not-allowed' : 'pointer',
                            transition: 'background 0.2s'
                        }}
                    >
                        Previous
                    </button>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Page {page} of {totalPages} (Total: {totalTenders.toLocaleString()})
                    </span>
                    <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        style={{
                            padding: '0.8rem 1.2rem',
                            background: page === totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            color: page === totalPages ? '#666' : 'white',
                            cursor: page === totalPages ? 'not-allowed' : 'pointer',
                            transition: 'background 0.2s'
                        }}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Most Detailed Tenders Section (Moved to Bottom) */}
            <div style={{ marginBottom: '3rem', marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid #BB86FC', paddingLeft: '1rem' }}>
                    Most Detailed Tenders
                </h2>
                <div className="tender-grid">
                    {!detailedData && !detailedTenders.length ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : (
                        detailedTenders.map(renderDetailedCard)
                    )}
                </div>
            </div>


            {/* Modal Detail View */}
            <TenderDetail
                id={params.id || null}
                onClose={() => navigate('/tenders' + location.search)}
            />
        </>
    );
};

export default TenderList;
