"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CampaignMetric } from '@/lib/mock-meta-data';
import { Badge } from '@/components/ui/badge';

interface CampaignTableProps {
  data: CampaignMetric[];
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

export default function CampaignTable({ data }: CampaignTableProps) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Métricas por Campanha</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Campanha</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">Impressões</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">CPC</TableHead>
                <TableHead className="text-right">Conversões</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.campaignName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(campaign.spend)}</TableCell>
                  <TableCell className="text-right">{formatNumber(campaign.impressions)}</TableCell>
                  <TableCell className="text-right">{formatNumber(campaign.clicks)}</TableCell>
                  <TableCell className="text-right">{campaign.ctr.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{formatCurrency(campaign.cpc)}</TableCell>
                  <TableCell className="text-right">{formatNumber(campaign.conversions)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={campaign.roas >= 3 ? 'default' : 'secondary'}>
                      {campaign.roas.toFixed(1)}x
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}