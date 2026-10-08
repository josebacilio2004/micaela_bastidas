'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Coins,
  HandCoins,
  Receipt,
  Plus,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
  FileCheck2,
  FileText,
} from 'lucide-react';

export default function FondoRotatorioPage() {
  const [activeTab, setActiveTab] = useState<'PRESTAMOS' | 'COBRANZAS'>('PRESTAMOS');
  const [loans, setLoans] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [contractData, setContractData] = useState<any>(null);
  const [loadingContract, setLoadingContract] = useState(false);
  const [contractSection, setContractSection] = useState<'ALL' | 'SOLICITUD' | 'LIQUIDACION' | 'CONTRATO' | 'CRONOGRAMA'>('ALL');

  // Comerciantes para selector
  const [merchants, setMerchants] = useState<any[]>([]);

  // Form préstamo
  const [loanForm, setLoanForm] = useState({
    merchantId: '',
    borrowerName: '',
    borrowerDni: '',
    amount: 500,
    termMonths: 2,
    interestRate: 5,
    notes: '',
  });

  // Form cobranza
  const [collectionForm, setCollectionForm] = useState({
    loanId: '',
    description: 'Cuota 1 de amortización',
    principalAmount: 250,
    interestAmount: 25,
    paymentMethod: 'EFECTIVO',
    receiptNumber: '',
  });

  // Ticket de cobranza para imprimir
  const [printReceiptData, setPrintReceiptData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [loansRes, collectionsRes, merchantsRes] = await Promise.all([
        apiRequest('/revolving-fund/loans'),
        apiRequest('/revolving-fund/collections'),
        apiRequest('/merchants'),
      ]);
      setLoans(loansRes || []);
      setCollections(collectionsRes || []);
      setMerchants(merchantsRes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectMerchant = (merchantId: string) => {
    const match = merchants.find((m) => m.id === merchantId);
    if (match) {
      setLoanForm((prev) => ({
        ...prev,
        merchantId,
        borrowerName: `${match.lastName}, ${match.firstName}`,
        borrowerDni: match.dni,
      }));
    } else {
      setLoanForm((prev) => ({
        ...prev,
        merchantId: '',
        borrowerName: '',
        borrowerDni: '',
      }));
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/revolving-fund/loans', {
        method: 'POST',
        body: JSON.stringify(loanForm),
      });
      alert('✓ Préstamo de Fondo Rotatorio registrado con éxito');
      setIsLoanModalOpen(false);
      fetchData();
      if (res?.id) {
        viewLoanContract(res.id);
      }
    } catch (e: any) {
      alert(e.message || 'Error al registrar préstamo');
    }
  };

  const viewLoanContract = async (loanId: string) => {
    try {
      setLoadingContract(true);
      const data = await apiRequest(`/revolving-fund/loans/${loanId}/contract`);
      setContractData(data);
    } catch (e: any) {
      alert(e.message || 'Error al cargar contrato de préstamo');
    } finally {
      setLoadingContract(false);
    }
  };

  const handlePrintLoanContract = () => {
    if (!contractData) return;
    const printWindow = window.open('', '_blank', 'width=880,height=1100');
    if (!printWindow) {
      alert('Por favor permita las ventanas emergentes en su navegador para imprimir');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Contrato y Cronograma Oficial Fondo Rotatorio - ${contractData.orderNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 18mm 20mm;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #111;
              line-height: 1.4;
              font-size: 10pt;
              margin: 0;
              padding: 0;
            }
            .page-container {
              page-break-after: always;
              min-height: 96vh;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding-bottom: 20px;
            }
            .page-container:last-child {
              page-break-after: auto;
            }
            .table-custom {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-size: 9pt;
            }
            .table-custom th, .table-custom td {
              border: 1px solid #333;
              padding: 5px 8px;
              text-align: left;
            }
            .table-custom th {
              background-color: #f1f5f9;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 8.5pt;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-justify { text-align: justify; }
            .uppercase { text-transform: uppercase; }
          </style>
        </head>
        <body>
          <!-- SECCIÓN 1: SOLICITO: PRÉSTAMO DEL FONDO ROTATORIO -->
          <div class="page-container">
            <div>
              <div style="text-align: right; font-weight: bold; font-size: 11pt; margin-bottom: 30px;">
                SOLICITO: PRÉSTAMO DEL FONDO ROTATORIO<br>
                <span style="font-weight: normal; font-size: 10pt;">La suma de s/ ${contractData.loanDetails?.principalAmount} Soles</span>
              </div>

              <div style="margin-bottom: 24px; font-size: 10.5pt; line-height: 1.5;">
                <b>Señor:</b><br>
                Presidente de la Asociación de Pequeños Comerciantes del Mercado de Abastos “MICAELA BASTIDAS” de “J.P.V” El Tambo – Huancayo
              </div>

              <div class="text-justify" style="font-size: 10.5pt; line-height: 1.8; margin-bottom: 20px;">
                Yo, <b>${contractData.borrower?.name}</b>, identificada(o) con DNI Nº <b>${contractData.borrower?.dni}</b> Domiciliada(o) en <b>${contractData.borrower?.address}</b>, me presento ante Ud. Respetuosamente expongo y digo:
              </div>

              <div class="text-justify" style="font-size: 10.5pt; line-height: 1.8; margin-bottom: 20px;">
                Mediante el presente documento, solicito a Ud. Se me otorgue un préstamo de <b>s/ ${contractData.loanDetails?.principalAmount} (${contractData.loanDetails?.principalInWords} Soles)</b>.
              </div>

              <div class="text-justify" style="font-size: 10.5pt; line-height: 1.8; margin-bottom: 30px;">
                Lo cual permitirá incrementar mi capital de trabajo, al mismo tiempo me comprometo a cumplir con la devolución del monto prestado de acuerdo al reglamento del Fondo Rotatorio.
              </div>

              <div style="text-align: right; font-size: 10.5pt; margin-bottom: 40px;">
                El Tambo, ${contractData.dateFormatted || contractData.date}
              </div>

              <div style="width: 65%; margin-left: auto; margin-bottom: 40px; font-size: 10pt;">
                <p style="margin: 4px 0;">Firma: ............................................................................</p>
                <p style="margin: 4px 0;">Apellidos y Nombres: <b>${contractData.borrower?.name}</b></p>
                <p style="margin: 4px 0;">DNI Nº: <b>${contractData.borrower?.dni}</b></p>
              </div>
            </div>

            <div style="border: 1px dashed #333; padding: 16px; background-color: #fafafa; margin-top: 30px;">
              <p style="margin: 0 0 45px 0; font-size: 9.5pt;">
                <b>OBSERVACIÓN:</b> Se aprobó la solicitud de préstamo por el Presidente para la cual la persona encargada otorga el debido préstamo.
              </p>
              <div style="text-align: center; border-top: 1px solid #000; width: 60%; margin: 0 auto; padding-top: 6px; font-size: 9pt;">
                <b>PRESIDENTE DE LA APCOMA - “M.B”</b>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 2: DOCUMENTO DE COMPROMISO Y COMPROBANTE DE LIQUIDACIÓN -->
          <div class="page-container">
            <div>
              <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 14px;">
                <h2 style="margin: 0; font-size: 12pt; font-weight: 900; text-transform: uppercase;">
                  DOCUMENTO DE COMPROMISO Y COMPROBANTE DE LIQUIDACIÓN
                </h2>
                <p style="margin: 2px 0 0 0; font-size: 8.5pt; color: #555;">APCOMA - “M.B” • MERCADO DE ABASTOS MICAELA BASTIDAS</p>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9.5pt; margin-bottom: 14px; background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 14px;">
                <div><b>APELLIDOS DEL SOLICITANTE:</b> ${contractData.borrower?.lastName || contractData.borrower?.name}</div>
                <div><b>NOMBRES DEL SOLICITANTE:</b> ${contractData.borrower?.firstName || ''}</div>
                <div><b>DOCUMENTO DE IDENTIDAD:</b> ${contractData.borrower?.dni}</div>
                <div><b>GIRO:</b> ${contractData.borrower?.businessCategory || 'ABARROTES'}</div>
                <div style="grid-column: span 2;"><b>DIRECCIÓN:</b> ${contractData.borrower?.address}</div>
              </div>

              <div style="font-weight: bold; font-size: 10pt; text-transform: uppercase; margin-bottom: 4px; border-bottom: 1px solid #333; padding-bottom: 2px;">
                DEL PRÉSTAMO
              </div>
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>MONTO SOLICITADO</th>
                    <th>INTERES ${contractData.loanDetails?.interestRateMonthly}%</th>
                    <th>MONTO TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="font-weight: bold; font-size: 11pt;">S/. ${contractData.loanDetails?.principalAmount}</td>
                    <td>
                      ${(Number(contractData.loanDetails?.interestRateMonthly || 0) / 100).toFixed(2)} C/M = S/ ${contractData.loanDetails?.monthlyInterestAmount}<br>
                      <b>${contractData.loanDetails?.termMonths} MESES = S/ ${contractData.loanDetails?.totalInterest}</b>
                    </td>
                    <td style="font-weight: 900; font-size: 11pt; color: #065f46;">S/. ${contractData.loanDetails?.totalAmountToPay}</td>
                  </tr>
                </tbody>
              </table>

              <div style="font-weight: bold; font-size: 10pt; text-transform: uppercase; margin-top: 14px; margin-bottom: 4px; border-bottom: 1px solid #333; padding-bottom: 2px;">
                DE LA DEVOLUCIÓN DEL PRÉSTAMO
              </div>
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>N° DE CUOTAS</th>
                    <th class="text-center">CUOTAS DIARIAS</th>
                    <th class="text-center">CUOTAS SEMANALES</th>
                    <th>CUOTAS MENSUALES</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>PAGOS EN:</b></td>
                    <td class="text-center">-</td>
                    <td class="text-center">-</td>
                    <td><b>${contractData.loanDetails?.termMonths} MESES</b></td>
                  </tr>
                  <tr>
                    <td><b>MONTO A PAGAR POR CUOTA</b></td>
                    <td class="text-center">-</td>
                    <td class="text-center">-</td>
                    <td style="font-weight: bold;">S/ ${contractData.loanDetails?.monthlyQuota}</td>
                  </tr>
                  <tr>
                    <td><b>FECHA DE PRÉSTAMO</b></td>
                    <td class="text-center">-</td>
                    <td class="text-center">-</td>
                    <td>${contractData.loanDetails?.startDateSlash}</td>
                  </tr>
                  <tr>
                    <td><b>FECHA DE 1° CUOTA</b></td>
                    <td class="text-center">-</td>
                    <td class="text-center">-</td>
                    <td>${contractData.loanDetails?.firstDueDateSlash}</td>
                  </tr>
                </tbody>
              </table>

              <div class="text-justify" style="font-size: 9.5pt; line-height: 1.5; margin: 20px 0;">
                Declaro haber sido informado previamente sobre este préstamo y el sistema de pagos asimismo me sujeto a los reglamentos de otorgamiento del préstamo aprobado por ambas partes.
              </div>
            </div>

            <div style="margin-top: 40px; display: flex; justify-content: space-between; text-align: center;">
              <div style="width: 45%; border-top: 1px solid #000; padding-top: 6px;">
                <p style="margin: 2px 0; font-weight: bold; font-size: 9pt;">PRESIDENTE DE LA APCOMA-MB</p>
                <p style="margin: 2px 0; font-size: 8pt; color: #555;">Representante Legal</p>
              </div>
              <div style="width: 45%; border-top: 1px solid #000; padding-top: 6px;">
                <p style="margin: 2px 0; font-weight: bold; font-size: 9pt;">BENEFICIARIO</p>
                <p style="margin: 2px 0; font-size: 8.5pt;">${contractData.borrower?.name}</p>
                <p style="margin: 2px 0; font-size: 8pt; color: #555;">DNI Nº: ${contractData.borrower?.dni}</p>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 3: CONTRATO DE COMPROMISO DE PAGO (9 CLÁUSULAS OFICIALES) -->
          <div class="page-container">
            <div>
              <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px;">
                <h2 style="margin: 0; font-size: 12pt; font-weight: 900; text-transform: uppercase;">
                  CONTRATO DE COMPROMISO DE PAGO
                </h2>
                <p style="margin: 2px 0 0 0; font-size: 8.5pt; color: #555;">ASOCIACIÓN DE PEQUEÑOS COMERCIANTES DEL MERCADO DE ABASTOS “MICAELA BASTIDAS” APCOMA-MB</p>
              </div>

              <div class="text-justify" style="font-size: 8.5pt; line-height: 1.4; margin-bottom: 10px;">
                Conste con el presente documento, el contrato de mutuo acuerdo que celebra de una parte la Asociación de Pequeños Comerciantes del Mercado de Abastos “MICAELA BASTIDAS” APCOMA-MB, a quien en adelante se le denominara <b>LA ASOCIACIÓN</b>; representada por su presidente <b>${contractData.president?.name || 'GARCIA COCA FREDDY'}</b> identificada con <b>DNI N° ${contractData.president?.dni || '20122038'}</b> Y otra parte Don(ña) <b>${contractData.borrower?.name}</b> con <b>DNI Nº ${contractData.borrower?.dni}</b> Quien en adelante se denominara <b>BENEFICIARIO (RA)</b>, contrato que celebran en los términos y condiciones siguientes:
              </div>

              <div class="text-justify" style="font-size: 8pt; line-height: 1.35;">
                ${(contractData.clauses || []).map((c: string) => {
                  const parts = c.split(':');
                  return `<div style="margin-bottom: 6px;"><b>${parts[0]}:</b>${parts.slice(1).join(':')}</div>`;
                }).join('')}
              </div>

              <div style="font-size: 8.5pt; margin: 10px 0; text-align: right;">
                En señal de conformidad a la presente firman a los ${contractData.day} días del mes de ${contractData.monthName} del año ${contractData.year}.
              </div>
            </div>

            <div style="margin-top: 30px; display: flex; justify-content: space-between; text-align: center;">
              <div style="width: 31%; border-top: 1px solid #000; padding-top: 4px; font-size: 8pt;">
                <p style="margin: 2px 0; font-weight: bold;">PRESIDENTE DE LA APCOMA-“MB”</p>
                <p style="margin: 2px 0; font-size: 7.5pt; color: #555;">Representante Legal</p>
              </div>
              <div style="width: 31%; border-top: 1px solid #000; padding-top: 4px; font-size: 8pt;">
                <p style="margin: 2px 0; font-weight: bold;">ENCARGADO(A) FONDO ROTATORIO</p>
                <p style="margin: 2px 0; font-size: 7.5pt; color: #555;">APCOMA “M.B”</p>
              </div>
              <div style="width: 31%; border-top: 1px solid #000; padding-top: 4px; font-size: 8pt;">
                <p style="margin: 2px 0; font-weight: bold;">BENEFICIARIO</p>
                <p style="margin: 2px 0; font-size: 8pt;">${contractData.borrower?.name}</p>
                <p style="margin: 2px 0; font-size: 7.5pt; color: #555;">DNI Nº ${contractData.borrower?.dni}</p>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 4: CRONOGRAMA OFICIAL DE PAGOS (CP) & FICHA TÉCNICA -->
          <div class="page-container">
            <div>
              <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px;">
                <h2 style="margin: 0; font-size: 12pt; font-weight: 900; text-transform: uppercase;">
                  CRONOGRAMA DE PAGOS
                </h2>
                <p style="margin: 2px 0 0 0; font-size: 8.5pt; color: #555;">APCOMA - “M.B” • OPERACIÓN: ${contractData.orderNumber}</p>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 8.5pt; margin-bottom: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px;">
                <div><b>NOMBRE:</b> ${contractData.borrower?.name}</div>
                <div><b>FECHA DESEMBOLSO:</b> ${contractData.loanDetails?.startDateSlash}</div>
                <div><b>DESEMBOLSO:</b> S/ ${contractData.loanDetails?.principalAmount} (${contractData.loanDetails?.principalInWords})</div>
                <div><b>TASA DE INTERÉS:</b> ${contractData.loanDetails?.interestRateMonthly}% Mensual</div>
                <div><b>MODALIDAD DE PAGO:</b> MENSUAL</div>
                <div><b>Nº DE CUOTAS:</b> ${contractData.loanDetails?.termMonths}</div>
                <div style="grid-column: span 2;"><b>TOTAL INTERÉS COMPENSATORIO:</b> S/ ${contractData.loanDetails?.totalInterest}</div>
              </div>

              <table class="table-custom">
                <thead>
                  <tr>
                    <th class="text-center">N° DE CUOTA</th>
                    <th>FECHA VENCIMIENTO</th>
                    <th class="text-right">CAPITAL AMORTIZADO</th>
                    <th class="text-right">INTERÉS COMPENSATORIO</th>
                    <th class="text-right">CUOTA TOTAL</th>
                    <th class="text-center">ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  ${(contractData.schedule || []).map((row: any) => `
                    <tr>
                      <td class="text-center font-bold">${row.installmentNumber}</td>
                      <td>${row.dueDateSlash || row.dueDate}</td>
                      <td class="text-right">S/ ${row.principalAmount}</td>
                      <td class="text-right">S/ ${row.interestAmount}</td>
                      <td class="text-right font-bold">S/ ${row.totalInstallment}</td>
                      <td class="text-center font-bold" style="font-size: 8pt;">${row.status}</td>
                    </tr>
                  `).join('')}
                  <tr style="background-color: #f1f5f9; font-weight: bold;">
                    <td colspan="2" class="text-center">TOTALES</td>
                    <td class="text-right">S/ ${contractData.loanDetails?.principalAmount}</td>
                    <td class="text-right">S/ ${contractData.loanDetails?.totalInterest}</td>
                    <td class="text-right" style="color: #065f46;">S/ ${contractData.loanDetails?.totalAmountToPay}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              <div style="margin-top: 25px; display: flex; justify-content: space-between; text-align: center;">
                <div style="width: 31%; border-top: 1px solid #000; padding-top: 4px; font-size: 8pt;">
                  <b>PRESIDENTE DE LA APCOMA-"MB"</b>
                </div>
                <div style="width: 31%; border-top: 1px solid #000; padding-top: 4px; font-size: 8pt;">
                  <b>TESORERA ENCARGADA FONDO ROTATORIO</b>
                </div>
                <div style="width: 31%; border-top: 1px solid #000; padding-top: 4px; font-size: 8pt;">
                  <b>BENEFICIARIO: ${contractData.borrower?.name}</b><br>
                  <span style="font-size: 7.5pt; color: #555;">DNI Nº ${contractData.borrower?.dni}</span>
                </div>
              </div>
            </div>

            <div style="margin-top: 20px; border-top: 2px dashed #999; padding-top: 10px;">
              <div style="font-size: 9pt; font-weight: bold; margin-bottom: 6px; text-transform: uppercase;">
                PRESTAMO Nº ${contractData.orderNumber} • CRONOGRAMA DE PAGO (CP) FONDO ROTATORIO
              </div>
              <table class="table-custom" style="font-size: 8pt; margin: 0;">
                <tr>
                  <td><b>DATOS DEL CLIENTE:</b></td>
                  <td>${contractData.borrower?.name}</td>
                  <td><b>Tel. o Cel.:</b> ${contractData.borrower?.phone}</td>
                  <td><b>DNI:</b> ${contractData.borrower?.dni}</td>
                </tr>
                <tr>
                  <td><b>DIRECCIÓN:</b></td>
                  <td colspan="3">${contractData.borrower?.address}</td>
                </tr>
                <tr>
                  <td><b>FIADOR O GARANTE:</b></td>
                  <td>Socio del Mercado</td>
                  <td colspan="2"><b>Puesto Comercial:</b> ${contractData.borrower?.stallCode}</td>
                </tr>
                <tr>
                  <td><b>MONTO DE PRÉSTAMO:</b></td>
                  <td>S/ ${contractData.loanDetails?.principalAmount} (${contractData.loanDetails?.principalInWords})</td>
                  <td colspan="2"><b>Interés:</b> ${contractData.loanDetails?.interestRateMonthly}% Mensual</td>
                </tr>
                <tr>
                  <td><b>PLAZO:</b></td>
                  <td>${contractData.loanDetails?.termMonths} MESES (${contractData.year} año)</td>
                  <td><b>COD. USUARIO:</b> ${contractData.borrower?.internalCode}</td>
                  <td><b>FECHA DE CANCELO:</b> ${contractData.loanDetails?.endDateSlash}</td>
                </tr>
              </table>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleSelectLoanForCollection = (loanId: string, quotaNumber?: number) => {
    const l = loans.find((item) => item.id === loanId);
    if (!l) {
      setCollectionForm((prev) => ({ ...prev, loanId: '' }));
      return;
    }
    const months = Number(l.termMonths) || 1;
    const principal = Number(l.amount);
    const rate = Number(l.interestRate || 0);
    const monthlyPrincipal = Number((principal / months).toFixed(2));
    const monthlyInterest = Number(((principal * rate) / 100).toFixed(2));
    const paidCount = (l.collections || []).length;
    const qNum = quotaNumber || Math.min(months, paidCount + 1);

    setCollectionForm({
      loanId: l.id,
      description: `Cuota ${qNum} de ${months} - Amortización Fondo Rotatorio`,
      principalAmount: monthlyPrincipal,
      interestAmount: monthlyInterest,
      paymentMethod: 'EFECTIVO',
      receiptNumber: `VCH-FR-${Date.now().toString().slice(-6)}`,
    });
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/revolving-fund/collections', {
        method: 'POST',
        body: JSON.stringify(collectionForm),
      });
      alert('✓ Cobranza registrada exitosamente e ingresada a Caja');
      setIsCollectionModalOpen(false);
      setPrintReceiptData(res);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Error al registrar cobranza');
    }
  };

  // KPIs
  const totalLent = loans.reduce((acc, l) => acc + Number(l.amount || 0), 0);
  const totalCollected = collections.reduce((acc, c) => acc + Number(c.totalAmount || 0), 0);
  const totalInterests = collections.reduce((acc, c) => acc + Number(c.interestAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Administración de Fondo Rotatorio</h1>
          <p className="text-xs text-slate-500">
            Microcréditos solidarios a comerciantes del mercado, control de colocaciones, amortizaciones e intereses.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsLoanModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow transition flex items-center space-x-1.5"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Nuevo Préstamo</span>
          </button>

          <button
            onClick={() => setIsCollectionModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow transition flex items-center space-x-1.5"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Registrar Cobranza</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Colocado en Préstamos</span>
          <p className="text-2xl font-black text-indigo-700 font-mono mt-1">S/ {totalLent.toFixed(2)}</p>
          <span className="text-xs text-slate-400">{loans.length} colocaciones</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Recuperado (Cobranzas)</span>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-1">S/ {totalCollected.toFixed(2)}</p>
          <span className="text-xs text-slate-400">{collections.length} amortizaciones</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400">Intereses Ganados</span>
          <p className="text-2xl font-black text-amber-600 font-mono mt-1">S/ {totalInterests.toFixed(2)}</p>
          <span className="text-xs text-slate-400">Rendimiento financiero</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('PRESTAMOS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'PRESTAMOS' ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HandCoins className="w-4 h-4" />
          <span>1. Préstamos ({loans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('COBRANZAS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'COBRANZAS' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>2. Cobranzas ({collections.length})</span>
        </button>
      </div>

      {/* Table Content */}
      {activeTab === 'PRESTAMOS' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">N° de Orden</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Nombre y Apellido</th>
                  <th className="p-3">DNI</th>
                  <th className="p-3">Plazo</th>
                  <th className="p-3">Monto (Capital)</th>
                  <th className="p-3">Total con Interés</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">No hay préstamos registrados</td>
                  </tr>
                ) : (
                  loans.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-indigo-700">{l.orderNumber}</td>
                      <td className="p-3 text-slate-600">{new Date(l.date).toLocaleDateString()}</td>
                      <td className="p-3 font-bold text-slate-900">{l.borrowerName}</td>
                      <td className="p-3 font-mono text-slate-600">{l.borrowerDni}</td>
                      <td className="p-3 text-slate-700">
                        <span className="font-semibold block">{l.termMonths} meses ({l.interestRate}%)</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {(l.collections || []).length}/{l.termMonths} cuotas
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">S/ {Number(l.amount).toFixed(2)}</td>
                      <td className="p-3 font-mono font-bold text-indigo-800">S/ {Number(l.totalAmount).toFixed(2)}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            l.status === 'CANCELADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.status === 'MOROSO'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => viewLoanContract(l.id)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition"
                            title="Ver Contrato y Cronograma de Amortización"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Contrato</span>
                          </button>
                          {l.status !== 'CANCELADO' && (
                            <button
                              onClick={() => {
                                handleSelectLoanForCollection(l.id);
                                setIsCollectionModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition"
                              title="Cobrar Cuota según Cronograma"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Cobrar Cuota</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'COBRANZAS' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">N° de Orden</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Nombre y Apellido</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3">Capital</th>
                  <th className="p-3">Interés</th>
                  <th className="p-3">Total Cobrado</th>
                  <th className="p-3">Préstamo Ref.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collections.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">No hay cobranzas registradas</td>
                  </tr>
                ) : (
                  collections.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-emerald-700">{c.orderNumber}</td>
                      <td className="p-3 text-slate-600">{new Date(c.date).toLocaleDateString()}</td>
                      <td className="p-3 font-bold text-slate-900">{c.borrowerName}</td>
                      <td className="p-3 text-slate-600">{c.description}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">S/ {Number(c.principalAmount).toFixed(2)}</td>
                      <td className="p-3 font-mono font-bold text-amber-600">S/ {Number(c.interestAmount).toFixed(2)}</td>
                      <td className="p-3 font-mono font-black text-emerald-800">S/ {Number(c.totalAmount).toFixed(2)}</td>
                      <td className="p-3 font-mono text-slate-500">{c.loan?.orderNumber || 'N/D'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nuevo Préstamo */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <h2 className="text-lg font-black text-slate-800 uppercase mb-4">Registrar Préstamo de Fondo Rotatorio</h2>

            <form onSubmit={handleCreateLoan} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Seleccionar Socio / Comerciante</label>
                <select
                  value={loanForm.merchantId}
                  onChange={(e) => handleSelectMerchant(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Ingresar Manualmente --</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.lastName}, {m.firstName} ({m.dni})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre y Apellido *</label>
                  <input
                    type="text"
                    required
                    value={loanForm.borrowerName}
                    onChange={(e) => setLoanForm({ ...loanForm, borrowerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">DNI *</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={loanForm.borrowerDni}
                    onChange={(e) => setLoanForm({ ...loanForm, borrowerDni: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Monto (S/) *</label>
                  <input
                    type="number"
                    step="10"
                    required
                    value={loanForm.amount}
                    onChange={(e) => setLoanForm({ ...loanForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-indigo-700 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Plazo (Meses)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={loanForm.termMonths}
                    onChange={(e) => setLoanForm({ ...loanForm, termMonths: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Interés (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={loanForm.interestRate}
                    onChange={(e) => setLoanForm({ ...loanForm, interestRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-amber-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Observaciones / Destino</label>
                <textarea
                  rows={2}
                  placeholder="Compra de mercadería, capital de trabajo, etc."
                  value={loanForm.notes}
                  onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow"
                >
                  Otorgar Préstamo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Cobranza */}
      {isCollectionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <h2 className="text-lg font-black text-slate-800 uppercase mb-4">Registrar Cobranza / Amortización</h2>

            <form onSubmit={handleCreateCollection} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Préstamo a Amortizar *</label>
                <select
                  required
                  value={collectionForm.loanId}
                  onChange={(e) => handleSelectLoanForCollection(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Seleccionar Préstamo --</option>
                  {loans
                    .filter((l) => l.status !== 'CANCELADO')
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.orderNumber} - {l.borrowerName} (Capital: S/ {l.amount} | Total: S/ {l.totalAmount})
                      </option>
                    ))}
                </select>
              </div>

              {/* Selector de Cuota rápida si hay préstamo seleccionado */}
              {collectionForm.loanId && (() => {
                const selLoan = loans.find((l) => l.id === collectionForm.loanId);
                if (!selLoan) return null;
                const totalMonths = Number(selLoan.termMonths) || 1;
                const paidCount = (selLoan.collections || []).length;
                return (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-700">Seleccionar Cuota del Cronograma:</span>
                      <span className="text-emerald-700 font-bold font-mono">{paidCount}/{totalMonths} Pagadas</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: totalMonths }, (_, i) => i + 1).map((qNum) => {
                        const isAlreadyPaid = qNum <= paidCount;
                        const isCurrent = collectionForm.description.includes(`Cuota ${qNum} `);
                        return (
                          <button
                            key={qNum}
                            type="button"
                            onClick={() => handleSelectLoanForCollection(selLoan.id, qNum)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                              isCurrent
                                ? 'bg-indigo-600 text-white shadow'
                                : isAlreadyPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            Cuota {qNum} {isAlreadyPaid ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Descripción de la Cuota *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Amortización Cuota 1"
                  value={collectionForm.description}
                  onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Abono Capital (S/) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={collectionForm.principalAmount}
                    onChange={(e) => setCollectionForm({ ...collectionForm, principalAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Interés (S/) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={collectionForm.interestAmount}
                    onChange={(e) => setCollectionForm({ ...collectionForm, interestAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-amber-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                <span className="font-bold text-emerald-900">Total a Cobrar:</span>
                <span className="text-base font-black text-emerald-800 font-mono">
                  S/ {(Number(collectionForm.principalAmount) + Number(collectionForm.interestAmount)).toFixed(2)}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCollectionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow"
                >
                  Registrar Cobranza
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket de Cobranza Imprimible POS */}
      {printReceiptData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <FileCheck2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-800 uppercase">Cobranza Registrada</h3>
              <p className="text-xs text-slate-500 font-mono">{printReceiptData.orderNumber}</p>
            </div>

            <div className="border-t border-b border-dashed border-slate-200 py-3 text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Titular:</span>
                <span className="font-bold text-slate-800">{printReceiptData.borrowerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Concepto:</span>
                <span className="text-slate-700">{printReceiptData.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Capital:</span>
                <span className="font-mono font-bold">S/ {Number(printReceiptData.principalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Interés:</span>
                <span className="font-mono font-bold text-amber-600">S/ {Number(printReceiptData.interestAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100 font-black text-sm">
                <span>TOTAL:</span>
                <span className="text-emerald-700 font-mono">S/ {Number(printReceiptData.totalAmount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setPrintReceiptData(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Contrato y Cronograma de Amortización Oficial */}
      {contractData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-4xl shadow-2xl border border-slate-100 my-8">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">
                    Expediente Oficial de Fondo Rotatorio
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Operación: <span className="font-bold text-slate-700">{contractData.orderNumber}</span> • {contractData.associationShort}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setContractData(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center text-sm font-black transition"
              >
                ✕
              </button>
            </div>

            {/* Pestañas de Navegación de Secciones Oficiales */}
            <div className="flex flex-wrap gap-2 mt-4 pb-2 border-b border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setContractSection('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  contractSection === 'ALL'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                📄 Todo el Documento
              </button>
              <button
                type="button"
                onClick={() => setContractSection('SOLICITUD')}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  contractSection === 'SOLICITUD'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                1. Solicitud de Préstamo
              </button>
              <button
                type="button"
                onClick={() => setContractSection('LIQUIDACION')}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  contractSection === 'LIQUIDACION'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                2. Ficha de Liquidación
              </button>
              <button
                type="button"
                onClick={() => setContractSection('CONTRATO')}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  contractSection === 'CONTRATO'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                3. Contrato (9 Cláusulas)
              </button>
              <button
                type="button"
                onClick={() => setContractSection('CRONOGRAMA')}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  contractSection === 'CRONOGRAMA'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                4. Cronograma & Ficha CP
              </button>
            </div>

            {/* Document Viewer Container */}
            <div className="mt-4 p-6 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-8 font-sans max-h-[62vh] overflow-y-auto">
              {/* SECCIÓN 1: SOLICITUD */}
              {(contractSection === 'ALL' || contractSection === 'SOLICITUD') && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="text-right font-bold text-slate-800 border-b pb-2">
                    <p className="uppercase text-[11px] tracking-wide text-indigo-900 font-black">SOLICITO: PRÉSTAMO DEL FONDO ROTATORIO</p>
                    <p className="text-xs text-slate-600 font-normal">La suma de S/ {contractData.loanDetails?.principalAmount} Soles</p>
                  </div>

                  <div className="text-slate-800 leading-relaxed space-y-2 text-xs">
                    <p className="font-bold">
                      Señor:<br />
                      <span className="font-normal text-slate-600">Presidente de la Asociación de Pequeños Comerciantes del Mercado de Abastos “MICAELA BASTIDAS” de “J.P.V” El Tambo – Huancayo</span>
                    </p>
                    <p className="text-justify pt-2">
                      Yo, <b className="text-slate-900">{contractData.borrower?.name}</b>, identificada(o) con DNI Nº <b className="font-mono">{contractData.borrower?.dni}</b> Domiciliada(o) en <b className="text-slate-900">{contractData.borrower?.address}</b>, me presento ante Ud. Respetuosamente expongo y digo:
                    </p>
                    <p className="text-justify">
                      Mediante el presente documento, solicito a Ud. Se me otorgue un préstamo de <b className="text-indigo-800">S/ {contractData.loanDetails?.principalAmount} ({contractData.loanDetails?.principalInWords} Soles)</b>.
                    </p>
                    <p className="text-justify text-slate-600">
                      Lo cual permitirá incrementar mi capital de trabajo, al mismo tiempo me comprometo a cumplir con la devolución del monto prestado de acuerdo al reglamento del Fondo Rotatorio.
                    </p>
                    <div className="text-right pt-2 font-medium text-slate-500">
                      El Tambo, {contractData.dateFormatted || contractData.date}
                    </div>
                  </div>

                  {/* Firmas Solicitud */}
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] max-w-sm">
                      <p className="font-bold text-amber-900 mb-1">OBSERVACIÓN:</p>
                      <p className="text-amber-800 leading-snug">Se aprobó la solicitud de préstamo por el Presidente para la cual la persona encargada otorga el debido préstamo.</p>
                      <p className="text-center font-bold text-slate-700 mt-3 pt-2 border-t border-amber-300">PRESIDENTE DE LA APCOMA - “M.B”</p>
                    </div>
                    <div className="text-center w-64 pt-6 border-t border-slate-400">
                      <p className="font-black text-slate-800">{contractData.borrower?.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">DNI Nº: {contractData.borrower?.dni}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Firma del Solicitante</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN 2: FICHA DE LIQUIDACIÓN */}
              {(contractSection === 'ALL' || contractSection === 'LIQUIDACION') && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="text-center border-b pb-3">
                    <h3 className="font-black text-slate-900 text-sm tracking-wide uppercase">DOCUMENTO DE COMPROMISO Y COMPROBANTE DE LIQUIDACIÓN</h3>
                    <p className="text-[10px] text-slate-500 font-mono">APCOMA - “M.B” • MERCADO DE ABASTOS MICAELA BASTIDAS</p>
                  </div>

                  {/* Datos del solicitante */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div><span className="font-bold text-slate-500">APELLIDOS:</span> <span className="font-bold text-slate-800">{contractData.borrower?.lastName || contractData.borrower?.name}</span></div>
                    <div><span className="font-bold text-slate-500">NOMBRES:</span> <span className="font-bold text-slate-800">{contractData.borrower?.firstName || '-'}</span></div>
                    <div><span className="font-bold text-slate-500">DNI:</span> <span className="font-mono text-slate-800">{contractData.borrower?.dni}</span></div>
                    <div><span className="font-bold text-slate-500">GIRO:</span> <span className="font-bold text-indigo-700">{contractData.borrower?.businessCategory}</span></div>
                    <div className="col-span-2"><span className="font-bold text-slate-500">DIRECCIÓN:</span> <span className="text-slate-700">{contractData.borrower?.address}</span></div>
                  </div>

                  {/* Tabla 1: Del Préstamo */}
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-[11px] mb-1">DEL PRÉSTAMO</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 font-bold text-slate-700">
                          <tr>
                            <th className="p-2 text-left">MONTO SOLICITADO</th>
                            <th className="p-2 text-left">INTERÉS {contractData.loanDetails?.interestRateMonthly}%</th>
                            <th className="p-2 text-right">MONTO TOTAL A PAGAR</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-slate-100">
                            <td className="p-2 font-bold font-mono text-slate-900">S/ {contractData.loanDetails?.principalAmount}</td>
                            <td className="p-2 text-slate-600">
                              {(Number(contractData.loanDetails?.interestRateMonthly || 0) / 100).toFixed(2)} c/m = S/ {contractData.loanDetails?.monthlyInterestAmount}<br />
                              <b className="text-slate-800">{contractData.loanDetails?.termMonths} meses = S/ {contractData.loanDetails?.totalInterest}</b>
                            </td>
                            <td className="p-2 text-right font-black font-mono text-emerald-800 text-sm">S/ {contractData.loanDetails?.totalAmountToPay}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tabla 2: De la Devolución */}
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-[11px] mb-1">DE LA DEVOLUCIÓN DEL PRÉSTAMO</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 font-bold text-slate-700">
                          <tr>
                            <th className="p-2 text-left">N° DE CUOTAS</th>
                            <th className="p-2 text-center">CUOTAS DIARIAS</th>
                            <th className="p-2 text-center">CUOTAS SEMANALES</th>
                            <th className="p-2 text-right">CUOTAS MENSUALES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="p-2 font-bold text-slate-700">PAGOS EN:</td>
                            <td className="p-2 text-center text-slate-400">-</td>
                            <td className="p-2 text-center text-slate-400">-</td>
                            <td className="p-2 text-right font-bold text-indigo-700">{contractData.loanDetails?.termMonths} MESES</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold text-slate-700">MONTO A PAGAR POR CUOTA:</td>
                            <td className="p-2 text-center text-slate-400">-</td>
                            <td className="p-2 text-center text-slate-400">-</td>
                            <td className="p-2 text-right font-black font-mono text-slate-900">S/ {contractData.loanDetails?.monthlyQuota}</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold text-slate-700">FECHA DE PRÉSTAMO:</td>
                            <td className="p-2 text-center text-slate-400">-</td>
                            <td className="p-2 text-center text-slate-400">-</td>
                            <td className="p-2 text-right font-mono text-slate-600">{contractData.loanDetails?.startDateSlash}</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold text-slate-700">FECHA DE 1° CUOTA:</td>
                            <td className="p-2 text-center text-slate-400">-</td>
                            <td className="p-2 text-center text-slate-400">-</td>
                            <td className="p-2 text-right font-mono text-slate-600">{contractData.loanDetails?.firstDueDateSlash}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-justify text-[11px] text-slate-500 italic pt-1">
                    Declaro haber sido informado previamente sobre este préstamo y el sistema de pagos asimismo me sujeto a los reglamentos de otorgamiento del préstamo aprobado por ambas partes.
                  </p>

                  <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                    <div className="border-t border-slate-400 pt-2">
                      <p className="font-black text-slate-800">PRESIDENTE DE LA APCOMA-MB</p>
                      <p className="text-[10px] text-slate-400">Representante Legal</p>
                    </div>
                    <div className="border-t border-slate-400 pt-2">
                      <p className="font-black text-slate-800">{contractData.borrower?.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">DNI Nº: {contractData.borrower?.dni}</p>
                      <p className="text-[10px] text-slate-400">BENEFICIARIO</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN 3: CONTRATO (9 CLÁUSULAS OFICIALES) */}
              {(contractSection === 'ALL' || contractSection === 'CONTRATO') && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="text-center border-b pb-3">
                    <h3 className="font-black text-slate-900 text-sm tracking-wide uppercase">CONTRATO DE COMPROMISO DE PAGO</h3>
                    <p className="text-[10px] text-slate-500">ASOCIACIÓN DE PEQUEÑOS COMERCIANTES DEL MERCADO DE ABASTOS “MICAELA BASTIDAS” APCOMA-MB</p>
                  </div>

                  <p className="text-justify text-xs leading-relaxed text-slate-700">
                    Conste con el presente documento, el contrato de mutuo acuerdo que celebra de una parte la Asociación de Pequeños Comerciantes del Mercado de Abastos “MICAELA BASTIDAS” APCOMA-MB, a quien en adelante se le denominara <b>LA ASOCIACIÓN</b>; representada por su presidente <b>{contractData.president?.name || 'GARCIA COCA FREDDY'}</b> identificada con <b>DNI N° {contractData.president?.dni || '20122038'}</b> Y otra parte Don(ña) <b>{contractData.borrower?.name}</b> con <b>DNI Nº {contractData.borrower?.dni}</b> Quien en adelante se denominara <b>BENEFICIARIO (RA)</b>, contrato que celebran en los términos y condiciones siguientes:
                  </p>

                  <div className="space-y-3 pt-2 text-xs text-slate-700 leading-relaxed">
                    {(contractData.clauses || []).map((clause: string, idx: number) => {
                      const parts = clause.split(':');
                      return (
                        <div key={idx} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                          <span className="font-black text-indigo-900 uppercase tracking-wide mr-1">
                            {parts[0]}:
                          </span>
                          <span className="text-slate-700 whitespace-pre-line">
                            {parts.slice(1).join(':')}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-right text-xs text-slate-500 font-medium pt-2">
                    En señal de conformidad a la presente firman a los {contractData.day} días del mes de {contractData.monthName} del año {contractData.year}.
                  </div>

                  <div className="pt-8 grid grid-cols-3 gap-4 text-center text-xs">
                    <div className="border-t border-slate-400 pt-2">
                      <p className="font-black text-slate-800">PRESIDENTE APCOMA-“MB”</p>
                      <p className="text-[10px] text-slate-400">Representante Legal</p>
                    </div>
                    <div className="border-t border-slate-400 pt-2">
                      <p className="font-black text-slate-800">ENCARGADO(A) FONDO ROTATORIO</p>
                      <p className="text-[10px] text-slate-400">APCOMA “M.B”</p>
                    </div>
                    <div className="border-t border-slate-400 pt-2">
                      <p className="font-black text-slate-800">{contractData.borrower?.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">DNI Nº {contractData.borrower?.dni}</p>
                      <p className="text-[10px] text-slate-400">BENEFICIARIO</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN 4: CRONOGRAMA & FICHA CP */}
              {(contractSection === 'ALL' || contractSection === 'CRONOGRAMA') && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="text-center border-b pb-3">
                    <h3 className="font-black text-slate-900 text-sm tracking-wide uppercase">CRONOGRAMA DE PAGOS</h3>
                    <p className="text-[10px] text-slate-500 font-mono">APCOMA - “M.B” • OPERACIÓN: {contractData.orderNumber}</p>
                  </div>

                  {/* Resumen */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div><span className="font-bold text-slate-500">NOMBRE:</span> <span className="font-bold text-slate-800">{contractData.borrower?.name}</span></div>
                    <div><span className="font-bold text-slate-500">FECHA DESEMBOLSO:</span> <span className="font-mono text-slate-800">{contractData.loanDetails?.startDateSlash}</span></div>
                    <div><span className="font-bold text-slate-500">DESEMBOLSO:</span> <span className="font-black font-mono text-indigo-800">S/ {contractData.loanDetails?.principalAmount}</span></div>
                    <div><span className="font-bold text-slate-500">TASA INTERÉS:</span> <span className="font-bold text-amber-700">{contractData.loanDetails?.interestRateMonthly}% Mensual</span></div>
                    <div><span className="font-bold text-slate-500">MODALIDAD DE PAGO:</span> <span className="font-bold text-slate-800">MENSUAL ({contractData.loanDetails?.termMonths} cuotas)</span></div>
                    <div><span className="font-bold text-slate-500">TOTAL INTERÉS:</span> <span className="font-black font-mono text-emerald-800">S/ {contractData.loanDetails?.totalInterest}</span></div>
                  </div>

                  {/* Tabla de Cronograma */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-2 text-center">N° Cuota</th>
                          <th className="p-2 text-left">Vencimiento</th>
                          <th className="p-2 text-right">Capital Amortizado</th>
                          <th className="p-2 text-right">Interés Compensatorio</th>
                          <th className="p-2 text-right">Cuota Total</th>
                          <th className="p-2 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(contractData.schedule || []).map((row: any) => (
                          <tr key={row.installmentNumber} className="hover:bg-slate-50">
                            <td className="p-2 text-center font-bold text-slate-700">Cuota {row.installmentNumber}</td>
                            <td className="p-2 font-mono text-slate-600">{row.dueDateSlash || row.dueDate}</td>
                            <td className="p-2 text-right font-mono">S/ {row.principalAmount}</td>
                            <td className="p-2 text-right font-mono text-amber-600">S/ {row.interestAmount}</td>
                            <td className="p-2 text-right font-mono font-bold text-indigo-800">S/ {row.totalInstallment}</td>
                            <td className="p-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.status === 'PAGADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-100/80 font-bold">
                          <td colSpan={2} className="p-2 text-center text-slate-700">TOTALES GENERALES</td>
                          <td className="p-2 text-right font-mono">S/ {contractData.loanDetails?.principalAmount}</td>
                          <td className="p-2 text-right font-mono text-amber-700">S/ {contractData.loanDetails?.totalInterest}</td>
                          <td className="p-2 text-right font-mono text-emerald-800 font-black">S/ {contractData.loanDetails?.totalAmountToPay}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Ficha Técnica CP */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-300">
                    <p className="font-black text-slate-800 text-[11px] uppercase tracking-wide mb-2">
                      PRESTAMO Nº {contractData.orderNumber} • CRONOGRAMA DE PAGO (CP) FONDO ROTATORIO
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="font-bold text-slate-500">CLIENTE:</span> <span className="font-bold text-slate-800">{contractData.borrower?.name}</span></div>
                      <div><span className="font-bold text-slate-500">TEL./CEL:</span> <span className="text-slate-700">{contractData.borrower?.phone}</span></div>
                      <div><span className="font-bold text-slate-500">DNI:</span> <span className="font-mono text-slate-800">{contractData.borrower?.dni}</span></div>
                      <div><span className="font-bold text-slate-500">DIRECCIÓN:</span> <span className="text-slate-700">{contractData.borrower?.address}</span></div>
                      <div><span className="font-bold text-slate-500">GARANTE / FIADOR:</span> <span className="text-slate-700">Socio del Mercado</span></div>
                      <div><span className="font-bold text-slate-500">PUESTO COMERCIAL:</span> <span className="font-bold text-indigo-700">{contractData.borrower?.stallCode}</span></div>
                      <div><span className="font-bold text-slate-500">CÓDIGO USUARIO:</span> <span className="font-mono text-slate-700">{contractData.borrower?.internalCode}</span></div>
                      <div><span className="font-bold text-slate-500">FECHA CANCELO:</span> <span className="font-mono text-slate-700">{contractData.loanDetails?.endDateSlash}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Acciones del Modal */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Imprime las 4 páginas oficiales A4 adaptadas al formato legal de la asociación.
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setContractData(null)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handlePrintLoanContract}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-lg flex items-center space-x-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Todo el Expediente Oficial (4 Páginas A4)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
