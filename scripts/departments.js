// scripts/departments.js - Versão ajustada para abas
document.addEventListener('DOMContentLoaded', function () {
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
                        <th style="padding: 12px; background: #f8f9fa; text-align: left;">Dia de Cadastro</th>
        `;

    // Mostrar coluna de ações apenas para administradores
    if (user.level === 'Administrador') {
        html += `<th style="padding: 12px; background: #f8f9fa; text-align: left;">Ações</th>`;
    }

    html += `</tr></thead><tbody>`;

    departments.forEach(dept => {
        const scheduleDay = dept.schedule_day
            ? `Dia ${dept.schedule_day}`
            : '<span style="color: #718096; font-style: italic;">Qualquer dia</span>';

        html += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px;">${dept.name}</td>
                    <td style="padding: 12px;">${dept.sectors.join(', ')}</td>
                    <td style="padding: 12px;">${scheduleDay}</td>
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
            btn.addEventListener('click', function () {
                const id = this.getAttribute('data-id');
                showDepartmentForm(id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = this.getAttribute('data-id');
                deleteDepartment(id);
            });
        });
    }
}

// FUNÇÃO showDepartmentForm ATUALIZADA - SEM BOTÃO "CADASTRAR E FECHAR"
function showDepartmentForm(id = null) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = id ? 'Editar Departamento' : 'Novo Departamento';

    modalBody.innerHTML = `
        <div class="form-group">
            <label for="department-name">Nome do Departamento *</label>
            <input type="text" id="department-name" placeholder="Nome do departamento" required>
        </div>
        <div class="form-group">
            <label for="department-sectors">Setores (separados por vírgula)</label>
            <input type="text" id="department-sectors" placeholder="Ex: Vocal, Instrumentos, Backing Vocal">
        </div>
        <div class="form-group">
            <label for="department-schedule-day">Dia para Cadastro de Escalas</label>
            <select id="department-schedule-day" style="margin-bottom: 8px;">
                <option value="">Qualquer dia (sem restrição)</option>
                <option value="1">Dia 1</option>
                <option value="2">Dia 2</option>
                <option value="3">Dia 3</option>
                <option value="4">Dia 4</option>
                <option value="5">Dia 5</option>
                <option value="6">Dia 6</option>
                <option value="7">Dia 7</option>
                <option value="8">Dia 8</option>
                <option value="9">Dia 9</option>
                <option value="10">Dia 10</option>
                <option value="11">Dia 11</option>
                <option value="12">Dia 12</option>
                <option value="13">Dia 13</option>
                <option value="14">Dia 14</option>
                <option value="15">Dia 15</option>
                <option value="16">Dia 16</option>
                <option value="17">Dia 17</option>
                <option value="18">Dia 18</option>
                <option value="19">Dia 19</option>
                <option value="20">Dia 20</option>
                <option value="21">Dia 21</option>
                <option value="22">Dia 22</option>
                <option value="23">Dia 23</option>
                <option value="24">Dia 24</option>
                <option value="25">Dia 25</option>
                <option value="26">Dia 26</option>
                <option value="27">Dia 27</option>
                <option value="28">Dia 28</option>
                <option value="29">Dia 29</option>
                <option value="30">Dia 30</option>
                <option value="31">Dia 31</option>
            </select>
            <div style="font-size: 0.8rem; color: #718096;">
                Selecione um dia específico do mês para este departamento cadastrar escalas.
                Se deixar em "Qualquer dia", não haverá restrição.
            </div>
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
                    const scheduleDayInput = document.getElementById('department-schedule-day');

                    if (nameInput && sectorsInput && scheduleDayInput) {
                        nameInput.value = data.name;
                        sectorsInput.value = data.sectors.join(', ');
                        scheduleDayInput.value = data.schedule_day || '';
                    }
                }
            });
    }

    // REMOVER CONFIGURAÇÃO ESPECÍFICA DE BOTÕES - DEIXAR APENAS OS PADRÕES
    // Os botões padrão do modal (Cancelar e Salvar) serão usados automaticamente

    // Configurar botão de salvar
    const saveBtn = document.getElementById('modal-save');
    if (saveBtn) {
        saveBtn.onclick = function () {
            saveDepartment(id);
        };
    }

    // Configurar botão de cancelar
    const cancelBtn = document.getElementById('modal-cancel');
    if (cancelBtn) {
        cancelBtn.onclick = function () {
            hideModal();
        };
    }

    // Mostrar modal
    showModal();
}

// ATUALIZAR FUNÇÃO saveDepartment
async function saveDepartment(id) {
    const nameInput = document.getElementById('department-name');
    const sectorsInput = document.getElementById('department-sectors');
    const scheduleDayInput = document.getElementById('department-schedule-day');

    if (!nameInput || !sectorsInput || !scheduleDayInput) return;

    const name = nameInput.value;
    const sectorsInputValue = sectorsInput.value;
    const sectors = sectorsInputValue.split(',').map(s => s.trim()).filter(s => s);
    const schedule_day = scheduleDayInput.value ? parseInt(scheduleDayInput.value) : null;

    if (!name) {
        alert('Por favor, informe o nome do departamento');
        return;
    }

    try {
        if (id) {
            // Editar departamento existente
            const { error } = await supabase
                .from('departments')
                .update({ name, sectors, schedule_day })
                .eq('id', id);

            if (error) throw error;
        } else {
            // Criar novo departamento
            const { error } = await supabase
                .from('departments')
                .insert([{ name, sectors, schedule_day }]);

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