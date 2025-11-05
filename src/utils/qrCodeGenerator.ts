/**
 * QR Code Generator Utility
 * 
 * Tạo QR code từ transaction code và amount
 * Sử dụng format VietQR để tạo QR code thanh toán
 */

export interface QRCodeData {
  transactionCode: string;
  amount: number;
  petName: string;
  merchantName?: string;
}

/**
 * Generate VietQR format string for payment
 * Format: Based on VietQR standard for QR code payment
 */
export function generateVietQRString(data: QRCodeData): string {
  const { transactionCode, amount, petName, merchantName = 'AdoPet' } = data;
  
  // VietQR format: 
  // 00020101021238570010A0000007750110{account}0208{amount}0304{currency}5802VN62{merchant}6304{checksum}
  // Simplified version for Vietnam payment QR
  
  // For simplicity, we'll use a format that includes:
  // - Transaction code
  // - Amount
  // - Pet name
  // This can be scanned by payment apps to show payment info
  
  const qrData = {
    type: 'payment',
    merchant: merchantName,
    transaction_code: transactionCode,
    amount: Math.round(amount),
    currency: 'VND',
    description: `Thanh toán cho ${petName}`,
    pet_name: petName,
  };

  // Convert to JSON string for QR code
  return JSON.stringify(qrData);
}

/**
 * Generate QR code data URL for display
 * This will be used with react-native-qrcode-svg
 */
export function generateQRCodeData(data: QRCodeData): string {
  return generateVietQRString(data);
}

