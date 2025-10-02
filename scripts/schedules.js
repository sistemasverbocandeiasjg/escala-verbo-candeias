// No início do schedules.js
if (window.performance && window.performance.navigation.type === 1) {
    // Página foi recarregada, limpar cache de funções
    console.log('🔄 Página recarregada - verificando versões...');
}

// Função para forçar atualização
window.forceUpdatePDF = function () {
    console.log('🔄 Forçando atualização do módulo PDF...');
    delete window.exportToPdf;
    // Recarregar apenas o scripts/schedules.js
    const script = document.createElement('script');
    script.src = 'scripts/schedules.js?v=' + new Date().getTime();
    document.head.appendChild(script);
};

// scripts/schedules.js - Versão ajustada para abas
document.addEventListener('DOMContentLoaded', function () {
    // As funções serão chamadas pelo dashboard.js
});

// CORREÇÃO DEFINITIVA: Função confiável para calcular dia da semana
function calculateDayOfWeek(dateString) {
    try {
        const [year, month, day] = dateString.split('-').map(Number);

        // Algoritmo de Tomohiko Sakamoto - mais confiável
        // Retorna: 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado

        const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
        const y = month < 3 ? year - 1 : year;
        const result = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month - 1] + day) % 7;

        // O algoritmo retorna 0=Dom, 1=Seg, ..., 6=Sáb - que é exatamente o que precisamos
        console.log(`Cálculo Sakamoto: ${dateString} -> ${result} (${getDayOfWeekName(result)})`);
        return result;

    } catch (error) {
        console.error('Erro no cálculo Sakamoto:', error);

        // Fallback: método Date com UTC para evitar timezone
        try {
            const [year, month, day] = dateString.split('-').map(Number);
            const date = new Date(Date.UTC(year, month - 1, day));
            const dayOfWeek = date.getUTCDay(); // 0=Domingo, 1=Segunda, etc.
            console.log(`Fallback UTC: ${dateString} -> ${dayOfWeek} (${getDayOfWeekName(dayOfWeek)})`);
            return dayOfWeek;
        } catch (fallbackError) {
            console.error('Erro no fallback:', fallbackError);
            return 0; // Default para Domingo
        }
    }
}

// CORREÇÃO: Substituir a função testDayOfWeek pela nova função confiável
function testDayOfWeek(dateString) {
    return calculateDayOfWeek(dateString);
}

// FUNÇÃO DE VERIFICAÇÃO PARA DATAS CONHECIDAS
function verifyKnownDates() {
    console.log('=== VERIFICAÇÃO DE DATAS CONHECIDAS ===');

    const testDates = [
        { date: '2025-09-25', expected: 4, name: 'Quinta-feira' },
        { date: '2025-09-28', expected: 0, name: 'Domingo' },
        { date: '2025-10-02', expected: 4, name: 'Quinta-feira' },
        { date: '2025-10-05', expected: 0, name: 'Domingo' },
        { date: '2025-10-01', expected: 3, name: 'Quarta-feira' },
        { date: '2025-10-06', expected: 1, name: 'Segunda-feira' }
    ];

    testDates.forEach(test => {
        const calculated = calculateDayOfWeek(test.date);
        const isCorrect = calculated === test.expected;
        console.log(`${test.date}: ${getDayOfWeekName(calculated)} (calculado: ${calculated}, esperado: ${test.expected}) - ${isCorrect ? '✅' : '❌'}`);
    });

    console.log('=== FIM DA VERIFICAÇÃO ===');
}

// Função para carregar escalas
async function loadSchedules(user) {
    try {
        const schedulesList = document.getElementById('schedules-list');
        const monthYearInput = document.getElementById('schedule-month-year');
        const departmentFilter = document.getElementById('schedule-department-filter');

        if (!schedulesList) return;

        let selectedMonthYear = monthYearInput ? monthYearInput.value : new Date().toISOString().slice(0, 7);
        let selectedDepartment = departmentFilter ? departmentFilter.value : 'all';

        // Extrair mês e ano do valor do input (formato YYYY-MM)
        const [year, month] = selectedMonthYear.split('-').map(Number);

        // Ajustar o mês (JavaScript usa meses de 0-11, então subtraímos 1)
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);

        let query = supabase
            .from('schedules')
            .select(`
                *,
                departments (name),
                members (name),
                services (name)
            `)
            .gte('date', firstDay.toISOString().split('T')[0])
            .lte('date', lastDay.toISOString().split('T')[0])
            .order('date')
            .order('service_id')
            .order('department_id')
            .order('sector');

        // Aplicar filtro de departamento
        if (selectedDepartment !== 'all') {
            query = query.eq('department_id', selectedDepartment);
        }

        // Se for líder, filtrar apenas por departamentos que ele gerencia
        if (user.level === 'Líder') {
            // Buscar departamentos do líder
            const { data: userDepartments, error: deptError } = await supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', user.id);

            if (!deptError && userDepartments && userDepartments.length > 0) {
                const deptIds = userDepartments.map(ud => ud.department_id);

                // Se há um departamento específico selecionado, verificar se o líder tem acesso
                if (selectedDepartment !== 'all' && !deptIds.includes(parseInt(selectedDepartment))) {
                    // O líder não tem acesso a este departamento, mostrar erro
                    schedulesList.innerHTML = '<div class="message error">Acesso não permitido a este departamento</div>';
                    return;
                }

                // Aplicar filtro para mostrar apenas departamentos do líder
                if (selectedDepartment === 'all') {
                    query = query.in('department_id', deptIds);
                }
            } else {
                // Líder sem departamentos associados
                schedulesList.innerHTML = '<div class="message error">Você não está associado a nenhum departamento</div>';
                return;
            }
        }

        const { data, error } = await query;

        if (error) throw error;

        renderSchedulesList(data, month - 1, year, user, selectedDepartment);
    } catch (error) {
        console.error('Erro ao carregar escalas:', error);
        const schedulesList = document.getElementById('schedules-list');
        if (schedulesList) {
            schedulesList.innerHTML = '<p class="message error">Erro ao carregar escalas</p>';
        }
    }
}

