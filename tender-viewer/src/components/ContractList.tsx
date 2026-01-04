import React, { useState } from 'react';
import useSWR from 'swr';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { formatAmount } from '../utils';
import ContractDetail from './ContractDetail';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API Error ${res.status}`);
    return res.json();
};

const ContractList: React.FC = () => {
    const [page, setPage] = useState(1);
    const limit = 50;
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'dateSigned', direction: 'desc' });
    const navigate = useNavigate();
    const location = useLocation();


    const query = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
        sort_by: sortConfig.key,
        descending: sortConfig.direction === 'desc' ? 'true' : 'false'
    });

    const { data, error, isLoading } = useSWR(`/api/2.4/contracts?${query.toString()}`, fetcher, {
        keepPreviousData: true
    });

    const contracts = data?.data || [];
    const totalContracts = data?.meta?.total || 0;
    const totalPages = Math.ceil(totalContracts / limit);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        } else {
            if (key === 'dateSigned' || key === 'value') direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    if (error) return <div style={{ color: 'red', marginTop: '2rem' }}>Failed to load contracts: {error.message}</div>;

    return (
        <div>
            {isLoading && <div style={{ textAlign: 'center', color: '#888' }}>Loading Contracts...</div>}

            <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Status</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Contract ID</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Tender</th>
                            <th
                                style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => handleSort('value')}
                            >
                                Value {getSortIndicator('value')}
                            </th>
                            <th
                                style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => handleSort('dateSigned')}
                            >
                                Date Signed {getSortIndicator('dateSigned')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.map((item: any, index: number) => {
                            const contract = item.contract || {};
                            return (
                                <tr
                                    key={index}
                                    className="table-row"
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                                    onClick={() => navigate(`/contracts/${contract.id}`)}
                                >
                                    <td style={{ padding: '1rem' }}>
                                        <span className={`status-badge ${contract.status === 'active' ? 'status-active' : 'status-complete'}`}>
                                            {contract.status || 'Active'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>
                                        {contract.id}
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Award: {contract.awardID}</div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {item.tender_title && (
                                            <div style={{ fontWeight: '500', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.tender_title}>
                                                {item.tender_title}
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {item.tender_id}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {formatAmount(contract.value)}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {contract.dateSigned ? new Date(contract.dateSigned).toLocaleDateString() : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalContracts > limit && (
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
                            cursor: page === 1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Previous
                    </button>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Page {page} of {totalPages} (Total: {totalContracts.toLocaleString()})
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
                            cursor: page === totalPages ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Modal Detail View */}
            <ContractDetail
                id={useParams<{ id: string }>().id || null}
                onClose={() => navigate('/contracts' + location.search)}
            />
        </div>
    );
};

export default ContractList;
