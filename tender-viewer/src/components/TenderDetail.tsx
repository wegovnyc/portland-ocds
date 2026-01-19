import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useSWR from 'swr';
import '../App.css';
import { formatTitle, formatAmount, formatStatus } from '../utils';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface TenderDetailProps {
    id: string | null;
    onClose: () => void;
}

const TenderDetail: React.FC<TenderDetailProps> = ({ id, onClose }) => {
    const { data, error, isLoading } = useSWR(id ? `/api/2.4/tenders/${id}` : null, fetcher);
    const location = useLocation();
    const [expandedContractId, setExpandedContractId] = useState<string | null>(null);
    const [expandedAwardId, setExpandedAwardId] = useState<string | null>(null);

    const rawData = data?.data;
    // Flatten OCDS structure: data.tender properties (title, etc) should be accessible at top level for this UI
    const tender = rawData ? { ...rawData, ...(rawData.tender || {}) } : null;

    // Check URL hash for contract permalink
    useEffect(() => {
        const hash = location.hash;
        if (hash && hash.startsWith('#contract-') && tender) {
            const contractId = hash.replace('#contract-', '');
            setExpandedContractId(contractId);

            // Find which award contains this contract
            const contract = (tender.contracts || []).find((c: any) => c.id === contractId);
            if (contract?.awardID) {
                setExpandedAwardId(contract.awardID);
            }

            // Scroll to contract after a short delay to allow expansion
            setTimeout(() => {
                const element = document.getElementById(`contract-${contractId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 300);
        }
    }, [location.hash, tender]);

    const isOpen = !!id;

    if (!id) return null;

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
                                {tender.procuringEntity?.additionalIdentifiers && tender.procuringEntity.additionalIdentifiers.length > 0 && (
                                    <div style={{ gridColumn: 'span 2', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <span className="label">Additional IDs: </span>
                                        {tender.procuringEntity.additionalIdentifiers.map((id: any, i: number) => (
                                            <span key={i} style={{ marginRight: '0.5rem' }}>{id.scheme}-{id.id} ({id.legalName})</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {(tender.tenderPeriod || tender.enquiryPeriod || tender.complaintPeriod) && (
                            <>
                                <h3 style={{ marginTop: '2rem' }}>Timeline</h3>
                                <div className="card" style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.03)' }}>
                                    {tender.tenderPeriod && (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span className="label">Tender Period Start</span>
                                                <span>{tender.tenderPeriod.startDate ? new Date(tender.tenderPeriod.startDate).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="label">Tender Period End</span>
                                                <span>{tender.tenderPeriod.endDate ? new Date(tender.tenderPeriod.endDate).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                        </>
                                    )}
                                    {tender.enquiryPeriod && (
                                        <>
                                            <div style={{ margin: '0.5rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span className="label">Enquiry Period Start</span>
                                                <span>{tender.enquiryPeriod.startDate ? new Date(tender.enquiryPeriod.startDate).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="label">Enquiry Period End</span>
                                                <span>{tender.enquiryPeriod.endDate ? new Date(tender.enquiryPeriod.endDate).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                        </>
                                    )}
                                    {tender.complaintPeriod && (
                                        <>
                                            <div style={{ margin: '0.5rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span className="label">Complaint Period Start</span>
                                                <span>{tender.complaintPeriod.startDate ? new Date(tender.complaintPeriod.startDate).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="label">Complaint Period End</span>
                                                <span>{tender.complaintPeriod.endDate ? new Date(tender.complaintPeriod.endDate).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                        </>
                                    )}
                                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                                        Last Updated: {tender.dateModified ? new Date(tender.dateModified).toLocaleString() : 'N/A'}
                                    </div>
                                </div>
                            </>
                        )}

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
                                {tender.awards.map((award: any, index: number) => {
                                    const linkedContracts = (tender.contracts || []).filter(
                                        (c: any) => c.awardID === award.id
                                    );
                                    return (
                                        <AwardCard
                                            key={award.id}
                                            award={award}
                                            contracts={linkedContracts}
                                            showContractNote={index === 0 && linkedContracts.length > 0}
                                            tenderId={id || undefined}
                                            expandedContractId={expandedContractId}
                                            isExpanded={expandedAwardId === award.id}
                                        />
                                    );
                                })}
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

const Card = ({ children, expandedContent, defaultExpanded = false }: { children: React.ReactNode, expandedContent?: React.ReactNode, defaultExpanded?: boolean }) => {
    const [expanded, setExpanded] = React.useState(defaultExpanded);

    // Sync with external defaultExpanded prop
    React.useEffect(() => {
        if (defaultExpanded) setExpanded(true);
    }, [defaultExpanded]);
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
            onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
            }}
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

// Collapsible section for sub-items within cards
const CollapsibleSection = ({ title, count, children }: { title: string, count: number, children: React.ReactNode }) => {
    const [expanded, setExpanded] = React.useState(false);
    if (count === 0) return null;
    return (
        <div style={{ marginTop: '1rem' }}>
            <div
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '4px',
                    marginBottom: expanded ? '0.5rem' : 0
                }}
            >
                <span className="label" style={{ margin: 0 }}>{title} ({count})</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {expanded ? '▲ Collapse' : '▼ Expand'}
                </span>
            </div>
            {expanded && (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

// Approval Chain Tracker - visualizes the approval workflow
const APPROVAL_ROLES = [
    { code: 'CA', title: 'Contract Admin', order: 1 },
    { code: 'AU', title: 'City Auditor', order: 2 },
    { code: 'AT', title: 'City Attorney', order: 3 },
    { code: 'PA', title: 'Purchasing Agent', order: 4 }
];

const ApprovalChainTracker = ({ milestones }: { milestones: any[] }) => {
    if (!milestones || milestones.length === 0) return null;

    // Build a map of completed approvals
    const approvalMap: Record<string, { status: string, date: string }> = {};
    milestones.forEach(m => {
        if (m.type === 'approval' && m.code) {
            approvalMap[m.code] = { status: m.status, date: m.date };
        }
    });

    // Check if any approval roles are present in the data
    const hasAnyApprovalRole = APPROVAL_ROLES.some(role => approvalMap[role.code]);
    if (!hasAnyApprovalRole) return null;

    return (
        <div style={{ marginTop: '1rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem'
            }}>
                <span className="label" style={{ margin: 0 }}>Approval Chain</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {Object.keys(approvalMap).length} of {APPROVAL_ROLES.length} complete
                </span>
            </div>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                flexWrap: 'wrap',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px'
            }}>
                {APPROVAL_ROLES.map((role, idx) => {
                    const approval = approvalMap[role.code];
                    const isMet = approval?.status === 'met';

                    return (
                        <React.Fragment key={role.code}>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                flex: '1',
                                minWidth: '70px'
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isMet ? 'rgba(3, 218, 198, 0.2)' : 'rgba(255,255,255,0.05)',
                                    border: `2px solid ${isMet ? '#03dac6' : 'rgba(255,255,255,0.2)'}`,
                                    marginBottom: '0.25rem'
                                }}>
                                    {isMet ? (
                                        <span style={{ color: '#03dac6', fontSize: '1rem' }}>✓</span>
                                    ) : (
                                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>{role.code}</span>
                                    )}
                                </div>
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: isMet ? '#03dac6' : 'var(--text-secondary)',
                                    textAlign: 'center'
                                }}>
                                    {role.title}
                                </span>
                                {isMet && approval.date && (
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                                        {new Date(approval.date).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            {idx < APPROVAL_ROLES.length - 1 && (
                                <div style={{
                                    width: '20px',
                                    height: '2px',
                                    background: isMet && approvalMap[APPROVAL_ROLES[idx + 1]?.code]?.status === 'met'
                                        ? '#03dac6'
                                        : 'rgba(255,255,255,0.1)',
                                    flexShrink: 0
                                }} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

// Transaction Timeline - visual representation of payments over time
const TransactionTimeline = ({ transactions }: { transactions: any[] }) => {
    if (!transactions || transactions.length === 0) return null;

    // Sort by date
    const sorted = [...transactions].sort((a, b) =>
        new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
    );

    const totalValue = sorted.reduce((sum, t) => sum + (t.value?.amount || 0), 0);
    const maxValue = Math.max(...sorted.map(t => t.value?.amount || 0));

    return (
        <div style={{ marginTop: '0.5rem' }}>
            {/* Summary bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                padding: '0.5rem',
                background: 'rgba(3, 218, 198, 0.1)',
                borderRadius: '4px'
            }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {sorted.length} payments
                </span>
                <span style={{ fontSize: '0.9rem', color: '#03dac6', fontWeight: 'bold' }}>
                    ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
            </div>
            {/* Mini bar chart */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '2px',
                height: '40px',
                padding: '0.25rem 0'
            }}>
                {sorted.slice(0, 20).map((t, i) => {
                    const height = maxValue > 0 ? Math.max(4, (t.value?.amount || 0) / maxValue * 36) : 4;
                    return (
                        <div
                            key={i}
                            title={`${new Date(t.date).toLocaleDateString()}: $${(t.value?.amount || 0).toLocaleString()}`}
                            style={{
                                flex: 1,
                                height: `${height}px`,
                                background: 'linear-gradient(to top, #03dac6, #bb86fc)',
                                borderRadius: '2px 2px 0 0',
                                opacity: 0.8,
                                cursor: 'help'
                            }}
                        />
                    );
                })}
                {sorted.length > 20 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                        +{sorted.length - 20}
                    </span>
                )}
            </div>
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

const AwardCard = ({ award, contracts = [], showContractNote = false, tenderId, expandedContractId, isExpanded = false }: { award: any, contracts?: any[], showContractNote?: boolean, tenderId?: string, expandedContractId?: string | null, isExpanded?: boolean }) => {
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
                {contracts.length > 0 && (
                    <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                        <span className="label" style={{ marginBottom: '0.5rem', display: 'block' }}>Contracts ({contracts.length})</span>
                        {contracts.map((contract: any) => (
                            <ContractCard
                                key={contract.id}
                                contract={contract}
                                tenderId={tenderId}
                                isExpanded={expandedContractId === contract.id}
                            />
                        ))}
                        {showContractNote && (
                            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.5rem', borderLeft: '2px solid var(--text-secondary)' }}>
                                NOTE: Original data used status "Terminated" to denote all contracts that are no longer active. We've changed "Terminated" to "Closed" to make the system more legible.
                            </div>
                        )}
                    </div>
                )}
            </div>
        } defaultExpanded={isExpanded}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className={`status-badge ${award.status === 'active' ? 'status-active' : ''}`}>{award.status}</span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    <div>{new Date(award.date).toLocaleDateString()}</div>
                    {award.contractPeriod && (
                        <div style={{ fontSize: '0.7rem' }}>
                            {new Date(award.contractPeriod.startDate).toLocaleDateString()} - {new Date(award.contractPeriod.endDate).toLocaleDateString()}
                        </div>
                    )}
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold' }}>
                    {org?.name || 'Unknown Supplier'}
                </div>
                <div className="amount">
                    {formatAmount(award.value)}
                </div>
            </div>
            {contracts.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {contracts.length} contract{contracts.length > 1 ? 's' : ''} linked
                </div>
            )}
        </Card>
    );
};

const ContractCard = ({ contract, tenderId, isExpanded = false }: { contract: any, tenderId?: string, isExpanded?: boolean }) => {
    const [expanded, setExpanded] = React.useState(isExpanded);

    // Sync with external isExpanded prop (for permalink)
    React.useEffect(() => {
        if (isExpanded) setExpanded(true);
    }, [isExpanded]);

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (tenderId) {
            const url = `${window.location.origin}/tenders/${tenderId}#contract-${contract.id}`;
            navigator.clipboard.writeText(url).then(() => {
                alert('Permalink copied to clipboard!');
            });
        }
    };

    return (
        <div
            className="card"
            id={`contract-${contract.id}`}
            style={{
                marginTop: '1rem',
                padding: '1rem',
                cursor: 'pointer',
                borderColor: expanded ? 'rgba(187, 134, 252, 0.5)' : 'rgba(255, 255, 255, 0.05)',
                background: expanded ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)'
            }}
            onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className={`status-badge ${contract.status === 'active' ? 'status-active' : 'status-complete'}`}>{formatStatus(contract.status)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {tenderId && (
                        <button
                            onClick={handleShare}
                            title="Copy permalink"
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                padding: '0.2rem',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            🔗
                        </button>
                    )}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{contract.date ? new Date(contract.date).toLocaleDateString() : ''}</span>
                </div>
            </div>
            <div style={{ fontWeight: 'bold' }}>
                {contract.contractID}
            </div>
            {expanded && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <span className="label">Date Signed</span>
                            <div>{contract.dateSigned ? new Date(contract.dateSigned).toLocaleDateString() : 'N/A'}</div>
                            {contract.period && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                    {new Date(contract.period.startDate).toLocaleDateString()} - {new Date(contract.period.endDate).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                        <div>
                            <span className="label">Value</span>
                            <div className="amount">
                                {formatAmount(contract.value)}
                            </div>
                        </div>
                    </div>

                    {/* Items - Collapsible */}
                    <CollapsibleSection title="Items" count={(contract.items || []).length}>
                        {(contract.items || []).map((item: any, i: number) => (
                            <div key={i} style={{ fontSize: '0.9rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                <div>{item.description}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Qty: {item.quantity} • {item.unit?.name || 'units'} • {item.classification?.description || ''}
                                </div>
                            </div>
                        ))}
                    </CollapsibleSection>

                    {/* Approval Chain Tracker - Visual approval workflow */}
                    <ApprovalChainTracker milestones={contract.milestones || []} />

                    {/* Milestones - Collapsible */}
                    <CollapsibleSection title="Milestones" count={(contract.milestones || []).length}>
                        {(contract.milestones || []).map((m: any, i: number) => (
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
                    </CollapsibleSection>

                    {/* Transaction Timeline - Visual payment history */}
                    {(contract.implementation?.transactions || []).length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            <span className="label">Payment History</span>
                            <TransactionTimeline transactions={contract.implementation?.transactions || []} />
                        </div>
                    )}

                    {/* Transactions - Collapsible */}
                    <CollapsibleSection title="Transactions" count={(contract.implementation?.transactions || []).length}>
                        {(contract.implementation?.transactions || []).map((t: any, i: number) => (
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
                    </CollapsibleSection>

                    {/* Purchase Orders - Collapsible */}
                    <CollapsibleSection title="Purchase Orders" count={(contract.implementation?.purchaseOrders || []).length}>
                        {(contract.implementation?.purchaseOrders || []).map((po: any, i: number) => (
                            <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{po.title}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {po.executionPeriod?.startDate ? new Date(po.executionPeriod.startDate).toLocaleDateString() : ''} - {po.executionPeriod?.endDate ? new Date(po.executionPeriod.endDate).toLocaleDateString() : ''}
                                </div>
                            </div>
                        ))}
                    </CollapsibleSection>

                    {/* Agreed Metrics - Collapsible */}
                    <CollapsibleSection title="Agreed Metrics" count={(contract.agreedMetrics || []).length}>
                        {(contract.agreedMetrics || []).map((m: any, i: number) => (
                            <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                <div style={{ fontWeight: '500' }}>{m.title}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.description}</div>
                            </div>
                        ))}
                    </CollapsibleSection>
                </div>
            )}
            <div style={{ textAlign: 'center', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                {expanded ? 'Show Less' : 'Show Details'}
            </div>
        </div>
    );
};

export default TenderDetail;
