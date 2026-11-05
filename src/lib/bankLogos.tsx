import React from 'react';
import { BankInfo } from '../types';

export const BRAZILIAN_BANKS: BankInfo[] = [
  { id: 'nubank', name: 'Nubank', code: '260', color: '#820AD1', textColor: '#FFFFFF', popular: true },
  { id: 'itau', name: 'Itaú Unibanco', code: '341', color: '#EC7000', textColor: '#FFFFFF', popular: true },
  { id: 'bradesco', name: 'Bradesco', code: '237', color: '#CC092F', textColor: '#FFFFFF', popular: true },
  { id: 'banco-do-brasil', name: 'Banco do Brasil', code: '001', color: '#FAF000', textColor: '#002D72', popular: true },
  { id: 'santander', name: 'Santander', code: '033', color: '#EC0000', textColor: '#FFFFFF', popular: true },
  { id: 'caixa', name: 'Caixa Econômica', code: '104', color: '#005CA9', textColor: '#FFFFFF', popular: true },
  { id: 'inter', name: 'Banco Inter', code: '077', color: '#FF7A00', textColor: '#FFFFFF', popular: true },
  { id: 'c6-bank', name: 'C6 Bank', code: '336', color: '#1B1B1B', textColor: '#FFFFFF', popular: true },
  { id: 'mercado-pago', name: 'Mercado Pago', code: '323', color: '#009EE3', textColor: '#FFFFFF', popular: true },
  { id: 'picpay', name: 'PicPay', code: '380', color: '#11C76F', textColor: '#FFFFFF', popular: true },
  { id: 'pagbank', name: 'PagBank (PagSeguro)', code: '290', color: '#00A859', textColor: '#FFFFFF', popular: true },
  { id: 'sicredi', name: 'Sicredi', code: '748', color: '#007A33', textColor: '#FFFFFF' },
  { id: 'sicoob', name: 'Sicoob', code: '756', color: '#003641', textColor: '#FFFFFF' },
  { id: 'outros', name: 'Outra Instituição', code: '999', color: '#111827', textColor: '#00BFFF' },
];

export function BankLogoIcon({ bankId, className = 'w-6 h-6' }: { bankId: string; className?: string }) {
  switch (bankId) {
    case 'nubank':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect width="100" height="100" rx="20" fill="#820AD1" />
          <path
            d="M30 68V32H40.5L54 53.5V32H64V68H53.5L40 46.5V68H30Z"
            fill="white"
          />
        </svg>
      );

    case 'itau':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect width="100" height="100" rx="20" fill="#EC7000" />
          <rect x="25" y="25" width="50" height="50" rx="8" fill="#003399" />
          <text x="50" y="58" fill="#FAF000" fontSize="22" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            Itaú
          </text>
        </svg>
      );

    case 'bradesco':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect width="100" height="100" rx="20" fill="#CC092F" />
          <circle cx="50" cy="38" r="8" fill="white" />
          <path d="M30 68C30 52 40 46 50 46C60 46 70 52 70 68H60C60 56 55 52 50 52C45 52 40 56 40 68H30Z" fill="white" />
        </svg>
      );

    case 'banco-do-brasil':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect width="100" height="100" rx="20" fill="#FAF000" />
          <rect x="25" y="25" width="50" height="50" rx="6" fill="#002D72" />
          <text x="50" y="58" fill="#FAF000" fontSize="22" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
            BB
          </text>
        </svg>
      );

    case 'santander':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect width="100" height="100" rx="20" fill="#EC0000" />
          {/* Santander Flame Icon */}
          <path
            d="M50 25C46 36 34 44 34 56C34 65 41 73 50 73C59 73 66 65 66 56C66 44 54 36 50 25ZM50 67C44 67 40 62 40 56C40 49 47 42 50 35C53 42 60 49 60 56C60 62 56 67 50 67Z"
            fill="white"
          />
        </svg>
      );

    case 'caixa':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect width="100" height="100" rx="20" fill="#005CA9" />
          <path d="M28 32L46 50L28 68H38L50 56L62 68H72L54 50L72 32H62L50 44L38 32H28Z" fill="#F37021" />
          <path d="M38 32L50 44L62 32H72L54 50L72 68H62L50 56L38 68H28L46 50L28 32H38Z" fill="white" fillOpacity="0.85" />
        </svg>
      );

    case 'inter':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect width="100" height="100" rx="20" fill="#FF7A00" />
          <text x="50" y="62" fill="white" fontSize="28" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            inter
          </text>
        </svg>
      );

    case 'c6-bank':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect width="100" height="100" rx="20" fill="#1B1B1B" />
          <circle cx="50" cy="50" r="32" stroke="#FFD600" strokeWidth="4" fill="none" />
          <text x="50" y="60" fill="white" fontSize="26" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            C6
          </text>
        </svg>
      );

    case 'mercado-pago':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect width="100" height="100" rx="20" fill="#009EE3" />
          <path
            d="M30 45C30 38 36 32 43 32C47 32 50 34 50 37C50 34 53 32 57 32C64 32 70 38 70 45C70 54 59 62 50 68C41 62 30 54 30 45Z"
            fill="white"
          />
        </svg>
      );

    case 'picpay':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect width="100" height="100" rx="20" fill="#11C76F" />
          <path d="M34 30H56C64 30 68 35 68 42C68 50 62 55 54 55H44V70H34V30ZM44 47H54C57 47 59 45 59 42C59 39 57 38 54 38H44V47Z" fill="white" />
        </svg>
      );

    case 'pagbank':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect width="100" height="100" rx="20" fill="#00A859" />
          <circle cx="50" cy="50" r="34" fill="#007F43" />
          <text x="50" y="62" fill="#FAF000" fontSize="34" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
            P
          </text>
        </svg>
      );

    case 'sicredi':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect width="100" height="100" rx="20" fill="#007A33" />
          <circle cx="50" cy="50" r="28" fill="#84BD00" />
          <text x="50" y="58" fill="white" fontSize="20" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            SICREDI
          </text>
        </svg>
      );

    case 'sicoob':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <rect width="100" height="100" rx="20" fill="#003641" />
          <circle cx="50" cy="50" r="26" fill="#00A859" />
          <text x="50" y="58" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            SICOOB
          </text>
        </svg>
      );

    default:
      return (
        <div className={`flex items-center justify-center rounded-xl bg-[#0B1120] text-[#00BFFF] font-bold text-xs uppercase border border-[#1E293B] ${className}`}>
          PIX
        </div>
      );
  }
}
