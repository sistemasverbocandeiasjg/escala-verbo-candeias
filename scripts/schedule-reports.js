// scripts/schedule-reports.js - Relatório de quantidades de escalas por membro
document.addEventListener('DOMContentLoaded', function () {
    // As funções serão chamadas pelo dashboard.js
});

// Função para carregar relatório de escalas
async function loadScheduleReports(user) {
    try {
        const reportsList = document.getElementById('schedule-reports-list');
        if (!reportsList) return;

        // Filtros
        const monthYearInput = document.getElementById('report-month-year');
        const selectedMonthYear = monthYearInput ? monthYearInput.value : new Date().toISOString().slice(0, 7);

        const [year, month] = selectedMonthYear.split('-').map(Number);
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);

        // Buscar escalas do período
        let schedulesQuery = supabase
            .from('schedules')
            .select(`
                *,
                departments (name),
                members (name, type),
                services (name)
            `)
            .gte('date', firstDay.toISOString().split('T')[0])
            .lte('date', lastDay.toISOString().split('T')[0])
            .order('date');

        // Se for líder, filtrar apenas seus departamentos
        if (user.level === 'Líder') {
            const { data: userDepartments, error: deptError } = await supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', user.id);

            if (!deptError && userDepartments && userDepartments.length > 0) {
                const deptIds = userDepartments.map(ud => ud.department_id);
                schedulesQuery = schedulesQuery.in('department_id', deptIds);
            } else {
                reportsList.innerHTML = '<div class="message error">Você não está associado a nenhum departamento</div>';
                return;
            }
        }

        const { data: schedules, error: schedulesError } = await schedulesQuery;
        if (schedulesError) throw schedulesError;

        // Buscar TODOS os membros para incluir os que não foram escalados
        let membersQuery = supabase
            .from('members')
            .select(`
                *,
                member_departments (department_id)
            `)
            .order('name');

        // Se for líder, filtrar apenas membros dos seus departamentos
        if (user.level === 'Líder') {
            const { data: userDepartments, error: deptError } = await supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', user.id);

            if (!deptError && userDepartments && userDepartments.length > 0) {
                const deptIds = userDepartments.map(ud => ud.department_id);

                // Buscar membros que pertencem aos departamentos do líder
                const { data: memberDepts, error: mdError } = await supabase
                    .from('member_departments')
                    .select('member_id')
                    .in('department_id', deptIds);

                if (!mdError && memberDepts && memberDepts.length > 0) {
                    const memberIds = memberDepts.map(md => md.member_id);
                    membersQuery = membersQuery.in('id', memberIds);
                }
            }
        }

        const { data: allMembers, error: membersError } = await membersQuery;
        if (membersError) throw membersError;

        // AGORA CHAMADA ASSÍNCRONA: processScheduleReport agora é async
        const reportData = await processScheduleReport(schedules, allMembers);
        renderScheduleReports(schedules, allMembers, user, month - 1, year, reportData);

    } catch (error) {
        console.error('Erro ao carregar relatório de escalas:', error);
        const reportsList = document.getElementById('schedule-reports-list');
        if (reportsList) {
            reportsList.innerHTML = '<p class="message error">Erro ao carregar relatório de escalas</p>';
        }
    }
}

