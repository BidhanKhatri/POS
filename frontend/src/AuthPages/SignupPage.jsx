import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUpButton } from '@clerk/react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import toast, { Toaster } from 'react-hot-toast';

function PinInput({ label, value, onChange }) {
    const refs = [useRef(), useRef(), useRef(), useRef()];

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
        const digit = e.target.value.replace(/\D/g, '').slice(-1);
        if (!digit) return;
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
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: '18px', letterSpacing: '0.1px', color: '#2B1D1A' }}>
                {label}
            </span>
            <div className="flex gap-3">
                {value.map((digit, idx) => (
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
                        className="w-14 h-14 text-center rounded border border-divider-tone bg-background outline-none focus:border-primary transition-colors"
                        style={{ fontSize: 22, fontWeight: 700, caretColor: 'transparent' }}
                    />
                ))}
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

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        if (!form.fullName.trim()) return toast.error('Full Name is required.');
        if (!form.email.trim()) return toast.error('Email is required.');

        const pinStr = pin.join('');
        const confirmPinStr = confirmPin.join('');

        if (pinStr.length < 4) return toast.error('Please enter a 4-digit PIN.');
        if (pinStr !== confirmPinStr) return toast.error('PINs do not match.');

        setLoading(true);
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: form.fullName.trim(), email: form.email.trim(), pin: pinStr }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Signup failed.');
            toast.success(`Account created! Employee code: ${data.employeeCode}`, { duration: 3000 });
            setForm({ fullName: '', email: '' });
            setPin(['', '', '', '']);
            setConfirmPin(['', '', '', '']);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col">
            <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
            {/* Full-width form area */}
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
                        Create your terminal account securely. Fast setup for enterprise POS.
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
                                />
                                <Field
                                    label="Email"
                                    name="email"
                                    value={form.email}
                                    onChange={onChange}
                                    placeholder="you@company.com"
                                    type="email"
                                    autoComplete="email"
                                />
                            </div>

                            {/* Divider */}
                            <div className="border-t border-divider-tone" />

                            {/* Row 2: Set PIN + Confirm PIN */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <PinInput
                                    label="Set PIN"
                                    value={pin}
                                    onChange={(v) => { setPin(v); setError(''); setSuccess(''); }}
                                />
                                <PinInput
                                    label="Confirm PIN"
                                    value={confirmPin}
                                    onChange={(v) => { setConfirmPin(v); setError(''); setSuccess(''); }}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center rounded transition-opacity"
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
                                    {loading ? 'Creating…' : 'Create Account'}
                                </button>

                                <div className="flex items-center gap-3 sm:hidden">
                                    <div className="flex-1 border-t border-divider-tone" />
                                    <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">or</span>
                                    <div className="flex-1 border-t border-divider-tone" />
                                </div>

                                <div className="hidden sm:flex items-center px-2">
                                    <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">or</span>
                                </div>

                                <SignUpButton mode="modal">
                                    <button
                                        type="button"
                                        className="flex-1 flex items-center justify-center gap-2 rounded border border-divider-tone bg-white hover:bg-surface-variant transition-colors cursor-pointer"
                                        style={{
                                            minHeight: 52,
                                            color: '#3E2723',
                                            fontSize: 14,
                                            fontWeight: 700,
                                            lineHeight: '20px',
                                            letterSpacing: '0.25px',
                                        }}
                                    >
                                        <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.84-2.42 2.39v1.98h3.91c2.28-2.1 3.57-5.18 3.57-8.22Z" />
                                            <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.91-3.04c-1.08.73-2.48 1.16-4.05 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.15C3.18 21.88 7.31 24 12 24Z" />
                                            <path fill="#FBBC05" d="M5.32 14.25a7.16 7.16 0 0 1 0-4.5V6.6H1.21a11.94 11.94 0 0 0 0 10.8l4.11-3.15Z" />
                                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.18 2.12 1.21 6.6l4.11 3.15c.94-2.85 3.57-4.96 6.68-4.96Z" />
                                        </svg>
                                        Continue with Google
                                    </button>
                                </SignUpButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, name, value, onChange, placeholder, type = 'text', autoComplete = 'off' }) {
    return (
        <label className="flex flex-col gap-2">
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: '18px', letterSpacing: '0.1px', color: '#2B1D1A' }}>
                {label}
            </span>
            <input
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                type={type}
                autoComplete={autoComplete}
                className="w-full rounded border border-divider-tone bg-background px-4 py-3 outline-none focus:border-primary"
                style={{ fontSize: 14, lineHeight: '20px' }}
            />
        </label>
    );
}

export default SignupPage;
