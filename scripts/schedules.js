// NO INÍCIO DO ARQUIVO - Adicionar após as declarações iniciais
console.log('=== SISTEMA DE ESCALAS - PDF COM LAYOUT AGRUPADO ===');
console.log('Versão: 2.3 - Export PDF com células mescladas');
console.log('Carregado em: ' + new Date().toLocaleString());
console.log('====================================================');

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

        // NOVO AGRUPAMENTO: Agrupar por culto e departamento para criar grupos visuais
        const schedulesForDate = schedulesByDate[dateStr];

        // Criar estrutura de agrupamento
        const groupedSchedules = {};

        schedulesForDate.forEach(schedule => {
            const key = `${schedule.service_id}-${schedule.department_id}`;

            if (!groupedSchedules[key]) {
                groupedSchedules[key] = {
                    service: schedule.services,
                    department: schedule.departments,
                    schedules: []
                };
            }

            groupedSchedules[key].schedules.push(schedule);
        });

        // Ordenar grupos por nome do culto e departamento
        const sortedGroups = Object.values(groupedSchedules).sort((a, b) => {
            // Primeiro por nome do culto
            const serviceCompare = a.service.name.localeCompare(b.service.name);
            if (serviceCompare !== 0) return serviceCompare;

            // Depois por nome do departamento
            return a.department.name.localeCompare(b.department.name);
        });

        // Renderizar cada grupo como linhas agrupadas na tabela
        sortedGroups.forEach((group, groupIndex) => {
            const { service, department, schedules } = group;

            // Ordenar escalas por setor e membro
            const sortedSchedules = schedules.sort((a, b) => {
                // Primeiro por setor
                const sectorCompare = (a.sector || '').localeCompare(b.sector || '');
                if (sectorCompare !== 0) return sectorCompare;

                // Depois por nome do membro
                return a.members.name.localeCompare(b.members.name);
            });

            // Calcular quantas linhas terá este grupo
            const groupRowspan = sortedSchedules.length;

            // Agrupar por setor dentro do grupo
            const schedulesBySector = {};
            sortedSchedules.forEach(schedule => {
                const sector = schedule.sector || 'Sem setor específico';
                if (!schedulesBySector[sector]) {
                    schedulesBySector[sector] = [];
                }
                schedulesBySector[sector].push(schedule);
            });

            // Ordenar setores alfabeticamente
            const sortedSectors = Object.keys(schedulesBySector).sort((a, b) => a.localeCompare(b));

            // Contador para controlar a posição atual no grupo
            let currentPosition = 0;

            // Renderizar cada setor dentro do grupo
            sortedSectors.forEach((sector, sectorIndex) => {
                const sectorSchedules = schedulesBySector[sector];
                const sectorRowspan = sectorSchedules.length;

                // Renderizar cada escala do setor
                sectorSchedules.forEach((schedule, scheduleIndex) => {
                    const isFirstInGroup = currentPosition === 0;
                    const isFirstInSector = scheduleIndex === 0;

                    html += `
                        <tr style="border-bottom: 1px solid #e2e8f0; ${isFirstInGroup ? 'border-top: 2px solid #e2e8f0;' : ''}">
                    `;

                    // Primeira linha do grupo - células mescladas para culto e departamento
                    if (isFirstInGroup && isFirstInSector) {
                        html += `
                            <td style="padding: 12px; font-weight: 600; color: #2d3748; text-align: center; vertical-align: middle;" rowspan="${groupRowspan}">
                                ${service.name}
                            </td>
                            <td style="padding: 12px; font-weight: 600; color: #2d3748; text-align: center; vertical-align: middle;" rowspan="${groupRowspan}">
                                ${department.name}
                            </td>
                        `;
                    }

                    // Primeira linha do setor - célula mesclada para o setor
                    if (isFirstInSector) {
                        html += `
                            <td style="padding: 12px; font-weight: 500; color: #4a5568; text-align: center; vertical-align: middle;" rowspan="${sectorRowspan}">
                                ${sector !== 'Sem setor específico' ? sector : '-'}
                            </td>
                        `;
                    }

                    // Células do membro (sempre preenchidas)
                    html += `
                            <td style="padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="color: #2d3748;">${schedule.members.name}</span>
                                    ${schedule.members.type ? `<span style="color: #718096; font-size: 0.8rem; background: #edf2f7; padding: 2px 6px; border-radius: 4px;">${schedule.members.type}</span>` : ''}
                                </div>
                            </td>
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

                    currentPosition++;
                });
            });
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

    // ADICIONE ESTA LINHA: Adiciona classe específica para o modal de escalas
    modal.classList.add('schedule-modal');

    modalTitle.textContent = id ? 'Editar Escala' : 'Nova Escala';

    // Carregar dados necessários
    let departmentsQuery = supabase.from('departments').select('*').order('name');

    // Se for líder, filtrar apenas seus departamentos
    if (user.level === 'Líder') {
        const { data: userDepartments, error: deptError } = await supabase
            .from('user_departments')
            .select('department_id')
            .eq('user_id', user.id);

        if (!deptError && userDepartments && userDepartments.length > 0) {
            const deptIds = userDepartments.map(ud => ud.department_id);
            departmentsQuery = departmentsQuery.in('id', deptIds);
        } else {
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

    // MODIFICAÇÃO AQUI: Adicione a classe modal-form-container
    modalBody.innerHTML = `
        <div class="modal-form-container">
            <div class="form-group">
                <label for="schedule-department">Departamento *</label>
                <select id="schedule-department" required 
                    ${user.level === 'Líder' ? (departments.length === 1 ? 'disabled' : '') : ''}>
                    ${departmentOptions}
                </select>
                ${user.level === 'Líder' && departments.length === 1 ?
            '<div class="select-hint">Departamento Associado</div>' : ''}
            </div>
            <div class="form-group">
                <label for="schedule-sector">Setor <span id="sector-required" style="display: none; color: red;">*</span></label>
                <select id="schedule-sector">
                    <option value="">Selecione um departamento primeiro</option>
                </select>
                <div class="select-hint" id="sector-hint">Os setores serão carregados após selecionar um departamento</div>
            </div>
            <div class="form-group">
                <label for="schedule-member">Membro *</label>
                <select id="schedule-member" required>
                    <option value="">Selecione um departamento primeiro</option>
                </select>
                <div class="select-hint">Membros do Departamento</div>
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

                // Aguardar para garantir carregamento
                setTimeout(() => {
                    // Preencher setor se existir
                    if (schedule.sector && schedule.sector.trim() !== '') {
                        sectorSelect.value = schedule.sector;
                    } else {
                        sectorSelect.value = '';
                    }

                    memberSelect.value = schedule.member_id;
                    serviceSelect.value = schedule.service_id;
                    dateInput.value = schedule.date;
                }, 300);
            }
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
            // ADICIONE ESTA LINHA: Remove a classe específica ao fechar o modal
            modal.classList.remove('schedule-modal');
        };
    }

    // Configurar o botão X (close)
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = function () {
            hideModal();
            // ADICIONE ESTA LINHA: Remove a classe específica ao fechar o modal
            modal.classList.remove('schedule-modal');
        };
    }

    // Mostrar modal
    showModal();
}

// CORREÇÃO DEFINITIVA: Garantir que o dia da semana está correto - MODIFICADA COM SWEETALERT2
async function saveSchedule(id, user) {
    const departmentSelect = document.getElementById('schedule-department');
    const sectorSelect = document.getElementById('schedule-sector');
    const memberSelect = document.getElementById('schedule-member');
    const serviceSelect = document.getElementById('schedule-service');
    const dateInput = document.getElementById('schedule-date');

    if (!departmentSelect || !sectorSelect || !memberSelect || !serviceSelect || !dateInput) {
        await SweetAlert.error('Erro', 'Elementos do formulário não encontrados');
        return;
    }

    const departmentId = departmentSelect.value;
    const sector = sectorSelect.value;
    const memberId = memberSelect.value;
    const serviceId = serviceSelect.value;
    const date = dateInput.value;

    // Validação básica dos campos obrigatórios
    if (!departmentId || !memberId || !serviceId || !date) {
        await SweetAlert.error('Atenção', 'Por favor, preencha todos os campos obrigatórios (*)');
        return;
    }

    // Validação: Verificar se setor é obrigatório mas não foi preenchido
    if (sectorSelect.required && !sector) {
        await SweetAlert.error('Atenção', 'Por favor, selecione um setor. Este departamento requer setor.');
        return;
    }

    try {
        const dayOfWeek = calculateDayOfWeek(date);

        // Verificar se já existe escala para este membro no mesmo culto e data
        const { data: existing, error: checkError } = await supabase
            .from('schedules')
            .select('*')
            .eq('member_id', memberId)
            .eq('service_id', serviceId)
            .eq('date', date);

        if (checkError) {
            console.error('Erro ao verificar escala:', checkError);
            await SweetAlert.error('Erro', 'Erro ao verificar escala existente');
            return;
        }

        if (existing && existing.length > 0 && (!id || existing[0].id !== parseInt(id))) {
            await SweetAlert.error('Atenção', 'Este membro já está escalado para este culto na data selecionada');
            return;
        }

        // CONFIRMAÇÃO COM SWEETALERT2
        const action = id ? 'editar' : 'cadastrar';
        const memberName = memberSelect.options[memberSelect.selectedIndex].text;
        const serviceName = serviceSelect.options[serviceSelect.selectedIndex].text;
        const departmentName = departmentSelect.options[departmentSelect.selectedIndex].text;
        const formattedDate = new Date(date).toLocaleDateString('pt-BR');

        const confirmMessage = id
            ? 'Confirmar Edição de Escala'
            : 'Confirmar Nova Escala';

        const confirmText = `• Membro: ${memberName}\n• Culto: ${serviceName}\n• Data: ${formattedDate}\n• Departamento: ${departmentName}${sector ? `\n• Setor: ${sector}` : ''}`;

        const confirmed = await SweetAlert.confirm(
            confirmMessage,
            confirmText,
            id ? 'Sim, Editar' : 'Sim, Cadastrar',
            'Cancelar'
        );

        if (!confirmed) {
            console.log('Usuário cancelou a operação');
            return;
        }

        // Mostrar loading
        SweetAlert.showLoading(id ? 'Atualizando escala...' : 'Cadastrando escala...');

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

            if (error) throw error;

            SweetAlert.close();
            await SweetAlert.success('Sucesso!', 'Escala atualizada com sucesso!');
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

            if (error) throw error;

            SweetAlert.close();
            await SweetAlert.success('Sucesso!', 'Escala criada com sucesso!');
        }

        // Fechar modal e recarregar lista
        hideModal();
        loadSchedules(user);

    } catch (error) {
        SweetAlert.close();
        console.error('Erro ao salvar escala:', error);
        await SweetAlert.error('Erro', 'Erro ao salvar escala: ' + error.message);
    }
}

