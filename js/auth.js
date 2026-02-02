/**
 * Authentication Handler
 * Manages login, registration, and form validation
 */

// ====================================
// UTILITY FUNCTIONS
// ====================================

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
  const alertBox = document.getElementById('alertBox');
  if (!alertBox) return;

  alertBox.textContent = message;
  alertBox.className = `cyber-alert ${type} active`;

  // Auto-hide after 5 seconds
  setTimeout(() => {
    alertBox.classList.remove('active');
  }, 5000);
}

/**
 * Clear alert message
 */
function clearAlert() {
  const alertBox = document.getElementById('alertBox');
  if (alertBox) {
    alertBox.classList.remove('active');
  }
}

/**
 * Validate form inputs
 */
function validateForm(formData, rules) {
  for (const [field, rule] of Object.entries(rules)) {
    const value = formData.get(field);
    
    if (rule.required && (!value || value.trim() === '')) {
      return { valid: false, message: `${rule.label || field} is required.` };
    }
    
    if (rule.minLength && value && value.length < rule.minLength) {
      return { valid: false, message: `${rule.label || field} must be at least ${rule.minLength} characters.` };
    }
    
    if (rule.pattern && value && !rule.pattern.test(value)) {
      return { valid: false, message: rule.patternMessage || `${rule.label || field} format is invalid.` };
    }

    if (rule.match && value !== formData.get(rule.match)) {
      return { valid: false, message: `${rule.label || field} does not match.` };
    }
  }
  
  return { valid: true };
}

/**
 * Store user data (mock storage)
 */
function storeUserData(userData) {
  const users = JSON.parse(localStorage.getItem('hydra_users') || '[]');
  
  // Check if user already exists
  const existingUser = users.find(u => u.phone === userData.phone);
  if (existingUser) {
    return { success: false, message: 'An account with this phone number already exists.' };
  }
  
  users.push({
    ...userData,
    id: Date.now(),
    createdAt: new Date().toISOString()
  });
  
  localStorage.setItem('hydra_users', JSON.stringify(users));
  return { success: true, message: 'Account created successfully!' };
}

/**
 * Find user by credentials
 */
function findUser(username, phone) {
  const users = JSON.parse(localStorage.getItem('hydra_users') || '[]');
  return users.find(u => 
    (u.username === username || u.phone === phone) && u.phone === phone
  );
}

/**
 * Verify user password
 */
function verifyPassword(user, password) {
  // In production, use proper password hashing
  return user && user.password === password;
}

// ====================================
// LOGIN PAGE HANDLERS
// ====================================

function initLoginPage() {
  const loginForm = document.getElementById('loginForm');
  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const otpInputGroup = document.getElementById('otpInputGroup');
  const countdownElement = document.getElementById('countdown');
  const phoneInput = document.getElementById('phone');
  
  let otpSent = false;
  let otpVerified = false;

  if (!loginForm) return;

  // Send OTP button handler
  sendOtpBtn?.addEventListener('click', async () => {
    const phone = phoneInput?.value;
    
    if (!phone) {
      showAlert('Please enter your phone number.', 'error');
      return;
    }

    sendOtpBtn.disabled = true;
    sendOtpBtn.innerHTML = '<span class="cyber-spinner"></span>';

    try {
      const result = await otpHandler.sendOTP(phone);
      
      if (result.success) {
        showAlert(result.message, 'success');
        otpInputGroup?.classList.add('active');
        otpSent = true;

        // Start countdown
        otpHandler.startCountdown(countdownElement, () => {
          sendOtpBtn.disabled = false;
          sendOtpBtn.textContent = 'Resend';
        });
      }
    } catch (error) {
      showAlert(error.message, 'error');
      sendOtpBtn.disabled = false;
    }

    sendOtpBtn.textContent = 'Resend';
  });

  // Login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const formData = new FormData(loginForm);
    const username = formData.get('username');
    const password = formData.get('password');
    const phone = formData.get('phone');
    const otp = formData.get('otp');

    // Validate basic fields
    const validation = validateForm(formData, {
      username: { required: true, label: 'Username' },
      password: { required: true, label: 'Password' },
      phone: { 
        required: true, 
        label: 'Phone Number',
        pattern: /^[0-9]{10}$/,
        patternMessage: 'Phone number must be 10 digits.'
      }
    });

    if (!validation.valid) {
      showAlert(validation.message, 'error');
      return;
    }

    // Check if OTP was sent
    if (!otpSent) {
      showAlert('Please send and verify OTP first.', 'error');
      return;
    }

    // Verify OTP
    if (!otp) {
      showAlert('Please enter the OTP code.', 'error');
      return;
    }

    const otpResult = otpHandler.verifyOTP(otp);
    if (!otpResult.success) {
      showAlert(otpResult.message, 'error');
      return;
    }

    // Find user and verify credentials
    const user = findUser(username, phone);
    
    if (!user) {
      showAlert('No account found. Please register first.', 'error');
      return;
    }

    if (!verifyPassword(user, password)) {
      showAlert('Invalid password.', 'error');
      return;
    }

    // Success - Store session
    sessionStorage.setItem('hydra_session', JSON.stringify({
      userId: user.id,
      username: user.username || user.firstName,
      role: user.role,
      loggedInAt: new Date().toISOString()
    }));

    showAlert('Login successful! Redirecting...', 'success');
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
  });
}

