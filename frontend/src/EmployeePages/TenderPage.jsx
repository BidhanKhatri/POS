import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PaymentIcon from '@mui/icons-material/Payment';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BlockIcon from '@mui/icons-material/Block';

const PAYMENT_METHODS = [
  { id: 'cash',   label: 'Cash',        icon: AttachMoneyIcon },
  { id: 'credit', label: 'Credit Card', icon: CreditCardIcon },
  { id: 'debit',  label: 'Debit Card',  icon: PaymentIcon },
  { id: 'misc',   label: 'Misc',        icon: MoreHorizIcon },
];

export default function TenderPage() {
  const navigate              = useNavigate();
  const location              = useLocation();
  const { amount, product, transactionType } = location.state || {};
  const terminalPath          = location.pathname.startsWith('/manager') ? '/manager/terminal' : '/employee/terminal';

  const [selectedMethod, setSelectedMethod] = useState(null);

  const isRefund = transactionType === 'RF';

  const handleCancel = () => navigate(terminalPath);

  const handleProcess = () => {
    if (!selectedMethod) return;
    // TODO: submit sale to backend
    navigate(terminalPath);
  };

  if (!amount || !product) {
    return (
      <div style={{
        padding: '40px 20px', textAlign: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <p style={{ color: '#B71C1C', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
          Invalid session — no transaction data.
        </p>
        <button
          onClick={() => navigate(terminalPath)}
          style={{
            padding: '11px 28px', background: '#3E2723', color: '#fff',
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          Back to Terminal
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px 16px 24px',
      maxWidth: 480,
      margin: '0 auto',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      /* fill available viewport so actions anchor to the bottom */
      minHeight: 'calc(100dvh - 132px)',
    }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={handleCancel}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 10,
            border: '1px solid #DDD2CC', background: '#fff', color: '#3E2723',
            cursor: 'pointer', boxShadow: '0 2px 0 #c4b8b2', flexShrink: 0,
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#2B1D1A', lineHeight: 1.25 }}>
            Select Tender
          </p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
            Choose payment method
          </p>
        </div>
      </div>

      {/* ── Transaction summary card (receipt style) ── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #DDD2CC',
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 24,
        boxShadow: '0 4px 0 #c8bdb8, 0 8px 20px rgba(62,39,35,0.08)',
      }}>

        {/* Card header strip */}
        <div style={{
          background: 'linear-gradient(135deg, #3E2723 0%, #5D4037 100%)',
          padding: '12px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            Transaction Summary
          </span>
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            padding: '3px 11px', borderRadius: 20,
            background: isRefund ? 'rgba(183,28,28,0.22)' : 'rgba(46,125,79,0.22)',
            border: `1px solid ${isRefund ? 'rgba(183,28,28,0.40)' : 'rgba(46,125,79,0.40)'}`,
            color: isRefund ? '#ff8a80' : '#69f0ae',
          }}>
            {isRefund ? 'REFUND' : 'SALE'}
          </span>
        </div>

        {/* Amount row */}
        <div style={{
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#A09490',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Total Amount
          </span>
          <span style={{
            fontSize: 28, fontWeight: 800, color: '#2B1D1A',
            letterSpacing: '-0.8px', fontVariantNumeric: 'tabular-nums',
          }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#6B5B57', marginRight: 1 }}>$</span>
            {amount}
          </span>
        </div>

        {/* Dashed separator */}
        <div style={{
          margin: '0 20px',
          borderTop: '1.5px dashed #DDD2CC',
        }} />

        {/* Product & type rows */}
        <div style={{ padding: '14px 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Product
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '2px 10px', borderRadius: 6,
                background: '#3E2723', color: '#D4A373',
                fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
              }}>
                {product.code}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#2B1D1A' }}>
                {product.name}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Type
            </span>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: isRefund ? '#B71C1C' : '#2E7D4F',
              letterSpacing: '0.04em',
            }}>
              {isRefund ? 'Refund' : 'Sale'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Payment method section ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#A09490',
          letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          Payment Method
        </span>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
      </div>

      {/* ── 2×2 payment grid — fluid, works on all mobile sizes ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
      }}>
        {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
          const isSelected = selectedMethod === id;
          return (
            <button
              key={id}
              onClick={() => setSelectedMethod(id)}
              className="active:translate-y-[4px]"
              style={{
                height: 96,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 9,
                borderRadius: 14,
                border: isSelected ? '2px solid #D4A373' : '1px solid #DDD2CC',
                background: isSelected
                  ? 'linear-gradient(160deg, #5D4037 0%, #3E2723 100%)'
                  : '#ffffff',
                boxShadow: isSelected
                  ? '0 4px 0 #2A1715, 0 6px 16px rgba(42,23,21,0.22)'
                  : '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                outline: 'none',
              }}
            >
              <Icon sx={{
                fontSize: 30,
                color: isSelected ? '#D4A373' : '#6B5B57',
                transition: 'color 0.15s',
              }} />
              <span style={{
                fontSize: 13, fontWeight: 700, letterSpacing: '0.01em',
                color: isSelected ? '#ffffff' : '#2B1D1A',
                transition: 'color 0.15s',
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Spacer — pushes actions to bottom ── */}
      <div style={{ flex: 1, minHeight: 28 }} />

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Process Payment */}
        <button
          onClick={handleProcess}
          disabled={!selectedMethod}
          style={{
            height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderRadius: 12,
            border: selectedMethod ? '2px solid #D4A373' : '1px solid #4a3329',
            background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)',
            color: '#fff',
            fontSize: 15, fontWeight: 800, letterSpacing: '0.06em',
            boxShadow: selectedMethod
              ? '0 4px 0 #2A1715, 0 6px 14px rgba(42,23,21,0.28), 0 0 0 1px #D4A373'
              : '0 4px 0 #2A1715, 0 6px 14px rgba(42,23,21,0.16)',
            opacity: selectedMethod ? 1 : 0.42,
            cursor: selectedMethod ? 'pointer' : 'not-allowed',
          }}
        >
          <CheckCircleOutlinedIcon sx={{ fontSize: 20 }} />
          Process Payment
        </button>

        {/* Divider with label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: '#EDE5E0' }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: '#C4B5B0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#EDE5E0' }} />
        </div>

        {/* Cancel Transaction */}
        <button
          onClick={handleCancel}
          style={{
            height: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            borderRadius: 12,
            border: '1px solid #f4b8b8',
            background: '#fff',
            color: '#B71C1C',
            fontSize: 14, fontWeight: 700, letterSpacing: '0.03em',
            boxShadow: '0 2px 0 #e8c8c8, 0 4px 10px rgba(183,28,28,0.06)',
            cursor: 'pointer',
          }}
        >
          <BlockIcon sx={{ fontSize: 17 }} />
          Cancel Transaction
        </button>

      </div>
    </div>
  );
}
