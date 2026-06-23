import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function VerifiedPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const code = params.get('code');
    const email = params.get('email');
    const error = params.get('error');

    if (error) {
        return (
            <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col items-center justify-center px-4">
                <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
                    <div style={{
                        width: 72, height: 72, borderRadius: 20,
                        background: 'rgba(183,28,28,0.08)',
                        border: '1.5px solid rgba(183,28,28,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <ErrorOutlineIcon sx={{ fontSize: 36, color: '#B71C1C' }} />
                    </div>

                    <div>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.3px' }}>
                            Verification Failed
                        </h1>
                        <p style={{ margin: '8px 0 0', fontSize: 14, color: '#6B5B57', lineHeight: '22px', maxWidth: 360 }}>
                            {decodeURIComponent(error)}
                        </p>
                    </div>

                    <div style={{
                        width: '100%',
                        background: 'rgba(183,28,28,0.05)',
                        border: '1px solid rgba(183,28,28,0.18)',
                        borderRadius: 10,
                        padding: '14px 18px',
                        textAlign: 'left',
                    }}>
                        <p style={{ margin: 0, fontSize: 12, color: '#B71C1C', lineHeight: '19px', fontWeight: 500 }}>
                            Verification links expire after 15 minutes. Please return to the signup page and submit your details again to receive a new link.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/signup')}
                        style={{
                            width: '100%', minHeight: 48,
                            background: '#3E2723', color: '#fff',
                            border: 'none', borderRadius: 8,
                            fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        <ArrowBackIcon sx={{ fontSize: 18 }} />
                        Back to Sign Up
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
                <div style={{
                    width: 72, height: 72, borderRadius: 20,
                    background: 'rgba(46,125,79,0.10)',
                    border: '1.5px solid rgba(46,125,79,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 36, color: '#2E7D4F' }} />
                </div>

                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.3px' }}>
                        Email Verified
                    </h1>
                    <p style={{ margin: '8px 0 0', fontSize: 14, color: '#6B5B57', lineHeight: '22px', maxWidth: 360 }}>
                        Your account is <strong style={{ color: '#2E7D4F' }}>active</strong>. You can now log in to the POS portal using your email and PIN.
                    </p>
                </div>

                <div style={{
                    width: '100%', background: '#fff',
                    border: '1px solid #DDD2CC', borderRadius: 12,
                    overflow: 'hidden',
                }}>
                    {email && (
                        <div style={{
                            padding: '14px 20px',
                            borderBottom: code ? '1px solid #EDE5DF' : 'none',
                        }}>
                            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                Verified Email
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: '#2B1D1A' }}>
                                {email}
                            </p>
                        </div>
                    )}
                    {code && (
                        <div style={{
                            padding: '14px 20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ textAlign: 'left' }}>
                                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                    Your Employee Code
                                </p>
                                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 900, color: '#3E2723', letterSpacing: '0.05em' }}>
                                    {code}
                                </p>
                            </div>
                            <CheckCircleOutlineIcon sx={{ fontSize: 28, color: '#2E7D4F' }} />
                        </div>
                    )}
                </div>

                <button
                    onClick={() => navigate('/login', { state: { verifiedEmail: email } })}
                    style={{
                        width: '100%', minHeight: 48,
                        background: '#3E2723', color: '#fff',
                        border: 'none', borderRadius: 8,
                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                >
                    <LoginOutlinedIcon sx={{ fontSize: 18 }} />
                    Go to Login
                </button>
            </div>
        </div>
    );
}
