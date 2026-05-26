"use client";

import { useEffect, useState, useRef } from 'react';
import { Bell, Volume2, ExternalLink, Copy, Check, Key, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Notification {
  id: number;
  message: string;
  timestamp: string;
  title?: string;
  source?: string;
}

export default function NotificationReceiver() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Fix Hydration: Initialize with placeholder and update in useEffect
  const [webhookUrl, setWebhookUrl] = useState('...');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhook/notification`);
      // Solicitar permissão de notificação ao carregar
      requestNotificationPermission();
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    
    const interval = setInterval(fetchNotifications, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notifications]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data: Notification[] = await res.json();
        
        if (data.length > notifications.length) {
          // Toca alerta e notifica apenas para notificações externas (não do usuário)
          const newMessages = data.filter(n => !notifications.find(existing => existing.id === n.id));
          const hasExternalAlert = newMessages.some(n => n.source !== 'user');
          
          if (hasExternalAlert) {
            // Tocar som
            playMelodyAlert();
            
            // Disparar notificação nativa de emergência para cada nova mensagem
            newMessages.forEach(n => {
              showEmergencyNotification(n);
            });
          }
          
          setNotifications(data);
          lastIdRef.current = data[data.length - 1].id;
        } else if (data.length > 0 && lastIdRef.current !== data[data.length - 1].id) {
           setNotifications(data);
           lastIdRef.current = data[data.length - 1].id;
        } else if (notifications.length === 0 && data.length > 0) {
          setNotifications(data);
          lastIdRef.current = data[data.length - 1].id;
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast.success('Notificações ativadas! Você receberá alertas de emergência.');
        } else {
          toast.error('Permissão de notificação negada. Ative nas configurações do navegador.');
        }
      } catch (error) {
        console.error('Error requesting notification permission', error);
      }
    }
  };

  const showEmergencyNotification = (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🚨 ALERTA DE EMERGÊNCIA 🚨', {
          body: notification.message,
          icon: '/icons/icon-192.svg',
          badge: '/icons/icon-192.svg',
          tag: notification.id.toString(), // Evita duplicatas na tela de bloqueio
          requireInteraction: true, // Mantém a notificação na tela até o usuário interagir (Desktop)
        });
      } catch (e) {
        console.error('Failed to show native notification', e);
      }
    }
  };

  const playMelodyAlert = () => {
    try {
      // Cria contexto de áudio se não existir ou se estiver fechado
      let audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Melodia urgente e alta (Dó-Ré-Mi-Fá-Sol-Lá-Si-Dó)
      const notes = [
        { freq: 523.25, start: 0.0, duration: 0.15 },    // C5
        { freq: 587.33, start: 0.15, duration: 0.15 },   // D5
        { freq: 659.25, start: 0.30, duration: 0.15 },   // E5
        { freq: 698.46, start: 0.45, duration: 0.15 },   // F5
        { freq: 783.99, start: 0.60, duration: 0.15 },   // G5
        { freq: 880.00, start: 0.75, duration: 0.15 },   // A5
        { freq: 987.77, start: 0.90, duration: 0.15 },   // B5
        { freq: 1046.50, start: 1.05, duration: 0.6 },   // C6 (Longo e alto)
      ];

      const now = audioContext.currentTime;
      const masterGain = audioContext.createGain();
      masterGain.gain.value = 0.5; // Volume mais alto
      masterGain.connect(audioContext.destination);

      notes.forEach(note => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.frequency.value = note.freq;
        osc.type = 'square'; // Onda quadrada soa mais "alarmante"
        
        // Envelope para ser alto e nítido
        gain.gain.setValueAtTime(0, now + note.start);
        gain.gain.linearRampToValueAtTime(1.0, now + note.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.duration);
        
        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration + 0.1);
      });

      // Fecha o contexto após o som terminar
      setTimeout(() => {
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      }, 2500);
      
    } catch (error) {
      console.error('Melody play failed', error);
    }
  };

  const testAlert = () => {
    playMelodyAlert();
    showEmergencyNotification({
      id: 0,
      message: 'Este é um teste do som de alerta!',
      timestamp: new Date().toISOString(),
    });
    toast.info('Testando melodia de alerta e notificação');
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('URL copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getSourceLabel = (source?: string) => {
    if (!source) return null;
    const labels: Record<string, string> = {
      'external-api': 'API Externa',
      'monitoring': 'Monitoramento',
      'webhook': 'Webhook',
      'user': 'Você',
    };
    return labels[source] || source;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-blue-600 dark:bg-blue-700 p-4 pt-12 shadow-md z-10">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Bell className="text-white" size={28} />
            <h1 className="text-xl font-bold text-white">Central de Alertas</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-blue-500"
            onClick={testAlert}
          >
            <Volume2 size={20} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full pb-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-70">
            <Bell size={64} className="mb-4" />
            <p className="text-lg">Aguardando notificações...</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex ${notification.source === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                notification.source === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none border-2 border-red-500/50'
              }`}>
                {notification.title && notification.source !== 'user' && (
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                    notification.source === 'user' ? 'text-blue-100' : 'text-red-500'
                  }`}>
                    {notification.title}
                  </p>
                )}
                <p className="text-base break-words">{notification.message}</p>
                <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                  {notification.source && (
                    <span className="flex items-center gap-1">
                      <ExternalLink size={10} />
                      {getSourceLabel(notification.source)}
                    </span>
                  )}
                  <span className={notification.source === 'user' ? 'ml-auto' : 'ml-auto'}>
                    {formatTime(notification.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700 max-w-md mx-auto w-full">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <Key size={14} />
            <span>Integração via API (Webhook)</span>
          </div>
          <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-xs font-mono break-all border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
            <span className="text-gray-500 dark:text-gray-400 truncate">{webhookUrl}</span>
            <button onClick={copyUrl} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500">
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Envie requisições POST com header <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">Authorization: Bearer SUA_API_KEY</code>.
          </p>
        </div>
      </div>
    </div>
  );
}