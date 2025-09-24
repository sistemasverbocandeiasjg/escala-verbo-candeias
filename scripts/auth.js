// scripts/auth.js
async function checkAuth() {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('Erro ao obter sessão:', sessionError);
            return null;
        }
        
        if (!session) {
            return null;
        }
        
        // Buscar dados adicionais do usuário na tabela users
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
        if (userError) {
            console.error('Erro ao buscar dados do usuário:', userError);
            // Retornar pelo menos os dados básicos do auth
            return {
                ...session.user,
                level: 'Pendente' // Valor padrão
            };
        }
        
        return {
            ...session.user,
            ...userData
        };
        
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return null;
    }
}

async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            throw error;
        }
        
        // Buscar dados adicionais do usuário
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();
            
        if (userError) {
            console.warn('Erro ao buscar dados adicionais:', userError);
            // Não falhar completamente - retornar dados básicos
            return {
                user: data.user,
                userData: {
                    id: data.user.id,
                    username: data.user.email.split('@')[0],
                    level: 'Pendente'
                }
            };
        }
        
        return {
            ...data,
            userData: userData
        };
        
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        throw error;
    }
}

async function logoutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }
        // Limpar qualquer estado local
        localStorage.removeItem('supabase.auth.token');
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        throw error;
    }
}

// Listener para mudanças de estado de autenticação
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Evento de autenticação:', event);
    
    if (event === 'SIGNED_OUT') {
        // Redirecionar para login se estiver em página protegida
        if (window.location.pathname !== '/index.html' && 
            !window.location.pathname.endsWith('index.html')) {
            window.location.href = 'index.html';
        }
    }
    
    if (event === 'SIGNED_IN') {
        // Recarregar a página atual após login
        if (window.location.pathname === '/index.html' || 
            window.location.pathname.endsWith('index.html')) {
            window.location.href = 'dashboard.html';
        }
    }
});

// Exportar funções para uso global
window.checkAuth = checkAuth;
window.loginUser = loginUser;
window.logoutUser = logoutUser;