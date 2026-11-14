import { type FormEvent, useEffect, useState } from 'react';
import { UserCheck, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  contextMessage: string;
  onClose: () => void;
  onLogin: (email: string, password: string) => string | null;
  onRegister: (name: string, email: string, password: string) => string | null;
}

export function AuthModal({
  isOpen,
  initialMode,
  contextMessage,
  onClose,
  onLogin,
  onRegister,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setLoginEmail('');
    setLoginPassword('');
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirm('');
    setErrorMsg(null);
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const normalizedEmail = loginEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMsg('Inserisci un indirizzo email valido.');
      return;
    }
    if (loginPassword.length < 6) {
      setErrorMsg('La password deve contenere almeno 6 caratteri.');
      return;
    }
    const err = onLogin(normalizedEmail, loginPassword);
    if (err) setErrorMsg(err);
  };

  const handleRegisterSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const normalizedEmail = regEmail.trim().toLowerCase();
    if (!regName.trim()) {
      setErrorMsg('Inserisci nome e cognome o nome agenzia.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMsg('Inserisci un indirizzo email valido.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('La password deve contenere almeno 6 caratteri.');
      return;
    }
    if (regPassword !== regConfirm) {
      setErrorMsg('Le password non coincidono.');
      return;
    }
    const err = onRegister(regName.trim(), normalizedEmail, regPassword);
    if (err) {
      setErrorMsg(err);
      if (err.includes('Esiste già')) {
        setMode('login');
        setLoginEmail(normalizedEmail);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-[#092b35]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border border-[#cbe2de] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl my-auto">
        <div className="px-6 py-4 border-b border-[#e1f0ed] flex items-center justify-between bg-[#f4faf9]">
          <h2 id="auth-modal-title" className="font-bold text-base text-[#0e4d5f] flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#2eb086]" aria-hidden="true" /> Account ImmoPulse
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra accesso"
            className="p-1.5 rounded-lg text-[#5a808a] hover:text-[#0e4d5f]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#eef6f5] border border-[#cbe2de]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-md text-xs font-semibold transition-colors ${
                mode === 'login' ? 'bg-[#0e4d5f] text-white' : 'text-[#4a707a] hover:text-[#0e4d5f]'
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-md text-xs font-semibold transition-colors ${
                mode === 'register' ? 'bg-[#0e4d5f] text-white' : 'text-[#4a707a] hover:text-[#0e4d5f]'
              }`}
            >
              Registrati
            </button>
          </div>

          {contextMessage && (
            <p className="text-xs bg-amber-50 text-amber-900 border border-amber-200 rounded-lg p-2.5">
              {contextMessage}
            </p>
          )}

          {errorMsg && (
            <div role="alert" className="text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded-lg p-2.5 font-medium">
              {errorMsg}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} noValidate className="space-y-3">
              <div>
                <label htmlFor="login-email" className="block text-xs text-[#3b5e68] mb-1">
                  Email *
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="nome@agenzia.it"
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-xs text-[#3b5e68] mb-1">
                  Password *
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  minLength={6}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white font-semibold text-xs"
              >
                Accedi ad ImmoPulse
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} noValidate className="space-y-3">
              <div>
                <label htmlFor="reg-name" className="block text-xs text-[#3b5e68] mb-1">
                  Nome e Cognome / Agenzia *
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Es. Studio Immobiliare Rossi"
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
              </div>
              <div>
                <label htmlFor="reg-email" className="block text-xs text-[#3b5e68] mb-1">
                  Email *
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="nome@agenzia.it"
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
              </div>
              <div>
                <label htmlFor="reg-password" className="block text-xs text-[#3b5e68] mb-1">
                  Password *
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
              </div>
              <div>
                <label htmlFor="reg-password-confirm" className="block text-xs text-[#3b5e68] mb-1">
                  Conferma Password *
                </label>
                <input
                  id="reg-password-confirm"
                  type="password"
                  required
                  minLength={6}
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  placeholder="Ripeti password"
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white font-semibold text-xs"
              >
                Crea Account e Scegli Piano
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
