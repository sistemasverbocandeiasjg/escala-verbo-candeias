// scripts/supabase.js - Versão corrigida
const SUPABASE_URL = 'https://zavmwzqtsepfqvdjgfzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphdm13enF0c2VwZnF2ZGpnZnpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyODM2MTcsImV4cCI6MjA3Mzg1OTYxN30.rREuALvQ9C-FGj7NmwLWKK-ygZb2vI4NgbWW7lsAJJg';

// Inicializar o cliente Supabase
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para mostrar mensagens globalmente
function showMessageGlobal(message, type) {
    console.log(`${type.toUpperCase()}: ${message}`);
    try {
        const messageDiv = document.getElementById('login-message');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = 'block';
        }
    } catch (error) {
        console.log('Não foi possível mostrar mensagem na UI:', error);
    }
}

// Função para verificar autenticação
async function checkAuth() {
    try {
        const userData = localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return null;
    }
}

// Função para obter o usuário atual
async function getCurrentUser() {
    return checkAuth();
}

// Função para carregar usuários
async function loadUsers() {
    try {
        // 1. Tentar do cache local
        const cachedUsers = localStorage.getItem('local_users_cache');
        if (cachedUsers) {
            const users = JSON.parse(cachedUsers);
            if (users.length > 0) {
                console.log('Usuários carregados do cache:', users.length);
                return users;
            }
        }
        
        // 2. Tentar do Supabase
        const { data: users, error } = await supabase
            .from('users')
            .select('*');
        
        if (!error && users && users.length > 0) {
            console.log('Usuários carregados do Supabase:', users.length);
            localStorage.setItem('local_users_cache', JSON.stringify(users));
            return users;
        }
        
        // 3. Usar fallback fixo
        console.log('Usando usuários de fallback');
        return FALLBACK_USERS;
        
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        return FALLBACK_USERS;
    }
}

// Função de login
async function customLogin(username, password) {
    try {
        console.log('Tentando login para:', username);
        
        // Carregar usuários
        const users = await loadUsers();
        console.log('Usuários disponíveis:', users.map(u => u.username));
        
        // Buscar usuário
        const user = users.find(u => u.username === username);
        
        if (!user) {
            const availableUsers = users.map(u => u.username).join(', ');
            throw new Error('Usuário não encontrado. Usuários disponíveis: ' + availableUsers);
        }
        
        // Verificar senha
        if (user.password !== password) {
            throw new Error('Senha incorreta');
        }
        
        // CORREÇÃO: Para líderes, carregar os departamentos associados
        if (user.level === 'Líder') {
            const { data: userDepartments, error: deptError } = await supabase
                .from('user_departments')
                .select('department_id, departments(name)')
                .eq('user_id', user.id);
                
            if (!deptError && userDepartments) {
                user.departments = userDepartments.map(ud => ({
                    id: ud.department_id,
                    name: ud.departments?.name || `Departamento ${ud.department_id}`
                }));
                
                // Se tiver apenas um departamento, definir como department principal
                if (user.departments.length === 1) {
                    user.department = user.departments[0].id;
                }
            }
        }
        
        // Criar sessão (sem a senha)
        const userSession = {
            id: user.id,
            username: user.username,
            level: user.level,
            departments: user.departments || [],
            department: user.department || null,
            created_at: user.created_at
        };
        
        localStorage.setItem('currentUser', JSON.stringify(userSession));
        return userSession;
        
    } catch (error) {
        console.error('Erro no login:', error);
        throw error;
    }
}

// Função para atualizar cache (agora definida corretamente)
async function refreshUsersCache() {
    try {
        showMessageGlobal('Atualizando cache...', 'info');
        const { data: users, error } = await supabase
            .from('users')
            .select('*');
        
        if (!error && users) {
            localStorage.setItem('local_users_cache', JSON.stringify(users));
            showMessageGlobal('Cache atualizado com sucesso! ' + users.length + ' usuários carregados', 'success');
            return true;
        } else {
            showMessageGlobal('Não foi possível atualizar o cache do banco', 'warning');
            return false;
        }
    } catch (error) {
        console.error('Erro ao atualizar cache:', error);
        showMessageGlobal('Erro ao atualizar cache', 'error');
        return false;
    }
}

// Função de logout
async function customLogout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('local_users_cache');
    return true;
}

// Exportar funções globais - AGORA CORRETAMENTE
window.refreshUsersCache = refreshUsersCache;
window.getCurrentUser = getCurrentUser;
window.showMessageGlobal = showMessageGlobal;
window.customLogin = customLogin;
window.customLogout = customLogout;
window.checkAuth = checkAuth;