import React, { useState } from 'react';
import { Modal } from './Modal';
import { authService } from '../services/authService';
import { toast } from 'react-hot-toast';

interface ConfirmacaoSenhaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmacaoSenhaModal({
  isOpen,
  onClose,
  onConfirm
}: ConfirmacaoSenhaModalProps) {
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senha) {
      toast.error('Por favor, insira sua senha.');
      return;
    }

    try {
      setCarregando(true);
      await authService.confirmarSenha(senha);
      setSenha('');
      onConfirm();
    } catch (error: any) {
      console.error('Erro ao confirmar senha:', error);
      const mensagem = error.response?.data?.detail || 'Senha incorreta ou erro na autenticaï¿½ï¿½o.';
      toast.error(mensagem);
    } finally {
      setCarregando(false);
    }
  };

  const handleClose = () => {
    setSenha('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen}>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all p-8'>
        <div className='mb-6 text-center'>
          <div className='inline-flex bg-blue-50 p-3 rounded-full mb-3 text-[#1a63b6]'>
            <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
            </svg>
          </div>
          <h3 className='text-xl font-bold text-gray-800'>Confirmar Senha</h3>
        </div>

        <form onSubmit={handleConfirmar} className='space-y-6'>
          <div className='space-y-2'>
            <input
              type='password'
              autoFocus
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder='Digite a sua senha'
              className='w-full border-2 border-gray-100 bg-gray-50 p-4 rounded-xl text-center text-lg focus:outline-none focus:border-[#1a63b6] focus:ring-4 focus:ring-blue-50 transition-all placeholder-gray-300'
              disabled={carregando}
            />
          </div>

          <div className='flex space-x-3 pt-2'>
            <button
              type='button'
              onClick={handleClose}
              className='flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-bold transition-colors'
              disabled={carregando}
            >
              Cancelar
            </button>
            <button
              type='submit'
              className='flex-1 px-4 py-3 bg-[#1a63b6] text-white rounded-xl hover:bg-blue-800 font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center space-x-2'
              disabled={carregando}
            >
              {carregando ? (
                <>
                  <svg className='animate-spin h-5 w-5 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                  </svg>
                  <span>Validando...</span>
                </>
              ) : (
                <span>Confirmar</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}