// FUNÇÃO DELETE MODIFICADA COM SWEETALERT2
async function deleteSchedule(id, user) {
    if (!id) return;

    try {
        // Buscar dados da escala para mostrar no confirm
        const { data: schedule, error: fetchError } = await supabase
            .from('schedules')
            .select(`
                *,
                departments (name),
                members (name),
                services (name)
            `)
            .eq('id', id)
            .single();

        if (fetchError) {
            console.error('Erro ao buscar dados da escala:', fetchError);
            await SweetAlert.error('Erro', 'Erro ao carregar dados da escala para exclusão');
            return;
        }

        if (!schedule) {
            await SweetAlert.error('Erro', 'Escala não encontrada');
            return;
        }

        // CONFIRMAÇÃO COM SWEETALERT2
        const confirmText = `• Membro: ${schedule.members?.name || 'N/A'}\n• Culto: ${schedule.services?.name || 'N/A'}\n• Data: ${new Date(schedule.date).toLocaleDateString('pt-BR')}\n• Departamento: ${schedule.departments?.name || 'N/A'}${schedule.sector ? `\n• Setor: ${schedule.sector}` : ''}\n\n⚠️ Esta ação não pode ser desfeita.`;

        const confirmed = await SweetAlert.confirm(
            'Confirmar Exclusão',
            confirmText,
            'Sim, Excluir',
            'Cancelar'
        );

        if (!confirmed) {
            console.log('Usuário cancelou a exclusão');
            return;
        }

        // Mostrar loading
        SweetAlert.showLoading('Excluindo escala...');

        // Executar exclusão
        const { error } = await supabase
            .from('schedules')
            .delete()
            .eq('id', id);

        if (error) throw error;

        SweetAlert.close();
        await SweetAlert.success('Sucesso!', 'Escala excluída com sucesso!');
        loadSchedules(user);

    } catch (error) {
        SweetAlert.close();
        console.error('Erro ao excluir escala:', error);
        await SweetAlert.error('Erro', 'Erro ao excluir escala: ' + error.message);
    }
}