function renderSchedulesList(schedules, month, year, user, selectedDepartment = 'all') {
    const schedulesList = document.getElementById('schedules-list');
    if (!schedulesList) return;

    // Mostrar o mês/ano sendo filtrado
    const monthName = getMonthName(month);

    // Texto do filtro atual
    let filterText = 'Todos os departamentos';
    if (selectedDepartment !== 'all') {
        // Encontrar o nome do departamento selecionado
        const selectedDept = schedules.find(s => s.department_id == selectedDepartment)?.departments?.name;
        filterText = selectedDept || `Departamento ${selectedDepartment}`;
    }

    const filterInfo = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="color: #333; margin: 0;">Escalas de ${monthName}/${year}</h3>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #666; font-size: 0.9rem;">Filtro: ${filterText}</span>
            </div>
        </div>
    `;

    if (!schedules || schedules.length === 0) {
        schedulesList.innerHTML = filterInfo + '<p class="message">Nenhuma escala encontrada para este período</p>';
        return;
    }

    // Agrupar escalas por data
    const schedulesByDate = {};
    schedules.forEach(schedule => {
        const dateStr = schedule.date;
        if (!schedulesByDate[dateStr]) {
            schedulesByDate[dateStr] = [];
        }
        schedulesByDate[dateStr].push(schedule);
    });

    // Gerar HTML
    let html = filterInfo;

    Object.keys(schedulesByDate).sort().forEach(dateStr => {
        // CORREÇÃO DEFINITIVA: Usar a nova função confiável
        let dayOfWeekIndex = schedulesByDate[dateStr][0]?.day_of_week;

        // Se não tiver day_of_week salvo ou estiver incorreto, recalcular
        if (dayOfWeekIndex === undefined || dayOfWeekIndex === null) {
            dayOfWeekIndex = calculateDayOfWeek(dateStr);
        }

        // VERIFICAÇÃO EXTRA: Se o dia calculado for diferente do salvo, usar o calculado
        const calculatedDay = calculateDayOfWeek(dateStr);
        if (dayOfWeekIndex !== calculatedDay) {
            console.warn(`Dia incorreto para ${dateStr}: salvo=${dayOfWeekIndex}, calculado=${calculatedDay}. Usando calculado.`);
            dayOfWeekIndex = calculatedDay;
        }

        const dayOfWeek = getDayOfWeekName(dayOfWeekIndex);
        const formattedDate = dateStr.split('-').reverse().join('/');

        console.log('Exibindo escala:', dateStr, 'Dia:', dayOfWeekIndex, dayOfWeek);

        html += `
            <div class="schedule-day" style="margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <h4 style="background: #667eea; color: white; padding: 15px 20px; margin: 0; font-size: 1.1rem;">${dayOfWeek}, ${formattedDate}</h4>
                <table class="data-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="padding: 12px; background: #f8f9fa; text-align: left;">Culto</th>
                            <th style="padding: 12px; background: #f8f9fa; text-align: left;">Departamento</th>
                            <th style="padding: 12px; background: #f8f9fa; text-align: left;">Setor</th>
                            <th style="padding: 12px; background: #f8f9fa; text-align: left;">Membro</th>
        `;

        // Mostrar coluna de ações apenas para administradores e líderes
        if (user.level === 'Administrador' || user.level === 'Líder') {
            html += `<th style="padding: 12px; background: #f8f9fa; text-align: left;">Ações</th>`;
        }

        html += `</tr></thead><tbody>`;

        // ORDENAÇÃO: Ordenar escalas por culto, departamento e setor dentro de cada data
        const sortedSchedules = schedulesByDate[dateStr].sort((a, b) => {
            // Primeiro por culto (service_id)
            if (a.service_id !== b.service_id) {
                return a.service_id - b.service_id;
            }

            // Depois por departamento (department_id)
            if (a.department_id !== b.department_id) {
                return a.department_id - b.department_id;
            }

            // Finalmente por setor (ordem alfabética)
            return a.sector.localeCompare(b.sector);
        });

        sortedSchedules.forEach(schedule => {
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px;">${schedule.services.name}</td>
                    <td style="padding: 12px;">${schedule.departments.name}</td>
                    <td style="padding: 12px;">${schedule.sector}</td>
                    <td style="padding: 12px;">${schedule.members.name}</td>
            `;

            // Mostrar ações apenas para administradores e líderes
            if (user.level === 'Administrador' || user.level === 'Líder') {
                html += `
                    <td style="padding: 12px;">
                        <button class="action-btn edit-btn" data-id="${schedule.id}" style="padding: 6px 12px; background: #4facfe; color: white; border: none; border-radius: 4px; margin-right: 5px; cursor: pointer;">Editar</button>
                        <button class="action-btn delete-btn" data-id="${schedule.id}" style="padding: 6px 12px; background: #fa709a; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button>
                    </td>
                `;
            }

            html += `</tr>`;
        });

        html += `</tbody></table></div>`;
    });

    schedulesList.innerHTML = html;

    // Adicionar event listeners para os botões (apenas para administradores e líderes)
    if (user.level === 'Administrador' || user.level === 'Líder') {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = this.getAttribute('data-id');
                showScheduleForm(user, id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = this.getAttribute('data-id');
                deleteSchedule(id, user);
            });
        });
    }
}

