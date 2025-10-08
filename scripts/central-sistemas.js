// scripts/central-sistemas.js - Versão completa com gerenciamento de usuários e filtragem de sistemas
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // Verificar se o usuário está logado
        const user = await checkAuth();

        if (!user) {
            // Redirecionar para login se não estiver autenticado
            window.location.href = 'index.html';
            return;
        }

        // Atualizar informações do usuário no cabeçalho
        const userNameElement = document.getElementById('user-name');
        const userLevelElement = document.getElementById('user-level');

        if (userNameElement) {
            userNameElement.textContent = user.username || 'Usuário';
        }

        if (userLevelElement) {
            userLevelElement.textContent = user.level || 'Nível';
        }

        // Mostrar/ocultar botão de configurações baseado no nível do usuário
        const configBtn = document.getElementById('config-btn');
        if (configBtn) {
            if (user.level === 'Administrador') {
                configBtn.style.display = 'flex';
                configBtn.addEventListener('click', showConfigModal);
            } else {
                configBtn.style.display = 'none';
            }
        }

        // Configurar botão de logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async function () {
                try {
                    // Adicionar efeito de loading
                    this.innerHTML = 'Saindo...';
                    this.disabled = true;

                    await customLogout();
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                    // Restaurar botão em caso de erro
                    this.innerHTML = 'Sair';
                    this.disabled = false;
                }
            });
        }

        // CARREGAR SISTEMAS FILTRADOS PARA O USUÁRIO
        await loadUserSystems();

    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = 'index.html';
    }
});

// Lista de sistemas disponíveis
const AVAILABLE_SYSTEMS = [
    { id: 'dashboard', name: 'ESCALAS', href: 'dashboard.html' },
    { id: 'sistema2', name: 'EVENTOS', href: 'sistema2.html' },
    { id: 'sistema3', name: 'FREQUÊNCIA', href: 'sistema3.html' },
    { id: 'sistema4', name: 'VERBO SHOP', href: 'sistema4.html' },
    { id: 'sistema5', name: 'VERBO CAFÉ', href: 'sistema5.html' },
    { id: 'sistema6', name: 'VERBO BRECHÓ', href: 'sistema6.html' }
];

// Função para carregar e exibir os sistemas baseado nas permissões do usuário
async function loadUserSystems() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        console.log('Carregando sistemas para o usuário:', user.username, user.level);

        let allowedSystems = [];

        // Administradores veem todos os sistemas
        if (user.level === 'Administrador') {
            allowedSystems = AVAILABLE_SYSTEMS;
            console.log('Usuário é administrador - mostrando todos os sistemas');
        } else {
            // Para outros usuários, verificar os sistemas permitidos
            const { data: userData, error } = await supabase
                .from('users')
                .select('allowed_systems')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Erro ao carregar permissões do usuário:', error);
                // EM CASO DE ERRO, NÃO MOSTRAR NENHUM SISTEMA
                allowedSystems = [];
                console.log('Erro ao carregar permissões - não mostrando nenhum sistema');
            } else if (userData && userData.allowed_systems && userData.allowed_systems.length > 0) {
                // Filtrar sistemas baseado nas permissões
                allowedSystems = AVAILABLE_SYSTEMS.filter(sys =>
                    userData.allowed_systems.includes(sys.id)
                );
                console.log('Sistemas permitidos encontrados:', allowedSystems);
            } else {
                // SE NÃO HÁ SISTEMAS DEFINIDOS, NÃO MOSTRAR NENHUM SISTEMA
                allowedSystems = [];
                console.log('Nenhum sistema específico definido - não mostrando nenhum sistema');
            }
        }

        renderSystemsGrid(allowedSystems);

    } catch (error) {
        console.error('Erro ao carregar sistemas do usuário:', error);
        // EM CASO DE ERRO, NÃO MOSTRAR NENHUM SISTEMA
        renderSystemsGrid([]);
    }
}