// CORREÇÃO COMPLETA DE TODAS AS ESCALAS EXISTENTES - MODIFICADA COM SWEETALERT2
async function completeFixAllSchedules() {
    try {
        console.log('=== CORREÇÃO COMPLETA DE TODAS AS ESCALAS ===');

        const confirmed = await SweetAlert.confirm(
            'Correção de Escalas',
            'Esta ação irá verificar e corrigir os dias da semana de todas as escalas existentes. Deseja continuar?',
            'Sim, Corrigir',
            'Cancelar'
        );

        if (!confirmed) return;

        SweetAlert.showLoading('Verificando escalas...');

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

        SweetAlert.close();

        console.log(`✅ CORREÇÃO CONCLUÍDA:`);
        console.log(`   ${fixed} escalas corrigidas`);
        console.log(`   ${alreadyCorrect} escalas já estavam corretas`);
        console.log(`   Total: ${fixed + alreadyCorrect} escalas verificadas`);

        await SweetAlert.success(
            'Correção Aplicada!',
            `${fixed} escalas corrigidas\n${alreadyCorrect} já estavam corretas`
        );

    } catch (error) {
        SweetAlert.close();
        console.error('Erro na correção completa:', error);
        await SweetAlert.error('Erro na Correção', 'Erro: ' + error.message);
    }
}

