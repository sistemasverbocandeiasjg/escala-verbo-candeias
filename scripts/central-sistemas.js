// scripts/central-sistemas.js
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // Verificar se o usuário está logado
        const user = await checkAuth();

        if (!user) {
            // Redirecionar para login se não estiver autenticado
            window.location.href = 'index.html';
            return;
        }

        // Atualizar informações do usuário no cabeçalho
        const userNameElement = document.getElementById('user-name');
        const userLevelElement = document.getElementById('user-level');

        if (userNameElement) {
            userNameElement.textContent = user.username || 'Usuário';
        }

        if (userLevelElement) {
            userLevelElement.textContent = user.level || 'Nível';
        }

        // Configurar botão de logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async function () {
                try {
                    // Adicionar efeito de loading
                    this.innerHTML = 'Saindo...';
                    this.disabled = true;

                    await customLogout();
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                    // Restaurar botão em caso de erro
                    this.innerHTML = 'Sair';
                    this.disabled = false;
                }
            });
        }

        // Adicionar efeitos interativos nos cards
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', function () {
                this.style.transform = 'translateY(-8px) scale(1.02)';
            });

            card.addEventListener('mouseleave', function () {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });

    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = 'index.html';
    }
});

// Função para verificar se há uma imagem de fundo
function checkBackgroundImage() {
    const body = document.body;
    const computedStyle = window.getComputedStyle(body);
    const backgroundImage = computedStyle.backgroundImage;

    // Se não há imagem de fundo ou é none/initial, aplicar gradiente
    if (!backgroundImage || backgroundImage === 'none' || backgroundImage === 'initial') {
        body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}

// Verificar fundo ao carregar
window.addEventListener('load', checkBackgroundImage);