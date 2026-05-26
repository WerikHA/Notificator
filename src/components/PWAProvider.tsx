"use client";

import { useEffect } from 'react';
import { toast } from 'sonner';

export default function PWAProvider() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registrado com sucesso:', registration.scope);
            toast.success('App pronto para uso offline');
          })
          .catch((error) => {
            console.error('Falha ao registrar SW:', error);
          });
      });
    }
  }, []);

  return null;
}