// Função para exportar escalas em PDF - COM LAYOUT AGRUPADO
async function exportToPdf() {
    try {
        console.log('Função exportToPdf chamada - Layout Agrupado');

        const monthYearInput = document.getElementById('schedule-month-year');
        const departmentFilter = document.getElementById('schedule-department-filter');

        console.log('monthYearInput:', monthYearInput);
        console.log('departmentFilter:', departmentFilter);

        if (!monthYearInput) {
            console.error('Elemento schedule-month-year não encontrado');
            await SweetAlert.error('Erro', 'Elemento de filtro não encontrado');
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

        // Mostrar loading no SweetAlert2
        SweetAlert.showLoading('Preparando PDF...');

        console.log('Buscando dados do Supabase com filtros...');

        // Buscar dados das escalas COM OS FILTROS APLICADOS
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);

        let query = supabase
            .from('schedules')
            .select(`
                *,
                departments (name),
                members (name, type),
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
                    SweetAlert.close();
                    await SweetAlert.error('Acesso Negado', 'Acesso não permitido a este departamento');
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
            SweetAlert.close();
            await SweetAlert.info('Nenhuma Escala', 'Nenhuma escala encontrada para exportar com os filtros selecionados.');
            // Restaurar botão
            exportPdfBtn.textContent = originalText;
            exportPdfBtn.disabled = false;
            return;
        }

        console.log('Verificando jsPDF...');
        if (typeof window.jspdf === 'undefined') {
            console.error('jsPDF não carregado');
            SweetAlert.close();
            await SweetAlert.error('Erro', 'Biblioteca jsPDF não carregada. Verifique a conexão com a internet.');
            // Restaurar botão
            exportPdfBtn.textContent = originalText;
            exportPdfBtn.disabled = false;
            return;
        }

        console.log('Criando PDF com layout agrupado...');

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
            // Processar cada data
            dates.forEach(dateStr => {
                const daySchedules = schedulesByDate[dateStr];

                // CORREÇÃO DEFINITIVA: Usar a mesma função confiável do sistema
                let dayOfWeekIndex = daySchedules[0]?.day_of_week;
                if (dayOfWeekIndex === undefined || dayOfWeekIndex === null) {
                    dayOfWeekIndex = calculateDayOfWeek(dateStr);
                }

                const calculatedDay = calculateDayOfWeek(dateStr);
                if (dayOfWeekIndex !== calculatedDay) {
                    dayOfWeekIndex = calculatedDay;
                }

                const dayOfWeek = getDayOfWeekName(dayOfWeekIndex);
                const formattedDate = dateStr.split('-').reverse().join('/');

                // AGRUPAMENTO: Agrupar por culto e departamento
                const groupedSchedules = {};

                daySchedules.forEach(schedule => {
                    const key = `${schedule.service_id}-${schedule.department_id}`;

                    if (!groupedSchedules[key]) {
                        groupedSchedules[key] = {
                            service: schedule.services,
                            department: schedule.departments,
                            schedules: []
                        };
                    }

                    groupedSchedules[key].schedules.push(schedule);
                });

                // Ordenar grupos
                const sortedGroups = Object.values(groupedSchedules).sort((a, b) => {
                    const serviceCompare = a.service.name.localeCompare(b.service.name);
                    if (serviceCompare !== 0) return serviceCompare;
                    return a.department.name.localeCompare(b.department.name);
                });

                // Calcular altura necessária para esta data
                let dateHeight = 0;
                sortedGroups.forEach(group => {
                    // Altura do grupo: 1 linha por membro + espaçamento
                    dateHeight += group.schedules.length * 8 + 5;
                });

                // VERIFICAÇÃO DE ESPAÇO NA PÁGINA
                const spaceAvailable = pageHeight - yPosition - 30;
                if (dateHeight > spaceAvailable) {
                    console.log(`Criando nova página para ${dateStr}`);
                    doc.addPage();
                    yPosition = margin;

                    // Redesenhar cabeçalho da página
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

                // Renderizar cada grupo
                sortedGroups.forEach((group, groupIndex) => {
                    const { service, department, schedules } = group;

                    // Ordenar escalas por setor e membro
                    const sortedSchedules = schedules.sort((a, b) => {
                        const sectorCompare = (a.sector || '').localeCompare(b.sector || '');
                        if (sectorCompare !== 0) return sectorCompare;
                        return a.members.name.localeCompare(b.members.name);
                    });

                    // Agrupar por setor dentro do grupo
                    const schedulesBySector = {};
                    sortedSchedules.forEach(schedule => {
                        const sector = schedule.sector || 'Sem setor específico';
                        if (!schedulesBySector[sector]) {
                            schedulesBySector[sector] = [];
                        }
                        schedulesBySector[sector].push(schedule);
                    });

                    const sortedSectors = Object.keys(schedulesBySector).sort((a, b) => a.localeCompare(b));
                    let currentPosition = 0;

                    // Renderizar cada setor
                    sortedSectors.forEach((sector, sectorIndex) => {
                        const sectorSchedules = schedulesBySector[sector];

                        // Renderizar cada membro do setor
                        sectorSchedules.forEach((schedule, scheduleIndex) => {
                            const isFirstInGroup = currentPosition === 0;
                            const isFirstInSector = scheduleIndex === 0;

                            // VERIFICAÇÃO DE ESPAÇO PARA LINHA
                            if (yPosition > pageHeight - 20) {
                                console.log('Criando nova página para linha individual');
                                doc.addPage();
                                yPosition = margin;

                                // Redesenhar cabeçalho da tabela
                                doc.setFont('helvetica', 'bold');
                                doc.setTextColor(255, 255, 255);
                                doc.setFillColor(128, 128, 128);
                                doc.rect(margin, yPosition, pageWidth - (margin * 2), 8, 'F');
                                doc.text('Culto', margin + 5, yPosition + 6);
                                doc.text('Departamento', margin + colWidth + 5, yPosition + 6);
                                doc.text('Setor', margin + (colWidth * 2) + 5, yPosition + 6);
                                doc.text('Membro', margin + (colWidth * 3) + 5, yPosition + 6);
                                yPosition += 10;
                            }

                            // Cor de fundo alternada para linhas
                            if (currentPosition % 2 === 0) {
                                doc.setFillColor(245, 245, 245);
                                doc.rect(margin, yPosition - 2, pageWidth - (margin * 2), 8, 'F');
                            }

                            // Primeira linha do grupo - desenhar culto e departamento
                            if (isFirstInGroup && isFirstInSector) {
                                doc.setFont('helvetica', 'bold');
                                doc.setTextColor(0, 0, 0);
                                doc.text(service.name.substring(0, 15), margin + 5, yPosition + 4);
                                doc.text(department.name.substring(0, 15), margin + colWidth + 5, yPosition + 4);
                            }

                            // Primeira linha do setor - desenhar setor
                            if (isFirstInSector) {
                                doc.setFont('helvetica', 'bold');
                                doc.setTextColor(80, 80, 80);
                                const displaySector = sector !== 'Sem setor específico' ? sector.substring(0, 12) : '-';
                                doc.text(displaySector, margin + (colWidth * 2) + 5, yPosition + 4);
                            }

                            // CORREÇÃO: Sempre desenhar o membro (SEM o tipo)
                            doc.setFont('helvetica', 'normal');
                            doc.setTextColor(0, 0, 0);
                            const memberName = schedule.members.name.substring(0, 20); // Aumentei o limite para compensar a remoção do tipo
                            doc.text(memberName, margin + (colWidth * 3) + 5, yPosition + 4);

                            yPosition += 8;
                            currentPosition++;
                        });
                    });
                });

                yPosition += 10; // Espaço entre datas
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
        SweetAlert.close();
        await SweetAlert.success('Sucesso!', 'PDF gerado com sucesso!');

    } catch (error) {
        SweetAlert.close();
        console.error('Erro ao gerar PDF:', error);
        await SweetAlert.error('Erro', 'Erro ao gerar PDF: ' + error.message);

        // Restaurar botão em caso de erro
        const exportPdfBtn = document.getElementById('export-pdf');
        if (exportPdfBtn) {
            exportPdfBtn.textContent = 'Exportar PDF';
            exportPdfBtn.disabled = false;
        }
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

// Função para carregar setores de um departamento e controlar obrigatoriedade
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

        // Elementos de controle de obrigatoriedade
        const sectorRequired = document.getElementById('sector-required');
        const sectorHint = document.getElementById('sector-hint');

        // Verificar se o departamento tem setores
        const hasSectors = department && department.sectors && department.sectors.length > 0;

        if (hasSectors) {
            // Departamento TEM setores - setor é obrigatório
            sectorSelect.required = true;
            if (sectorRequired) sectorRequired.style.display = 'inline';
            if (sectorHint) sectorHint.textContent = 'Selecione um setor *';

            // Adicionar opção padrão obrigatória
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Selecione um setor';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            sectorSelect.appendChild(defaultOption);

            // Adicionar setores ao select
            department.sectors.sort().forEach(sector => {
                const option = document.createElement('option');
                option.value = sector;
                option.textContent = sector;
                sectorSelect.appendChild(option);
            });

            console.log(`Setores carregados para departamento ${department.name}:`, department.sectors.length);
        } else {
            // Departamento NÃO TEM setores - setor NÃO é obrigatório
            sectorSelect.required = false;
            if (sectorRequired) sectorRequired.style.display = 'none';
            if (sectorHint) sectorHint.textContent = 'Este departamento não tem setores cadastrados';

            // Adicionar opção padrão
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Nenhum setor específico';
            sectorSelect.appendChild(defaultOption);

            console.log(`Departamento ${department?.name} não tem setores cadastrados`);
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

// Verificação de carregamento do SweetAlert2
console.log('SweetAlert2 carregado:', typeof Swal !== 'undefined');
console.log('SweetAlert utilitário carregado:', typeof SweetAlert !== 'undefined');

if (typeof Swal !== 'undefined' && typeof SweetAlert !== 'undefined') {
    console.log('✅ SweetAlert2 está funcionando corretamente!');
} else {
    console.error('❌ SweetAlert2 não foi carregado corretamente!');
}