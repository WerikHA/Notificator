"use client";

import { useEffect, useState, useRef } from 'react';
import { Bell, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Notification {
  id: number;
  message: string;
  timestamp: string;
}

export default function NotificationReceiver() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetchNotifications();
    requestNotificationPermission();
    
    // Poll for new notifications every 2 seconds
    const interval = setInterval(fetchNotifications, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Scroll to bottom when new notifications arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notifications]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data: Notification[] = await res.json();
        
        // Check if there are new notifications
        if (data.length > notifications.length) {
          const newNotifs = data.slice(notifications.length);
          
          newNotifs.forEach(() => {
            playLoudAlert();
          });

          setNotifications(data);
          lastIdRef.current = data[data.length - 1].id;
        } else if (data.length > 0 && lastIdRef.current !== data[data.length - 1].id) {
           // In case of reordering or missed updates
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
      // Create an audio context for the loud beep
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // High frequency square wave for a harsh/loud alert
      oscillator.frequency.value = 880; 
      oscillator.type = 'square'; 
      gainNode.gain.value = 1.0; // Max volume
      
      oscillator.start();
      
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 1500); // 1.5 second alert
      
    } catch (error) {
      console.error('Audio play failed', error);
    }
  };

  const testAlert = () => {
    playLoudAlert();
    toast.info('Testando alerta sonoro');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
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

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full pb-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-70">
            <Bell size={64} className="mb-4" />
            <p className="text-lg">Aguardando notificações...</p>
            <p className="text-sm mt-2">Novas mensagens aparecerão aqui.</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-br-none px-4 py-3 shadow-sm">
                <p className="text-base break-words">{notification.message}</p>
                <p className="text-xs text-blue-100 mt-1 text-right">
                  {formatTime(notification.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}