// ====================================
// REGISTRATION PAGE HANDLERS
// ====================================

function initRegistrationPage() {
  const registerForm = document.getElementById('registerForm');
  const roleSelect = document.getElementById('role');
  const riskManagementFields = document.getElementById('riskManagementFields');
  const adminFields = document.getElementById('adminFields');

  if (!registerForm) return;

  // Role selection handler - Show/hide conditional fields
  roleSelect?.addEventListener('change', (e) => {
    const selectedRole = e.target.value;

    // Hide all role-specific fields first
    riskManagementFields?.classList.remove('active');
    adminFields?.classList.remove('active');

    // Clear inputs in hidden sections
    if (selectedRole !== 'risk_management') {
      document.getElementById('employeeId')?.setAttribute('value', '');
      document.getElementById('bankName')?.setAttribute('value', '');
    }
    if (selectedRole !== 'admin') {
      document.getElementById('personalId')?.setAttribute('value', '');
      document.getElementById('idCard')?.setAttribute('value', '');
    }

    // Show relevant fields based on selection
    if (selectedRole === 'risk_management') {
      riskManagementFields?.classList.add('active');
      // Make fields required
      document.getElementById('employeeId')?.setAttribute('required', 'required');
      document.getElementById('bankName')?.setAttribute('required', 'required');
      document.getElementById('personalId')?.removeAttribute('required');
      document.getElementById('idCard')?.removeAttribute('required');
    } else if (selectedRole === 'admin') {
      adminFields?.classList.add('active');
      // Make fields required
      document.getElementById('personalId')?.setAttribute('required', 'required');
      document.getElementById('idCard')?.setAttribute('required', 'required');
      document.getElementById('employeeId')?.removeAttribute('required');
      document.getElementById('bankName')?.removeAttribute('required');
    }
  });

  // Registration form submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const formData = new FormData(registerForm);
    const role = formData.get('role');

    // Base validation rules
    const validationRules = {
      firstName: { required: true, label: 'First Name' },
      lastName: { required: true, label: 'Last Name' },
      phone: { 
        required: true, 
        label: 'Phone Number',
        pattern: /^[0-9]{10}$/,
        patternMessage: 'Phone number must be 10 digits.'
      },
      role: { required: true, label: 'Role' },
      password: { 
        required: true, 
        label: 'Password',
        minLength: 8
      },
      confirmPassword: {
        required: true,
        label: 'Confirm Password',
        match: 'password'
      }
    };

    // Add role-specific validation
    if (role === 'risk_management') {
      validationRules.employeeId = { required: true, label: 'Employee ID' };
      validationRules.bankName = { required: true, label: 'Bank Name' };
    } else if (role === 'admin') {
      validationRules.personalId = { 
        required: true, 
        label: 'Personal ID',
        pattern: /^[0-9]{13}$/,
        patternMessage: 'Personal ID must be 13 digits.'
      };
      validationRules.idCard = { 
        required: true, 
        label: 'ID Card',
        pattern: /^[0-9]{13}$/,
        patternMessage: 'ID Card must be 13 digits.'
      };
    }

    // Validate form
    const validation = validateForm(formData, validationRules);
    if (!validation.valid) {
      showAlert(validation.message, 'error');
      return;
    }

    // Prepare user data
    const userData = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      username: formData.get('firstName').toLowerCase() + formData.get('lastName').toLowerCase().charAt(0),
      phone: formData.get('phone'),
      role: role,
      password: formData.get('password') // In production, hash this!
    };

    // Add role-specific data
    if (role === 'risk_management') {
      userData.employeeId = formData.get('employeeId');
      userData.bankName = formData.get('bankName');
    } else if (role === 'admin') {
      userData.personalId = formData.get('personalId');
      userData.idCard = formData.get('idCard');
    }

    // Store user
    const result = storeUserData(userData);

    if (result.success) {
      showAlert(result.message + ' Redirecting to login...', 'success');
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    } else {
      showAlert(result.message, 'error');
    }
  });
}

// ====================================
// INITIALIZATION
// ====================================

document.addEventListener('DOMContentLoaded', () => {
  // Determine which page we're on and initialize accordingly
  if (document.getElementById('loginForm')) {
    initLoginPage();
  }
  
  if (document.getElementById('registerForm')) {
    initRegistrationPage();
  }

  // Add input focus effects
  document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement?.classList.add('focused');
    });
    
    input.addEventListener('blur', () => {
      input.parentElement?.classList.remove('focused');
    });
  });
});