// As demais funções permanecem as mesmas (showScheduleForm, saveSchedule, deleteSchedule, etc.)
async function showScheduleForm(user, id = null) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = id ? 'Editar Escala' : 'Nova Escala';

    // Carregar dados necessários
    let departmentsQuery = supabase.from('departments').select('*').order('name');

    // Se for líder, filtrar apenas seus departamentos
    if (user.level === 'Líder') {
        // Buscar os departamentos do líder na tabela user_departments
        const { data: userDepartments, error: deptError } = await supabase
            .from('user_departments')
            .select('department_id')
            .eq('user_id', user.id);

        if (!deptError && userDepartments && userDepartments.length > 0) {
            const deptIds = userDepartments.map(ud => ud.department_id);
            departmentsQuery = departmentsQuery.in('id', deptIds);
        } else {
            // Se não encontrar departamentos, mostrar mensagem
            modalBody.innerHTML = `
                <div class="message error">
                    <p>Você não está associado a nenhum departamento.</p>
                    <p>Entre em contato com o administrador do sistema.</p>
                </div>
            `;
            showModal();
            return;
        }
    }

    const [
        { data: departments },
        { data: services },
        { data: allMembers }
    ] = await Promise.all([
        departmentsQuery,
        supabase.from('services').select('*').order('name'),
        supabase.from('members').select(`
            *,
            member_departments (department_id)
        `).order('name')
    ]);

    // Verificar se o líder tem departamentos
    if (user.level === 'Líder' && (!departments || departments.length === 0)) {
        modalBody.innerHTML = `
            <div class="message error">
                <p>Nenhum departamento encontrado para seu usuário.</p>
                <p>Entre em contato com o administrador do sistema.</p>
            </div>
        `;
        showModal();
        return;
    }

    let departmentOptions = '<option value="">Selecione</option>';
    departments.forEach(dept => {
        departmentOptions += `<option value="${dept.id}">${dept.name}</option>`;
    });

    let serviceOptions = '<option value="">Selecione</option>';
    services.forEach(service => {
        serviceOptions += `<option value="${service.id}">${service.name}</option>`;
    });

    // CORREÇÃO: Para líderes, se houver apenas um departamento, selecionar automaticamente
    const autoSelectDepartment = user.level === 'Líder' && departments && departments.length === 1;
    const initialDepartmentValue = autoSelectDepartment ? departments[0].id : '';

    modalBody.innerHTML = `
        <div class="form-group">
            <label for="schedule-department">Departamento *</label>
            <select id="schedule-department" required 
                ${user.level === 'Líder' ? (departments.length === 1 ? 'disabled' : '') : ''}>
                ${departmentOptions}
            </select>
            ${user.level === 'Líder' && departments.length === 1 ?
            '<div class="select-hint">Seu único departamento associado</div>' : ''}
        </div>
        <div class="form-group">
            <label for="schedule-sector">Setor *</label>
            <select id="schedule-sector" required>
                <option value="">Selecione um departamento primeiro</option>
            </select>
            <div class="select-hint">Os setores serão carregados após selecionar um departamento</div>
        </div>
        <div class="form-group">
            <label for="schedule-member">Membro *</label>
            <select id="schedule-member" required>
                <option value="">Selecione um departamento primeiro</option>
            </select>
            <div class="select-hint">Os membros serão filtrados de acordo com o departamento selecionado</div>
        </div>
        <div class="form-group">
            <label for="schedule-service">Culto *</label>
            <select id="schedule-service" required>
                ${serviceOptions}
            </select>
        </div>
        <div class="form-group">
            <label for="schedule-date">Data *</label>
            <input type="date" id="schedule-date" required>
        </div>
    `;

    // Armazenar todos os membros para filtragem posterior
    const membersData = allMembers || [];

    // Adicionar event listener para carregar setores E membros quando departamento for selecionado
    const departmentSelect = document.getElementById('schedule-department');
    const sectorSelect = document.getElementById('schedule-sector');
    const memberSelect = document.getElementById('schedule-member');

    // CORREÇÃO: Configurar o departamento inicial para líderes
    if (departmentSelect && sectorSelect && memberSelect) {
        // Se for líder e tem apenas um departamento, selecionar automaticamente
        if (autoSelectDepartment) {
            departmentSelect.value = initialDepartmentValue;
        }

        departmentSelect.addEventListener('change', function () {
            const departmentId = this.value;
            loadSectorsForDepartment(departmentId, sectorSelect);
            loadMembersForDepartment(departmentId, memberSelect, membersData);
        });

        // Carregar setores e membros se já houver um departamento selecionado
        if (departmentSelect.value) {
            loadSectorsForDepartment(departmentSelect.value, sectorSelect);
            loadMembersForDepartment(departmentSelect.value, memberSelect, membersData);
        }
    }

    // Preencher formulário se for edição
    if (id) {
        const { data: schedule, error } = await supabase
            .from('schedules')
            .select('*')
            .eq('id', id)
            .single();

        if (!error && schedule) {
            const departmentSelect = document.getElementById('schedule-department');
            const sectorSelect = document.getElementById('schedule-sector');
            const memberSelect = document.getElementById('schedule-member');
            const serviceSelect = document.getElementById('schedule-service');
            const dateInput = document.getElementById('schedule-date');

            if (departmentSelect && sectorSelect && memberSelect && serviceSelect && dateInput) {
                departmentSelect.value = schedule.department_id;

                // Carregar setores e membros para o departamento selecionado
                await loadSectorsForDepartment(schedule.department_id, sectorSelect);
                await loadMembersForDepartment(schedule.department_id, memberSelect, membersData);

                // Aguardar um pouco para garantir que os setores e membros foram carregados
                setTimeout(() => {
                    sectorSelect.value = schedule.sector;
                    memberSelect.value = schedule.member_id;
                    serviceSelect.value = schedule.service_id;
                    dateInput.value = schedule.date;
                }, 200);
            }
        }
    } else {
        // Definir data padrão como hoje
        const dateInput = document.getElementById('schedule-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // CORREÇÃO: Para líderes, carregar automaticamente setores e membros do departamento
        if (user.level === 'Líder' && autoSelectDepartment) {
            setTimeout(() => {
                loadSectorsForDepartment(initialDepartmentValue, sectorSelect);
                loadMembersForDepartment(initialDepartmentValue, memberSelect, membersData);
            }, 100);
        }
    }

    // Configurar botão de salvar
    const saveBtn = document.getElementById('modal-save');
    if (saveBtn) {
        saveBtn.onclick = function () {
            saveSchedule(id, user);
        };
    }

    // Configurar botão de cancelar
    const cancelBtn = document.getElementById('modal-cancel');
    if (cancelBtn) {
        cancelBtn.onclick = function () {
            hideModal();
        };
    }

    // Configurar o botão X (close)
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = function () {
            hideModal();
        };
    }

    // Mostrar modal
    showModal();
}

