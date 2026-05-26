"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { Bell, Volume2, ExternalLink, Copy, Check, Key } from 'lucide-react';
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

  // Detecta a URL base automaticamente
  const webhookUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/webhook/notification`;
    }
    return '...';
  }, []);

  useEffect(() => {
    fetchNotifications();
    requestNotificationPermission();
    
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
          // Toca alerta apenas para notificações externas (não do usuário)
          const newMessages = data.filter(n => !notifications.find(existing => existing.id === n.id));
          const hasExternalAlert = newMessages.some(n => n.source !== 'user');
          
          if (hasExternalAlert) {
            playLoudAlert();
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
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notificações do navegador ativadas');
      }
    }
  };

  const playLoudAlert = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880; 
      oscillator.type = 'square'; 
      gainNode.gain.value = 1.0; 
      
      oscillator.start();
      
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 1500); 
    } catch (error) {
      console.error('Audio play failed', error);
    }
  };

  const testAlert = () => {
    playLoudAlert();
    toast.info('Testando alerta sonoro');
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
      <div className="bg-blue-600 dark:bg-blue-800 p-4 pt-12 shadow-md z-10">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Bell className="text-white" size={24} />
            <h1 className="text-xl font-bold text-white">Central de Alertas</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-blue-700"
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
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-gray-700'
              }`}>
                {notification.title && notification.source !== 'user' && (
                  <p className={`text-xs font-semibold mb-1 ${
                    notification.source === 'user' ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
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