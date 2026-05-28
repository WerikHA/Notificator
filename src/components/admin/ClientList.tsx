"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ExternalLink, 
  Copy, 
  Check, 
  Pencil, 
  Trash2, 
  Power, 
  PowerOff,
  Loader2,
  BarChart3,
  Lock
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Client {
  id: string;
  name: string;
  slug: string;
  metaAdsAccountId: string;
  metaAdsAccessToken: string;
  chatPassword: string;
  createdAt: string;
  isActive: boolean;
}

interface ClientListProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onRefresh: () => void;
}

export default function ClientList({ clients, onEdit, onRefresh }: ClientListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const getDashboardUrl = (slug: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/dashboard/${slug}`;
    }
    return `/dashboard/${slug}`;
  };

  const copyLink = (client: Client) => {
    const url = getDashboardUrl(client.slug);
    navigator.clipboard.writeText(url);
    setCopiedId(client.id);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleActive = async (client: Client) => {
    setTogglingId(client.id);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !client.isActive }),
      });

      if (!res.ok) throw new Error('Erro ao alterar status');

      toast.success(client.isActive ? 'Dashboard desativado' : 'Dashboard ativado');
      onRefresh();
    } catch {
      toast.error('Erro ao alterar status');
    } finally {
      setTogglingId(null);
    }
  };

  const deleteClient = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/clients/${deleteId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Erro ao deletar');

      toast.success('Cliente removido!');
      setDeleteId(null);
      onRefresh();
    } catch {
      toast.error('Erro ao remover cliente');
    } finally {
      setDeleting(false);
    }
  };

  if (clients.length === 0) {
    return (
      <Card className="bg-[#18191A] border-gray-800 text-white">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 size={48} className="text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">Nenhum cliente cadastrado</p>
          <p className="text-gray-500 text-sm mt-1">Clique em &quot;Novo Cliente&quot; para começar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {clients.map((client) => (
          <Card key={client.id} className="bg-[#18191A] border-gray-800 text-white hover:border-gray-700 transition-colors">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-white truncate">{client.name}</h3>
                    <Badge variant={client.isActive ? 'default' : 'secondary'} className={client.isActive ? 'bg-green-600' : 'bg-gray-600'}>
                      {client.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 font-mono truncate">
                    Conta: {client.metaAdsAccountId}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-gray-500">
                      Criado: {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                    {client.chatPassword && (
                      <div className="flex items-center gap-1 text-xs text-purple-400">
                        <Lock size={10} />
                        <span>Senha chat: {client.chatPassword}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="bg-[#242526] rounded px-2 py-1 text-xs text-gray-400 font-mono max-w-[200px] truncate hidden md:block">
                    {getDashboardUrl(client.slug)}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white"
                    onClick={() => copyLink(client)}
                    title="Copiar link"
                  >
                    {copiedId === client.id ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white"
                    onClick={() => window.open(getDashboardUrl(client.slug), '_blank')}
                    title="Abrir dashboard"
                  >
                    <ExternalLink size={14} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white"
                    onClick={() => onEdit(client)}
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white"
                    onClick={() => toggleActive(client)}
                    disabled={togglingId === client.id}
                    title={client.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {togglingId === client.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : client.isActive ? (
                      <PowerOff size={14} />
                    ) : (
                      <Power size={14} />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-500"
                    onClick={() => setDeleteId(client.id)}
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#18191A] border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Esta ação não pode ser desfazida. O dashboard do cliente será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#242526] border-gray-700 text-white hover:bg-[#2F3033]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteClient}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}