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
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h3 id="confirm-title">${title}</h3>
                    <p id="confirm-message">${message}</p>
                    <div class="modal-buttons">
                        <button id="confirm-yes" class="btn btn-primary">Sim</button>
                        <button id="confirm-no" class="btn btn-secondary">Não</button>
                    </div>
                </div>
            `;
            document.body.appendChild(confirmModal);
            
            // Adicionar event listeners
            document.getElementById('confirm-yes').addEventListener('click', () => hideConfirmModal(true));
            document.getElementById('confirm-no').addEventListener('click', () => hideConfirmModal(false));
            confirmModal.querySelector('.close').addEventListener('click', () => hideConfirmModal(false));
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
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h3 id="result-title">${title}</h3>
                    <p id="result-message">${message}</p>
                    <div class="modal-buttons">
                        <button id="result-ok" class="btn btn-primary">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(resultModal);
            
            // Adicionar event listeners
            document.getElementById('result-ok').addEventListener('click', () => hideResultModal());
            resultModal.querySelector('.close').addEventListener('click', () => hideResultModal());
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
        
        // CORREÇÃO: Garantir que o event listener do close está funcionando
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            // Remover event listeners anteriores
            closeBtn.replaceWith(closeBtn.cloneNode(true));
            const newCloseBtn = modal.querySelector('.close');
            
            newCloseBtn.onclick = function() {
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
    }
}

// CORREÇÃO: Adicionar event listener global para o botão close
document.addEventListener('DOMContentLoaded', function() {
    // Configurar o botão close do modal principal
    const modal = document.getElementById('modal');
    if (modal) {
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = function() {
                hideModal();
            };
        }
        
        // Configurar o botão cancelar do modal principal
        const cancelBtn = document.getElementById('modal-cancel');
        if (cancelBtn) {
            cancelBtn.onclick = function() {
                hideModal();
            };
        }
    }
});

// Fechar modais ao clicar fora
window.addEventListener('click', function(event) {
    const confirmModal = document.getElementById('confirm-modal');
    const resultModal = document.getElementById('result-modal');
    const normalModal = document.getElementById('modal');
    
    if (event.target === confirmModal) hideConfirmModal(false);
    if (event.target === resultModal) hideResultModal();
    if (event.target === normalModal) hideModal();
});

// Fechar modais com ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const confirmModal = document.getElementById('confirm-modal');
        const resultModal = document.getElementById('result-modal');
        const normalModal = document.getElementById('modal');
        
        if (confirmModal && confirmModal.style.display === 'flex') hideConfirmModal(false);
        if (resultModal && resultModal.style.display === 'flex') hideResultModal();
        if (normalModal && normalModal.style.display === 'flex') hideModal();
    }
});

// Exportar funções
window.showConfirmModal = showConfirmModal;
window.showResultModal = showResultModal;
window.showModal = showModal;
window.hideModal = hideModal;