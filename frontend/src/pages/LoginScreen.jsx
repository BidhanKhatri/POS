import React, { useState } from 'react';
import LockIcon from '@mui/icons-material/LockOutlined';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';

const LoginScreen = () => {
  const [pin, setPin] = useState('');

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < 4; i++) {
      dots.push(
        <div
          key={i}
          className={`w-5 h-5 rounded-full border-[2.5px] border-primary ${i < pin.length ? 'bg-primary' : 'bg-transparent'
            }`}
        ></div>
      );
    }
    return dots;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans text-on-surface">
      <div className="w-full max-w-[400px] flex flex-col space-y-6">

        {/* Top Status Bar */}
        <div className="flex items-center justify-center py-4 px-4 bg-surface border border-divider-tone rounded-xl">
          <LockIcon className="text-on-surface-variant mr-2" fontSize="small" />
          <span className="text-sm font-bold tracking-widest text-on-surface-variant uppercase">
            Terminal Secure - Please Enter Pin
          </span>
        </div>

        {/* Main Keypad Card */}
        <div className="bg-surface border border-divider-tone rounded-xl p-8 flex flex-col items-center">

          {/* PIN Dots */}
          <div className="flex space-x-6 mb-10 mt-2">
            {renderPinDots()}
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-3 gap-4 w-full mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="h-[72px] flex items-center justify-center text-[28px] font-semibold bg-surface border border-divider-tone hover:bg-surface-variant active:bg-surface-dim transition-colors rounded font-sans text-primary"
              >
                {num}
              </button>
            ))}

            <button
              onClick={handleClear}
              className="h-[72px] flex items-center justify-center text-lg font-bold bg-error text-white hover:opacity-90 active:opacity-80 transition-opacity rounded uppercase tracking-wider"
            >
              Clr
            </button>

            <button
              onClick={() => handleNumberClick('0')}
              className="h-[72px] flex items-center justify-center text-[28px] font-semibold bg-surface border border-divider-tone hover:bg-surface-variant active:bg-surface-dim transition-colors rounded font-sans text-primary"
            >
              0
            </button>

            <button
              onClick={handleBackspace}
              className="h-[72px] flex items-center justify-center text-on-surface-variant bg-surface border border-divider-tone hover:bg-surface-variant active:bg-surface-dim transition-colors rounded"
            >
              <BackspaceOutlinedIcon />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row space-x-4 w-full">
            <button className="flex-1 flex items-center justify-center py-4 bg-primary-container text-white font-bold tracking-widest rounded hover:opacity-90 transition-opacity">
              <AccessTimeIcon fontSize="small" className="mr-2" />
              CLOCK IN
            </button>

            <button className="flex-1 flex items-center justify-center py-4 bg-surface text-primary font-bold tracking-widest rounded border border-divider-tone hover:bg-surface-variant transition-colors">
              <PersonAddAltIcon fontSize="small" className="mr-2" />
              SIGN UP
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