// CORREÇÃO DEFINITIVA: Na função saveSchedule - garantir que o dia da semana está correto
async function saveSchedule(id, user) {
    const departmentSelect = document.getElementById('schedule-department');
    const sectorSelect = document.getElementById('schedule-sector');
    const memberSelect = document.getElementById('schedule-member');
    const serviceSelect = document.getElementById('schedule-service');
    const dateInput = document.getElementById('schedule-date');

    if (!departmentSelect || !sectorSelect || !memberSelect || !serviceSelect || !dateInput) {
        alert('Erro: Elementos do formulário não encontrados');
        return;
    }

    const departmentId = departmentSelect.value;
    const sector = sectorSelect.value;
    const memberId = memberSelect.value;
    const serviceId = serviceSelect.value;
    const date = dateInput.value;

    // Validação dos campos
    if (!departmentId || !sector || !memberId || !serviceId || !date) {
        alert('Por favor, preencha todos os campos obrigatórios (*)');
        return;
    }

    if (sector === '' || sector === 'Selecione um setor') {
        alert('Por favor, selecione um setor válido');
        return;
    }

    try {
        // CORREÇÃO: Usar a nova função confiável
        const dayOfWeek = calculateDayOfWeek(date);

        console.log('=== SALVANDO ESCALA ===');
        console.log('Data selecionada:', date);
        console.log('Dia da semana calculado:', dayOfWeek);
        console.log('Nome do dia:', getDayOfWeekName(dayOfWeek));
        console.log('======================');

        // Verificar se já existe escala para este membro no mesmo culto e data
        const { data: existing, error: checkError } = await supabase
            .from('schedules')
            .select('*')
            .eq('member_id', memberId)
            .eq('service_id', serviceId)
            .eq('date', date);

        if (checkError) {
            console.error('Erro ao verificar escala:', checkError);
            alert('Erro ao verificar escala existente');
            return;
        }

        if (existing && existing.length > 0 && (!id || existing[0].id !== parseInt(id))) {
            alert('Este membro já está escalado para este culto na data selecionada');
            return;
        }

        if (id) {
            // Editar escala existente
            const { error } = await supabase
                .from('schedules')
                .update({
                    department_id: departmentId,
                    sector: sector,
                    member_id: memberId,
                    service_id: serviceId,
                    date: date,
                    day_of_week: dayOfWeek
                })
                .eq('id', id);

            if (error) {
                console.error('Erro ao atualizar escala:', error);
                throw error;
            }

            alert('Escala atualizada com sucesso!');
        } else {
            // Criar nova escala
            const { error } = await supabase
                .from('schedules')
                .insert([{
                    department_id: departmentId,
                    sector: sector,
                    member_id: memberId,
                    service_id: serviceId,
                    date: date,
                    day_of_week: dayOfWeek
                }]);

            if (error) {
                console.error('Erro ao criar escala:', error);
                throw error;
            }

            alert('Escala criada com sucesso!');
        }

        // Fechar modal e recarregar lista
        hideModal();

        // Recarregar escalas
        loadSchedules(user);

    } catch (error) {
        console.error('Erro ao salvar escala:', error);
        alert('Erro ao salvar escala: ' + error.message);
    }
}

