// scripts/members.js - Versão ajustada para abas
document.addEventListener('DOMContentLoaded', function() {
    // As funções serão chamadas pelo dashboard.js
});

// Função para carregar membros
async function loadMembers(user) {
    try {
        const membersList = document.getElementById('members-list');
        if (!membersList) return;
        
        let query = supabase
            .from('members')
            .select(`
                *,
                member_departments (
                    department_id,
                    departments (name)
                )
            `)
            .order('name');
            
        const { data, error } = await query;
            
        if (error) throw error;
        
        renderMembersList(data, user);
    } catch (error) {
        console.error('Erro ao carregar membros:', error);
        const membersList = document.getElementById('members-list');
        if (membersList) {
            membersList.innerHTML = '<p class="message error">Erro ao carregar membros</p>';
        }
    }
}

function renderMembersList(members, user) {
    const membersList = document.getElementById('members-list');
    if (!membersList) return;
    
    if (!members || members.length === 0) {
        membersList.innerHTML = '<p class="message">Nenhum membro cadastrado</p>';
        return;
    }
    
    let html = `
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Nome</th>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Email</th>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Telefone</th>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Tipo</th>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Departamentos</th>
    `;
    
    // Mostrar coluna de ações apenas para administradores
    if (user.level === 'Administrador') {
        html += `<th style="padding: 12px; background: #f8f9fa; text-align: left;">Ações</th>`;
    }
    
    html += `</tr></thead><tbody>`;
    
    members.forEach(member => {
        const departments = member.member_departments 
            ? member.member_departments.map(md => md.departments.name).join(', ')
            : 'Nenhum';
            
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px;">${member.name}</td>
                <td style="padding: 12px;">${member.email || '-'}</td>
                <td style="padding: 12px;">${member.phone}</td>
                <td style="padding: 12px;">${member.type}</td>
                <td style="padding: 12px;">${departments}</td>
        `;
        
        // Mostrar ações apenas para administradores
        if (user.level === 'Administrador') {
            html += `
                <td style="padding: 12px;">
                    <button class="action-btn edit-btn" data-id="${member.id}" style="padding: 6px 12px; background: #4facfe; color: white; border: none; border-radius: 4px; margin-right: 5px; cursor: pointer;">Editar</button>
                    <button class="action-btn delete-btn" data-id="${member.id}" style="padding: 6px 12px; background: #fa709a; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button>
                </td>
            `;
        }
        
        html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    membersList.innerHTML = html;
    
    // Adicionar event listeners para os botões (apenas para administradores)
    if (user.level === 'Administrador') {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                showMemberForm(id);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteMember(id);
            });
        });
    }
}

// As demais funções permanecem as mesmas
async function showMemberForm(id = null) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = id ? 'Editar Membro' : 'Novo Membro';
    
    // Carregar departamentos para o select
    const { data: departments, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
        
    if (error) {
        console.error('Erro ao carregar departamentos:', error);
        return;
    }
    
    let departmentOptions = '';
    departments.forEach(dept => {
        departmentOptions += `<option value="${dept.id}">${dept.name}</option>`;
    });
    
    modalBody.innerHTML = `
        <div class="form-group">
            <label for="member-name">Nome *</label>
            <input type="text" id="member-name" placeholder="Nome completo" required>
        </div>
        <div class="form-group">
            <label for="member-email">Email</label>
            <input type="email" id="member-email" placeholder="Email">
        </div>
        <div class="form-group">
            <label for="member-phone">Telefone *</label>
            <input type="text" id="member-phone" placeholder="Telefone" required>
        </div>
        <div class="form-group">
            <label for="member-type">Tipo *</label>
            <select id="member-type" required>
                <option value="">Selecione</option>
                <option value="Liderado">Liderado</option>
                <option value="Convidado">Convidado</option>
            </select>
        </div>
        <div class="form-group">
            <label>Departamentos *</label>
            <div id="departments-checkboxes" style="display: grid; gap: 10px; max-height: 200px; overflow-y: auto; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px;">
                ${departments.map(dept => `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="dept-${dept.id}" value="${dept.id}">
                        <label for="dept-${dept.id}">${dept.name}</label>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Preencher formulário se for edição
    if (id) {
        const { data: member, error } = await supabase
            .from('members')
            .select(`
                *,
                member_departments (department_id)
            `)
            .eq('id', id)
            .single();
            
        if (!error && member) {
            const nameInput = document.getElementById('member-name');
            const emailInput = document.getElementById('member-email');
            const phoneInput = document.getElementById('member-phone');
            const typeSelect = document.getElementById('member-type');
            
            if (nameInput && emailInput && phoneInput && typeSelect) {
                nameInput.value = member.name;
                emailInput.value = member.email || '';
                phoneInput.value = member.phone;
                typeSelect.value = member.type;
            }
            
            // Marcar checkboxes dos departamentos
            if (member.member_departments) {
                member.member_departments.forEach(md => {
                    const checkbox = document.getElementById(`dept-${md.department_id}`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }
    }
    
    // Configurar botão de salvar
    const saveBtn = document.getElementById('modal-save');
    if (saveBtn) {
        saveBtn.onclick = function() {
            saveMember(id);
        };
    }
    
    // Mostrar modal
    showModal();
}
    
    async function saveMember(id) {
        const nameInput = document.getElementById('member-name');
        const emailInput = document.getElementById('member-email');
        const phoneInput = document.getElementById('member-phone');
        const typeSelect = document.getElementById('member-type');
        
        if (!nameInput || !emailInput || !phoneInput || !typeSelect) return;
        
        const name = nameInput.value;
        const email = emailInput.value;
        const phone = phoneInput.value;
        const type = typeSelect.value;
        
        // Obter departamentos selecionados
        const departmentCheckboxes = document.querySelectorAll('#departments-checkboxes input[type="checkbox"]:checked');
        const departments = Array.from(departmentCheckboxes).map(cb => parseInt(cb.value));
        
        if (!name || !phone || !type || departments.length === 0) {
            alert('Por favor, preencha todos os campos obrigatórios (*)');
            return;
        }
        
        try {
            if (id) {
                // Editar membro existente
                const { error } = await supabase
                    .from('members')
                    .update({ name, email, phone, type })
                    .eq('id', id);
                    
                if (error) throw error;
                
                // Atualizar departamentos do membro
                // Primeiro remover todas as associações existentes
                await supabase
                    .from('member_departments')
                    .delete()
                    .eq('member_id', id);
                    
                // Adicionar novas associações
                if (departments.length > 0) {
                    const memberDepartments = departments.map(deptId => ({
                        member_id: id,
                        department_id: deptId
                    }));
                    
                    const { error: deptError } = await supabase
                        .from('member_departments')
                        .insert(memberDepartments);
                        
                    if (deptError) throw deptError;
                }
            } else {
                // Criar novo membro
                const { data: newMember, error } = await supabase
                    .from('members')
                    .insert([{ name, email, phone, type }])
                    .select()
                    .single();
                    
                if (error) throw error;
                
                // Adicionar associações com departamentos
                if (departments.length > 0) {
                    const memberDepartments = departments.map(deptId => ({
                        member_id: newMember.id,
                        department_id: deptId
                    }));
                    
                    const { error: deptError } = await supabase
                        .from('member_departments')
                        .insert(memberDepartments);
                        
                    if (deptError) throw deptError;
                }
            }
            
            // Fechar modal e recarregar lista
            const modal = document.getElementById('modal');
            hideModal();
            
            // Recarregar membros
            const user = await getCurrentUser();
            loadMembers(user);
        } catch (error) {
            console.error('Erro ao salvar membro:', error);
            alert('Erro ao salvar membro: ' + error.message);
        }
    }
    
    async function deleteMember(id) {
        if (!confirm('Tem certeza que deseja excluir este membro?')) return;
        
        try {
            const { error } = await supabase
                .from('members')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            // Recarregar membros
            const user = await getCurrentUser();
            loadMembers(user);
        } catch (error) {
            console.error('Erro ao excluir membro:', error);
            alert('Erro ao excluir membro: ' + error.message);
        }
    }

window.loadMembers = loadMembers;
window.showMemberForm = showMemberForm;
