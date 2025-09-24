// scripts/script.js - Página de login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const messageDiv = document.getElementById('login-message');
    
    // Verificar se já está logado
    checkAuth().then(user => {
        if (user) {
            window.location.href = 'dashboard.html';
        }
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginBtn = this.querySelector('button[type="submit"]');
            
            // Validação básica
            if (!email || !password) {
                showMessage('Por favor, preencha todos os campos', 'error');
                return;
            }
            
            // Validar formato de email
            if (!isValidEmail(email)) {
                showMessage('Por favor, insira um email válido', 'error');
                return;
            }
            
            // Mostrar loading
            loginBtn.classList.add('loading');
            loginBtn.textContent = 'Entrando...';
            hideMessage();
            
            try {
                // Fazer login usando a função do auth.js
                const result = await loginUser(email, password);
                
                showMessage('Login realizado com sucesso! Redirecionando...', 'success');
                
                // Redirecionar após breve delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } catch (error) {
                console.error('Erro no login:', error);
                
                // Mensagens de erro específicas
                let errorMessage = 'Erro ao fazer login';
                
                if (error.message.includes('Invalid login credentials')) {
                    errorMessage = 'Email ou senha incorretos';
                } else if (error.message.includes('Email not confirmed')) {
                    errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
                } else if (error.message.includes('Too many requests')) {
                    errorMessage = 'Muitas tentativas. Tente novamente em alguns minutos.';
                } else {
                    errorMessage = error.message || 'Erro ao fazer login';
                }
                
                showMessage(errorMessage, 'error');
                
            } finally {
                // Restaurar botão
                loginBtn.classList.remove('loading');
                loginBtn.textContent = 'Entrar';
            }
        });
    }
    
    // Função para validar email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Função para mostrar mensagens
    function showMessage(message, type = 'info') {
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = 'block';
            
            // Auto-esconder mensagens de sucesso
            if (type === 'success') {
                setTimeout(() => {
                    hideMessage();
                }, 3000);
            }
        }
    }
    
    // Função para esconder mensagens
    function hideMessage() {
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }
    }
    
    // Preencher automaticamente em desenvolvimento
    function autoFillDevCredentials() {
        // Só preencher automaticamente em localhost para desenvolvimento
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            
            if (emailInput && passwordInput) {
                // Preencher com valores padrão para desenvolvimento
                emailInput.value = 'admin@empresa.com';
                passwordInput.value = 'admin123';
                
                // Mostrar mensagem informativa
                showMessage('Credenciais de desenvolvimento preenchidas automaticamente', 'info');
                setTimeout(hideMessage, 3000);
            }
        }
    }
    
    // Chamar auto-preenchimento em desenvolvimento
    autoFillDevCredentials();
    
    // Tecla Enter para submit
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && loginForm) {
            const focusedElement = document.activeElement;
            if (focusedElement && (focusedElement.type === 'email' || focusedElement.type === 'password')) {
                loginForm.dispatchEvent(new Event('submit'));
            }
        }
    });
    
    // Focar no campo de email ao carregar
    setTimeout(() => {
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.focus();
        }
    }, 100);
});

// Função para logout (pode ser usada em outras páginas)
async function handleLogout() {
    try {
        await logoutUser();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao fazer logout: ' + error.message);
    }
}

// Verificar autenticação em outras páginas
async function checkAuthentication() {
    try {
        const user = await checkAuth();
        if (!user) {
            window.location.href = 'index.html';
            return null;
        }
        return user;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = 'index.html';
        return null;
    }
}

// Exportar funções para uso global
window.handleLogout = handleLogout;
window.checkAuthentication = checkAuthentication;