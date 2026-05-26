interface Window {
  html2canvas: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  jspdf: {
    jsPDF: new (...args: any[]) => {
      addImage: (imgData: string, format: string, x: number, y: number, width: number, height: number) => void;
      addPage: () => void;
      save: (filename: string) => void;
    };
  };
}