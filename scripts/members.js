// scripts/members.js - Versão ajustada para abas
document.addEventListener('DOMContentLoaded', function () {
    // As funções serão chamadas pelo dashboard.js
});

// ATUALIZAR A QUERY NO loadMembers PARA BUSCAR OS LIMITES
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
                    monthly_limit,
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

// ATUALIZAR FUNÇÃO renderMembersList NO members.js
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
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Limite de Escalas</th>
    `;

    // Mostrar coluna de ações apenas para administradores
    if (user.level === 'Administrador') {
        html += `<th style="padding: 12px; background: #f8f9fa; text-align: left;">Ações</th>`;
    }

    html += `</tr></thead><tbody>`;

    members.forEach(member => {
        // Processar informações dos departamentos e limites
        const departmentsInfo = member.member_departments
            ? member.member_departments.map(md => {
                const deptName = md.departments?.name || 'Departamento';
                const limitText = md.monthly_limit
                    ? `${md.monthly_limit} vez(es)/mês`
                    : 'Ilimitado';
                return {
                    name: deptName,
                    limit: limitText,
                    hasLimit: !!md.monthly_limit
                };
            })
            : [];

        const departmentsText = departmentsInfo.length > 0
            ? departmentsInfo.map(dept => dept.name).join(', ')
            : 'Nenhum';

        // Criar texto formatado para os limites
        const limitsText = departmentsInfo.length > 0
            ? departmentsInfo.map(dept =>
                `<div style="margin-bottom: 4px;">
                    <strong>${dept.name}:</strong> 
                    <span style="color: ${dept.hasLimit ? '#2d3748' : '#718096'}; font-size: 0.9em;">
                        ${dept.limit}
                    </span>
                </div>`
            ).join('')
            : '<span style="color: #718096; font-style: italic;">Nenhum limite definido</span>';

        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px;">${member.name}</td>
                <td style="padding: 12px;">${member.email || '-'}</td>
                <td style="padding: 12px;">${member.phone}</td>
                <td style="padding: 12px;">${member.type}</td>
                <td style="padding: 12px;">${departmentsText}</td>
                <td style="padding: 12px; font-size: 0.9em;">
                    ${limitsText}
                </td>
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
            btn.addEventListener('click', function () {
                const id = this.getAttribute('data-id');
                showMemberForm(id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = this.getAttribute('data-id');
                deleteMember(id);
            });
        });
    }
}

// ATUALIZAR A FUNÇÃO showMemberForm NO members.js
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

    // CORREÇÃO: Layout organizado para os checkboxes de departamentos COM LIMITE
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
            <div id="departments-checkboxes" style="
                display: grid; 
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 12px; 
                max-height: 250px; 
                overflow-y: auto; 
                padding: 15px; 
                border: 1px solid #e2e8f0; 
                border-radius: 6px;
                background: #f8f9fa;
                margin-top: 8px;
            ">
                ${departments.map(dept => `
                    <div style="
                        display: flex; 
                        flex-direction: column;
                        gap: 8px;
                        padding: 12px;
                        background: white;
                        border-radius: 4px;
                        border: 1px solid #e2e8f0;
                        transition: all 0.2s ease;
                    " class="checkbox-item">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input 
                                type="checkbox" 
                                id="dept-${dept.id}" 
                                value="${dept.id}"
                                style="
                                    width: 18px;
                                    height: 18px;
                                    margin: 0;
                                    cursor: pointer;
                                "
                            >
                            <label 
                                for="dept-${dept.id}" 
                                style="
                                    margin: 0;
                                    cursor: pointer;
                                    font-weight: 500;
                                    color: #2d3748;
                                    flex: 1;
                                "
                            >
                                ${dept.name}
                            </label>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-left: 28px;">
                            <label for="dept-limit-${dept.id}" style="font-size: 0.8rem; color: #718096;">
                                Limite mensal:
                            </label>
                            <input 
                                type="number" 
                                id="dept-limit-${dept.id}" 
                                min="0" 
                                max="31"
                                placeholder="Ilimitado"
                                style="
                                    width: 80px;
                                    padding: 4px 8px;
                                    border: 1px solid #e2e8f0;
                                    border-radius: 4px;
                                    font-size: 0.8rem;
                                "
                            >
                            <span style="font-size: 0.7rem; color: #a0aec0;">vezes/mês</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="font-size: 0.8rem; color: #718096; margin-top: 6px;">
                Selecione pelo menos um departamento. Deixe o limite em branco para escalas ilimitadas.
            </div>
        </div>
    `;

    // Preencher formulário se for edição
    if (id) {
        const { data: member, error } = await supabase
            .from('members')
            .select(`
                *,
                member_departments (department_id, monthly_limit)
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

            // Marcar checkboxes dos departamentos e preencher limites
            if (member.member_departments) {
                member.member_departments.forEach(md => {
                    const checkbox = document.getElementById(`dept-${md.department_id}`);
                    const limitInput = document.getElementById(`dept-limit-${md.department_id}`);

                    if (checkbox) {
                        checkbox.checked = true;
                        // Habilitar o input de limite quando o checkbox está marcado
                        if (limitInput) {
                            limitInput.disabled = false;
                            limitInput.value = md.monthly_limit || '';
                        }
                    }
                });
            }
        }
    }

    // Adicionar event listeners para os checkboxes controlarem os inputs de limite
    departments.forEach(dept => {
        const checkbox = document.getElementById(`dept-${dept.id}`);
        const limitInput = document.getElementById(`dept-limit-${dept.id}`);

        if (checkbox && limitInput) {
            // Inicialmente desabilitar se não estiver checked
            if (!checkbox.checked) {
                limitInput.disabled = true;
                limitInput.value = '';
            }

            checkbox.addEventListener('change', function () {
                limitInput.disabled = !this.checked;
                if (!this.checked) {
                    limitInput.value = '';
                }
            });
        }
    });

    // Configurar botão de salvar
    const saveBtn = document.getElementById('modal-save');
    if (saveBtn) {
        saveBtn.onclick = function () {
            saveMember(id);
        };
    }

    // Mostrar modal
    showModal();
}