// Função para renderizar a grade de sistemas - VERSÃO COM MENSAGEM MELHORADA
function renderSystemsGrid(systems) {
    const grid = document.querySelector('.grid');
    if (!grid) {
        console.error('Elemento .grid não encontrado');
        return;
    }

    console.log('Renderizando sistemas:', systems);

    if (!systems || systems.length === 0) {
        grid.innerHTML = `
            <div class="no-systems-message">
                <h3 style="color: #718096; margin-bottom: 15px;">Nenhum sistema disponível</h3>
                <p style="color: #a0aec0; margin-bottom: 20px;">Seu usuário não tem acesso a nenhum sistema no momento.</p>
                <p style="color: #a0aec0; font-size: 14px;">Entre em contato com o administrador para solicitar acesso aos sistemas necessários.</p>
            </div>
        `;
        return;
    }

    let gridHTML = '';

    systems.forEach(system => {
        gridHTML += `
            <a class="card" href="${system.href}">${system.name}</a>
        `;
    });

    grid.innerHTML = gridHTML;

    // Reaplicar os efeitos hover nos cards
    const cards = grid.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Função para mostrar modal de configurações
async function showConfigModal() {
    try {
        // Criar modal se não existir
        let modal = document.getElementById('config-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'config-modal';
            modal.className = 'config-modal';
            modal.innerHTML = `
                <div class="config-modal-content">
                    <div class="config-modal-header">
                        <h2>Gerenciar Usuários</h2>
                        <span class="config-modal-close">&times;</span>
                    </div>
                    <div class="config-modal-body">
                        <div class="data-actions">
                            <button id="add-user-btn" class="btn btn-primary">Novo Usuário</button>
                        </div>
                        <div id="users-list-container">
                            <div style="text-align: center; padding: 20px; color: #718096;">
                                Carregando usuários...
                            </div>
                        </div>
                    </div>
                    <div class="config-modal-actions">
                        <button id="config-cancel" class="btn btn-secondary">Fechar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Configurar eventos do modal
            const closeBtn = modal.querySelector('.config-modal-close');
            const cancelBtn = modal.querySelector('#config-cancel');
            const addUserBtn = modal.querySelector('#add-user-btn');

            closeBtn.onclick = hideConfigModal;
            cancelBtn.onclick = hideConfigModal;
            addUserBtn.onclick = () => showUserForm();

            // Fechar modal ao clicar fora
            modal.onclick = function (event) {
                if (event.target === modal) {
                    hideConfigModal();
                }
            };
        }

        modal.style.display = 'block';
        document.body.classList.add('modal-open');

        // Carregar lista de usuários
        await loadUsersList();

    } catch (error) {
        console.error('Erro ao mostrar modal de configurações:', error);
    }
}

// Função para esconder modal de configurações
function hideConfigModal() {
    const modal = document.getElementById('config-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// Função para carregar lista de usuários
async function loadUsersList() {
    try {
        const container = document.getElementById('users-list-container');
        if (!container) return;

        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #718096;">Carregando usuários...</div>';

        // Buscar usuários do Supabase
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        if (!users || users.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #718096;">Nenhum usuário cadastrado.</div>';
            return;
        }

        // Criar tabela de usuários
        let tableHTML = `
            <table class="users-table">
                <thead>
                    <tr>
                        <th>Usuário</th>
                        <th>Nível</th>
                        <th>Sistemas Permitidos</th>
                        <th>Data de Criação</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;

        users.forEach(user => {
            const createdDate = new Date(user.created_at).toLocaleDateString('pt-BR');
            const allowedSystems = user.allowed_systems || [];
            const systemsText = user.level === 'Administrador'
                ? 'Todos os sistemas'
                : (allowedSystems.length > 0
                    ? allowedSystems.map(sysId => {
                        const system = AVAILABLE_SYSTEMS.find(s => s.id === sysId);
                        return system ? system.name : sysId;
                    }).join(', ')
                    : 'Nenhum sistema');

            tableHTML += `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.level}</td>
                    <td>${systemsText}</td>
                    <td>${createdDate}</td>
                    <td>
                        <button class="btn btn-primary btn-small edit-user" data-user-id="${user.id}">Editar</button>
                        ${user.level !== 'Administrador' ? `<button class="btn btn-secondary btn-small delete-user" data-user-id="${user.id}">Excluir</button>` : ''}
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;

        // Adicionar eventos aos botões
        document.querySelectorAll('.edit-user').forEach(btn => {
            btn.addEventListener('click', function () {
                const userId = this.getAttribute('data-user-id');
                showUserForm(userId);
            });
        });

        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', function () {
                const userId = this.getAttribute('data-user-id');
                deleteUser(userId);
            });
        });

    } catch (error) {
        console.error('Erro ao carregar lista de usuários:', error);
        const container = document.getElementById('users-list-container');
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #e53e3e;">Erro ao carregar usuários.</div>';
        }
    }
}

// Função para mostrar formulário de usuário
async function showUserForm(userId = null) {
    try {
        // Criar modal de formulário se não existir
        let formModal = document.getElementById('user-form-modal');
        if (!formModal) {
            formModal = document.createElement('div');
            formModal.id = 'user-form-modal';
            formModal.className = 'config-modal';
            document.body.appendChild(formModal);
        }

        // Carregar dados do usuário se for edição
        let userData = null;
        if (userId) {
            console.log('Carregando dados do usuário:', userId);
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Erro ao carregar usuário:', error);
                throw new Error('Erro ao carregar dados do usuário: ' + error.message);
            }
            userData = user;
            console.log('Dados do usuário carregados:', userData);
        }

        // Determinar sistemas permitidos
        let allowedSystems = [];
        if (userData && userData.allowed_systems) {
            allowedSystems = userData.allowed_systems;
        } else if (userData && userData.level === 'Administrador') {
            // Administradores têm acesso a todos os sistemas
            allowedSystems = AVAILABLE_SYSTEMS.map(sys => sys.id);
        } else {
            // Se não há sistemas definidos, permitir todos por padrão (serão filtrados depois)
            allowedSystems = AVAILABLE_SYSTEMS.map(sys => sys.id);
        }

        console.log('Sistemas permitidos:', allowedSystems);

        // Criar checkboxes para sistemas
        const systemsCheckboxes = AVAILABLE_SYSTEMS.map(system => {
            const isChecked = allowedSystems.includes(system.id);
            console.log(`Sistema ${system.name}: ${isChecked ? 'checked' : 'unchecked'}`);

            return `
                <div class="system-checkbox">
                    <input type="checkbox" id="system-${system.id}" name="allowed_systems" value="${system.id}" ${isChecked ? 'checked' : ''}>
                    <label for="system-${system.id}">${system.name}</label>
                </div>
            `;
        }).join('');

        // Usar IDs únicos para evitar conflitos
        const formId = 'user-form-' + (userId || 'new');
        const usernameId = 'user-username-' + (userId || 'new');
        const passwordId = 'user-password-' + (userId || 'new');
        const levelId = 'user-level-' + (userId || 'new');

        formModal.innerHTML = `
            <div class="config-modal-content" style="max-width: 600px;">
                <div class="config-modal-header">
                    <h2>${userId ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                    <span class="config-modal-close" onclick="hideUserFormModal()">&times;</span>
                </div>
                <div class="config-modal-body">
                    <form id="${formId}">
                        <div class="form-group">
                            <label for="${usernameId}">Usuário *</label>
                            <input type="text" id="${usernameId}" value="${userData ? userData.username : ''}" required 
                                   placeholder="Digite o nome de usuário">
                        </div>
                        
                        <div class="form-group">
                            <label for="${passwordId}">Senha ${userId ? '(deixe em branco para manter atual)' : '*'}</label>
                            <input type="password" id="${passwordId}" 
                                   placeholder="${userId ? 'Deixe em branco para não alterar' : 'Digite a senha'}" 
                                   ${userId ? '' : 'required'}>
                        </div>
                        
                        <div class="form-group">
                            <label for="${levelId}">Nível *</label>
                            <select id="${levelId}" required>
                                <option value="">Selecione o nível</option>
                                <option value="Pendente" ${userData && userData.level === 'Pendente' ? 'selected' : ''}>Pendente</option>
                                <option value="Líder" ${userData && userData.level === 'Líder' ? 'selected' : ''}>Líder</option>
                                <option value="Administrador" ${userData && userData.level === 'Administrador' ? 'selected' : ''}>Administrador</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Sistemas Permitidos</label>
                            <div class="systems-checkboxes">
                                ${systemsCheckboxes}
                            </div>
                            <small id="systems-help-text">Selecione quais sistemas este usuário poderá acessar</small>
                        </div>
                        
                        <div class="form-group" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="hideUserFormModal()">Cancelar</button>
                                <button type="submit" class="btn btn-primary">${userId ? 'Atualizar' : 'Cadastrar'}</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Mostrar modal
        formModal.style.display = 'block';
        document.body.classList.add('modal-open');

        // Configurar evento do formulário
        const form = formModal.querySelector(`#${formId}`);
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                console.log('Formulário submetido para usuário:', userId);

                // Passar os IDs específicos para a função saveUser
                await saveUser(userId, {
                    usernameId: usernameId,
                    passwordId: passwordId,
                    levelId: levelId,
                    formModal: formModal
                });
            };
        } else {
            console.error('Formulário não encontrado com ID:', formId);
        }

        // Configurar evento do botão close
        const closeBtn = formModal.querySelector('.config-modal-close');
        closeBtn.onclick = hideUserFormModal;

        // Fechar modal ao clicar fora
        formModal.onclick = function (event) {
            if (event.target === formModal) {
                hideUserFormModal();
            }
        };

        // Adicionar lógica para desabilitar sistemas para administradores
        setTimeout(() => {
            const levelSelect = formModal.querySelector(`#${levelId}`);
            const systemsContainer = formModal.querySelector('.systems-checkboxes');
            const helpText = formModal.querySelector('#systems-help-text');

            if (levelSelect && systemsContainer && helpText) {
                const updateSystemsVisibility = () => {
                    const isAdmin = levelSelect.value === 'Administrador';
                    const checkboxes = systemsContainer.querySelectorAll('input[type="checkbox"]');

                    checkboxes.forEach(checkbox => {
                        if (isAdmin) {
                            checkbox.checked = true;
                            checkbox.disabled = true;
                            checkbox.parentElement.style.opacity = '0.6';
                        } else {
                            checkbox.disabled = false;
                            checkbox.parentElement.style.opacity = '1';
                        }
                    });

                    // Atualizar o texto de ajuda
                    helpText.textContent = isAdmin
                        ? 'Administradores têm acesso a todos os sistemas automaticamente'
                        : 'Selecione quais sistemas este usuário poderá acessar';
                };

                // Aplicar inicialmente
                updateSystemsVisibility();

                // Aplicar quando o nível mudar
                levelSelect.addEventListener('change', updateSystemsVisibility);
            }
        }, 200);

        // Verificar se os elementos foram criados corretamente
        setTimeout(() => {
            console.log('Verificando elementos criados:');
            console.log('Username input:', !!formModal.querySelector(`#${usernameId}`));
            console.log('Level select:', !!formModal.querySelector(`#${levelId}`));
            console.log('Password input:', !!formModal.querySelector(`#${passwordId}`));

            const levelSelect = formModal.querySelector(`#${levelId}`);
            if (levelSelect && userData && userData.level) {
                console.log('Nível do usuário carregado:', userData.level);
                console.log('Valor selecionado no select:', levelSelect.value);
            }

            // Focar no primeiro campo
            const usernameInput = formModal.querySelector(`#${usernameId}`);
            if (usernameInput) usernameInput.focus();
        }, 100);

    } catch (error) {
        console.error('Erro ao mostrar formulário de usuário:', error);
        alert('Erro ao carregar formulário: ' + error.message);
    }
}

// Função para esconder modal de formulário
function hideUserFormModal() {
    const formModal = document.getElementById('user-form-modal');
    if (formModal) {
        formModal.style.display = 'none';
        formModal.innerHTML = ''; // Limpar conteúdo
        document.body.classList.remove('modal-open');
    }
}

// Função para salvar usuário
async function saveUser(userId = null, elementIds = null) {
    try {
        console.log('Iniciando salvamento do usuário:', userId);

        let formModal, usernameInput, passwordInput, levelSelect;

        if (elementIds) {
            // Usar IDs específicos fornecidos
            formModal = elementIds.formModal;
            usernameInput = formModal.querySelector(`#${elementIds.usernameId}`);
            passwordInput = formModal.querySelector(`#${elementIds.passwordId}`);
            levelSelect = formModal.querySelector(`#${elementIds.levelId}`);
        } else {
            // Buscar automaticamente (fallback)
            formModal = document.getElementById('user-form-modal');
            usernameInput = formModal.querySelector('#user-username');
            passwordInput = formModal.querySelector('#user-password');
            levelSelect = formModal.querySelector('#user-level');
        }

        console.log('Elementos encontrados:', {
            formModal: !!formModal,
            username: !!usernameInput,
            password: !!passwordInput,
            level: !!levelSelect
        });

        if (!formModal || !usernameInput || !levelSelect) {
            console.error('Elementos não encontrados:', {
                formModal: formModal,
                usernameInput: usernameInput,
                levelSelect: levelSelect
            });
            alert('Erro: Campos do formulário não encontrados. Recarregue a página e tente novamente.');
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput ? passwordInput.value : '';
        const level = levelSelect.value;

        // Obter sistemas selecionados DENTRO do modal
        const selectedSystems = Array.from(formModal.querySelectorAll('input[name="allowed_systems"]:checked'))
            .map(checkbox => checkbox.value);

        console.log('Sistemas selecionados:', selectedSystems);

        // VALIDAÇÃO IMPORTANTE: Garantir que pelo menos um sistema seja selecionado para não-administradores
        if (level !== 'Administrador' && selectedSystems.length === 0) {
            alert('Usuários que não são administradores devem ter pelo menos um sistema selecionado. Caso contrário, o usuário não terá acesso a nenhum sistema.');
            return;
        }

        // Validações básicas
        if (!username) {
            alert('Por favor, informe o nome de usuário');
            usernameInput.focus();
            return;
        }

        if (!level) {
            alert('Por favor, selecione o nível do usuário');
            levelSelect.focus();
            return;
        }

        if (!userId && !password) {
            alert('Por favor, informe uma senha para o novo usuário');
            if (passwordInput) passwordInput.focus();
            return;
        }

        // Preparar dados para salvar
        const userData = {
            username: username,
            level: level,
            // Administradores têm acesso a todos os sistemas automaticamente
            allowed_systems: level === 'Administrador' ? AVAILABLE_SYSTEMS.map(sys => sys.id) : selectedSystems
        };

        console.log('Dados a serem salvos:', userData);

        // Adicionar senha apenas se foi informada
        if (password) {
            userData.password = password;
        }

        let result;
        if (userId) {
            console.log('Atualizando usuário:', userId);

            // Verificar se o usuário existe antes de atualizar
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('id', userId)
                .single();

            if (checkError) {
                throw new Error('Usuário não encontrado: ' + checkError.message);
            }

            // Atualizar usuário existente
            const { data, error } = await supabase
                .from('users')
                .update(userData)
                .eq('id', userId);

            if (error) {
                console.error('Erro ao atualizar:', error);
                throw error;
            }

            result = 'Usuário atualizado com sucesso!';

        } else {
            console.log('Criando novo usuário');

            // Verificar se o usuário já existe
            const { data: existingUsers, error: checkError } = await supabase
                .from('users')
                .select('username')
                .eq('username', username);

            if (checkError) {
                console.warn('Não foi possível verificar usuário existente:', checkError);
            } else if (existingUsers && existingUsers.length > 0) {
                throw new Error('Este nome de usuário já está em uso');
            }

            // Criar novo usuário
            const { data, error } = await supabase
                .from('users')
                .insert([userData])
                .select()
                .single();

            if (error) {
                console.error('Erro ao criar:', error);
                throw error;
            }

            result = 'Usuário cadastrado com sucesso!';
        }

        // Fechar modal de formulário
        hideUserFormModal();

        // Pequeno delay para melhor UX
        await new Promise(resolve => setTimeout(resolve, 500));

        // Recarregar lista de usuários
        await loadUsersList();

        // Se o usuário atualizou seu próprio perfil, recarregar os sistemas
        const currentUser = await getCurrentUser();
        if (currentUser && userId === currentUser.id) {
            console.log('Usuário atualizou seu próprio perfil - recarregando sistemas...');
            await loadUserSystems();
        }

        // Mostrar mensagem de sucesso
        alert(result);

    } catch (error) {
        console.error('Erro detalhado ao salvar usuário:', error);

        let errorMessage = 'Erro ao salvar usuário';

        if (error.message.includes('duplicate key') || error.message.includes('username_unique')) {
            errorMessage = 'Este nome de usuário já está em uso. Por favor, escolha outro.';
        } else if (error.message.includes('Usuário não encontrado')) {
            errorMessage = 'Usuário não encontrado no banco de dados.';
        } else if (error.message.includes('já está em uso')) {
            errorMessage = error.message;
        } else {
            errorMessage += ': ' + (error.message || 'Erro desconhecido');
        }

        alert(errorMessage);
    }
}

// Função para excluir usuário
async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) {
            throw error;
        }

        alert('Usuário excluído com sucesso!');
        await loadUsersList(); // Recarregar lista

    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário: ' + error.message);
    }
}

// Função para verificar se há uma imagem de fundo
function checkBackgroundImage() {
    const body = document.body;
    const computedStyle = window.getComputedStyle(body);
    const backgroundImage = computedStyle.backgroundImage;

    // Se não há imagem de fundo ou é none/initial, aplicar gradiente
    if (!backgroundImage || backgroundImage === 'none' || backgroundImage === 'initial') {
        body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}

// Função para forçar atualização dos sistemas (útil para testes)
async function refreshUserSystems() {
    console.log('Forçando atualização dos sistemas...');
    await loadUserSystems();
}

// Verificar fundo ao carregar
window.addEventListener('load', checkBackgroundImage);

// Exportar funções para uso global
window.showUserForm = showUserForm;
window.hideUserFormModal = hideUserFormModal;
window.saveUser = saveUser;
window.refreshUserSystems = refreshUserSystems;