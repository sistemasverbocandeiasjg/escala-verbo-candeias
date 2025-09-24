// scripts/departments.js - Versão ajustada para abas
document.addEventListener('DOMContentLoaded', function() {
    // As funções serão chamadas pelo dashboard.js
});

// Função para carregar departamentos
async function loadDepartments(user) {
    try {
        const departmentsList = document.getElementById('departments-list');
        if (!departmentsList) return;
        
        let query = supabase
            .from('departments')
            .select('*')
            .order('name');
            
        const { data, error } = await query;
            
        if (error) throw error;
        
        renderDepartmentsList(data, user);
    } catch (error) {
        console.error('Erro ao carregar departamentos:', error);
        const departmentsList = document.getElementById('departments-list');
        if (departmentsList) {
            departmentsList.innerHTML = '<p class="message error">Erro ao carregar departamentos</p>';
        }
    }
}

function renderDepartmentsList(departments, user) {
    const departmentsList = document.getElementById('departments-list');
    if (!departmentsList) return;
    
    if (!departments || departments.length === 0) {
        departmentsList.innerHTML = '<p class="message">Nenhum departamento cadastrado</p>';
        return;
    }
    
    let html = `
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Nome</th>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Setores</th>
    `;
    
    // Mostrar coluna de ações apenas para administradores
    if (user.level === 'Administrador') {
        html += `<th style="padding: 12px; background: #f8f9fa; text-align: left;">Ações</th>`;
    }
    
    html += `</tr></thead><tbody>`;
    
    departments.forEach(dept => {
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px;">${dept.name}</td>
                <td style="padding: 12px;">${dept.sectors.join(', ')}</td>
        `;
        
        // Mostrar ações apenas para administradores
        if (user.level === 'Administrador') {
            html += `
                <td style="padding: 12px;">
                    <button class="action-btn edit-btn" data-id="${dept.id}" style="padding: 6px 12px; background: #4facfe; color: white; border: none; border-radius: 4px; margin-right: 5px; cursor: pointer;">Editar</button>
                    <button class="action-btn delete-btn" data-id="${dept.id}" style="padding: 6px 12px; background: #fa709a; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button>
                </td>
            `;
        }
        
        html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    departmentsList.innerHTML = html;
    
    // Adicionar event listeners para os botões (apenas para administradores)
    if (user.level === 'Administrador') {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                showDepartmentForm(id);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteDepartment(id);
            });
        });
    }
}
    
    function showDepartmentForm(id = null) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalTitle || !modalBody) return;
        
        modalTitle.textContent = id ? 'Editar Departamento' : 'Novo Departamento';
        
        modalBody.innerHTML = `
            <div class="form-group">
                <label for="department-name">Nome do Departamento</label>
                <input type="text" id="department-name" placeholder="Nome do departamento">
            </div>
            <div class="form-group">
                <label for="department-sectors">Setores (separados por vírgula)</label>
                <input type="text" id="department-sectors" placeholder="Ex: Vocal, Instrumentos, Backing Vocal">
            </div>
        `;
        
        // Preencher formulário se for edição
        if (id) {
            supabase
                .from('departments')
                .select('*')
                .eq('id', id)
                .single()
                .then(({ data, error }) => {
                    if (!error && data) {
                        const nameInput = document.getElementById('department-name');
                        const sectorsInput = document.getElementById('department-sectors');
                        if (nameInput && sectorsInput) {
                            nameInput.value = data.name;
                            sectorsInput.value = data.sectors.join(', ');
                        }
                    }
                });
        }
        
        // Configurar botão de salvar
        const saveBtn = document.getElementById('modal-save');
        if (saveBtn) {
            // Remover event listeners anteriores para evitar duplicação
            saveBtn.replaceWith(saveBtn.cloneNode(true));
            const newSaveBtn = document.getElementById('modal-save');
            
            newSaveBtn.onclick = function() {
                saveDepartment(id);
            };
        }
        
        // Mostrar modal
        showModal();
    }
    
    async function saveDepartment(id) {
        const nameInput = document.getElementById('department-name');
        const sectorsInput = document.getElementById('department-sectors');
        
        if (!nameInput || !sectorsInput) return;
        
        const name = nameInput.value;
        const sectorsInputValue = sectorsInput.value;
        const sectors = sectorsInputValue.split(',').map(s => s.trim()).filter(s => s);
        
        if (!name) {
            alert('Por favor, informe o nome do departamento');
            return;
        }
        
        try {
            if (id) {
                // Editar departamento existente
                const { error } = await supabase
                    .from('departments')
                    .update({ name, sectors })
                    .eq('id', id);
                    
                if (error) throw error;
            } else {
                // Criar novo departamento
                const { error } = await supabase
                    .from('departments')
                    .insert([{ name, sectors }]);
                    
                if (error) throw error;
            }
            
            // Fechar modal e recarregar lista
            const modal = document.getElementById('modal');
            hideModal();
            
            // Recarregar departamentos
            const user = await getCurrentUser();
            loadDepartments(user);
        } catch (error) {
            console.error('Erro ao salvar departamento:', error);
            alert('Erro ao salvar departamento: ' + error.message);
        }
    }
    
    async function deleteDepartment(id) {
        if (!confirm('Tem certeza que deseja excluir este departamento?')) return;
        
        try {
            const { error } = await supabase
                .from('departments')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            // Recarregar departamentos
            const user = await getCurrentUser();
            loadDepartments(user);
        } catch (error) {
            console.error('Erro ao excluir departamento:', error);
            alert('Erro ao excluir departamento: ' + error.message);
        }
    }

window.loadDepartments = loadDepartments;
window.showDepartmentForm = showDepartmentForm;