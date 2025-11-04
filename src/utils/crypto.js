import CryptoJS from 'crypto-js'

// 密钥 - 与 Rust 代码保持一致
const SECRET_KEY = '$mmL1oX*ar&xfuFjjIsA7SqC7ad0DE1N'

/**
 * 解密字符串
 * @param {string} encryptedText - Base64编码的加密字符串
 * @returns {string} 解密后的原始字符串
 */
export function decrypt(encryptedText) {
  try {
    // Base64 解码
    const combined = CryptoJS.enc.Base64.parse(encryptedText)
    
    // 分离 nonce (前12字节) 和 密文
    const nonceBytes = CryptoJS.lib.WordArray.create(combined.words.slice(0, 3), 12)
    const ciphertextBytes = CryptoJS.lib.WordArray.create(
      combined.words.slice(3), 
      combined.sigBytes - 12
    )
    
    // 转换密钥
    const key = CryptoJS.enc.Utf8.parse(SECRET_KEY)
    
    // 使用 AES-256-GCM 解密
    // 注意: crypto-js 不直接支持 GCM，这里使用 AES-CTR 作为替代
    // 如果严格需要 GCM，建议使用 Web Crypto API
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertextBytes },
      key,
      {
        iv: nonceBytes,
        mode: CryptoJS.mode.CTR,
        padding: CryptoJS.pad.NoPadding
      }
    )
    
    return decrypted.toString(CryptoJS.enc.Utf8)
  } catch (e) {
    console.error('解密失败:', e)
    return ''
  }
}

/**
 * 使用 Web Crypto API 解密 (AES-256-GCM)
 * @param {string} encryptedText - Base64编码的加密字符串
 * @returns {Promise<string>} 解密后的原始字符串
 */
export async function decryptGCM(encryptedText) {
  try {
    // Base64 解码
    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0))
    
    // 分离 nonce (前12字节) 和 密文
    const nonce = combined.slice(0, 12)
    const ciphertext = combined.slice(12)
    
    // 导入密钥
    const keyData = new TextEncoder().encode(SECRET_KEY)
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
    
    // 解密
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonce
      },
      key,
      ciphertext
    )
    
    return new TextDecoder().decode(decrypted)
  } catch (e) {
    console.error('解密失败:', e)
    return ''
  }
}
