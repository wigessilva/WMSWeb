import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

export default function Conferencia() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full p-10 bg-white shadow-sm rounded-xl border border-gray-200 mt-10 max-w-lg mx-auto">
      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Conferência do Romaneio #{id}</h2>
      <p className="text-gray-500 mb-8 text-center">
        Página de contagem em doca. Esta será a interface responsiva para bipe e contagem em chão de fábrica.
      </p>
      <Button variant="primary" onClick={() => navigate('/atividades')}>
        Voltar para Atividades
      </Button>
    </div>
  );
}
