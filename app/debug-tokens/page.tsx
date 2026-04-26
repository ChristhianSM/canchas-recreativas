'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DebugTokensPage() {
  const [tokens, setTokens] = useState<any>({});

  useEffect(() => {
    // Obtener todos los tokens del localStorage
    const allTokens = {
      cp_token: localStorage.getItem('cp_token'),
      cp_user: localStorage.getItem('cp_user'),
      cancha_piura_user: localStorage.getItem('cancha_piura_user'),
      cp_owner_token: localStorage.getItem('cp_owner_token'),
      admin_token: localStorage.getItem('admin_token'),
      // Buscar cualquier otro token que pueda existir
      allKeys: Object.keys(localStorage).filter(key => 
        key.includes('token') || key.includes('user') || key.includes('auth')
      )
    };
    setTokens(allTokens);
  }, []);

  const clearAllTokens = () => {
    // Limpiar todos los tokens
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_user');
    localStorage.removeItem('cancha_piura_user');
    localStorage.removeItem('cp_owner_token');
    localStorage.removeItem('admin_token');
    
    // Limpiar cualquier otro token
    Object.keys(localStorage).forEach(key => {
      if (key.includes('token') || key.includes('user') || key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
    
    alert('Todos los tokens han sido eliminados. Recarga la página.');
    window.location.reload();
  };

  const testToken = async (tokenName: string, token: string) => {
    if (!token) return;
    
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      console.log(`Token ${tokenName}:`, data);
      alert(`Token ${tokenName}: ${data.email || data.error || 'Sin email'}`);
    } catch (err) {
      console.error(`Error con token ${tokenName}:`, err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Debug Tokens</h1>
      
      <div className="space-y-4">
        <Card className="p-4">
          <h2 className="font-bold mb-2">Tokens en localStorage:</h2>
          <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
            {JSON.stringify(tokens, null, 2)}
          </pre>
        </Card>

        <div className="flex gap-2 flex-wrap">
          {Object.entries(tokens).map(([key, value]) => {
            if (key === 'allKeys' || !value) return null;
            return (
              <Button 
                key={key} 
                variant="outline" 
                size="sm"
                onClick={() => testToken(key, value as string)}
              >
                Probar {key}
              </Button>
            );
          })}
        </div>

        <Button 
          variant="destructive" 
          onClick={clearAllTokens}
          className="w-full"
        >
          🗑️ Limpiar TODOS los tokens
        </Button>

        <Card className="p-4 bg-yellow-50">
          <h3 className="font-bold text-yellow-800">Instrucciones:</h3>
          <ol className="text-sm text-yellow-700 mt-2 space-y-1">
            <li>1. Revisa qué tokens tienes</li>
            <li>2. Prueba cada token para ver a qué usuario corresponde</li>
            <li>3. Si hay tokens mezclados, haz clic en "Limpiar TODOS los tokens"</li>
            <li>4. Vuelve a iniciar sesión con tu cuenta correcta</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}