import React from 'react';
import useSWR from 'swr';
import '../App.css';
import { formatTitle, formatAmount } from '../utils';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface TenderDetailProps {
    id: string | null;
    onClose: () => void;
}

const TenderDetail: React.FC<TenderDetailProps> = ({ id, onClose }) => {
    const { data, error, isLoading } = useSWR(id ? `/api/2.4/tenders/${id}` : null, fetcher);

    const isOpen = !!id;

    if (!id) return null;

    const tender = data?.data;

    return (
        <>
            <div className={`overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
            <div className={`detail-view ${isOpen ? 'open' : ''}`}>
                <button className="close-btn" onClick={onClose}>&times;</button>

                {isLoading && <p>Loading details...</p>}
                {error && <p>Error loading tender details</p>}

                {tender && (
                    <div>
                        <div className={`status-badge ${tender.status === 'active' ? 'status-active' : ''}`} style={{ display: 'inline-block', marginBottom: '1rem' }}>
                            {tender.status}
                        </div>
                        <h2>{formatTitle(tender.title)}</h2>
                        <div className="tender-meta" style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span>ID: {tender.tenderID}</span>
                            {tender.sourceUrl && (
                                <a href={tender.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    View Source Tender ↗
                                </a>
                            )}
                        </div>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{tender.description}</p>


                        <div className="key-value-grid">
                            <div>
                                <span className="label">Tender ID</span>
                                <div className="value">{tender.tenderID}</div>
                            </div>
                            <div>
                                <span className="label">Value</span>
                                <div className="value amount">
                                    {formatAmount(tender.value)}
                                </div>
                            </div>
                            <div>
                                <span className="label">Minimal Step</span>
                                <div className="value" style={{ fontSize: '1rem' }}>
                                    {formatAmount(tender.minimalStep)}
                                </div>
                            </div>
                            <div>
                                <span className="label">Procurement Method</span>
                                <div className="value" style={{ textTransform: 'capitalize' }}>
                                    {tender.procurementMethod} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8em' }}>({tender.procurementMethodType})</span>
                                </div>
                            </div>
                            <div>
                                <span className="label">Award Criteria</span>
                                <div className="value">{tender.awardCriteria}</div>
                            </div>
                            {tender.selectionCriteria && tender.selectionCriteria.criteria && (
                                <div style={{ gridColumn: 'span 2' }}>
                                    <span className="label">Selection Criteria</span>
                                    {tender.selectionCriteria.criteria.map((c: any, i: number) => (
                                        <div key={i} style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '6px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                                <span style={{ fontWeight: '500' }}>{c.type}</span>
                                                {c.minimum && <span className="status-badge">{c.minimum}</span>}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{c.description}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                Verification: <a href={c.verificationMethod} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>Link</a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div>
                                <span className="label">Submission Method</span>
                                <div className="value">{tender.submissionMethod}</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', marginBottom: '1rem' }}>Procuring Entity</h3>
                            <div className="value" style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{tender.procuringEntity?.name}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                <div>
                                    <span className="label">Identifier</span>
                                    <div>{tender.procuringEntity?.identifier?.legalName}</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>{tender.procuringEntity?.identifier?.scheme}: {tender.procuringEntity?.identifier?.id}</div>
                                </div>
                                <div>
                                    <span className="label">Address</span>
                                    <div>
                                        {tender.procuringEntity?.address?.streetAddress}, {tender.procuringEntity?.address?.locality}<br />
                                        {tender.procuringEntity?.address?.region}, {tender.procuringEntity?.address?.countryName} {tender.procuringEntity?.address?.postalCode}
                                    </div>
                                </div>
                                <div>
                                    <span className="label">Contact</span>
                                    <div>{tender.procuringEntity?.contactPoint?.name}</div>
                                    <a href={`mailto:${tender.procuringEntity?.contactPoint?.email}`} style={{ color: 'var(--primary-color)' }}>{tender.procuringEntity?.contactPoint?.email}</a>
                                    <div>{tender.procuringEntity?.contactPoint?.telephone}</div>
                                </div>
                            </div>
                        </div>

                        <h3 style={{ marginTop: '2rem' }}>Timeline</h3>
                        <div className="card" style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span className="label">Tender Period Start</span>
                                <span>{new Date(tender.tenderPeriod?.startDate).toLocaleDateString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="label">Tender Period End</span>
                                <span>{new Date(tender.tenderPeriod?.endDate).toLocaleDateString()}</span>
                            </div>
                            {tender.enquiryPeriod && (
                                <>
                                    <div style={{ margin: '0.5rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span className="label">Enquiry Period Start</span>
                                        <span>{new Date(tender.enquiryPeriod?.startDate).toLocaleDateString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span className="label">Enquiry Period End</span>
                                        <span>{new Date(tender.enquiryPeriod?.endDate).toLocaleDateString()}</span>
                                    </div>
                                </>
                            )}
                            {tender.complaintPeriod && (
                                <>
                                    <div style={{ margin: '0.5rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span className="label">Complaint Period Start</span>
                                        <span>{new Date(tender.complaintPeriod?.startDate).toLocaleDateString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span className="label">Complaint Period End</span>
                                        <span>{new Date(tender.complaintPeriod?.endDate).toLocaleDateString()}</span>
                                    </div>
                                </>
                            )}
                            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                                Last Updated: {new Date(tender.dateModified).toLocaleString()}
                            </div>
                        </div>

                        {tender.documents && tender.documents.length > 0 && (
                            <>
                                <h3 style={{ marginTop: '2rem' }}>Documents ({tender.documents.length})</h3>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {tender.documents.map((doc: any) => (
                                        <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit', background: 'rgba(255,255,255,0.03)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '500' }}>{doc.title}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{doc.format} • {new Date(doc.datePublished).toLocaleDateString()}</span>
                                            </div>
                                            <span style={{ fontSize: '1.2rem' }}>↓</span>
                                        </a>
                                    ))}
                                </div>
                            </>
                        )}

                        <h3 style={{ marginTop: '2rem' }}>Items</h3>
                        {tender.items?.map((item: any) => (
                            <TenderItem key={item.id} item={item} />
                        ))}

                        {tender.bids && tender.bids.length > 0 && (
                            <>
                                <h3 style={{ marginTop: '2rem' }}>Bidders ({tender.bids.length})</h3>
                                {tender.bids.map((bid: any) => (
                                    <BidCard key={bid.id} bid={bid} />
                                ))}
                            </>
                        )}

                        {tender.awards && tender.awards.length > 0 && (
                            <>
                                <h3 style={{ marginTop: '2rem' }}>Awards ({tender.awards.length})</h3>
                                {tender.awards.map((award: any) => (
                                    <AwardCard key={award.id} award={award} />
                                ))}
                            </>
                        )}

                        {tender.contracts && tender.contracts.length > 0 && (
                            <>
                                <h3 style={{ marginTop: '2rem' }}>Contracts ({tender.contracts.length})</h3>
                                {tender.contracts.map((contract: any) => (
                                    <ContractCard key={contract.id} contract={contract} />
                                ))}
                            </>
                        )}

                        {tender.questions && tender.questions.length > 0 && (
                            <>
                                <h3 style={{ marginTop: '2rem' }}>Enquiries ({tender.questions.length})</h3>
                                {tender.questions.map((q: any) => (
                                    <div key={q.id} className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{q.title}</div>
                                        <div>{q.description}</div>
                                        {q.answer && (
                                            <div style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '2px solid var(--secondary-color)' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--secondary-color)' }}>Answer:</div>
                                                <div>{q.answer}</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}

                        {tender.complaints && tender.complaints.length > 0 && (
                            <>
                                <h3 style={{ marginTop: '2rem' }}>Complaints ({tender.complaints.length})</h3>
                                {tender.complaints.map((c: any) => (
                                    <div key={c.id} className="card" style={{ marginTop: '1rem', padding: '1rem', borderColor: 'var(--error-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span className="status-badge" style={{ background: 'rgba(207, 102, 121, 0.15)', color: 'var(--error-color)' }}>{c.status}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(c.date).toLocaleDateString()}</span>
                                        </div>
                                        <div style={{ fontWeight: 'bold' }}>{c.title}</div>
                                        <div>{c.description}</div>
                                    </div>
                                ))}
                            </>
                        )}

                        {tender.revisions && tender.revisions.length > 0 && (
                            <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Change History ({tender.revisions.length})</h3>
                                {tender.revisions.slice(0, 5).map((rev: any, i: number) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span>{new Date(rev.date).toLocaleString()}</span>
                                        <span style={{ color: 'var(--text-secondary)' }}>{rev.author} • {rev.changes.length} changes</span>
                                    </div>
                                ))}
                                {tender.revisions.length > 5 && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>... and {tender.revisions.length - 5} more</div>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

const Card = ({ children, expandedContent }: { children: React.ReactNode, expandedContent?: React.ReactNode }) => {
    const [expanded, setExpanded] = React.useState(false);
    return (
        <div
            className="card"
            style={{
                marginTop: '1rem',
                padding: '1rem',
                cursor: 'pointer',
                borderColor: expanded ? 'rgba(187, 134, 252, 0.5)' : 'rgba(255, 255, 255, 0.05)',
                background: expanded ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)'
            }}
            onClick={() => setExpanded(!expanded)}
        >
            <div style={{ width: '100%' }}>
                {children}
            </div>
            {expandedContent && expanded && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    {expandedContent}
                </div>
            )}
            {expandedContent && (
                <div style={{ textAlign: 'center', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {expanded ? 'Show Less' : 'Show Details'}
                </div>
            )}
        </div>
    );
};

const TenderItem = ({ item }: { item: any }) => {
    return (
        <Card expandedContent={
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <span className="label">Category</span>
                    <div style={{ fontSize: '0.9rem', color: '#fff' }}>{item.classification.description}</div>
                </div>
                <div>
                    <span className="label">Unit</span>
                    <div style={{ fontSize: '0.9rem', color: '#fff' }}>{item.unit.name} <span style={{ color: 'var(--text-secondary)' }}>({item.unit.code})</span></div>
                </div>
                <div>
                    <span className="label">Delivery Date</span>
                    <div style={{ fontSize: '0.9rem', color: '#fff' }}>
                        {item.deliveryDate?.startDate ? new Date(item.deliveryDate.startDate).toLocaleDateString() : 'N/A'}
                        {' - '}
                        {item.deliveryDate?.endDate ? new Date(item.deliveryDate.endDate).toLocaleDateString() : 'N/A'}
                    </div>
                </div>
                <div>
                    <span className="label">Delivery Address</span>
                    <div style={{ fontSize: '0.9rem', color: '#fff' }}>
                        {item.deliveryAddress?.streetAddress}, {item.deliveryAddress?.locality}
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{item.deliveryAddress?.region} {item.deliveryAddress?.postalCode}</div>
                    </div>
                </div>
            </div>
        }>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.description}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Qty: {item.quantity}</span>
                <span>Class: {item.classification.id}</span>
            </div>
        </Card>
    );
};

const BidCard = ({ bid }: { bid: any }) => {
    const org = bid.tenderers?.[0];
    return (
        <Card expandedContent={
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <span className="label">Legal Name</span>
                    <div>{org?.identifier?.legalName || org?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{org?.identifier?.id}</div>
                </div>
                <div>
                    <span className="label">Address</span>
                    <div style={{ fontSize: '0.9rem' }}>
                        {org?.address?.streetAddress}, {org?.address?.locality}<br />
                        {org?.address?.region}, {org?.address?.countryName}
                    </div>
                </div>
                <div>
                    <span className="label">Contact</span>
                    <div>{org?.contactPoint?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{org?.contactPoint?.telephone}</div>
                </div>
                <div>
                    <span className="label">Date</span>
                    <div>{new Date(bid.date).toLocaleString()}</div>
                </div>
            </div>
        }>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold' }}>
                    {org?.name || 'Unknown Tenderer'}
                </div>
                <div className="amount">
                    {formatAmount(bid.value)}
                </div>
            </div>
        </Card>
    );
};

const AwardCard = ({ award }: { award: any }) => {
    const org = award.suppliers?.[0];
    return (
        <Card expandedContent={
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <span className="label">Supplier</span>
                    <div>{org?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{org?.identifier?.id}</div>
                </div>
                <div>
                    <span className="label">Bid Reference</span>
                    <div style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{award.bid_id}</div>
                </div>
                <div>
                    <span className="label">Period</span>
                    <div>{new Date(award.date).toLocaleDateString()}</div>
                </div>
            </div>
        }>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className={`status-badge ${award.status === 'active' ? 'status-active' : ''}`}>{award.status}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(award.date).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold' }}>
                    {org?.name || 'Unknown Supplier'}
                </div>
                <div className="amount">
                    {formatAmount(award.value)}
                </div>
            </div>
        </Card>
    );
};

const ContractCard = ({ contract }: { contract: any }) => {
    return (
        <Card expandedContent={
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <span className="label">Date Signed</span>
                    <div>{contract.dateSigned ? new Date(contract.dateSigned).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                    <span className="label">Award ID</span>
                    <div style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contract.awardID}</div>
                </div>
                <div>
                    <span className="label">Value</span>
                    <div className="amount">
                        {formatAmount(contract.value)}
                    </div>
                </div>
                {contract.items && contract.items.length > 0 && (
                    <div style={{ gridColumn: 'span 2' }}>
                        <span className="label">Items</span>
                        {contract.items.map((item: any, i: number) => (
                            <div key={i} style={{ fontSize: '0.9rem', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                <div>{item.description}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Qty: {item.quantity} • {item.unit.name} • {item.classification.description}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {contract.milestones && contract.milestones.length > 0 && (
                    <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                        <span className="label">Milestones</span>
                        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {contract.milestones.map((m: any, i: number) => (
                                <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', borderLeft: `3px solid ${m.status === 'met' ? 'var(--secondary-color)' : 'var(--text-secondary)'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: '500' }}>{m.title}</span>
                                        <span className="status-badge" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>{m.status}</span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{m.description}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Type: {m.type} {m.code ? `(${m.code})` : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {contract.implementation && (
                    <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                        {contract.implementation.transactions && contract.implementation.transactions.length > 0 && (
                            <>
                                <span className="label">Transactions</span>
                                <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {contract.implementation.transactions.map((t: any, i: number) => (
                                        <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.9rem' }}>{new Date(t.date).toLocaleDateString()}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    {t.payer?.name} → {t.payee?.name}
                                                </div>
                                            </div>
                                            <div className="amount">{formatAmount(t.value)}</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        {contract.implementation.purchaseOrders && contract.implementation.purchaseOrders.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                <span className="label">Purchase Orders</span>
                                <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {contract.implementation.purchaseOrders.map((po: any, i: number) => (
                                        <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{po.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {po.executionPeriod?.startDate ? new Date(po.executionPeriod.startDate).toLocaleDateString() : ''} - {po.executionPeriod?.endDate ? new Date(po.executionPeriod.endDate).toLocaleDateString() : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {contract.agreedMetrics && contract.agreedMetrics.length > 0 && (
                    <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                        <span className="label">Agreed Metrics</span>
                        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {contract.agreedMetrics.map((m: any, i: number) => (
                                <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                    <div style={{ fontWeight: '500' }}>{m.title}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        }>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className={`status-badge ${contract.status === 'active' ? 'status-active' : 'status-complete'}`}>{contract.status}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(contract.date).toLocaleDateString()}</span>
            </div>
            <div style={{ fontWeight: 'bold' }}>
                {contract.contractID}
            </div>
        </Card>
    );
};

export default TenderDetail;
