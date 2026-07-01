import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import toast, { Toaster } from 'react-hot-toast';
import { API_URL as API } from '../config/api';

const C = {
    primary: '#3E2723',
    primaryFill: 'rgba(62,39,35,0.09)',
    primaryBorder: '#3E2723',
    divider: '#DDD2CC',
    textPri: '#2B1D1A',
    textSec: '#6B5B57',
};

function PinInput({ label, value, onChange }) {
    const refs = [useRef(), useRef(), useRef(), useRef()];
    const [focusedIdx, setFocusedIdx] = useState(null);

    // Clicking anywhere on the PIN group focuses the first unfilled box (or last if full)
    const handleGroupClick = () => {
        const firstEmpty = value.findIndex((d) => d === '');
        const target = firstEmpty === -1 ? 3 : firstEmpty;
        refs[target].current.focus();
    };

    const handleKey = (e, idx) => {
        if (e.key === 'Backspace') {
            if (value[idx] !== '') {
                const next = [...value];
                next[idx] = '';
                onChange(next);
            } else if (idx > 0) {
                refs[idx - 1].current.focus();
                const next = [...value];
                next[idx - 1] = '';
                onChange(next);
            }
            return;
        }
        if (e.key === 'ArrowLeft' && idx > 0) { refs[idx - 1].current.focus(); return; }
        if (e.key === 'ArrowRight' && idx < 3) { refs[idx + 1].current.focus(); return; }
    };

    const handleChange = (e, idx) => {
        const raw = e.target.value.replace(/\D/g, '');
        // Mobile backspace: input cleared → remove digit and move back
        if (!raw) {
            const next = [...value];
            next[idx] = '';
            onChange(next);
            if (idx > 0) refs[idx - 1].current.focus();
            return;
        }
        const digit = raw.slice(-1);
        const next = [...value];
        next[idx] = digit;
        onChange(next);
        if (idx < 3) refs[idx + 1].current.focus();
    };

    const handlePaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
        if (!pasted) return;
        e.preventDefault();
        const next = pasted.split('').concat(['', '', '', '']).slice(0, 4);
        onChange(next);
        refs[Math.min(pasted.length, 3)].current.focus();
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
                <LockOutlinedIcon sx={{ fontSize: 14, color: C.textSec }} />
                <span style={{ fontSize: 13, fontWeight: 600, lineHeight: '18px', letterSpacing: '0.1px', color: C.textPri }}>
                    {label}
                </span>
            </div>
            {/* Clicking anywhere in this wrapper redirects focus to the right box */}
            <div className="flex justify-center sm:justify-start gap-3" onClick={handleGroupClick} style={{ cursor: 'text' }}>
                {value.map((digit, idx) => {
                    const isActive = focusedIdx === idx;
                    return (
                        <input
                            key={idx}
                            ref={refs[idx]}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(e, idx)}
                            onKeyDown={(e) => handleKey(e, idx)}
                            onPaste={handlePaste}
                            onFocus={() => setFocusedIdx(idx)}
                            onBlur={() => setFocusedIdx(null)}
                            className="w-14 h-14 text-center rounded outline-none transition-all"
                            style={{
                                fontSize: 22,
                                fontWeight: 700,
                                caretColor: 'transparent',
                                background: digit ? C.primaryFill : isActive ? 'rgba(62,39,35,0.04)' : '#fff',
                                border: isActive
                                    ? `2px solid ${C.primary}`
                                    : digit
                                        ? `1.5px solid ${C.primaryBorder}`
                                        : `1px solid ${C.divider}`,
                                boxShadow: isActive
                                    ? `0 0 0 3px rgba(62,39,35,0.12)`
                                    : digit
                                        ? `0 0 0 3px rgba(62,39,35,0.07)`
                                        : 'none',
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function Field({ label, name, value, onChange, placeholder, type = 'text', autoComplete = 'off', icon: Icon }) {
    const [focused, setFocused] = useState(false);
    return (
        <label className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
                {Icon && <Icon sx={{ fontSize: 14, color: C.textSec }} />}
                <span style={{ fontSize: 13, fontWeight: 600, lineHeight: '18px', letterSpacing: '0.1px', color: C.textPri }}>
                    {label}
                </span>
            </div>
            <div
                className="flex items-center rounded border bg-white transition-all overflow-hidden"
                style={{
                    borderColor: focused ? C.primary : C.divider,
                    borderWidth: focused ? '1.5px' : '1px',
                    boxShadow: focused ? `0 0 0 3px rgba(62,39,35,0.07)` : 'none',
                }}
            >
                {Icon && (
                    <span style={{ paddingLeft: 12, display: 'flex', alignItems: 'center', color: focused ? C.primary : '#A09490', flexShrink: 0 }}>
                        <Icon sx={{ fontSize: 18 }} />
                    </span>
                )}
                <input
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    type={type}
                    autoComplete={autoComplete}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className="flex-1 bg-transparent outline-none px-3 py-3"
                    style={{ fontSize: 16, lineHeight: '20px', color: C.textPri }}
                />
            </div>
        </label>
    );
}

/* ── Email sent — check inbox screen ── */
function EmailSentScreen({ email, onBack }) {
    return (
        <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
                <div style={{
                    width: 72, height: 72, borderRadius: 20,
                    background: 'rgba(62,39,35,0.08)',
                    border: '1.5px solid rgba(62,39,35,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <MarkEmailReadOutlinedIcon sx={{ fontSize: 36, color: '#3E2723' }} />
                </div>

                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.3px' }}>
                        Check Your Inbox
                    </h1>
                    <p style={{ margin: '8px 0 0', fontSize: 14, color: '#6B5B57', lineHeight: '22px', maxWidth: 360 }}>
                        We sent a verification link to <strong style={{ color: '#3E2723' }}>{email}</strong>.
                        Click the link in the email to activate your account.
                    </p>
                </div>

                <div style={{
                    width: '100%',
                    background: 'rgba(2,119,189,0.05)',
                    border: '1px solid rgba(2,119,189,0.18)',
                    borderRadius: 10,
                    padding: '14px 18px',
                    textAlign: 'left',
                }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#01579B', lineHeight: '19px', fontWeight: 500 }}>
                        <strong>Link expires in 15 minutes.</strong> Check your spam folder if you don't see the email. The link will activate your account instantly — no manager approval needed.
                    </p>
                </div>

                <button
                    onClick={onBack}
                    style={{
                        width: '100%', minHeight: 48,
                        background: '#3E2723', color: '#fff',
                        border: 'none', borderRadius: 8,
                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        letterSpacing: '0.02em',
                    }}
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
}

/* ── Active (EMS-verified) success screen ── */
function ActiveScreen({ employeeCode, onLogin }) {
    return (
        <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
                <div style={{
                    width: 72, height: 72, borderRadius: 20,
                    background: 'rgba(46,125,79,0.12)',
                    border: '1.5px solid rgba(46,125,79,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 36, color: '#2E7D4F' }} />
                </div>

                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.3px' }}>
                        Account Ready
                    </h1>
                    <p style={{ margin: '8px 0 0', fontSize: 14, color: '#6B5B57', lineHeight: '20px', maxWidth: 340 }}>
                        Your Staffing Betit account was verified and your POS account is <strong>active</strong>. You can log in now with your email and PIN.
                    </p>
                </div>

                {employeeCode && (
                    <div style={{
                        width: '100%', background: '#fff',
                        border: '1px solid #DDD2CC', borderRadius: 12, padding: '16px 20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div style={{ textAlign: 'left' }}>
                            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                Employee Code
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 900, color: '#3E2723', letterSpacing: '0.05em' }}>
                                {employeeCode}
                            </p>
                        </div>
                        <CheckCircleOutlineIcon sx={{ fontSize: 28, color: '#2E7D4F' }} />
                    </div>
                )}

                <button
                    onClick={onLogin}
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

/* ── Pending approval screen ── */
function PendingScreen({ employeeCode, onBack }) {
    return (
        <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
                {/* Icon */}
                <div style={{
                    width: 72, height: 72, borderRadius: 20,
                    background: 'rgba(212,163,115,0.14)',
                    border: '1.5px solid rgba(212,163,115,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <HourglassEmptyOutlinedIcon sx={{ fontSize: 36, color: '#D4A373' }} />
                </div>

                {/* Heading */}
                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.3px' }}>
                        Account Submitted
                    </h1>
                    <p style={{ margin: '8px 0 0', fontSize: 14, color: '#6B5B57', lineHeight: '20px', maxWidth: 340 }}>
                        Your account is <strong>pending manager approval</strong>. You will be able to log in once a manager reviews and approves your request.
                    </p>
                </div>

                {/* Employee code card */}
                {employeeCode && (
                    <div style={{
                        width: '100%',
                        background: '#fff',
                        border: '1px solid #DDD2CC',
                        borderRadius: 12,
                        padding: '16px 20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div style={{ textAlign: 'left' }}>
                            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                Your Employee Code
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 900, color: '#3E2723', letterSpacing: '0.05em' }}>
                                {employeeCode}
                            </p>
                        </div>
                        <CheckCircleOutlineIcon sx={{ fontSize: 28, color: '#2E7D4F' }} />
                    </div>
                )}

                {/* Info box */}
                <div style={{
                    width: '100%',
                    background: 'rgba(2,119,189,0.05)',
                    border: '1px solid rgba(2,119,189,0.18)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    textAlign: 'left',
                }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#01579B', lineHeight: '18px', fontWeight: 500 }}>
                        Your manager will review your account in the <strong>Manager Portal → Accounts</strong> section. No action is required from you at this stage.
                    </p>
                </div>

                {/* Back to login */}
                <button
                    onClick={onBack}
                    style={{
                        width: '100%', minHeight: 48,
                        background: '#3E2723', color: '#fff',
                        border: 'none', borderRadius: 8,
                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        letterSpacing: '0.02em',
                    }}
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
}

function SignupPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ fullName: '', email: '' });
    const [pin, setPin] = useState(['', '', '', '']);
    const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(null); // { employeeCode }
    const [errorMsg, setErrorMsg] = useState('');

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        if (!form.fullName.trim()) return toast.error('Full name is required.');
        if (!form.email.trim()) return toast.error('Email is required.');

        const pinStr = pin.join('');
        const confirmPinStr = confirmPin.join('');

        if (pinStr.length < 4) return toast.error('Please enter a 4-digit PIN.');
        if (pinStr !== confirmPinStr) return toast.error('PINs do not match.');

        setLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch(`${API}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: form.fullName.trim(), email: form.email.trim(), pin: pinStr }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Signup failed.');
            if (data.pendingVerification) {
                // Sync ON — verification email sent, show inbox screen
                setSubmitted({ email: form.email.trim(), status: 'EMAIL_SENT' });
                return;
            }
            if ((data.status ?? 'PENDING') === 'ACTIVE') {
                navigate('/login');
                return;
            }
            setSubmitted({ employeeCode: data.employeeCode, status: 'PENDING' });
        } catch (err) {
            const msg = err.message || 'Signup failed.';
            const isEmsError = msg.toLowerCase().includes('staffing betit') && msg.toLowerCase().includes('not found');
            toast.error(isEmsError ? 'Email Not In Staffing Betit' : msg, {
                duration: 3000,
                style: { fontSize: 12, padding: '8px 12px', maxWidth: 300 },
            });
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        if (submitted.status === 'EMAIL_SENT')
            return <EmailSentScreen email={submitted.email} onBack={() => navigate('/login')} />;
        if (submitted.status === 'ACTIVE')
            return <ActiveScreen employeeCode={submitted.employeeCode} onLogin={() => navigate('/login')} />;
        return <PendingScreen employeeCode={submitted.employeeCode} onBack={() => navigate('/login')} />;
    }

    return (
        <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col">
            <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
            <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-6 pb-8 sm:py-10">
                <div className="w-full max-w-4xl">
                    <div className="flex items-center gap-3 mb-2">
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="flex items-center justify-center rounded-full transition-colors hover:bg-surface-variant flex-shrink-0"
                            style={{ width: 34, height: 34, color: '#3E2723', border: '1.5px solid #DDD2CC' }}
                        >
                            <ArrowBackIcon sx={{ fontSize: 18 }} />
                        </button>
                        <h1
                            className="text-on-surface text-xl sm:text-[28px]"
                            style={{ fontWeight: 800, lineHeight: 'clamp(28px, 6vw, 36px)', letterSpacing: '-0.3px' }}
                        >
                            Create Account
                        </h1>
                    </div>
                    <p className="mb-8 truncate" style={{ fontSize: 14, color: '#6B5B57', lineHeight: '20px' }}>
                        Create your terminal account. Your account will be reviewed by a manager before activation.
                    </p>

                    <div className="bg-surface border border-divider-tone rounded-lg p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
                        <form onSubmit={onSubmit} className="flex flex-col gap-6">
                            {/* Row 1: Name + Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <Field
                                    label="Full Name"
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={onChange}
                                    placeholder="Your name"
                                    autoComplete="name"
                                    icon={PersonOutlinedIcon}
                                />
                                <Field
                                    label="Email"
                                    name="email"
                                    value={form.email}
                                    onChange={onChange}
                                    placeholder="you@company.com"
                                    type="email"
                                    autoComplete="email"
                                    icon={EmailOutlinedIcon}
                                />
                            </div>

                            <div className="border-t border-divider-tone" />

                            {/* Row 2: PIN */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <PinInput label="Set PIN" value={pin} onChange={setPin} />
                                <PinInput label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} />
                            </div>

                            {/* Persistent error */}
                            {errorMsg && (
                                <div style={{
                                    background: 'rgba(183,28,28,0.06)',
                                    border: '1px solid rgba(183,28,28,0.22)',
                                    borderRadius: 8,
                                    padding: '10px 14px',
                                }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#B71C1C', lineHeight: '17px' }}>
                                        {errorMsg}
                                    </span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center justify-center rounded transition-opacity"
                                    style={{
                                        minHeight: 52,
                                        backgroundColor: '#3E2723',
                                        color: '#FFFFFF',
                                        fontSize: 14,
                                        fontWeight: 700,
                                        lineHeight: '20px',
                                        letterSpacing: '0.25px',
                                        opacity: loading ? 0.6 : 1,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {loading ? 'Submitting…' : 'Submit Application'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SignupPage;
