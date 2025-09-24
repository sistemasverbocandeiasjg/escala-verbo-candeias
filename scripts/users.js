// scripts/users.js - Versão ajustada para abas
document.addEventListener('DOMContentLoaded', function() {
    // As funções serão chamadas pelo dashboard.js
});

// Função para carregar usuários
async function loadUsers() {
    try {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;
        
        console.log('Carregando usuários...');
        const { data: users, error } = await supabase
            .from('users')
            .select(`
                *,
                user_departments (
                    department_id,
                    departments (name)
                )
            `)
            .order('username');
            
        if (error) {
            console.error('Erro ao buscar usuários:', error);
            throw error;
        }
        
        console.log('Usuários carregados:', users);
        renderUsersList(users);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        const usersList = document.getElementById('users-list');
        if (usersList) {
            usersList.innerHTML = '<p class="message error">Erro ao carregar usuários</p>';
        }
    }
}

function renderUsersList(users) {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;
    
    console.log('Renderizando lista de usuários:', users);
    
    if (!users || users.length === 0) {
        usersList.innerHTML = `
            <div class="empty-state">
                <p>Nenhum usuário cadastrado</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Usuário</th>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Nível</th>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Departamentos</th>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Data de Criação</th>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Ações</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        const createdAt = new Date(user.created_at).toLocaleDateString('pt-BR');
        
        // Extrair nomes dos departamentos
        let departmentNames = 'Nenhum';
        if (user.user_departments && user.user_departments.length > 0) {
            departmentNames = user.user_departments
                .map(ud => ud.departments?.name || `Departamento ${ud.department_id}`)
                .join(', ');
        }
            
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px;">${user.username}</td>
                <td style="padding: 12px;">${user.level}</td>
                <td style="padding: 12px;">${departmentNames}</td>
                <td style="padding: 12px;">${createdAt}</td>
                <td style="padding: 12px;">
                    <button class="action-btn edit-btn" data-id="${user.id}" style="padding: 6px 12px; background: #4facfe; color: white; border: none; border-radius: 4px; margin-right: 5px; cursor: pointer;">Editar</button>
                    <button class="action-btn delete-btn" data-id="${user.id}" style="padding: 6px 12px; background: #fa709a; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    usersList.innerHTML = html;
    
    // Reatribuir event listeners após renderizar
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            showUserForm(id);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            deleteUser(id);
        });
    });
}
    
    async function showUserForm(id = null) {
        // Carregar departamentos
        const { data: departments, error: deptError } = await supabase
            .from('departments')
            .select('*');
            
        if (deptError) {
            console.error('Erro ao carregar departamentos:', deptError);
            return;
        }
        
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalTitle || !modalBody) {
            console.error('Elementos do modal não encontrados');
            return;
        }
        
        modalTitle.textContent = id ? 'Editar Usuário' : 'Novo Usuário';
        
        // Carregar dados do usuário
        let user = null;
        let userDepartmentIds = [];
        
        if (id) {
            try {
                // Carregar usuário
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', id)
                    .single();
                    
                if (userError) throw userError;
                user = userData;
                
                // Carregar departamentos do usuário da tabela user_departments
                const { data: userDepts, error: deptError } = await supabase
                    .from('user_departments')
                    .select('department_id')
                    .eq('user_id', id);
                    
                if (!deptError && userDepts) {
                    userDepartmentIds = userDepts.map(ud => ud.department_id);
                }
                
            } catch (error) {
                console.error('Erro ao carregar usuário:', error);
                await showResultModal('Erro ao carregar dados do usuário', 'Erro');
                return;
            }
        }
        
        // Criar checkboxes para departamentos
        let departmentsCheckboxes = '';
        if (departments && departments.length > 0) {
            departmentsCheckboxes = departments.map(dept => `
                <div class="checkbox-item">
                    <input type="checkbox" id="dept-${dept.id}" name="departments" value="${dept.id}" 
                        ${userDepartmentIds.includes(dept.id) ? 'checked' : ''}>
                    <label for="dept-${dept.id}">${dept.name}</label>
                </div>
            `).join('');
        } else {
            departmentsCheckboxes = '<p class="no-departments">Nenhum departamento cadastrado</p>';
        }
        
        modalBody.innerHTML = `
            <div class="form-group">
                <label for="user-username">Usuário *</label>
                <input type="text" id="user-username" value="${user ? user.username : ''}" required>
            </div>
            
            <div class="form-group">
                <label for="user-password">Senha ${id ? '(deixe em branco para manter atual)' : '*'}</label>
                <input type="password" id="user-password" placeholder="${id ? 'Deixe em branco para não alterar' : 'Digite a senha'}" ${id ? '' : 'required'}>
            </div>
            
            <div class="form-group">
                <label for="user-level">Nível *</label>
                <select id="user-level" required>
                    <option value="">Selecione</option>
                    <option value="Pendente" ${user && user.level === 'Pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="Líder" ${user && user.level === 'Líder' ? 'selected' : ''}>Líder</option>
                    <option value="Administrador" ${user && user.level === 'Administrador' ? 'selected' : ''}>Administrador</option>
                </select>
            </div>
            
            <div class="form-group" id="user-departments-container" style="display: none;">
                <label>Departamentos (selecione os departamentos que este líder gerenciará)</label>
                <div class="checkbox-group" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
                    ${departmentsCheckboxes}
                </div>
                <small>Selecione os departamentos que este líder irá gerenciar</small>
            </div>
        `;
        
        // Mostrar/ocultar departamentos baseado no nível
        const levelSelect = document.getElementById('user-level');
        const deptContainer = document.getElementById('user-departments-container');
        
        if (levelSelect && deptContainer) {
            if ((user && user.level === 'Líder') || levelSelect.value === 'Líder') {
                deptContainer.style.display = 'block';
            }
            
            levelSelect.addEventListener('change', function() {
                deptContainer.style.display = this.value === 'Líder' ? 'block' : 'none';
            });
        }
        
        // Configurar botão de salvar
        const saveBtn = document.getElementById('modal-save');
        if (saveBtn) {
            // Remover event listener anterior para evitar duplicação
            const newSaveBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
            
            newSaveBtn.onclick = async function() {
                await saveUser(id, departments);
            };
        }
        
        // Configurar botão de cancelar
        const cancelBtn = document.getElementById('modal-cancel');
        if (cancelBtn) {
            cancelBtn.onclick = function() {
                hideModal();
            };
        }
        
        showModal();
    }
    
    async function saveUser(id, allDepartments) {
        const usernameInput = document.getElementById('user-username');
        const passwordInput = document.getElementById('user-password');
        const levelSelect = document.getElementById('user-level');
        const departmentCheckboxes = document.querySelectorAll('input[name="departments"]:checked');
        
        if (!usernameInput || !levelSelect) return;
        
        const username = usernameInput.value;
        const password = passwordInput.value;
        const level = levelSelect.value;
        
        if (!username || !level) {
            await showResultModal('Por favor, preencha todos os campos obrigatórios (*)', 'Atenção');
            return;
        }
        
        // Obter IDs e NOMES dos departamentos selecionados (apenas se for líder)
        let selectedDepartmentIds = [];
        let selectedDepartmentNames = [];
        
        if (level === 'Líder') {
            selectedDepartmentIds = Array.from(departmentCheckboxes).map(checkbox => {
                const deptId = parseInt(checkbox.value);
                const dept = allDepartments.find(d => d.id === deptId);
                if (dept) {
                    selectedDepartmentNames.push(dept.name);
                }
                return deptId;
            });
            
            if (selectedDepartmentIds.length === 0) {
                await showResultModal('Líderes devem ter pelo menos um departamento associado', 'Atenção');
                return;
            }
        }
        
        try {
            // Primeira confirmação
            const confirmResult = await showConfirmModal(
                id ? 'Tem certeza que deseja editar este usuário?' : 'Tem certeza que deseja cadastrar este novo usuário?',
                id ? 'Confirmar Edição' : 'Confirmar Cadastro'
            );
            
            if (!confirmResult) return;
            
            let resultMessage = '';
            
            if (id) {
                // Editar usuário existente
                const updateData = { 
                    username: username,
                    level: level,
                    departments: selectedDepartmentNames
                };
                
                if (password) {
                    updateData.password = password;
                }
                
                const { error: userError } = await supabase
                    .from('users')
                    .update(updateData)
                    .eq('id', id);
                    
                if (userError) throw userError;
                
                await updateUserDepartments(id, selectedDepartmentIds);
                resultMessage = 'Usuário editado com sucesso!';
                
            } else {
                // Criar novo usuário
                if (!password) {
                    await showResultModal('Por favor, informe uma senha para o novo usuário', 'Atenção');
                    return;
                }
                
                // VERIFICAÇÃO ALTERNATIVA - Buscar todos os usuários e filtrar localmente
                let userExists = false;
                try {
                    const { data: allUsers, error: fetchError } = await supabase
                        .from('users')
                        .select('username');
                        
                    if (!fetchError && allUsers) {
                        userExists = allUsers.some(user => user.username === username);
                    }
                } catch (checkError) {
                    console.warn('Não foi possível verificar usuário existente, continuando...', checkError);
                    // Continua mesmo com erro na verificação
                }
                
                if (userExists) {
                    await showResultModal('Este nome de usuário já está em uso. Por favor, escolha outro.', 'Atenção');
                    return;
                }
                
                // Inserir novo usuário
                const { data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert([{ 
                        username: username,
                        password: password,
                        level: level,
                        departments: selectedDepartmentNames
                    }])
                    .select()
                    .single();
                    
                if (insertError) {
                    console.error('Erro ao inserir usuário:', insertError);
                    throw insertError;
                }
                
                if (level === 'Líder' && selectedDepartmentIds.length > 0) {
                    await updateUserDepartments(newUser.id, selectedDepartmentIds);
                }
                resultMessage = 'Usuário cadastrado com sucesso!';
            }
            
            // Fechar o modal de formulário
            hideModal();
            
            // Pequeno delay para melhor UX
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Mostrar confirmação de sucesso
            await showResultModal(resultMessage, 'Sucesso');
            
            // Recarregar a lista de usuários após o sucesso
            setTimeout(() => {
                loadUsers();
            }, 300);
            
        } catch (error) {
            console.error('Erro ao salvar usuário:', error);
            
            let errorMessage = 'Erro ao salvar usuário';
            if (error.code === 'PGRST301' || error.message.includes('406')) {
                errorMessage = 'Erro de permissão no banco de dados. Verifique se a tabela users existe e tem as colunas corretas.';
            } else if (error.message.includes('duplicate key')) {
                errorMessage = 'Este nome de usuário já está em uso.';
            }
            
            await showResultModal(
                errorMessage + ': ' + (error.message || 'Erro desconhecido'),
                'Erro'
            );
        }
    }
    
    async function updateUserDepartments(userId, departmentIds) {
        try {
            // Remover todas as associações existentes
            const { error: deleteError } = await supabase
                .from('user_departments')
                .delete()
                .eq('user_id', userId);
                
            if (deleteError) throw deleteError;
            
            // Adicionar novas associações
            if (departmentIds.length > 0) {
                const userDepartments = departmentIds.map(deptId => ({
                    user_id: userId,
                    department_id: deptId
                }));
                
                const { error: insertError } = await supabase
                    .from('user_departments')
                    .insert(userDepartments);
                    
                if (insertError) throw insertError;
            }
        } catch (error) {
            console.error('Erro ao atualizar departamentos:', error);
            throw error;
        }
    }
    
    async function deleteUser(id) {
        if (!id) return;
        
        try {
            // Primeira confirmação
            const confirmDelete = await showConfirmModal(
                'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.',
                'Confirmar Exclusão'
            );
            
            if (!confirmDelete) return;
            
            // Executar exclusão
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            // Segunda confirmação (sucesso)
            await showResultModal(
                'Usuário excluído com sucesso!',
                'Sucesso'
            );
            
            // Recarregar lista após exclusão
            loadUsers();
            
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            await showResultModal(
                'Erro ao excluir usuário: ' + error.message,
                'Erro'
            );
        }
    }

window.loadUsers = loadUsers;
window.showUserForm = showUserForm;
window.deleteUser = deleteUser;