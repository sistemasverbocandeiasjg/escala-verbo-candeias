// scripts/services.js - Versão ajustada para abas
document.addEventListener('DOMContentLoaded', function() {
    // As funções serão chamadas pelo dashboard.js
});

// Função para carregar cultos
async function loadServices(user) {
    try {
        const servicesList = document.getElementById('services-list');
        if (!servicesList) return;
        
        let query = supabase
            .from('services')
            .select('*')
            .order('name');
            
        const { data, error } = await query;
            
        if (error) throw error;
        
        renderServicesList(data, user);
    } catch (error) {
        console.error('Erro ao carregar cultos:', error);
        const servicesList = document.getElementById('services-list');
        if (servicesList) {
            servicesList.innerHTML = '<p class="message error">Erro ao carregar cultos</p>';
        }
    }
}

function renderServicesList(services, user) {
    const servicesList = document.getElementById('services-list');
    if (!servicesList) return;
    
    if (!services || services.length === 0) {
        servicesList.innerHTML = '<p class="message">Nenhum culto cadastrado</p>';
        return;
    }
    
    let html = `
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Nome</th>
    `;
    
    // Mostrar coluna de ações apenas para administradores
    if (user.level === 'Administrador') {
        html += `<th style="padding: 12px; background: #f8f9fa; text-align: left;">Ações</th>`;
    }
    
    html += `</tr></thead><tbody>`;
    
    services.forEach(service => {
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px;">${service.name}</td>
        `;
        
        // Mostrar ações apenas para administradores
        if (user.level === 'Administrador') {
            html += `
                <td style="padding: 12px;">
                    <button class="action-btn edit-btn" data-id="${service.id}" style="padding: 6px 12px; background: #4facfe; color: white; border: none; border-radius: 4px; margin-right: 5px; cursor: pointer;">Editar</button>
                    <button class="action-btn delete-btn" data-id="${service.id}" style="padding: 6px 12px; background: #fa709a; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button>
                </td>
            `;
        }
        
        html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    servicesList.innerHTML = html;
    
    // Adicionar event listeners para os botões (apenas para administradores)
    if (user.level === 'Administrador') {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                showServiceForm(id);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteService(id);
            });
        });
    }
}
    
    function showServiceForm(id = null) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalTitle || !modalBody) return;
        
        modalTitle.textContent = id ? 'Editar Culto' : 'Novo Culto';
        
        modalBody.innerHTML = `
            <div class="form-group">
                <label for="service-name">Nome do Culto</label>
                <input type="text" id="service-name" placeholder="Nome do culto">
            </div>
        `;
        
        // Preencher formulário se for edição
        if (id) {
            supabase
                .from('services')
                .select('*')
                .eq('id', id)
                .single()
                .then(({ data, error }) => {
                    if (!error && data) {
                        const nameInput = document.getElementById('service-name');
                        if (nameInput) {
                            nameInput.value = data.name;
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
                saveService(id);
            };
        }
        
        // Mostrar modal
        showModal();
    }
    
    async function saveService(id) {
        const nameInput = document.getElementById('service-name');
        if (!nameInput) return;
        
        const name = nameInput.value;
        
        if (!name) {
            alert('Por favor, informe o nome do culto');
            return;
        }
        
        try {
            if (id) {
                // Editar culto existente
                const { error } = await supabase
                    .from('services')
                    .update({ name })
                    .eq('id', id);
                    
                if (error) throw error;
            } else {
                // Criar novo culto
                const { error } = await supabase
                    .from('services')
                    .insert([{ name }]);
                    
                if (error) throw error;
            }
            
            // Fechar modal e recarregar lista
            const modal = document.getElementById('modal');
            hideModal();
            
            // Recarregar cultos
            const user = await getCurrentUser();
            loadServices(user);
        } catch (error) {
            console.error('Erro ao salvar culto:', error);
            alert('Erro ao salvar culto: ' + error.message);
        }
    }
    
    async function deleteService(id) {
        if (!confirm('Tem certeza que deseja excluir este culto?')) return;
        
        try {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            // Recarregar cultos
            const user = await getCurrentUser();
            loadServices(user);
        } catch (error) {
            console.error('Erro ao excluir culto:', error);
            alert('Erro ao excluir culto: ' + error.message);
        }
    }

window.loadServices = loadServices;
window.showServiceForm = showServiceForm;