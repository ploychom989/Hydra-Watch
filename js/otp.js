/**
 * OTP (One-Time Password) Handler
 * Handles OTP generation, sending simulation, and verification
 */

class OTPHandler {
  constructor() {
    this.generatedOTP = null;
    this.otpExpiry = null;
    this.countdownInterval = null;
    this.resendCooldown = 60; // seconds
  }

  /**
   * Generate a random 6-digit OTP
   */
  generateOTP() {
    this.generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpExpiry = Date.now() + (5 * 60 * 1000); // 5 minutes expiry
    return this.generatedOTP;
  }

  /**
   * Simulate sending OTP to phone number
   * In production, this would call an SMS API
   */
  sendOTP(phoneNumber) {
    return new Promise((resolve, reject) => {
      // Validate phone number format
      if (!this.validatePhoneNumber(phoneNumber)) {
        reject(new Error('Invalid phone number format. Please enter a 10-digit number.'));
        return;
      }

      // Simulate network delay
      setTimeout(() => {
        const otp = this.generateOTP();
        
        // In development, show OTP in console and alert
        console.log(`[DEV] OTP sent to ${phoneNumber}: ${otp}`);
        
        // Show OTP for demo purposes (remove in production)
        this.showOTPNotification(phoneNumber, otp);
        
        resolve({
          success: true,
          message: `OTP sent to ${this.maskPhoneNumber(phoneNumber)}`,
          expiresIn: 300 // 5 minutes in seconds
        });
      }, 1500); // Simulate 1.5s network delay
    });
  }

  /**
   * Verify the entered OTP
   */
  verifyOTP(enteredOTP) {
    if (!this.generatedOTP) {
      return {
        success: false,
        message: 'No OTP has been generated. Please request a new OTP.'
      };
    }

    if (Date.now() > this.otpExpiry) {
      this.generatedOTP = null;
      return {
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      };
    }

    if (enteredOTP === this.generatedOTP) {
      this.generatedOTP = null; // Clear OTP after successful verification
      return {
        success: true,
        message: 'OTP verified successfully!'
      };
    }

    return {
      success: false,
      message: 'Invalid OTP. Please try again.'
    };
  }

  /**
   * Validate phone number format (10 digits)
   */
  validatePhoneNumber(phone) {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Mask phone number for display (e.g., 081****678)
   */
  maskPhoneNumber(phone) {
    if (phone.length < 10) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(7);
  }

  /**
   * Show OTP notification (for demo purposes)
   */
  showOTPNotification(phone, otp) {
    // Create a custom notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, rgba(0, 245, 255, 0.95), rgba(255, 0, 255, 0.95));
      color: #0a0a0f;
      padding: 20px 25px;
      border-radius: 12px;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 600;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 0 30px rgba(0, 245, 255, 0.5);
      animation: slideIn 0.5s ease;
      max-width: 320px;
    `;
    
    notification.innerHTML = `
      <div style="font-size: 12px; opacity: 0.8; margin-bottom: 8px;">📱 SMS Message Received</div>
      <div style="font-size: 16px; margin-bottom: 5px;">Your OTP Code:</div>
      <div style="font-size: 28px; font-family: 'Orbitron', sans-serif; letter-spacing: 8px; text-align: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">${otp}</div>
      <div style="font-size: 11px; opacity: 0.7; margin-top: 10px;">Valid for 5 minutes • Demo Mode</div>
    `;

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.5s ease forwards';
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 10000);
  }

  /**
   * Start countdown timer for OTP resend
   */
  startCountdown(displayElement, onComplete) {
    let timeLeft = this.resendCooldown;
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    displayElement.textContent = timeLeft;

    this.countdownInterval = setInterval(() => {
      timeLeft--;
      displayElement.textContent = timeLeft;

      if (timeLeft <= 0) {
        clearInterval(this.countdownInterval);
        if (onComplete) onComplete();
      }
    }, 1000);
  }

  /**
   * Stop countdown timer
   */
  stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}

// Create global instance
const otpHandler = new OTPHandler();