async function deleteSchedule(id, user) {
    if (!confirm('Tem certeza que deseja excluir esta escala?')) return;

    try {
        const { error } = await supabase
            .from('schedules')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert('Escala excluída com sucesso!');
        loadSchedules(user);
    } catch (error) {
        console.error('Erro ao excluir escala:', error);
        alert('Erro ao excluir escala: ' + error.message);
    }
}

// Função para exportar escalas em PDF - COM PAGINAÇÃO INTELIGENTE
async function exportToPdf() {
    try {
        console.log('Função exportToPdf chamada');

        const monthYearInput = document.getElementById('schedule-month-year');
        const departmentFilter = document.getElementById('schedule-department-filter');

        console.log('monthYearInput:', monthYearInput);
        console.log('departmentFilter:', departmentFilter);

        if (!monthYearInput) {
            console.error('Elemento schedule-month-year não encontrado');
            alert('Erro: Elemento de filtro não encontrado');
            return;
        }

        const selectedMonthYear = monthYearInput.value;
        const selectedDepartment = departmentFilter ? departmentFilter.value : 'all';

        console.log('Mês/Ano selecionado:', selectedMonthYear);
        console.log('Departamento selecionado:', selectedDepartment);

        const [year, month] = selectedMonthYear.split('-').map(Number);
        const monthName = getMonthName(month - 1);

        // Mostrar loading
        const exportPdfBtn = document.getElementById('export-pdf');
        if (!exportPdfBtn) {
            console.error('Botão export-pdf não encontrado');
            return;
        }

        const originalText = exportPdfBtn.textContent;
        exportPdfBtn.textContent = 'Gerando PDF...';
        exportPdfBtn.disabled = true;

        console.log('Buscando dados do Supabase com filtros...');

        // Buscar dados das escalas COM OS FILTROS APLICADOS
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);

        let query = supabase
            .from('schedules')
            .select(`
                *,
                departments (name),
                members (name),
                services (name)
            `)
            .gte('date', firstDay.toISOString().split('T')[0])
            .lte('date', lastDay.toISOString().split('T')[0])
            .order('date')
            .order('service_id')
            .order('department_id')
            .order('sector');

        // Aplicar filtro de departamento
        if (selectedDepartment !== 'all') {
            query = query.eq('department_id', selectedDepartment);
        }

        // Se for líder, aplicar filtro de departamentos do líder
        const user = await getCurrentUser();
        if (user && user.level === 'Líder') {
            const { data: userDepartments, error: deptError } = await supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', user.id);

            if (!deptError && userDepartments && userDepartments.length > 0) {
                const deptIds = userDepartments.map(ud => ud.department_id);

                // Se há um departamento específico selecionado, verificar se o líder tem acesso
                if (selectedDepartment !== 'all' && !deptIds.includes(parseInt(selectedDepartment))) {
                    alert('Acesso não permitido a este departamento');
                    exportPdfBtn.textContent = originalText;
                    exportPdfBtn.disabled = false;
                    return;
                }

                // Aplicar filtro para mostrar apenas departamentos do líder
                if (selectedDepartment === 'all') {
                    query = query.in('department_id', deptIds);
                }
            }
        }

        const { data: schedules, error } = await query;

        if (error) {
            console.error('Erro ao buscar escalas:', error);
            throw error;
        }

        console.log('Escalas encontradas para PDF:', schedules ? schedules.length : 0);

        if (!schedules || schedules.length === 0) {
            alert('Nenhuma escala encontrada para exportar com os filtros selecionados.');
            // Restaurar botão
            exportPdfBtn.textContent = originalText;
            exportPdfBtn.disabled = false;
            return;
        }

        console.log('Verificando jsPDF...');
        if (typeof window.jspdf === 'undefined') {
            console.error('jsPDF não carregado');
            alert('Erro: Biblioteca jsPDF não carregada. Verifique a conexão com a internet.');
            // Restaurar botão
            exportPdfBtn.textContent = originalText;
            exportPdfBtn.disabled = false;
            return;
        }

        console.log('Criando PDF com paginação inteligente...');

        // Criar conteúdo do PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let yPosition = margin;

        // Cabeçalho
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(102, 126, 234);
        doc.text('Sistema de Escalas - Igreja', pageWidth / 2, yPosition, { align: 'center' });

        yPosition += 10;
        doc.setFontSize(14);
        doc.setTextColor(128, 128, 128);

        // Texto do cabeçalho refletindo os filtros
        let headerText = `Escalas de ${monthName}/${year}`;
        if (selectedDepartment !== 'all') {
            const selectedDept = schedules.find(s => s.department_id == selectedDepartment)?.departments?.name;
            headerText += ` - ${selectedDept || `Departamento ${selectedDepartment}`}`;
        } else if (user && user.level === 'Líder') {
            // Verificar se o líder tem apenas um departamento
            const { data: userDepartments, error: deptError } = await supabase
                .from('user_departments')
                .select('department_id, departments(name)')
                .eq('user_id', user.id);

            if (!deptError && userDepartments && userDepartments.length === 1) {
                const deptName = userDepartments[0].departments?.name || `Departamento ${userDepartments[0].department_id}`;
                headerText += ` - ${deptName}`;
            } else {
                headerText += ' - Meus Departamentos';
            }
        }

        doc.text(headerText, pageWidth / 2, yPosition, { align: 'center' });

        yPosition += 15;

        // Conteúdo das escalas
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        // Agrupar escalas por data
        const schedulesByDate = {};
        schedules.forEach(schedule => {
            const dateStr = schedule.date;
            if (!schedulesByDate[dateStr]) {
                schedulesByDate[dateStr] = [];
            }
            schedulesByDate[dateStr].push(schedule);
        });

        const dates = Object.keys(schedulesByDate).sort();
        console.log('Datas para processar no PDF:', dates.length);

        if (dates.length === 0) {
            doc.setFontSize(12);
            doc.text('Nenhuma escala encontrada para o período selecionado.', margin, yPosition);
        } else {
            // NOVA LÓGICA: Calcular altura necessária para cada dia ANTES de desenhar
            const dayHeights = {};

            dates.forEach(dateStr => {
                const daySchedules = schedulesByDate[dateStr];
                const headerHeight = 12; // Altura do cabeçalho da data
                const tableHeaderHeight = 10; // Altura do cabeçalho da tabela
                const rowHeight = 10; // Altura de cada linha
                const spacing = 5; // Espaçamento entre dias

                // Altura total necessária para este dia
                dayHeights[dateStr] = headerHeight + tableHeaderHeight + (daySchedules.length * rowHeight) + spacing;
            });

            // Processar cada data com verificação de espaço
            dates.forEach(dateStr => {
                const daySchedules = schedulesByDate[dateStr];

                // CORREÇÃO DEFINITIVA: Usar a mesma função confiável do sistema
                let dayOfWeekIndex = daySchedules[0]?.day_of_week;

                // Se não tiver day_of_week salvo ou estiver incorreto, recalcular
                if (dayOfWeekIndex === undefined || dayOfWeekIndex === null) {
                    dayOfWeekIndex = calculateDayOfWeek(dateStr);
                }

                // VERIFICAÇÃO EXTRA: Se o dia calculado for diferente do salvo, usar o calculado
                const calculatedDay = calculateDayOfWeek(dateStr);
                if (dayOfWeekIndex !== calculatedDay) {
                    console.warn(`Dia incorreto no PDF para ${dateStr}: salvo=${dayOfWeekIndex}, calculado=${calculatedDay}. Usando calculado.`);
                    dayOfWeekIndex = calculatedDay;
                }

                const dayOfWeek = getDayOfWeekName(dayOfWeekIndex);
                const formattedDate = dateStr.split('-').reverse().join('/');

                // VERIFICAÇÃO DE ESPAÇO NA PÁGINA - CORREÇÃO APLICADA
                const spaceNeeded = dayHeights[dateStr];
                const spaceAvailable = pageHeight - yPosition - 20; // 20px para rodapé

                console.log(`Data: ${dateStr}, Espaço necessário: ${spaceNeeded}, Espaço disponível: ${spaceAvailable}, Posição Y: ${yPosition}`);

                // Se não couber na página atual, criar nova página
                if (spaceNeeded > spaceAvailable) {
                    console.log(`Criando nova página para ${dateStr} - necessário: ${spaceNeeded}, disponível: ${spaceAvailable}`);
                    doc.addPage();
                    yPosition = margin;

                    // Redesenhar cabeçalho da página na nova página
                    doc.setFontSize(20);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(102, 126, 234);
                    doc.text('Sistema de Escalas - Igreja', pageWidth / 2, yPosition, { align: 'center' });

                    yPosition += 10;
                    doc.setFontSize(14);
                    doc.setTextColor(128, 128, 128);
                    doc.text(headerText, pageWidth / 2, yPosition, { align: 'center' });

                    yPosition += 15;
                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);
                }

                // DEBUG: Log para verificar as datas no PDF
                console.log('PDF - Data:', dateStr, 'Dia calculado:', dayOfWeekIndex, 'Nome:', dayOfWeek);

                // Data/dia da semana
                doc.setFont('helvetica', 'bold');
                doc.setFillColor(102, 126, 234);
                doc.setTextColor(255, 255, 255);
                doc.rect(margin, yPosition, pageWidth - (margin * 2), 8, 'F');
                doc.text(`${dayOfWeek}, ${formattedDate}`, margin + 5, yPosition + 6);

                yPosition += 12;

                // Cabeçalho da tabela
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.setFillColor(128, 128, 128);
                doc.rect(margin, yPosition, pageWidth - (margin * 2), 8, 'F');

                const colWidth = (pageWidth - (margin * 2)) / 4;
                doc.text('Culto', margin + 5, yPosition + 6);
                doc.text('Departamento', margin + colWidth + 5, yPosition + 6);
                doc.text('Setor', margin + (colWidth * 2) + 5, yPosition + 6);
                doc.text('Membro', margin + (colWidth * 3) + 5, yPosition + 6);

                yPosition += 10;

                // Linhas da tabela
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);

                // ORDENAÇÃO: Ordenar escalas por culto, departamento e setor dentro de cada data
                const sortedSchedules = daySchedules.sort((a, b) => {
                    // Primeiro por culto (service_id)
                    if (a.service_id !== b.service_id) {
                        return a.service_id - b.service_id;
                    }

                    // Depois por departamento (department_id)
                    if (a.department_id !== b.department_id) {
                        return a.department_id - b.department_id;
                    }

                    // Finalmente por setor (ordem alfabética)
                    return a.sector.localeCompare(b.sector);
                });

                sortedSchedules.forEach((schedule, index) => {
                    // VERIFICAÇÃO DE ESPAÇO PARA CADA LINHA - CORREÇÃO EXTRA
                    if (yPosition > pageHeight - 20) {
                        console.log('Criando nova página para linha individual');
                        doc.addPage();
                        yPosition = margin;

                        // Redesenhar cabeçalho da tabela na nova página para continuidade
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(255, 255, 255);
                        doc.setFillColor(128, 128, 128);
                        doc.rect(margin, yPosition, pageWidth - (margin * 2), 8, 'F');
                        doc.text('Culto', margin + 5, yPosition + 6);
                        doc.text('Departamento', margin + colWidth + 5, yPosition + 6);
                        doc.text('Setor', margin + (colWidth * 2) + 5, yPosition + 6);
                        doc.text('Membro', margin + (colWidth * 3) + 5, yPosition + 6);
                        yPosition += 10;
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(0, 0, 0);
                    }

                    // Cor de fundo alternada para linhas
                    if (index % 2 === 0) {
                        doc.setFillColor(245, 245, 245);
                        doc.rect(margin, yPosition - 2, pageWidth - (margin * 2), 8, 'F');
                    }

                    // Conteúdo das células (texto reduzido)
                    const culto = schedule.services?.name || '-';
                    const depto = schedule.departments?.name || '-';
                    const setor = schedule.sector || '-';
                    const membro = schedule.members?.name || '-';

                    doc.text(culto.substring(0, 15), margin + 5, yPosition + 4);
                    doc.text(depto.substring(0, 15), margin + colWidth + 5, yPosition + 4);
                    doc.text(setor.substring(0, 15), margin + (colWidth * 2) + 5, yPosition + 4);
                    doc.text(membro.substring(0, 15), margin + (colWidth * 3) + 5, yPosition + 4);

                    yPosition += 10;
                });

                yPosition += 5; // Espaço entre datas
            });
        }

        // Rodapé
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

            // Informações do filtro no rodapé
            let filterInfo = `Filtro: ${selectedDepartment === 'all' ? 'Todos os departamentos' : 'Departamento específico'}`;
            if (selectedDepartment !== 'all') {
                const selectedDept = schedules.find(s => s.department_id == selectedDepartment)?.departments?.name;
                filterInfo = `Departamento: ${selectedDept || selectedDepartment}`;
            }
            doc.text(filterInfo, margin, pageHeight - 10);
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        console.log('Salvando PDF...');

        // Nome do arquivo refletindo os filtros
        let fileName = 'escalas';

        // Buscar informações do departamento para líderes
        let departmentName = '';

        if (selectedDepartment !== 'all') {
            // Departamento específico selecionado
            const selectedDept = schedules.find(s => s.department_id == selectedDepartment)?.departments?.name;
            departmentName = selectedDept ? selectedDept.replace(/\s+/g, '_') : `departamento_${selectedDepartment}`;
        } else if (user && user.level === 'Líder') {
            // Líder com "Todos os departamentos" - verificar se tem apenas um departamento
            const { data: userDepartments, error: deptError } = await supabase
                .from('user_departments')
                .select('department_id, departments(name)')
                .eq('user_id', user.id);

            if (!deptError && userDepartments && userDepartments.length === 1) {
                departmentName = userDepartments[0].departments?.name?.replace(/\s+/g, '_') || `departamento_${userDepartments[0].department_id}`;
            } else if (!deptError && userDepartments && userDepartments.length > 1) {
                departmentName = 'Meus_Departamentos';
            } else {
                departmentName = 'Meus_Departamentos';
            }
        } else {
            // Administrador com "Todos os departamentos"
            departmentName = 'Todos_Departamentos';
        }

        fileName += `_${departmentName}_${monthName}_${year}.pdf`;

        doc.save(fileName);

        // Restaurar botão
        exportPdfBtn.textContent = originalText;
        exportPdfBtn.disabled = false;

        console.log('PDF gerado com sucesso! Nome do arquivo:', fileName);
        showMessageGlobal('PDF gerado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF: ' + error.message);

        // Restaurar botão em caso de erro
        const exportPdfBtn = document.getElementById('export-pdf');
        if (exportPdfBtn) {
            exportPdfBtn.textContent = 'Exportar PDF';
            exportPdfBtn.disabled = false;
        }
    }
}

