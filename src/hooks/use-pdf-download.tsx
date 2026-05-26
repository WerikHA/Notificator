"use client";

import { useCallback, useState } from 'react';

export function usePdfDownload() {
  const [generating, setGenerating] = useState(false);

  const generatePdf = useCallback(async (elementId: string, filename: string = 'relatorio') => {
    setGenerating(true);

    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Elemento não encontrado');
      }

      const html2canvasModule = await import('html2canvas');
      const html2canvasFn = html2canvasModule.default;

      const jsPDFModule = await import('jspdf');
      const jsPDFConstructor = jsPDFModule.default;

      const canvas = await html2canvasFn(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0A0B0D',
        windowWidth: 1400,
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDFConstructor('p', 'mm', 'a4');
      let position = 0;
      let heightLeft = imgHeight;

      const imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      pdf.save(`${filename}-${date}.pdf`);

      return true;
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw error;
    } finally {
      setGenerating(false);
    }
  }, []);

  return { generatePdf, generating };
}