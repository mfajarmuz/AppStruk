import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import ReceiptForm from './components/ReceiptForm';
import ReceiptPreview, { parseReceiptTemplate } from './components/ReceiptPreview';
import TemplateManager from './components/TemplateManager';
import FuelPriceManager from './components/FuelPriceManager';
import HistoryPanel from './components/HistoryPanel';
import PrinterSettings from './components/PrinterSettings';

import { INITIAL_FUELS } from './data/defaultFuels';
import { DEFAULT_TEMPLATES } from './data/defaultTemplates';
import { dbService } from './services/dbService';
import './styles/app.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('generator');
  const isLoadedRef = useRef(false);

  // State Management
  const [fuels, setFuels] = useState(INITIAL_FUELS);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState('pertamina-sukaraja-real');
  const [history, setHistory] = useState([]);
  
  // Font & Logo Size Settings State
  const [logoWidth, setLogoWidth] = useState(160);
  const [fontSettings, setFontSettings] = useState({
    fontFamily: "'Courier New', Courier, 'Consolas', monospace",
    fontSize: 12.5,
    lineHeight: 1.35,
    fontWeight: 'normal',
    textAlign: 'left'
  });

  // Dynamic Template Pattern with Tags matching photo
  const [templatePattern, setTemplatePattern] = useState(`{NO_SPBU}
{NAMA_SPBU}
{ALAMAT}
Shift: {SHIFT}          No. Trans: {NO_TRANS}
Waktu: {WAKTU}
-----------------------------------------
Pulau/Pompa: {POMPA}
Nama Produk: {NAMA_PRODUK}
Harga/Liter: Rp. {HARGA_LITER}
Volume     : (L) {VOLUME}
Total Harga: Rp. {TOTAL_HARGA}
Operator   : {OPERATOR}
-----------------------------------------
{METODE_BAYAR}                                {TOTAL_HARGA}`);

  // Printer state
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [printerSettings, setPrinterSettings] = useState({
    paperWidth: 58, // 5.7 cm - 5.8 cm paper width
    fontSize: 7.5,
    silentPrint: false
  });
  const [isPrinting, setIsPrinting] = useState(false);

  // Default Form Data matching user photo 100%
  const [formData, setFormData] = useState({
    spbuName: 'SPBU RY SUKARAJA JENGGALA',
    spbuNo: '3446125',
    spbuAddress: 'JL. RAYA SUKARAJA DS. JENGGALA',
    spbuPhone: '',
    shift: '1',
    transactionNo: '6137760',
    date: '04/08/2026',
    time: '07:52:30',
    dateTime: '04/08/2026 07:52:30',
    fuelId: 'fuel_7',
    fuelName: 'PERTAMINA_DEX',
    pricePerLiter: 21150,
    totalAmount: 500000,
    paidAmount: 500000,
    liter: 23.64,
    pumpNo: '1',
    operatorName: 'AJIS',
    platNo: '',
    paymentMethod: 'CASH',
    customLogoUrl: ''
  });

  // Load Saved Data from Supabase Cloud DB on Mount ONCE
  useEffect(() => {
    async function initData() {
      try {
        const loadedTemplates = await dbService.loadData('templates');
        if (loadedTemplates && Array.isArray(loadedTemplates) && loadedTemplates.length > 0) {
          const freshTemplates = DEFAULT_TEMPLATES.map(def => def).concat(
            loadedTemplates.filter(t => !DEFAULT_TEMPLATES.some(d => d.id === t.id))
          );
          setTemplates(freshTemplates);
        }

        const loadedFuels = await dbService.loadData('fuels');
        if (loadedFuels && Array.isArray(loadedFuels) && loadedFuels.length > 0) {
          setFuels(loadedFuels);
        }

        const loadedHistory = await dbService.loadData('history');
        if (loadedHistory) setHistory(loadedHistory);

        const loadedPrinter = await dbService.loadData('selectedPrinter');
        if (loadedPrinter) setSelectedPrinter(loadedPrinter);

        const loadedSettings = await dbService.loadData('printerSettings');
        if (loadedSettings) setPrinterSettings(loadedSettings);

        const loadedPattern = await dbService.loadData('templatePattern');
        if (loadedPattern) setTemplatePattern(loadedPattern);

        const loadedFontSettings = await dbService.loadData('fontSettings');
        if (loadedFontSettings) setFontSettings(loadedFontSettings);

        const loadedLogoWidth = await dbService.loadData('logoWidth');
        if (loadedLogoWidth) setLogoWidth(loadedLogoWidth);

        fetchPrinters();
      } catch (err) {
        console.error('Error loading database data:', err);
      } finally {
        isLoadedRef.current = true;
      }
    }
    initData();
  }, []);

  // Fetch Available Printers
  const fetchPrinters = async () => {
    if (window.electronAPI) {
      try {
        const availablePrinters = await window.electronAPI.getPrinters();
        setPrinters(availablePrinters || []);

        if (!selectedPrinter && availablePrinters && availablePrinters.length > 0) {
          const vscPrinter = availablePrinters.find(p => 
            p.name.toUpperCase().includes('VSC') || 
            p.name.toUpperCase().includes('58') || 
            p.name.toUpperCase().includes('POS')
          );
          if (vscPrinter) {
            setSelectedPrinter(vscPrinter.name);
          } else {
            setSelectedPrinter(availablePrinters[0].name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch printers:', err);
      }
    }
  };

  // Sync states to Supabase Cloud Storage ONLY AFTER initial load completes!
  useEffect(() => {
    if (isLoadedRef.current) {
      dbService.saveData('fuels', fuels);
    }
  }, [fuels]);

  useEffect(() => {
    if (isLoadedRef.current) {
      dbService.saveData('templates', templates);
    }
  }, [templates]);

  useEffect(() => {
    if (isLoadedRef.current) {
      dbService.saveData('history', history);
    }
  }, [history]);

  useEffect(() => {
    if (isLoadedRef.current) {
      dbService.saveData('templatePattern', templatePattern);
    }
  }, [templatePattern]);

  useEffect(() => {
    if (isLoadedRef.current) {
      dbService.saveData('fontSettings', fontSettings);
    }
  }, [fontSettings]);

  useEffect(() => {
    if (isLoadedRef.current) {
      dbService.saveData('logoWidth', logoWidth);
    }
  }, [logoWidth]);

  useEffect(() => {
    if (isLoadedRef.current) {
      dbService.saveData('selectedPrinter', selectedPrinter);
    }
  }, [selectedPrinter]);

  useEffect(() => {
    if (isLoadedRef.current) {
      dbService.saveData('printerSettings', printerSettings);
    }
  }, [printerSettings]);

  // Active Template Object
  const currentTemplate = (templates && templates.length > 0) 
    ? (templates.find(t => t.id === selectedTemplateId) || templates[0]) 
    : DEFAULT_TEMPLATES[0];

  // Print Receipt Handler
  const handlePrintReceipt = async (htmlContent) => {
    setIsPrinting(true);

    const historyItem = {
      ...formData,
      templatePattern: templatePattern,
      compiledText: parseReceiptTemplate(templatePattern, formData),
      fontSettings: fontSettings,
      logoWidth: logoWidth,
      id: `hist_${Date.now()}`,
      templateId: selectedTemplateId,
      templateName: currentTemplate.name,
      printedAt: new Date().toISOString()
    };
    const updatedHistory = [historyItem, ...history];
    setHistory(updatedHistory);
    dbService.saveData('history', updatedHistory);

    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.printReceipt(htmlContent, selectedPrinter, printerSettings);
        if (!res.success) {
          alert('Peringatan: Gagal mencetak ke printer. ' + (res.error || ''));
        }
      } catch (err) {
        alert('Gagal mengirim perintah cetak ke printer: ' + err.message);
      }
    } else {
      window.print();
    }
    setIsPrinting(false);
  };

  // Save to history manually
  const handleSaveHistory = () => {
    const historyItem = {
      ...formData,
      templatePattern: templatePattern,
      compiledText: parseReceiptTemplate(templatePattern, formData),
      fontSettings: fontSettings,
      logoWidth: logoWidth,
      id: `hist_${Date.now()}`,
      templateId: selectedTemplateId,
      templateName: currentTemplate.name,
      savedAt: new Date().toISOString()
    };
    const updatedHistory = [historyItem, ...history];
    setHistory(updatedHistory);
    dbService.saveData('history', updatedHistory);
    alert('Transaksi berhasil disimpan ke Riwayat (Tersimpan ke Supabase Database)!');
  };

  // Load past receipt from history
  const handleLoadReceiptFromHistory = (historyItem) => {
    if (historyItem.templatePattern) {
      setTemplatePattern(historyItem.templatePattern);
    }
    if (historyItem.fontSettings) {
      setFontSettings(historyItem.fontSettings);
    }
    if (historyItem.logoWidth) {
      setLogoWidth(historyItem.logoWidth);
    }
    setFormData({
      ...formData,
      spbuName: historyItem.spbuName,
      spbuNo: historyItem.spbuNo,
      spbuAddress: historyItem.spbuAddress,
      spbuPhone: historyItem.spbuPhone,
      shift: historyItem.shift || '1',
      transactionNo: historyItem.transactionNo,
      dateTime: historyItem.dateTime,
      fuelId: historyItem.fuelId,
      fuelName: historyItem.fuelName,
      pricePerLiter: historyItem.pricePerLiter,
      totalAmount: historyItem.totalAmount,
      paidAmount: historyItem.paidAmount,
      liter: historyItem.liter,
      pumpNo: historyItem.pumpNo,
      operatorName: historyItem.operatorName,
      platNo: historyItem.platNo,
      paymentMethod: historyItem.paymentMethod
    });
    if (historyItem.templateId) {
      setSelectedTemplateId(historyItem.templateId);
    }
    setActiveTab('generator');
  };

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedPrinter={selectedPrinter}
        printers={printers}
      />

      <main className="main-content">
        {activeTab === 'generator' && (
          <div className="generator-layout">
            <ReceiptForm
              formData={formData}
              setFormData={setFormData}
              fuels={fuels}
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              setSelectedTemplateId={setSelectedTemplateId}
            />

            <ReceiptPreview
              templatePattern={templatePattern}
              setTemplatePattern={setTemplatePattern}
              fontSettings={fontSettings}
              setFontSettings={setFontSettings}
              logoWidth={logoWidth}
              setLogoWidth={setLogoWidth}
              receiptData={formData}
              template={currentTemplate}
              onPrint={handlePrintReceipt}
              onSaveHistory={handleSaveHistory}
              isPrinting={isPrinting}
              selectedPrinter={selectedPrinter}
            />
          </div>
        )}

        {activeTab === 'templates' && (
          <TemplateManager
            templates={templates}
            setTemplates={setTemplates}
            onSelectTemplate={(id) => {
              setSelectedTemplateId(id);
              setActiveTab('generator');
            }}
            formData={formData}
          />
        )}

        {activeTab === 'fuels' && (
          <FuelPriceManager
            fuels={fuels}
            setFuels={setFuels}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPanel
            history={history}
            setHistory={setHistory}
            onLoadReceipt={handleLoadReceiptFromHistory}
            onPrintReceipt={handlePrintReceipt}
          />
        )}

        {activeTab === 'settings' && (
          <PrinterSettings
            printers={printers}
            selectedPrinter={selectedPrinter}
            setSelectedPrinter={setSelectedPrinter}
            printerSettings={printerSettings}
            setPrinterSettings={setPrinterSettings}
            onRefreshPrinters={fetchPrinters}
            onTestPrint={() => handlePrintReceipt()}
          />
        )}
      </main>
    </div>
  );
}