// ATUALIZAR FUNÇÃO saveMember PARA SALVAR LIMITES
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

    // Obter departamentos selecionados COM LIMITES
    const departmentCheckboxes = document.querySelectorAll('#departments-checkboxes input[type="checkbox"]:checked');
    const memberDepartments = [];

    departmentCheckboxes.forEach(cb => {
        const departmentId = parseInt(cb.value);
        const limitInput = document.getElementById(`dept-limit-${departmentId}`);
        const monthly_limit = limitInput && limitInput.value ? parseInt(limitInput.value) : null;

        memberDepartments.push({
            member_id: id, // Será atualizado após criar o membro
            department_id: departmentId,
            monthly_limit: monthly_limit
        });
    });

    if (!name || !phone || !type || memberDepartments.length === 0) {
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

            // Atualizar departamentos do membro COM LIMITES
            // Primeiro remover todas as associações existentes
            await supabase
                .from('member_departments')
                .delete()
                .eq('member_id', id);

            // Adicionar novas associações COM LIMITES
            if (memberDepartments.length > 0) {
                const memberDepartmentsToInsert = memberDepartments.map(md => ({
                    ...md,
                    member_id: id
                }));

                const { error: deptError } = await supabase
                    .from('member_departments')
                    .insert(memberDepartmentsToInsert);

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

            // Adicionar associações com departamentos COM LIMITES
            if (memberDepartments.length > 0) {
                const memberDepartmentsToInsert = memberDepartments.map(md => ({
                    ...md,
                    member_id: newMember.id
                }));

                const { error: deptError } = await supabase
                    .from('member_departments')
                    .insert(memberDepartmentsToInsert);

                if (deptError) throw deptError;
            }
        }

        // Fechar modal e recarregar lista
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
