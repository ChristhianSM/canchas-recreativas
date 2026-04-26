'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getToken } from '@/lib/api';

export default function DebugUsuarioPage() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkUser = async () => {
    setLoading(true);
    const token = getToken();
    
    if (!token) {
      setInfo({ error: 'No hay token en localStorage' });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/debug-mi-usuario', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setInfo(data);
    } catch (err: any) {
      setInfo({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Debug Usuario</h1>
      
      <Button onClick={checkUser} disabled={loading}>
        {loading ? 'Verificando...' : 'Verificar mi usuario'}
      </Button>

      {info && (
        <Card className="mt-4 p-4">
          <pre className="text-xs overflow-auto">
            {JSON.stringify(info, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}