// CORREÇÃO COMPLETA DE TODAS AS ESCALAS EXISTENTES
async function completeFixAllSchedules() {
    try {
        console.log('=== CORREÇÃO COMPLETA DE TODAS AS ESCALAS ===');

        const { data: schedules, error } = await supabase
            .from('schedules')
            .select('id, date, day_of_week');

        if (error) throw error;

        let fixed = 0;
        let alreadyCorrect = 0;

        for (const schedule of schedules) {
            const correctDay = calculateDayOfWeek(schedule.date);

            if (schedule.day_of_week !== correctDay) {
                console.log(`🔧 Corrigindo ${schedule.date}: ${schedule.day_of_week} (${getDayOfWeekName(schedule.day_of_week)}) -> ${correctDay} (${getDayOfWeekName(correctDay)})`);

                const { error: updateError } = await supabase
                    .from('schedules')
                    .update({ day_of_week: correctDay })
                    .eq('id', schedule.id);

                if (!updateError) {
                    fixed++;
                } else {
                    console.error('Erro ao atualizar:', updateError);
                }
            } else {
                alreadyCorrect++;
            }
        }

        console.log(`✅ CORREÇÃO CONCLUÍDA:`);
        console.log(`   ${fixed} escalas corrigidas`);
        console.log(`   ${alreadyCorrect} escalas já estavam corretas`);
        console.log(`   Total: ${fixed + alreadyCorrect} escalas verificadas`);

        alert(`✅ Correção aplicada!\n${fixed} escalas corrigidas\n${alreadyCorrect} já estavam corretas`);

    } catch (error) {
        console.error('Erro na correção completa:', error);
        alert('❌ Erro na correção: ' + error.message);
    }
}

