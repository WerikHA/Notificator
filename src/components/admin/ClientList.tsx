"use client";

import { useState, useEffect, useCallback } from 'react';
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
  Wallet,
  TrendingUp,
  Target,
  RefreshCw,
  AlertCircle
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
  createdAt: string;
  isActive: boolean;
}

interface BalanceInfo {
  name: string;
  currency: string;
  amountSpent: number;
  balance: number;
  spendCap: number;
  availableBalance: number | null;
  hasLimit: boolean;
}

interface ClientListProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onRefresh: () => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function ClientList({ clients, onEdit, onRefresh }: ClientListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, BalanceInfo>>({});
  const [loadingBalances, setLoadingBalances] = useState<Record<string, boolean>>({});

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

  const fetchBalance = useCallback(async (client: Client) => {
    setLoadingBalances((prev) => ({ ...prev, [client.id]: true }));
    try {
      const res = await fetch('/api/meta/account-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: client.metaAdsAccessToken,
          accountId: client.metaAdsAccountId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBalances((prev) => ({ ...prev, [client.id]: data }));
      }
    } catch {
      // Ignora erro silenciosamente
    } finally {
      setLoadingBalances((prev) => ({ ...prev, [client.id]: false }));
    }
  }, []);

  const fetchAllBalances = useCallback(async () => {
    for (const client of clients) {
      if (client.isActive) {
        await fetchBalance(client);
      }
    }
  }, [clients, fetchBalance]);

  useEffect(() => {
    if (clients.length > 0) {
      fetchAllBalances();
    }
  }, [clients.length, fetchAllBalances]);

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
        {clients.map((client) => {
          const bal = balances[client.id];
          const isLoadingBal = loadingBalances[client.id];

          return (
            <Card key={client.id} className="bg-[#18191A] border-gray-800 text-white hover:border-gray-700 transition-colors">
              <CardContent className="p-4">
                {/* Linha principal */}
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
                    <p className="text-xs text-gray-500 mt-1">
                      Criado: {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                    </p>
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
                      onClick={() => fetchBalance(client)}
                      disabled={isLoadingBal}
                      title="Atualizar saldo"
                    >
                      <RefreshCw size={14} className={isLoadingBal ? 'animate-spin' : ''} />
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

                {/* Saldo da conta */}
                {client.isActive && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    {isLoadingBal && !bal && (
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Loader2 size={12} className="animate-spin" />
                        Carregando saldo da conta...
                      </div>
                    )}
                    {bal && (
                      <div className="space-y-2">
                        {/* Saldo Disponível */}
                        {bal.availableBalance !== null && bal.availableBalance !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <Wallet size={12} className="text-green-400" />
                            <span className="text-gray-500">Saldo Disponível:</span>
                            <span className={`font-medium ${bal.availableBalance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(bal.availableBalance)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle size={12} className="text-yellow-400" />
                            <span className="text-gray-500">Limite não configurado</span>
                          </div>
                        )}

                        {/* Outras métricas */}
                        <div className="flex flex-wrap gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-blue-400" />
                            <span className="text-gray-500">Gasto Total:</span>
                            <span className="font-medium text-blue-400">{formatCurrency(bal.amountSpent)}</span>
                          </div>
                          {bal.spendCap > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Target size={12} className="text-purple-400" />
                              <span className="text-gray-500">Limite Mensal:</span>
                              <span className="font-medium text-purple-400">{formatCurrency(bal.spendCap)}</span>
                            </div>
                          )}
                        </div>

                        {/* Barra de progresso */}
                        {bal.spendCap > 0 && (
                          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                bal.availableBalance !== null && bal.availableBalance > 0 
                                  ? 'bg-green-500' 
                                  : 'bg-red-500'
                              }`}
                              style={{ 
                                width: `${Math.min(100, (bal.amountSpent / bal.spendCap) * 100)}%` 
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {!isLoadingBal && !bal && (
                      <p className="text-[11px] text-gray-600">Não foi possível carregar o saldo</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
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