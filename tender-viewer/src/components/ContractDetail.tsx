import React from 'react';
import { formatAmount } from '../utils';

interface ContractDetailProps {
    id: string | null;
    contract?: any; // Optional now
    tenderTitle?: string;
    onClose: () => void;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

const ContractDetail: React.FC<ContractDetailProps> = ({ id, contract: initialContract, tenderTitle, onClose }) => {

    // If we have an ID but no initialContract, fetch it.
    // If we have initialContract, use it.
    // Actually, simply fetching by ID is safest if deep linking, but if passed from list we might save a request.
    // However, for permalinks we need to fetch if direct access.

    const shouldFetch = !!id && !initialContract;
    const { data, error, isLoading } = useSWR(shouldFetch ? `/api/2.4/contracts/${id}` : null, fetcher);

    // Use passed contract or fetched contract
    const contract = initialContract || (data?.data?.contract);
    const fetchedTenderTitle = data?.data?.tender_title; // If API returns it

    const finalTenderTitle = tenderTitle || fetchedTenderTitle;

    if (!id && !initialContract) return null;
    if (shouldFetch && isLoading) return <div className="overlay open"><div className="detail-view open"><p>Loading...</p></div></div>;
    if (!contract && !isLoading) return null;

    return (
        <>
            <div className="overlay open" onClick={onClose} />
            <div className="detail-view open">
                <button className="close-btn" onClick={onClose}>&times;</button>

                <div className={`status-badge ${contract.status === 'active' ? 'status-active' : ''}`} style={{ display: 'inline-block', marginBottom: '1rem' }}>
                    {contract.status || 'Active'}
                </div>

                <h2>{contract.title || "Contract " + contract.id}</h2>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    Contract ID: {contract.id}
                    {finalTenderTitle && (
                        <div style={{ marginTop: '0.5rem', color: 'var(--primary-color)' }}>
                            Parent Tender: {finalTenderTitle}
                        </div>
                    )}
                </div>

                <div className="key-value-grid">
                    <div>
                        <span className="label">Value</span>
                        <div className="amount">{formatAmount(contract.value)}</div>
                    </div>
                    <div>
                        <span className="label">Date Signed</span>
                        <div className="value">{contract.dateSigned ? new Date(contract.dateSigned).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div>
                        <span className="label">Award ID</span>
                        <div className="value">{contract.awardID}</div>
                    </div>
                    <div>
                        <span className="label">Period</span>
                        <div className="value">
                            {contract.period?.startDate ? new Date(contract.period.startDate).toLocaleDateString() : 'N/A'}
                            {' - '}
                            {contract.period?.endDate ? new Date(contract.period.endDate).toLocaleDateString() : 'N/A'}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <h3>Description</h3>
                    <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>{contract.description || 'No description provided.'}</p>
                </div>

                {contract.items && contract.items.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <h3>Line Items ({contract.items.length})</h3>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {contract.items.map((item: any, i: number) => (
                                <div key={i} className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)' }}>
                                    <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>{item.description}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                        <div>
                                            <span className="label">Quantity</span>
                                            <div>{item.quantity} {item.unit?.name}</div>
                                        </div>
                                        <div>
                                            <span className="label">Classification</span>
                                            <div>{item.classification?.description}</div>
                                        </div>
                                        <div>
                                            <span className="label">Delivery location</span>
                                            <div>{item.deliveryAddress?.streetAddress || item.deliveryAddress?.region || '-'}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {contract.milestones && contract.milestones.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <h3>Milestones ({contract.milestones.length})</h3>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {contract.milestones.map((m: any, i: number) => (
                                <div key={i} className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${m.status === 'met' ? 'var(--secondary-color)' : '#666'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ fontWeight: '500' }}>{m.title}</div>
                                        <div className="status-badge" style={{ fontSize: '0.7rem' }}>{m.status}</div>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>{m.description}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Due: {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'N/A'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {contract.documents && contract.documents.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <h3>Documents ({contract.documents.length})</h3>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {contract.documents.map((doc: any, i: number) => (
                                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit', background: 'rgba(255,255,255,0.03)' }}>
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{doc.title}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{doc.format}</div>
                                    </div>
                                    <span>⬇</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </>
    );
};

export default ContractDetail;
