import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import type { Usuario } from '../types/usuario';

interface LoginProps {
  onLogin: (usuario: Usuario) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Lembra o último usuário que fez login no computador
  useEffect(() => {
    const ultimoLogin = localStorage.getItem('wms_ultimo_login');
    if (ultimoLogin) {
      setLogin(ultimoLogin);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!login.trim() || !senha) {
      setErro('Por favor, preencha o login e a password.');
      return;
    }

    if (!/^\d{6}$/.test(senha)) {
      setErro('A password deve conter exatamente 6 dígitos numéricos.');
      return;
    }

    setCarregando(true);
    try {
      const usuario = await authService.login(login, senha);

      // Guarda o login no navegador para a próxima vez
      localStorage.setItem('wms_ultimo_login', login);

      onLogin(usuario);
    } catch (error: any) {
      setErro(error.message || 'Erro ao iniciar sessão.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-wms-fundo flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm border border-gray-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1a63b6] tracking-wide">Bem-vindo!</h1>
          <p className="text-gray-500 mt-2 text-sm">Faça login para continuar</p>
        </div>

        {erro && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded border border-red-200 text-center font-medium">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full border border-gray-300 p-2.5 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
              placeholder="Digite seu login"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              maxLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-gray-300 p-2.5 rounded focus:outline-none focus:ring-2 focus:ring-[#1a63b6] text-center tracking-widest text-lg"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-[#1a63b6] text-white p-2.5 rounded hover:bg-blue-800 transition-colors font-medium mt-4 shadow-sm disabled:opacity-50"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}