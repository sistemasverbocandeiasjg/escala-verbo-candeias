console.log('=== SISTEMA DE ESCALAS - VERIFICAÇÃO DE VERSÃO ===');
console.log('Versão do schedules.js: 2.3 - PDF com Layout Agrupado');
console.log('Carregado em: ' + new Date().toLocaleString());
console.log('================================================');

// Função para verificar se o PDF está carregado (sem forçar recarregamento)
window.checkPDFFixLoaded = function () {
    const pdfFunction = window.exportToPdf;
    if (pdfFunction) {
        console.log('✅ Função exportToPdf carregada corretamente');

        // Verificação mais simples - apenas se a função existe
        const functionString = pdfFunction.toString();
        if (functionString.includes('exportToPdf')) {
            console.log('✅ PDF funcional detectado');
            return true;
        }
        return true; // Sempre retorna true para evitar recarregamento
    }
    return true; // Sempre retorna true para evitar recarregamento
};

// Verificação não intrusiva
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        window.checkPDFFixLoaded();
    }, 500);
});

// scripts/dashboard.js - Versão completa corrigida para abas superiores
document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelectorAll('.nav-tabs a');
    const mainContent = document.querySelector('.main-content');

    // Verificar autenticação ao carregar o dashboard
    checkAuth().then(user => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Atualizar informações do usuário no header
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = user.username + ' (' + user.level + ')';
        }

        // Configurar botão de logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async function () {
                try {
                    await customLogout();
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                }
            });
        }

        // CORREÇÃO: Primeiro configurar a navegação baseada no nível
        setupNavigationBasedOnUserLevel(user);

        // DEPOIS configurar a navegação por tabs
        setupTabNavigation(user);

        // FINALMENTE carregar o conteúdo inicial
        loadInitialContent(user);
    });

    function setupNavigationBasedOnUserLevel(user) {
        const navTabs = document.querySelector('.nav-tabs ul');
        const usersNavItem = document.getElementById('users-nav-item');
        const reportsNavItem = document.getElementById('reports-nav-item'); // AGORA COM ID

        if (!navTabs) return;

        console.log('Configurando navegação para:', user.level);

        // Esconder/mostrar aba de usuários
        if (usersNavItem) {
            if (user.level === 'Administrador') {
                usersNavItem.style.display = 'block';
                console.log('✅ Aba de Usuários mostrada para Administrador');
            } else {
                usersNavItem.style.display = 'none';
                console.log('❌ Aba de Usuários escondida');
            }
        }

        // MOSTRAR ABA DE RELATÓRIOS PARA ADMINISTRADOR E LÍDER
        if (reportsNavItem) {
            if (user.level === 'Administrador' || user.level === 'Líder') {
                reportsNavItem.style.display = 'block';
                console.log('✅ Aba de Relatórios mostrada para', user.level);
            } else {
                reportsNavItem.style.display = 'none';
                console.log('❌ Aba de Relatórios escondida');
            }
        }

        // CORREÇÃO: Resetar todas as abas primeiro
        const allTabs = navTabs.querySelectorAll('li');
        allTabs.forEach(tab => {
            // Não resetar as abas que já foram configuradas acima
            if (tab.id !== 'users-nav-item' && tab.id !== 'reports-nav-item') {
                tab.style.display = 'block';
            }
        });

        // Se for líder, mostrar apenas a aba de Escalas e Relatórios
        if (user.level === 'Líder') {
            allTabs.forEach(tab => {
                const link = tab.querySelector('a');
                if (link && link.getAttribute('data-page') !== 'schedules' &&
                    link.getAttribute('data-page') !== 'schedule-reports' &&
                    tab.id !== 'reports-nav-item') { // Mantém a aba de relatórios
                    tab.style.display = 'none';
                    console.log('🔒 Escondendo aba:', link.getAttribute('data-page'));
                }
            });

            // Renomear a aba para ficar mais claro
            const schedulesTab = navTabs.querySelector('a[data-page="schedules"]');
            if (schedulesTab) {
                schedulesTab.textContent = 'Gerenciar Escalas';
            }
        } else {
            // Para administradores, garantir que todas as abas estão visíveis
            allTabs.forEach(tab => {
                if (tab.id !== 'users-nav-item' && tab.id !== 'reports-nav-item') {
                    tab.style.display = 'block';
                }
            });

            // Restaurar o texto original da aba de escalas
            const schedulesTab = navTabs.querySelector('a[data-page="schedules"]');
            if (schedulesTab) {
                schedulesTab.textContent = 'Gerenciar Escalas';
            }
        }

        console.log('Navegação configurada com sucesso');
    }

    function loadInitialContent(user) {
        // CORREÇÃO: Remover a aba ativa primeiro
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Se for líder, carregar diretamente a seção de escalas
        if (user.level === 'Líder') {
            // Ativar visualmente a aba de escalas
            const schedulesLink = document.querySelector('a[data-page="schedules"]');
            if (schedulesLink) {
                schedulesLink.classList.add('active');
            }

            loadSectionContent('schedules', user);
        } else {
            // Para administradores, carregar dashboard normalmente
            const dashboardLink = document.querySelector('a[data-page="dashboard"]');
            if (dashboardLink) {
                dashboardLink.classList.add('active');
            }
            loadSectionContent('dashboard', user);
        }
    }

    function setupTabNavigation(user) {
        navLinks.forEach(link => {
            // CORREÇÃO: Remover a lógica de esconder abas aqui
            // A lógica de visibilidade já é tratada em setupNavigationBasedOnUserLevel

            link.addEventListener('click', function (e) {
                e.preventDefault();

                const targetPage = this.getAttribute('data-page');

                // Ativar aba selecionada
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');

                // Carregar conteúdo da seção
                loadSectionContent(targetPage, user);
            });
        });
    }

    async function loadSectionContent(section, user) {
        if (!mainContent) return;

        // Mostrar loading
        mainContent.innerHTML = '<div style="text-align: center; padding: 50px; color: #667eea;">Carregando...</div>';

        try {
            let content = '';

            switch (section) {
                case 'dashboard':
                    content = await loadDashboardContent(user);
                    break;
                case 'schedules':
                    content = await loadSchedulesContent(user);
                    break;
                case 'schedule-reports': // NOVA SEÇÃO
                    content = await loadScheduleReportsContent(user);
                    break;
                case 'members':
                    content = await loadMembersContent(user);
                    break;
                case 'departments':
                    content = await loadDepartmentsContent(user);
                    break;
                case 'services':
                    content = await loadServicesContent(user);
                    break;
                case 'users':
                    content = await loadUsersContent(user);
                    break;
                default:
                    content = '<div class="message error">Seção não encontrada</div>';
            }

            mainContent.innerHTML = content;

            // Re-inicializar event listeners específicos da seção
            initializeSectionEvents(section, user);

        } catch (error) {
            console.error('Erro ao carregar seção:', error);
            mainContent.innerHTML = '<div class="message error">Erro ao carregar conteúdo: ' + error.message + '</div>';
        }
    }

    function initializeSectionEvents(section, user) {
        switch (section) {
            case 'dashboard':
                initializeDashboardEvents(user);
                break;
            case 'schedules':
                initializeSchedulesEvents(user);
                break;
            case 'schedule-reports': // NOVA SEÇÃO
                initializeScheduleReportsEvents(user);
                break;
            case 'members':
                initializeMembersEvents(user);
                break;
            case 'departments':
                initializeDepartmentsEvents(user);
                break;
            case 'services':
                initializeServicesEvents(user);
                break;
            case 'users':
                initializeUsersEvents(user);
                break;
        }
    }

    // ========== DASHBOARD ==========
    async function loadDashboardContent(user) {
        const stats = await getDashboardStats(user);

        return `
            <div id="dashboard" class="content-section active">
                <div class="form-container">
                    <div class="form-header">
                        <h2>Dashboard</h2>
                        <p>Visão geral do sistema</p>
                    </div>
                    <div class="form-body">
                        <div class="stats-container">
                            <div class="stat-card">
                                <h3>Membros</h3>
                                <p id="members-count">${stats.members}</p>
                            </div>
                            <div class="stat-card">
                                <h3>Departamentos</h3>
                                <p id="departments-count">${stats.departments}</p>
                            </div>
                            <div class="stat-card">
                                <h3>Cultos</h3>
                                <p id="services-count">${stats.services}</p>
                            </div>
                            <div class="stat-card">
                                <h3>Usuários</h3>
                                <p id="users-count">${stats.users}</p>
                            </div>
                            <div class="stat-card">
                                <h3>Escalas do Mês</h3>
                                <p id="schedules-count">${stats.schedules}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function initializeDashboardEvents(user) {
        // Atualizar estatísticas em tempo real se necessário
        console.log('Dashboard inicializado');
    }

    // ========== ESCALAS ==========
    async function loadSchedulesContent(user) {
        // Se for líder, mostrar título mais específico
        const title = user.level === 'Líder' ? 'Minhas Escalas' : 'Gerenciar Escalas';
        const description = user.level === 'Líder'
            ? 'Visualize e gerencie as escalas dos seus departamentos'
            : 'Cadastre e visualize as escalas dos cultos';

        return `
            <div id="schedules" class="content-section active">
                <div class="form-container">
                    <div class="form-header">
                        <h2>${title}</h2>
                        <p>${description}</p>
                    </div>
                    <div class="form-body">
                        <div class="filters">
                            <div class="filter-group">
                                <label for="schedule-month-year">Mês/Ano</label>
                                <input type="month" id="schedule-month-year" class="month-picker" value="${new Date().toISOString().slice(0, 7)}">
                            </div>
                            <div class="filter-group" id="department-filter-container">
                                <label for="schedule-department-filter">Departamento</label>
                                <select id="schedule-department-filter">
                                    <option value="all">Carregando...</option>
                                </select>
                            </div>
                            <button id="reset-filter" class="btn btn-secondary btn-icon" title="Voltar para mês atual">⟳</button>
                        </div>
                        
                        <div class="data-actions">
                            <button id="add-schedule" class="btn btn-primary">Nova Escala</button>
                            <button id="export-pdf" class="btn btn-secondary">Exportar PDF</button>
                        </div>
                        
                        <div id="schedules-list" class="data-content"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function initializeSchedulesEvents(user) {
        console.log('Inicializando eventos de escalas...');

        const addScheduleBtn = document.getElementById('add-schedule');
        const resetFilterBtn = document.getElementById('reset-filter');
        const monthYearInput = document.getElementById('schedule-month-year');
        const departmentFilter = document.getElementById('schedule-department-filter');
        const exportPdfBtn = document.getElementById('export-pdf');

        // Carregar opções do filtro de departamentos
        loadDepartmentFilterOptions(user, departmentFilter);

        if (addScheduleBtn) {
            addScheduleBtn.addEventListener('click', () => {
                console.log('Botão Nova Escala clicado');
                if (typeof showScheduleForm === 'function') {
                    showScheduleForm(user);
                } else {
                    console.error('Função showScheduleForm não encontrada');
                }
            });
        }

        if (resetFilterBtn && monthYearInput) {
            resetFilterBtn.addEventListener('click', () => {
                console.log('Botão Reset Filtro clicado');
                const today = new Date();
                monthYearInput.value = today.toISOString().slice(0, 7);
                if (departmentFilter) {
                    departmentFilter.value = 'all';
                }
                loadSchedulesData(user);
            });

            monthYearInput.addEventListener('change', () => {
                console.log('Filtro mês/ano alterado:', monthYearInput.value);
                loadSchedulesData(user);
            });
        }

        if (departmentFilter) {
            departmentFilter.addEventListener('change', () => {
                console.log('Filtro departamento alterado:', departmentFilter.value);
                loadSchedulesData(user);
            });
        }

        // Conectar botão de exportação PDF (removido o Excel)
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', exportToPdf);
        }

        loadSchedulesData(user);
    }

    // NOVA FUNÇÃO: Carregar opções do filtro de departamentos
    async function loadDepartmentFilterOptions(user, departmentFilter) {
        if (!departmentFilter) return;

        try {
            let departmentsQuery = supabase.from('departments').select('*').order('name');

            // Se for líder, carregar apenas seus departamentos
            if (user.level === 'Líder') {
                const { data: userDepartments, error: deptError } = await supabase
                    .from('user_departments')
                    .select('department_id')
                    .eq('user_id', user.id);

                if (!deptError && userDepartments && userDepartments.length > 0) {
                    const deptIds = userDepartments.map(ud => ud.department_id);
                    departmentsQuery = departmentsQuery.in('id', deptIds);
                }
            }

            const { data: departments, error } = await departmentsQuery;

            if (error) {
                console.error('Erro ao carregar departamentos:', error);
                departmentFilter.innerHTML = '<option value="all">Erro ao carregar</option>';
                return;
            }

            // Construir opções do filtro
            let options = '<option value="all">Todos os departamentos</option>';

            if (departments && departments.length > 0) {
                departments.forEach(dept => {
                    options += `<option value="${dept.id}">${dept.name}</option>`;
                });
            }

            departmentFilter.innerHTML = options;

        } catch (error) {
            console.error('Erro ao carregar filtro de departamentos:', error);
            departmentFilter.innerHTML = '<option value="all">Erro ao carregar</option>';
        }
    }

    async function loadSchedulesData(user) {
        if (typeof loadSchedules === 'function') {
            await loadSchedules(user);
        } else {
            console.error('Função loadSchedules não encontrada');
            const schedulesList = document.getElementById('schedules-list');
            if (schedulesList) {
                schedulesList.innerHTML = '<div class="message error">Função de carregamento não disponível</div>';
            }
        }
    }

    // ========== RELATÓRIOS DE ESCALAS ==========
    async function loadScheduleReportsContent(user) {
        const title = user.level === 'Líder' ? 'Meu Relatório de Escalas' : 'Relatório de Escalas';
        const description = user.level === 'Líder'
            ? 'Quantidade de escalas dos membros do seu departamento'
            : 'Quantidade de escalas de todos os membros por departamento';

        return `
            <div id="schedule-reports" class="content-section active">
                <div class="form-container">
                    <div class="form-header">
                        <h2>${title}</h2>
                        <p>${description}</p>
                    </div>
                    <div class="form-body">
                        <div class="filters">
                            <div class="filter-group">
                                <label for="report-month-year">Mês/Ano</label>
                                <input type="month" id="report-month-year" class="month-picker" value="${new Date().toISOString().slice(0, 7)}">
                            </div>
                            <button id="refresh-report" class="btn btn-primary btn-icon" title="Atualizar relatório">⟳</button>
                        </div>
                        
                        <div id="schedule-reports-list" class="data-content"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function initializeScheduleReportsEvents(user) {
        console.log('Inicializando eventos de relatórios...');

        const refreshReportBtn = document.getElementById('refresh-report');
        const monthYearInput = document.getElementById('report-month-year');

        if (refreshReportBtn) {
            refreshReportBtn.addEventListener('click', () => {
                console.log('Atualizando relatório...');
                loadScheduleReportsData(user);
            });
        }

        if (monthYearInput) {
            monthYearInput.addEventListener('change', () => {
                console.log('Filtro mês/ano alterado:', monthYearInput.value);
                loadScheduleReportsData(user);
            });
        }

        loadScheduleReportsData(user);
    }

    async function loadScheduleReportsData(user) {
        if (typeof loadScheduleReports === 'function') {
            await loadScheduleReports(user);
        } else {
            console.error('Função loadScheduleReports não encontrada');
            const reportsList = document.getElementById('schedule-reports-list');
            if (reportsList) {
                reportsList.innerHTML = '<div class="message error">Função de relatório não disponível</div>';
            }
        }
    }

    // ========== MEMBROS ==========
    async function loadMembersContent(user) {
        const showAddButton = user.level === 'Administrador' ? '' : 'style="display: none;"';

        return `
            <div id="members" class="content-section active">
                <div class="form-container">
                    <div class="form-header">
                        <h2>Gerenciar Membros</h2>
                        <p>Cadastre e gerencie os membros da igreja</p>
                    </div>
                    <div class="form-body">
                        <div class="data-actions">
                            <button id="add-member" class="btn btn-primary" ${showAddButton}>Novo Membro</button>
                        </div>
                        <div id="members-list" class="data-content"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function initializeMembersEvents(user) {
        const addMemberBtn = document.getElementById('add-member');

        if (addMemberBtn && user.level === 'Administrador') {
            addMemberBtn.addEventListener('click', () => {
                if (typeof showMemberForm === 'function') {
                    showMemberForm();
                } else {
                    console.error('Função showMemberForm não encontrada');
                }
            });
        }

        if (typeof loadMembers === 'function') {
            loadMembers(user);
        } else {
            console.error('Função loadMembers não encontrada');
            const membersList = document.getElementById('members-list');
            if (membersList) {
                membersList.innerHTML = '<div class="message error">Função de carregamento não disponível</div>';
            }
        }
    }

    // ========== DEPARTAMENTOS ==========
    async function loadDepartmentsContent(user) {
        const showAddButton = user.level === 'Administrador' ? '' : 'style="display: none;"';

        return `
            <div id="departments" class="content-section active">
                <div class="form-container">
                    <div class="form-header">
                        <h2>Gerenciar Departamentos</h2>
                        <p>Cadastre os departamentos e seus setores</p>
                    </div>
                    <div class="form-body">
                        <div class="data-actions">
                            <button id="add-department" class="btn btn-primary" ${showAddButton}>Novo Departamento</button>
                        </div>
                        <div id="departments-list" class="data-content"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function initializeDepartmentsEvents(user) {
        const addDepartmentBtn = document.getElementById('add-department');

        if (addDepartmentBtn && user.level === 'Administrador') {
            addDepartmentBtn.addEventListener('click', () => {
                if (typeof showDepartmentForm === 'function') {
                    showDepartmentForm();
                } else {
                    console.error('Função showDepartmentForm não encontrada');
                }
            });
        }

        if (typeof loadDepartments === 'function') {
            loadDepartments(user);
        } else {
            console.error('Função loadDepartments não encontrada');
            const departmentsList = document.getElementById('departments-list');
            if (departmentsList) {
                departmentsList.innerHTML = '<div class="message error">Função de carregamento não disponível</div>';
            }
        }
    }

    // ========== CULTOS ==========
    async function loadServicesContent(user) {
        const showAddButton = user.level === 'Administrador' ? '' : 'style="display: none;"';

        return `
            <div id="services" class="content-section active">
                <div class="form-container">
                    <div class="form-header">
                        <h2>Gerenciar Cultos</h2>
                        <p>Cadastre os horários de culto</p>
                    </div>
                    <div class="form-body">
                        <div class="data-actions">
                            <button id="add-service" class="btn btn-primary" ${showAddButton}>Novo Culto</button>
                        </div>
                        <div id="services-list" class="data-content"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function initializeServicesEvents(user) {
        const addServiceBtn = document.getElementById('add-service');

        if (addServiceBtn && user.level === 'Administrador') {
            addServiceBtn.addEventListener('click', () => {
                if (typeof showServiceForm === 'function') {
                    showServiceForm();
                } else {
                    console.error('Função showServiceForm não encontrada');
                }
            });
        }

        if (typeof loadServices === 'function') {
            loadServices(user);
        } else {
            console.error('Função loadServices não encontrada');
            const servicesList = document.getElementById('services-list');
            if (servicesList) {
                servicesList.innerHTML = '<div class="message error">Função de carregamento não disponível</div>';
            }
        }
    }

    // ========== USUÁRIOS ==========
    async function loadUsersContent(user) {
        if (user.level !== 'Administrador') {
            return `
                <div id="users" class="content-section active">
                    <div class="form-container">
                        <div class="form-header">
                            <h2>Gerenciar Usuários</h2>
                            <p>Acesso restrito a administradores</p>
                        </div>
                        <div class="form-body">
                            <div class="message error">Acesso restrito a administradores</div>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div id="users" class="content-section active">
                <div class="form-container">
                    <div class="form-header">
                        <h2>Gerenciar Usuários</h2>
                        <p>Cadastre os usuários do sistema</p>
                    </div>
                    <div class="form-body">
                        <div class="data-actions">
                            <button id="add-user" class="btn btn-primary">Novo Usuário</button>
                        </div>
                        <div id="users-list" class="data-content"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function initializeUsersEvents(user) {
        if (user.level !== 'Administrador') {
            console.log('Acesso à gestão de usuários negado - nível insuficiente');
            return;
        }

        const addUserBtn = document.getElementById('add-user');

        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => {
                if (typeof showUserForm === 'function') {
                    showUserForm();
                } else {
                    console.error('Função showUserForm não encontrada');
                }
            });
        }

        if (typeof loadUsers === 'function') {
            loadUsers();
        } else {
            console.error('Função loadUsers não encontrada');
            const usersList = document.getElementById('users-list');
            if (usersList) {
                usersList.innerHTML = '<div class="message error">Função de carregamento não disponível</div>';
            }
        }
    }

    // ========== FUNÇÕES AUXILIARES ==========
    async function getDashboardStats(user) {
        try {
            const [members, departments, services, users, schedules] = await Promise.all([
                getCount('members'),
                getCount('departments'),
                getCount('services'),
                getCount('users'),
                getSchedulesCount()
            ]);

            return {
                members: members || 0,
                departments: departments || 0,
                services: services || 0,
                users: users || 0,
                schedules: schedules || 0
            };
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            return { members: 0, departments: 0, services: 0, users: 0, schedules: 0 };
        }
    }

    async function getCount(tableName) {
        try {
            const { count, error } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.warn(`Erro na contagem de ${tableName}:`, error);
                // Tentar método alternativo
                const { data: items, error: fetchError } = await supabase
                    .from(tableName)
                    .select('id');

                if (!fetchError && items) return items.length;
                return 0;
            }
            return count || 0;
        } catch (error) {
            console.error(`Erro ao contar ${tableName}:`, error);
            return 0;
        }
    }

    async function getSchedulesCount() {
        try {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            const { count, error } = await supabase
                .from('schedules')
                .select('*', { count: 'exact', head: true })
                .gte('date', firstDay.toISOString().split('T')[0])
                .lte('date', lastDay.toISOString().split('T')[0]);

            if (error) {
                console.warn('Erro na contagem de escalas:', error);
                const { data: schedules, error: fetchError } = await supabase
                    .from('schedules')
                    .select('id')
                    .gte('date', firstDay.toISOString().split('T')[0])
                    .lte('date', lastDay.toISOString().split('T')[0]);

                if (!fetchError && schedules) return schedules.length;
                return 0;
            }
            return count || 0;
        } catch (error) {
            console.error('Erro ao contar escalas:', error);
            return 0;
        }
    }

    // ========== FUNÇÕES GLOBAIS ==========
    window.refreshDashboard = async function () {
        const user = await getCurrentUser();
        if (user) {
            // Recarregar a seção atual
            const activeTab = document.querySelector('.nav-tabs a.active');
            if (activeTab) {
                const currentSection = activeTab.getAttribute('data-page');
                loadSectionContent(currentSection, user);
            }
        }
    };

    window.forceDashboardRefresh = async function () {
        console.log('Forçando atualização do dashboard...');
        const user = await getCurrentUser();
        if (user) {
            const activeTab = document.querySelector('.nav-tabs a.active');
            if (activeTab) {
                const currentSection = activeTab.getAttribute('data-page');
                loadSectionContent(currentSection, user);
            }
        }
    };

    // Função para obter usuário atual
    window.getCurrentUser = async function () {
        return await checkAuth();
    };

    console.log('Dashboard.js carregado com sucesso - Versão 1.5 com Relatórios');
});