// Função para renderizar o relatório
function renderScheduleReports(schedules, allMembers, user, month, year, reportData) {
    const reportsList = document.getElementById('schedule-reports-list');
    if (!reportsList) return;

    const monthName = getMonthName(month);

    // AGORA reportData é passado como parâmetro, não precisa processar novamente

    let html = `
        <div class="filter-info">
            <h3>Relatório de Escalas - ${monthName}/${year}</h3>
            <p>Quantidade de vezes que cada membro foi escalado por departamento</p>
        </div>
        
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Membro</th>
                    <th style="padding: 12px; background: #f8f9fa; text-align: left;">Departamento</th>
                    <th style="padding: 12px; background: #f8f9fa; text-align: center;">Quantidade</th>
                    <th style="padding: 12px; background: #f8f9fa; text-align: center;">Total Geral</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Ordenar dados: primeiro por nome do membro, depois por departamento
    // Membros com escalas primeiro, depois membros sem escalas
    const sortedData = Object.values(reportData).sort((a, b) => {
        // Primeiro: membros com escalas vs sem escalas
        const hasScalesA = a.totalCount > 0;
        const hasScalesB = b.totalCount > 0;

        if (hasScalesA && !hasScalesB) return -1;
        if (!hasScalesA && hasScalesB) return 1;

        // Segundo: por nome do membro
        const nameCompare = a.memberName.localeCompare(b.memberName);
        if (nameCompare !== 0) return nameCompare;

        // Terceiro: por departamento
        return a.departmentName.localeCompare(b.departmentName);
    });

    let lastMember = null;
    let memberRowspan = 0;

    // Calcular rowspan para cada membro
    const memberRowspans = {};
    sortedData.forEach(item => {
        if (!memberRowspans[item.memberId]) {
            memberRowspans[item.memberId] = 0;
        }
        memberRowspans[item.memberId]++;
    });

    sortedData.forEach((item, index) => {
        const isNewMember = lastMember !== item.memberId;
        lastMember = item.memberId;

        // Destacar membros sem escalas
        const rowClass = item.totalCount === 0 ? 'style="background-color: #fff5f5;"' : '';

        html += `
            <tr ${rowClass} style="border-bottom: 1px solid #e2e8f0;">
        `;

        // Membro (com rowspan se for o primeiro do membro)
        if (isNewMember) {
            const memberName = item.totalCount === 0 ?
                `${item.memberName} <span style="color: #e53e3e; font-style: italic;">(sem escalas)</span>` :
                item.memberName;

            html += `<td style="padding: 12px;" rowspan="${memberRowspans[item.memberId]}">${memberName}</td>`;
        }

        // Departamento - AGORA COM NOME CORRETO
        html += `<td style="padding: 12px;">${item.departmentName}</td>`;

        // Quantidade por departamento
        const countDisplay = item.count > 0 ?
            `<span style="font-weight: bold;">${item.count}</span>` :
            '<span style="color: #a0aec0;">0</span>';

        html += `<td style="padding: 12px; text-align: center;">${countDisplay}</td>`;

        // Total geral (com rowspan se for o primeiro do membro)
        if (isNewMember) {
            const totalDisplay = item.totalCount > 0 ?
                `<span style="font-weight: bold; background: #f0f8ff; padding: 4px 8px; border-radius: 4px;">${item.totalCount}</span>` :
                '<span style="color: #a0aec0;">0</span>';

            html += `<td style="padding: 12px; text-align: center;" rowspan="${memberRowspans[item.memberId]}">${totalDisplay}</td>`;
        }

        html += `</tr>`;
    });

    html += `</tbody></table>`;

    // Estatísticas resumidas
    const membersWithScales = new Set(schedules.map(s => s.member_id)).size;
    const membersWithoutScales = allMembers ? allMembers.length - membersWithScales : 0;
    const totalDepartments = new Set(schedules.map(s => s.department_id)).size;
    const totalSchedules = schedules.length;

    html += `
        <div class="report-summary" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h4>Resumo do Período</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 10px;">
                <div class="summary-item">
                    <strong>Total de Membros:</strong> ${allMembers ? allMembers.length : 0}
                </div>
                <div class="summary-item">
                    <strong>Membros Escalados:</strong> ${membersWithScales}
                </div>
                <div class="summary-item">
                    <strong>Membros Sem Escalas:</strong> 
                    <span style="color: ${membersWithoutScales > 0 ? '#e53e3e' : '#38a169'}">
                        ${membersWithoutScales}
                    </span>
                </div>
                <div class="summary-item">
                    <strong>Total de Departamentos:</strong> ${totalDepartments}
                </div>
                <div class="summary-item">
                    <strong>Total de Escalas:</strong> ${totalSchedules}
                </div>
            </div>
        </div>
    `;

    reportsList.innerHTML = html;
}

// Função para processar os dados do relatório (incluindo membros não escalados)
async function processScheduleReport(schedules, allMembers) {
    const reportData = {};
    const memberTotals = {};

    // Calcular totais por membro a partir das escalas
    schedules.forEach(schedule => {
        const memberId = schedule.member_id;
        if (!memberTotals[memberId]) {
            memberTotals[memberId] = 0;
        }
        memberTotals[memberId]++;
    });

    // Primeiro: processar membros que TEM escalas
    schedules.forEach(schedule => {
        const key = `${schedule.department_id}-${schedule.member_id}`;

        if (!reportData[key]) {
            reportData[key] = {
                departmentId: schedule.department_id,
                departmentName: schedule.departments?.name || `Departamento ${schedule.department_id}`,
                memberId: schedule.member_id,
                memberName: schedule.members?.name || `Membro ${schedule.member_id}`,
                count: 0,
                totalCount: memberTotals[schedule.member_id] || 0
            };
        }

        reportData[key].count++;
    });

    // Segundo: adicionar membros que NÃO TEM escalas
    if (allMembers && allMembers.length > 0) {
        // Buscar TODOS os departamentos para ter os nomes completos
        const { data: allDepartments, error: deptError } = await supabase
            .from('departments')
            .select('id, name')
            .order('name');

        const departmentsMap = {};
        if (!deptError && allDepartments) {
            allDepartments.forEach(dept => {
                departmentsMap[dept.id] = dept.name;
            });
        }

        allMembers.forEach(member => {
            // Verificar se o membro tem alguma escala
            const hasAnySchedule = schedules.some(schedule => schedule.member_id === member.id);

            if (!hasAnySchedule) {
                // Para cada departamento do membro, criar uma entrada
                if (member.member_departments && member.member_departments.length > 0) {
                    member.member_departments.forEach(md => {
                        const key = `${md.department_id}-${member.id}`;
                        if (!reportData[key]) {
                            const deptName = departmentsMap[md.department_id] || `Departamento ${md.department_id}`;
                            reportData[key] = {
                                departmentId: md.department_id,
                                departmentName: deptName,
                                memberId: member.id,
                                memberName: member.name,
                                count: 0,
                                totalCount: 0
                            };
                        }
                    });
                } else {
                    // Se o membro não tem departamentos associados, criar uma entrada genérica
                    const key = `no-dept-${member.id}`;
                    reportData[key] = {
                        departmentId: null,
                        departmentName: 'Sem departamento',
                        memberId: member.id,
                        memberName: member.name,
                        count: 0,
                        totalCount: 0
                    };
                }
            }
        });
    }

    return reportData;
}

// Função auxiliar para nome do mês
function getMonthName(month) {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month];
}

window.loadScheduleReports = loadScheduleReports;