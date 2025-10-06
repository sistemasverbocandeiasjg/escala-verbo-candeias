// scripts/modal.js - Sistema de confirmação completo
let currentResolve = null;

// Função para mostrar modal de confirmação (Sim/Não)
function showConfirmModal(message, title = 'Confirmação') {
    return new Promise((resolve) => {
        currentResolve = resolve;

        // Criar modal de confirmação se não existir
        let confirmModal = document.getElementById('confirm-modal');
        if (!confirmModal) {
            confirmModal = document.createElement('div');
            confirmModal.id = 'confirm-modal';
            confirmModal.className = 'modal';
            confirmModal.innerHTML = `
            <div class="modal-content" style="max-width: 360px; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <div class="modal-header" style="padding: 8px 15px 6px 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <h2 id="confirm-title" style="font-size: 1rem; margin: 0;">${title}</h2>
                    <span class="close" style="color: white;">&times;</span>
                </div>
                <div class="modal-body" style="padding: 12px 15px;">
                    <p id="confirm-message" style="white-space: pre-line; line-height: 1.4; font-size: 14px; margin: 0;">${message}</p>
                </div>
                <div class="modal-actions" style="padding: 8px 15px 10px 15px; background: #f8f9fa; border-top: 1px solid #e2e8f0;">
                    <button id="confirm-no" class="btn btn-secondary" style="background: #f56565; color: white; padding: 6px 12px; font-size: 13px; margin-right: 8px;">Não</button>
                    <button id="confirm-yes" class="btn btn-primary" style="background: #48bb78; color: white; padding: 6px 12px; font-size: 13px;">Sim</button>
                </div>
            </div>
        `;
            document.body.appendChild(confirmModal);

            // Adicionar event listeners - CORREÇÃO: usar funções anônimas
            document.getElementById('confirm-yes').addEventListener('click', function () {
                if (window.hideConfirmModal) {
                    window.hideConfirmModal(true);
                }
            });

            document.getElementById('confirm-no').addEventListener('click', function () {
                if (window.hideConfirmModal) {
                    window.hideConfirmModal(false);
                }
            });

            confirmModal.querySelector('.close').addEventListener('click', function () {
                if (window.hideConfirmModal) {
                    window.hideConfirmModal(false);
                }
            });
        } else {
            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-message').textContent = message;
        }

        confirmModal.style.display = 'flex';
        document.body.classList.add('modal-open');
    });
}

// Função para esconder modal de confirmação
function hideConfirmModal(result) {
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) {
        confirmModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    if (currentResolve) {
        currentResolve(result);
        currentResolve = null;
    }
}

// Função para mostrar modal de resultado (OK)
function showResultModal(message, title = 'Resultado') {
    return new Promise((resolve) => {
        // Criar modal de resultado se não existir
        let resultModal = document.getElementById('result-modal');
        if (!resultModal) {
            resultModal = document.createElement('div');
            resultModal.id = 'result-modal';
            resultModal.className = 'modal';
            resultModal.innerHTML = `
                <div class="modal-content" style="max-width: 350px; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    <div class="modal-header" style="padding: 12px 15px 8px 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        <h2 id="result-title" style="font-size: 1.1rem; margin: 0;">${title}</h2>
                        <span class="close" style="color: white;">&times;</span>
                    </div>
                    <div class="modal-body" style="padding: 15px;">
                        <p id="result-message" style="white-space: pre-line; line-height: 1.4; font-size: 14px; margin: 0;">${message}</p>
                    </div>
                    <div class="modal-actions" style="padding: 12px 15px; background: #f8f9fa; border-top: 1px solid #e2e8f0;">
                        <button id="result-ok" class="btn btn-primary" style="padding: 6px 20px; font-size: 13px;">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(resultModal);

            // Adicionar event listeners - CORREÇÃO: usar funções anônimas
            document.getElementById('result-ok').addEventListener('click', function () {
                if (window.hideResultModal) {
                    window.hideResultModal();
                }
            });

            resultModal.querySelector('.close').addEventListener('click', function () {
                if (window.hideResultModal) {
                    window.hideResultModal();
                }
            });
        } else {
            document.getElementById('result-title').textContent = title;
            document.getElementById('result-message').textContent = message;
        }

        resultModal.style.display = 'flex';
        document.body.classList.add('modal-open');
    });
}

// Função para esconder modal de resultado
function hideResultModal() {
    const resultModal = document.getElementById('result-modal');
    if (resultModal) {
        resultModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// Função para mostrar o modal normal
function showModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        document.body.classList.add('modal-open');

        // Garantir que o modal esteja no topo
        setTimeout(() => {
            modal.scrollTop = 0;
        }, 100);

        // CORREÇÃO: Garantir que o event listener do close está funcionando
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            // Remover event listeners anteriores
            closeBtn.replaceWith(closeBtn.cloneNode(true));
            const newCloseBtn = modal.querySelector('.close');

            newCloseBtn.onclick = function () {
                hideModal();
            };
        }
    }
}

// Função para esconder o modal normal
function hideModal() {
    console.log('hideModal chamada'); // DEBUG
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');

        // Remover classe específica de escalas se existir
        modal.classList.remove('schedule-modal');
    }
}

// CORREÇÃO: Adicionar event listener global para o botão close
document.addEventListener('DOMContentLoaded', function () {
    // Configurar o botão close do modal principal
    const modal = document.getElementById('modal');
    if (modal) {
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = function () {
                hideModal();
            };
        }

        // Configurar o botão cancelar do modal principal
        const cancelBtn = document.getElementById('modal-cancel');
        if (cancelBtn) {
            cancelBtn.onclick = function () {
                hideModal();
            };
        }
    }
});

// Fechar modal ao clicar fora
window.addEventListener('click', function (event) {
    const normalModal = document.getElementById('modal');
    if (event.target === normalModal) hideModal();
});

// Fechar modal com ESC
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        const normalModal = document.getElementById('modal');
        if (normalModal && normalModal.style.display === 'flex') hideModal();
    }
});

// Exportar funções
window.showModal = showModal;
window.hideModal = hideModal;