// Adicionar funções globais para teste e correção
window.verifyDates = verifyKnownDates;
window.completeFix = completeFixAllSchedules;
window.calculateDay = calculateDayOfWeek;

window.loadSchedules = loadSchedules;
window.showScheduleForm = showScheduleForm;

// Funções auxiliares existentes (não modificadas)
function getMonthName(month) {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month];
}

function getDayOfWeekName(dayIndex) {
    const normalizedIndex = parseInt(dayIndex);

    const days = [
        'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
        'Quinta-feira', 'Sexta-feira', 'Sábado'
    ];

    if (normalizedIndex >= 0 && normalizedIndex < days.length) {
        return days[normalizedIndex];
    }

    console.warn('Índice de dia inválido:', dayIndex);
    return 'Dia inválido';
}

// Função auxiliar para mostrar estado de carregamento
function setSelectLoading(selectElement, isLoading) {
    if (isLoading) {
        selectElement.classList.add('loading');
        selectElement.disabled = true;
    } else {
        selectElement.classList.remove('loading');
        selectElement.disabled = false;
    }
}

// Função para carregar setores de um departamento
async function loadSectorsForDepartment(departmentId, sectorSelect) {
    if (!departmentId || !sectorSelect) return;

    try {
        setSelectLoading(sectorSelect, true);

        // Buscar informações do departamento
        const { data: department, error } = await supabase
            .from('departments')
            .select('sectors, name')
            .eq('id', departmentId)
            .single();

        if (error) {
            console.error('Erro ao buscar departamento:', error);
            throw error;
        }

        // Limpar select de setores
        sectorSelect.innerHTML = '';

        // Adicionar setores ao select
        if (department && department.sectors && department.sectors.length > 0) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = `Selecione um setor de ${department.name}`;
            sectorSelect.appendChild(defaultOption);

            // Ordenar setores alfabeticamente
            department.sectors.sort().forEach(sector => {
                const option = document.createElement('option');
                option.value = sector;
                option.textContent = sector;
                sectorSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = `Nenhum setor cadastrado em ${department?.name || 'este departamento'}`;
            option.disabled = true;
            sectorSelect.appendChild(option);
        }
    } catch (error) {
        console.error('Erro ao carregar setores:', error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Erro ao carregar setores';
        option.disabled = true;
        sectorSelect.appendChild(option);
    } finally {
        setSelectLoading(sectorSelect, false);
    }
}

// NOVA FUNÇÃO: Carregar membros filtrados por departamento
async function loadMembersForDepartment(departmentId, memberSelect, allMembers) {
    if (!departmentId || !memberSelect) return;

    try {
        setSelectLoading(memberSelect, true);

        // Limpar select de membros
        memberSelect.innerHTML = '';

        // Adicionar opção padrão
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Selecione um membro';
        memberSelect.appendChild(defaultOption);

        if (!allMembers || allMembers.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nenhum membro disponível';
            option.disabled = true;
            memberSelect.appendChild(option);
            return;
        }

        // Filtrar membros que pertencem ao departamento selecionado
        const filteredMembers = allMembers.filter(member => {
            // Verificar se o membro tem o department_id na relação member_departments
            return member.member_departments &&
                member.member_departments.some(md => md.department_id == departmentId);
        });

        console.log('Membros filtrados para departamento', departmentId, ':', filteredMembers.length);

        if (filteredMembers.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nenhum membro neste departamento';
            option.disabled = true;
            memberSelect.appendChild(option);
        } else {
            // Ordenar membros por nome
            filteredMembers.sort((a, b) => a.name.localeCompare(b.name));

            // Adicionar membros ao select
            filteredMembers.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = member.name;
                memberSelect.appendChild(option);
            });
        }

    } catch (error) {
        console.error('Erro ao carregar membros:', error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Erro ao carregar membros';
        option.disabled = true;
        memberSelect.appendChild(option);
    } finally {
        setSelectLoading(memberSelect, false);
    }
}